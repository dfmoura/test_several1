from __future__ import annotations

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict


class DecimalEncoderMixin(BaseModel):
    model_config = ConfigDict(json_encoders={Decimal: lambda v: float(v)})


class ImportResponse(BaseModel):
    batch_id: int
    imported: int
    duplicates: int
    total_movements: int
    tickers: list[str]


class ImportBatchResponse(BaseModel):
    id: int
    filename: str
    imported_at: str
    row_count: int
    duplicate_count: int


class TickerCardResponse(BaseModel):
    ticker: str
    company_name: str
    quantity: float
    avg_cost: float
    total_invested: float
    total_liquidated: float
    total_income: float
    current_price: float | None
    market_value: float | None


class DashboardResponse(BaseModel):
    total_invested: float
    total_liquidated: float
    total_income: float
    net_invested: float
    tickers: list[TickerCardResponse]


class TimelinePointResponse(BaseModel):
    period: str
    invested: float
    liquidated: float
    income: float
    cumulative_invested: float
    cumulative_liquidated: float
    cumulative_income: float
    invested_quantity: float
    liquidated_quantity: float
    income_quantity: float
    position_quantity: float
    invested_unit_price: float | None
    liquidated_unit_price: float | None
    income_unit_price: float | None
    asset_patrimony: float
    savings_patrimony: float
    cdi_patrimony: float


class TickerDetailResponse(BaseModel):
    ticker: str
    timeline: list[TimelinePointResponse]
    comparison_advantage: float
    cdi_advantage: float
    savings_monthly_rate_pct: float
    cdi_monthly_rate_pct: float


class PortfolioComparisonPointResponse(BaseModel):
    period: str
    asset_patrimony: float
    savings_patrimony: float
    cdi_patrimony: float


class PortfolioComparisonResponse(BaseModel):
    timeline: list[PortfolioComparisonPointResponse]
    comparison_advantage: float
    cdi_advantage: float
    savings_monthly_rate_pct: float
    cdi_monthly_rate_pct: float


def decimal_to_float(value: Decimal | None) -> float | None:
    if value is None:
        return None
    return float(value)
