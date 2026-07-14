from datetime import date, timedelta
from decimal import Decimal

from app.domain.models import Movement
from app.domain.position_calculator import PositionCalculator
from app.domain.value_objects import MovementKind


def _income(
    ticker: str,
    trade_date: date,
    unit_price: Decimal,
    *,
    quantity: Decimal = Decimal("100"),
) -> Movement:
    return Movement(
        trade_date=trade_date,
        kind=MovementKind.INCOME,
        ticker=ticker,
        product=f"{ticker} - TEST",
        institution="",
        direction="Credito",
        movement_label="Dividendo",
        quantity=quantity,
        unit_price=unit_price,
        total_value=unit_price * quantity,
    )


def test_dividends_12m_sums_recent_unit_values_only() -> None:
    today = date.today()
    movements = [
        _income("PETR4", today - timedelta(days=30), Decimal("1.50")),
        _income("PETR4", today - timedelta(days=200), Decimal("0.50")),
        _income("PETR4", today - timedelta(days=400), Decimal("9.00")),
        _income("VALE3", today - timedelta(days=10), Decimal("2.00")),
    ]

    assert PositionCalculator.dividends_12m_per_share(movements, "PETR4") == Decimal("2.0")
    assert PositionCalculator.dividends_12m_per_share(movements, "VALE3") == Decimal("2.0")
    assert PositionCalculator.dividends_12m_per_share(movements, "MISSING") == Decimal("0")


def test_dividends_12m_derives_unit_from_total_when_missing() -> None:
    today = date.today()
    movements = [
        Movement(
            trade_date=today - timedelta(days=15),
            kind=MovementKind.INCOME,
            ticker="ITUB4",
            product="ITUB4 - TEST",
            institution="",
            direction="Credito",
            movement_label="JCP",
            quantity=Decimal("50"),
            unit_price=None,
            total_value=Decimal("25"),
        )
    ]

    assert PositionCalculator.dividends_12m_per_share(movements, "ITUB4") == Decimal("0.5")
