from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal


@dataclass
class HistoricalPriceBar:
    trade_date: date
    open_price: Decimal
    high_price: Decimal
    low_price: Decimal
    avg_price: Decimal
    close_price: Decimal


@dataclass
class IntradayPricePoint:
    traded_at: datetime
    price: Decimal


@dataclass
class DividendEvent:
    ex_date: date
    approval_date: date | None
    corporate_action: str
    type_stock: str
    value_cash: Decimal
    closing_price_prior_ex: Decimal | None = None


@dataclass
class CompanyIdentity:
    ticker: str
    company_name: str
    trading_name: str
    type_stock: str | None


@dataclass
class MarketPricePoint:
    timestamp: str
    label: str
    segment: str
    price: Decimal | None = None
    low: Decimal | None = None
    avg: Decimal | None = None
    high: Decimal | None = None


@dataclass
class MarketDividendPoint:
    date: str
    label: str
    unit_value: Decimal
    cumulative_unit_value: Decimal
    corporate_action: str


@dataclass
class MarketTickerRow:
    ticker: str
    company_name: str
    current_price: Decimal | None
    previous_price: Decimal | None
    price_direction: str
    dividends_12m: Decimal
    yield_ratio: Decimal | None
    history_synced_at: datetime | None = None
    intraday_synced_at: datetime | None = None


@dataclass
class MarketTickerDetail:
    ticker: str
    company_name: str
    current_price: Decimal | None
    previous_price: Decimal | None
    price_direction: str
    dividends_12m: Decimal
    yield_ratio: Decimal | None
    dividends_total: Decimal
    historical_low: Decimal | None
    historical_avg: Decimal | None
    historical_high: Decimal | None
    price_series: list[MarketPricePoint] = field(default_factory=list)
    dividend_series: list[MarketDividendPoint] = field(default_factory=list)
