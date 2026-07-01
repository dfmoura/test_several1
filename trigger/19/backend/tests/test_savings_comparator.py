from decimal import Decimal

from app.domain.savings_comparator import DEFAULT_SAVINGS_MONTHLY_RATE, simulate_savings_balance


def test_savings_compounds_and_applies_same_flows() -> None:
    flows = [
        ("2024-01", Decimal("1000"), Decimal("0")),
        ("2024-02", Decimal("0"), Decimal("0")),
        ("2024-03", Decimal("500"), Decimal("200")),
    ]
    balances = simulate_savings_balance(flows, DEFAULT_SAVINGS_MONTHLY_RATE)

    assert balances["2024-01"] == Decimal("1000.00")
    assert balances["2024-02"] == Decimal("1005.00")
    assert balances["2024-03"] == Decimal("1310.02")
