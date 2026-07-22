import asyncio
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.domain.models import Movement
from app.domain.position_calculator import PositionCalculator
from app.domain.savings_comparator import simulate_bitcoin_balance
from app.domain.value_objects import MovementKind
from app.infrastructure.bitcoin_benchmark_provider import (
    BitcoinBenchmarkProvider,
    BitcoinMonthlyPrices,
)


def test_bitcoin_balance_tracks_price_variation() -> None:
    flows = [
        ("2024-01", Decimal("1000"), Decimal("0")),
        ("2024-02", Decimal("0"), Decimal("0")),
        ("2024-03", Decimal("500"), Decimal("0")),
    ]
    prices = {
        "2024-01": Decimal("100"),
        "2024-02": Decimal("150"),  # +50%
        "2024-03": Decimal("120"),  # -20%
    }

    balances = simulate_bitcoin_balance(flows, prices)

    assert balances["2024-01"] == Decimal("1000.00")
    assert balances["2024-02"] == Decimal("1500.00")
    # 1500 * (120/150) + 500 = 1200 + 500
    assert balances["2024-03"] == Decimal("1700.00")


def test_bitcoin_balance_empty_prices_keeps_flows() -> None:
    flows = [("2024-01", Decimal("1000"), Decimal("0"))]
    assert simulate_bitcoin_balance(flows, {}) == {"2024-01": Decimal("1000.00")}


def test_build_timeline_populates_bitcoin_patrimony() -> None:
    movements = [
        Movement(
            trade_date=date(2024, 1, 15),
            kind=MovementKind.BUY,
            ticker="PETR4",
            product="PETR4",
            institution="XP",
            direction="Debito",
            movement_label="Compra",
            quantity=Decimal("10"),
            unit_price=Decimal("30"),
            total_value=Decimal("300"),
        ),
        Movement(
            trade_date=date(2024, 2, 10),
            kind=MovementKind.INCOME,
            ticker="PETR4",
            product="PETR4",
            institution="XP",
            direction="Credito",
            movement_label="Dividendo",
            quantity=Decimal("10"),
            unit_price=None,
            total_value=Decimal("20"),
        ),
    ]

    points = PositionCalculator().build_timeline(
        movements,
        "PETR4",
        current_price=Decimal("30"),
        bitcoin_monthly_prices={"2024-01": Decimal("100"), "2024-02": Decimal("200")},
    )

    jan, feb = points
    assert jan.bitcoin_patrimony == Decimal("300.00")
    # 300 * (200/100) = 600 (no flow em fevereiro)
    assert feb.bitcoin_patrimony == Decimal("600.00")


def test_bitcoin_monthly_prices_metadata() -> None:
    prices = BitcoinMonthlyPrices(
        prices={"2024-01": Decimal("100"), "2024-02": Decimal("150")}
    )
    assert prices.available is True
    assert prices.latest_return_pct() == 50.0

    empty = BitcoinMonthlyPrices(prices={})
    assert empty.available is False
    assert empty.latest_return_pct() == 0.0


def test_provider_parses_binance_monthly_prices() -> None:
    provider = BitcoinBenchmarkProvider()

    async def fake_get(url: str, params=None, headers=None):
        response = MagicMock()
        response.status_code = 200
        # kline: [openTime, open, high, low, close, ...]
        response.json.return_value = [
            [1704067200000, "0", "0", "0", "200000.0", "1"],  # 2024-01
            [1706745600000, "0", "0", "0", "260000.0", "1"],  # 2024-02
        ]
        return response

    client = MagicMock()
    client.get = AsyncMock(side_effect=fake_get)
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)

    with patch(
        "app.infrastructure.bitcoin_benchmark_provider.httpx.AsyncClient",
        return_value=client,
    ):
        prices = asyncio.run(provider.get_monthly_prices("2024-01", "2024-02"))

    assert prices.prices["2024-01"] == Decimal("200000.0")
    assert prices.prices["2024-02"] == Decimal("260000.0")
    assert prices.available is True
