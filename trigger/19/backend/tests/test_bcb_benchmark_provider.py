import asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.domain.savings_comparator import simulate_fixed_income_balance
from app.infrastructure.bcb_benchmark_provider import BcbBenchmarkProvider


def test_provider_parses_bcb_monthly_rates() -> None:
    provider = BcbBenchmarkProvider()

    async def fake_get(url: str, params: dict | None = None):
        response = MagicMock()
        response.status_code = 200
        if "bcdata.sgs.196" in url:
            response.json.return_value = [
                {"data": "01/01/2024", "valor": "0.50"},
                {"data": "01/02/2024", "valor": "0.60"},
            ]
        elif "bcdata.sgs.4391" in url:
            response.json.return_value = [
                {"data": "01/01/2024", "valor": "0.91"},
                {"data": "01/02/2024", "valor": "1.01"},
            ]
        else:
            response.json.return_value = []
        return response

    client = MagicMock()
    client.get = AsyncMock(side_effect=fake_get)
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.infrastructure.bcb_benchmark_provider.httpx.AsyncClient", return_value=client):
        rates = asyncio.run(provider.get_monthly_rates("2024-01", "2024-02"))

    assert rates.savings["2024-01"] == Decimal("0.0050000")
    assert rates.savings["2024-02"] == Decimal("0.0060000")
    assert rates.selic["2024-01"] == Decimal("0.0091000")
    assert rates.selic["2024-02"] == Decimal("0.0101000")
    assert rates.latest_pct(rates.selic, Decimal("0.0085")) == 1.01


def test_variable_monthly_rates_compound_per_period() -> None:
    flows = [
        ("2024-01", Decimal("1000"), Decimal("0")),
        ("2024-02", Decimal("0"), Decimal("0")),
    ]
    rates = {
        "2024-01": Decimal("0.01"),
        "2024-02": Decimal("0.02"),
    }
    balances = simulate_fixed_income_balance(flows, rates)

    assert balances["2024-01"] == Decimal("1000.00")
    assert balances["2024-02"] == Decimal("1020.00")


def test_provider_falls_back_when_bcb_unavailable() -> None:
    provider = BcbBenchmarkProvider()

    client = MagicMock()
    client.get = AsyncMock(side_effect=Exception("network down"))
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.infrastructure.bcb_benchmark_provider.httpx.AsyncClient", return_value=client):
        rates = asyncio.run(provider.get_monthly_rates("2024-01", "2024-02"))

    assert rates.savings["2024-01"] == Decimal("0.005")
    assert rates.selic["2024-01"] == Decimal("0.0085")
