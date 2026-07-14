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
    assert jan.selic_patrimony == Decimal("300.00")

    assert mar.asset_patrimony == Decimal("400.00")
    assert mar.savings_patrimony > Decimal("300.00")
    assert mar.selic_patrimony > Decimal("300.00")
    assert mar.selic_patrimony > mar.savings_patrimony
    assert mar.asset_patrimony > mar.selic_patrimony


def test_income_avg_purchase_unit_price_uses_cost_at_dividend_date() -> None:
    """Yield deve usar o preço médio de compra válido na data do provento, não após compras posteriores."""
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
            unit_price=Decimal("20"),
            total_value=Decimal("200"),
        ),
        Movement(
            trade_date=date(2024, 6, 5),
            kind=MovementKind.INCOME,
            ticker="PETR4",
            product="PETR4",
            institution="XP",
            direction="Credito",
            movement_label="Dividendo",
            quantity=Decimal("10"),
            unit_price=Decimal("1"),
            total_value=Decimal("10"),
        ),
        Movement(
            trade_date=date(2024, 6, 20),
            kind=MovementKind.BUY,
            ticker="PETR4",
            product="PETR4",
            institution="XP",
            direction="Debito",
            movement_label="Compra",
            quantity=Decimal("10"),
            unit_price=Decimal("40"),
            total_value=Decimal("400"),
        ),
    ]

    june = PositionCalculator().build_timeline(movements, "PETR4")[1]

    assert june.income == Decimal("10")
    assert june.income_unit_price == Decimal("1")
    assert june.income_avg_purchase_unit_price == Decimal("20")
    assert june.avg_purchase_unit_price == Decimal("30")
    assert june.income_unit_price / june.income_avg_purchase_unit_price == Decimal("0.05")
