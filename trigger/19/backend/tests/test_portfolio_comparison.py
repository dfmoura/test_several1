from datetime import date
from decimal import Decimal

from app.domain.models import Movement
from app.domain.position_calculator import PositionCalculator
from app.domain.value_objects import MovementKind


def test_portfolio_timeline_aggregates_tickers() -> None:
    movements = [
        Movement(
            trade_date=date(2024, 1, 10),
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
            trade_date=date(2024, 1, 20),
            kind=MovementKind.BUY,
            ticker="VALE3",
            product="VALE3",
            institution="XP",
            direction="Debito",
            movement_label="Compra",
            quantity=Decimal("5"),
            unit_price=Decimal("60"),
            total_value=Decimal("300"),
        ),
        Movement(
            trade_date=date(2024, 2, 5),
            kind=MovementKind.INCOME,
            ticker="PETR4",
            product="PETR4",
            institution="XP",
            direction="Credito",
            movement_label="Dividendo",
            quantity=Decimal("10"),
            unit_price=None,
            total_value=Decimal("40"),
        ),
    ]

    calculator = PositionCalculator()
    points = calculator.build_portfolio_timeline(
        movements,
        current_prices={"PETR4": Decimal("35"), "VALE3": Decimal("65")},
    )

    assert len(points) == 2
    jan, feb = points

    assert jan.asset_patrimony == Decimal("600.00")
    assert jan.savings_patrimony == Decimal("600.00")
    assert jan.selic_patrimony == Decimal("600.00")

    assert feb.asset_patrimony == Decimal("715.00")
    assert feb.savings_patrimony == Decimal("603.00")
    assert feb.selic_patrimony == Decimal("605.10")
    assert feb.selic_patrimony > feb.savings_patrimony
    assert feb.asset_patrimony > feb.selic_patrimony
