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


def _price_for_period(
    period: str,
    monthly_prices: Mapping[str, Decimal],
) -> Decimal | None:
    """Preço do período ou o último conhecido anterior a ele."""
    if period in monthly_prices:
        return monthly_prices[period]
    prior = [p for p in monthly_prices if p <= period]
    if prior:
        return monthly_prices[max(prior)]
    return None


def simulate_bitcoin_balance(
    monthly_flows: list[tuple[str, Decimal, Decimal]],
    monthly_prices: Mapping[str, Decimal],
) -> dict[str, Decimal]:
    """Simula o saldo caso os mesmos aportes e resgates fossem em Bitcoin.

    A cada período o saldo é reavaliado pela variação do preço do BTC/BRL entre o
    período anterior e o atual; em seguida aplica-se o fluxo (aporte − resgate) do
    mês. Sem cotação no período, usa-se o último preço conhecido.
    """
    balance = Decimal("0")
    balances: dict[str, Decimal] = {}
    prev_price: Decimal | None = None

    for period, invested, liquidated in monthly_flows:
        price = _price_for_period(period, monthly_prices)
        if price is not None and prev_price is not None and prev_price > 0:
            balance = balance * (price / prev_price)
        balance += invested - liquidated
        balances[period] = balance.quantize(Decimal("0.01"))
        if price is not None:
            prev_price = price

    return balances
