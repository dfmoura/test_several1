from datetime import datetime

import httpx

from app.config import Settings
from app.core.exceptions import MarketDataError
from app.core.logging import get_logger
from app.integrations.market.catalog import Asset
from app.schemas.market import MarketQuote

logger = get_logger(__name__)


class FrankfurterProvider:
    """Currency rates from the Frankfurter API (ECB reference data, free/no key).

    Returns how much of the configured base currency one unit of the foreign
    currency is worth (e.g. 1 USD = 5.10 BRL).
    """

    name = "frankfurter"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.frankfurter_base_url.rstrip("/"),
            timeout=settings.market_http_timeout,
        )

    async def fetch(self, asset: Asset) -> MarketQuote:
        target = self._settings.market_base_currency.upper()
        base = asset.symbol.upper()

        if base == target:
            return MarketQuote(
                asset_key=asset.key,
                name=asset.name,
                category=asset.category,
                symbol=base,
                price=1.0,
                currency=target,
                source="ECB/Frankfurter",
                delayed=True,
            )

        try:
            response = await self._client.get(
                "/v1/latest",
                params={"base": base, "symbols": target},
            )
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.error("frankfurter_error", symbol=base, error=str(exc))
            raise MarketDataError(f"Frankfurter request failed: {exc}") from exc

        rate = (data.get("rates") or {}).get(target)
        if rate is None:
            raise MarketDataError(
                f"Frankfurter has no rate for {base}->{target}",
                details={"base": base, "target": target},
            )

        as_of: datetime | None = None
        if raw_date := data.get("date"):
            try:
                as_of = datetime.strptime(raw_date, "%Y-%m-%d")
            except ValueError:
                as_of = None

        return MarketQuote(
            asset_key=asset.key,
            name=asset.name,
            category=asset.category,
            symbol=base,
            price=float(rate),
            currency=target,
            as_of=as_of,
            source="ECB/Frankfurter",
            delayed=True,
            raw={"date": data.get("date")},
        )

    async def close(self) -> None:
        await self._client.aclose()
