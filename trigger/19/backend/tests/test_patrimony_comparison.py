from datetime import date
from decimal import Decimal

from app.domain.models import Movement
from app.domain.position_calculator import PositionCalculator
from app.domain.value_objects import MovementKind


def test_timeline_includes_patrimony_comparison() -> None:
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
            trade_date=date(2024, 3, 10),
            kind=MovementKind.INCOME,
            ticker="PETR4",
            product="PETR4",
            institution="XP",
            direction="Credito",
            movement_label="Dividendo",
            quantity=Decimal("10"),
            unit_price=None,
            total_value=Decimal("50"),
        ),
    ]

    calculator = PositionCalculator()
    points = calculator.build_timeline(
        movements,
        "PETR4",
        current_price=Decimal("35"),
    )

    assert len(points) == 2
    jan, mar = points

    assert jan.asset_patrimony == Decimal("300.00")
    assert jan.savings_patrimony == Decimal("300.00")
    assert jan.cdi_patrimony == Decimal("300.00")

    assert mar.asset_patrimony == Decimal("400.00")
    assert mar.savings_patrimony > Decimal("300.00")
    assert mar.cdi_patrimony > Decimal("300.00")
    assert mar.cdi_patrimony > mar.savings_patrimony
    assert mar.asset_patrimony > mar.cdi_patrimony
