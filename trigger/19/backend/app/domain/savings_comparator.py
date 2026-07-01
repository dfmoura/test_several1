from __future__ import annotations

from decimal import Decimal

# Poupança simplificada: 0,5% a.m. quando TR ≈ 0 (referência BCB).
DEFAULT_SAVINGS_MONTHLY_RATE = Decimal("0.005")
# CDI simplificado: ~10,65% a.a. (≈ 0,85% a.m. capitalizado).
DEFAULT_CDI_MONTHLY_RATE = Decimal("0.0085")


def simulate_fixed_income_balance(
    monthly_flows: list[tuple[str, Decimal, Decimal]],
    monthly_rate: Decimal,
) -> dict[str, Decimal]:
    """Simula saldo com os mesmos aportes e resgates do ativo."""
    balance = Decimal("0")
    balances: dict[str, Decimal] = {}

    for period, invested, liquidated in monthly_flows:
        balance = balance * (Decimal("1") + monthly_rate)
        balance += invested - liquidated
        balances[period] = balance.quantize(Decimal("0.01"))

    return balances


def simulate_savings_balance(
    monthly_flows: list[tuple[str, Decimal, Decimal]],
    monthly_rate: Decimal = DEFAULT_SAVINGS_MONTHLY_RATE,
) -> dict[str, Decimal]:
    return simulate_fixed_income_balance(monthly_flows, monthly_rate)


def simulate_cdi_balance(
    monthly_flows: list[tuple[str, Decimal, Decimal]],
    monthly_rate: Decimal = DEFAULT_CDI_MONTHLY_RATE,
) -> dict[str, Decimal]:
    return simulate_fixed_income_balance(monthly_flows, monthly_rate)
