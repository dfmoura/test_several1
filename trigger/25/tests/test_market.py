from unittest.mock import AsyncMock, MagicMock

import pytest

from app.config import Settings
from app.integrations.market.catalog import detect_assets, get_asset
from app.integrations.market.frankfurter_provider import FrankfurterProvider
from app.integrations.market.yahoo_provider import YahooFinanceProvider
from app.memory.redis_client import RedisClient
from app.schemas.market import AssetCategory, MarketQuote
from app.services.market_service import MarketService


def test_detect_assets_matches_currency_and_commodity() -> None:
    assets = detect_assets("Quanto tá o dólar hoje e o preço do ouro?")
    keys = {a.key for a in assets}
    assert "usd" in keys
    assert "gold" in keys


def test_detect_assets_accent_insensitive() -> None:
    assets = detect_assets("cotação do cafe e do petroleo")
    keys = {a.key for a in assets}
    assert "coffee" in keys
    assert "wti" in keys


def test_detect_assets_respects_limit() -> None:
    text = "dolar euro libra ouro prata cobre petroleo"
    assert len(detect_assets(text, limit=2)) == 2


def test_detect_assets_no_false_positive() -> None:
    assert detect_assets("bom dia, tudo certo por aí?") == []


def test_detect_assets_word_boundary() -> None:
    # "eth" must not trigger inside another word.
    assert detect_assets("vamos ao Bethânia") == []


@pytest.mark.asyncio
async def test_frankfurter_provider(settings: Settings) -> None:
    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json = MagicMock(
        return_value={"amount": 1.0, "base": "USD", "date": "2026-07-20",
                      "rates": {"BRL": 5.1043}}
    )
    provider = FrankfurterProvider(settings)
    provider._client.get = AsyncMock(return_value=fake_response)

    quote = await provider.fetch(get_asset("usd"))
    await provider.close()

    assert quote.price == pytest.approx(5.1043)
    assert quote.currency == "BRL"
    assert quote.category == AssetCategory.CURRENCY
    assert quote.source == "ECB/Frankfurter"


@pytest.mark.asyncio
async def test_yahoo_provider(settings: Settings) -> None:
    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json = MagicMock(
        return_value={
            "chart": {
                "result": [
                    {
                        "meta": {
                            "currency": "USD",
                            "symbol": "GC=F",
                            "regularMarketPrice": 4059.1,
                            "chartPreviousClose": 4015.9,
                            "regularMarketTime": 1784638777,
                            "fullExchangeName": "COMEX",
                        }
                    }
                ],
                "error": None,
            }
        }
    )
    provider = YahooFinanceProvider(settings)
    provider._client.get = AsyncMock(return_value=fake_response)

    quote = await provider.fetch(get_asset("gold"))
    await provider.close()

    assert quote.price == pytest.approx(4059.1)
    assert quote.currency == "USD"
    assert quote.previous_close == pytest.approx(4015.9)
    assert quote.change_percent == pytest.approx(1.08, abs=0.05)
    assert quote.category == AssetCategory.FUTURE


@pytest.mark.asyncio
async def test_market_service_uses_cache(
    settings: Settings,
    redis_client: RedisClient,
) -> None:
    service = MarketService(settings=settings, redis_client=redis_client)

    fake_provider = AsyncMock()
    fake_provider.fetch = AsyncMock(
        return_value=MarketQuote(
            asset_key="gold",
            name="Ouro (futuro)",
            category=AssetCategory.FUTURE,
            symbol="GC=F",
            price=4059.1,
            currency="USD",
            source="Yahoo Finance",
        )
    )
    service._providers["yahoo"] = fake_provider

    asset = get_asset("gold")
    first = await service.get_quote(asset)
    second = await service.get_quote(asset)

    assert first.price == second.price
    fake_provider.fetch.assert_awaited_once()


@pytest.mark.asyncio
async def test_quotes_for_text_fail_open(
    settings: Settings,
    redis_client: RedisClient,
) -> None:
    service = MarketService(settings=settings, redis_client=redis_client)

    failing = AsyncMock()
    failing.fetch = AsyncMock(side_effect=RuntimeError("upstream down"))
    service._providers["frankfurter"] = failing
    service._providers["yahoo"] = failing

    # Should swallow provider errors and return an empty list, never raise.
    assert await service.quotes_for_text("quanto tá o dólar?") == []


def test_format_for_prompt() -> None:
    quote = MarketQuote(
        asset_key="gold",
        name="Ouro (futuro)",
        category=AssetCategory.FUTURE,
        symbol="GC=F",
        price=4059.1,
        currency="USD",
        change_percent=1.08,
        source="Yahoo Finance",
    )
    block = MarketService.format_for_prompt([quote])
    assert "Ouro (futuro)" in block
    assert "US$ 4,059.10" in block
    assert MarketService.format_for_prompt([]) == ""


@pytest.mark.asyncio
async def test_market_assets_endpoint(api_client) -> None:
    response = await api_client.get("/market/assets")
    assert response.status_code == 200
    keys = {item["key"] for item in response.json()}
    assert {"usd", "gold", "bitcoin"}.issubset(keys)
