from __future__ import annotations

from collections.abc import Mapping
from decimal import Decimal

# Fallbacks quando a API do BCB estiver indisponível.
# Poupança simplificada: 0,5% a.m. quando TR ≈ 0 (referência BCB).
DEFAULT_SAVINGS_MONTHLY_RATE = Decimal("0.005")
# Selic simplificada: ~10,65% a.a. (≈ 0,85% a.m. capitalizado).
DEFAULT_SELIC_MONTHLY_RATE = Decimal("0.0085")

MonthlyRateInput = Decimal | Mapping[str, Decimal]


def _rate_for_period(
    period: str,
    monthly_rate: MonthlyRateInput,
    default: Decimal,
) -> Decimal:
    if isinstance(monthly_rate, Mapping):
        if period in monthly_rate:
            return monthly_rate[period]
        # Última taxa conhecida anterior ao período.
        prior = [p for p in monthly_rate if p <= period]
        if prior:
            return monthly_rate[max(prior)]
        return default
    return monthly_rate


def simulate_fixed_income_balance(
    monthly_flows: list[tuple[str, Decimal, Decimal]],
    monthly_rate: MonthlyRateInput,
    *,
    default_rate: Decimal = DEFAULT_SAVINGS_MONTHLY_RATE,
) -> dict[str, Decimal]:
    """Simula saldo com os mesmos aportes e resgates do ativo.

    `monthly_rate` pode ser uma taxa constante ou um mapa período (YYYY-MM) → taxa.
    """
    balance = Decimal("0")
    balances: dict[str, Decimal] = {}

    for period, invested, liquidated in monthly_flows:
        rate = _rate_for_period(period, monthly_rate, default_rate)
        balance = balance * (Decimal("1") + rate)
        balance += invested - liquidated
        balances[period] = balance.quantize(Decimal("0.01"))

    return balances


def simulate_savings_balance(
    monthly_flows: list[tuple[str, Decimal, Decimal]],
    monthly_rate: MonthlyRateInput = DEFAULT_SAVINGS_MONTHLY_RATE,
) -> dict[str, Decimal]:
    return simulate_fixed_income_balance(
        monthly_flows,
        monthly_rate,
        default_rate=DEFAULT_SAVINGS_MONTHLY_RATE,
    )


def simulate_selic_balance(
    monthly_flows: list[tuple[str, Decimal, Decimal]],
    monthly_rate: MonthlyRateInput = DEFAULT_SELIC_MONTHLY_RATE,
) -> dict[str, Decimal]:
    return simulate_fixed_income_balance(
        monthly_flows,
        monthly_rate,
        default_rate=DEFAULT_SELIC_MONTHLY_RATE,
    )
