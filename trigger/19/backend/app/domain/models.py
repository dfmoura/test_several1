from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from app.domain.value_objects import IncomeType, MovementKind


@dataclass
class Movement:
    trade_date: date
    kind: MovementKind
    ticker: str
    product: str
    institution: str
    direction: str
    movement_label: str
    quantity: Decimal
    unit_price: Decimal | None
    total_value: Decimal | None
    income_type: IncomeType | None = None
    external_key: str = ""


@dataclass
class TickerPosition:
    ticker: str
    quantity: Decimal = Decimal("0")
    total_invested: Decimal = Decimal("0")
    total_liquidated: Decimal = Decimal("0")
    total_income: Decimal = Decimal("0")
    avg_cost: Decimal = Decimal("0")

    @property
    def net_invested(self) -> Decimal:
        return self.total_invested - self.total_liquidated


@dataclass
class TimelinePoint:
    period: str
    invested: Decimal
    liquidated: Decimal
    income: Decimal
    cumulative_invested: Decimal
    cumulative_liquidated: Decimal
    cumulative_income: Decimal
    invested_quantity: Decimal = Decimal("0")
    liquidated_quantity: Decimal = Decimal("0")
    income_quantity: Decimal = Decimal("0")
    position_quantity: Decimal = Decimal("0")
    invested_unit_price: Decimal | None = None
    liquidated_unit_price: Decimal | None = None
    income_unit_price: Decimal | None = None
    avg_purchase_unit_price: Decimal | None = None
    income_avg_purchase_unit_price: Decimal | None = None
    asset_patrimony: Decimal = Decimal("0")
    savings_patrimony: Decimal = Decimal("0")
    selic_patrimony: Decimal = Decimal("0")


@dataclass
class PortfolioComparisonPoint:
    period: str
    asset_patrimony: Decimal
    savings_patrimony: Decimal
    selic_patrimony: Decimal = Decimal("0")


@dataclass
class ComparisonMeta:
    savings_advantage: Decimal
    selic_advantage: Decimal
    savings_monthly_rate_pct: float
    selic_monthly_rate_pct: float


@dataclass
class TickerDashboard:
    ticker: str
    company_name: str
    quantity: Decimal
    avg_cost: Decimal
    total_invested: Decimal
    total_liquidated: Decimal
    total_income: Decimal
    current_price: Decimal | None = None
    market_value: Decimal | None = None
    dividends_12m: Decimal = Decimal("0")
    yield_ratio: Decimal | None = None


@dataclass
class PortfolioSummary:
    total_invested: Decimal = Decimal("0")
    total_liquidated: Decimal = Decimal("0")
    total_income: Decimal = Decimal("0")
    tickers: list[TickerDashboard] = field(default_factory=list)
