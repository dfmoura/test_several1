from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class AssetCategory(str, Enum):
    CURRENCY = "currency"
    COMMODITY = "commodity"
    FUTURE = "future"
    CRYPTO = "crypto"
    INDEX = "index"


# Display symbol per quote currency (falls back to the ISO code).
_CURRENCY_SYMBOLS: dict[str, str] = {
    "BRL": "R$",
    "USD": "US$",
    "EUR": "€",
    "GBP": "£",
    "JPY": "¥",
}


class MarketQuote(BaseModel):
    """Normalized quote shared across every market data provider."""

    asset_key: str
    name: str
    category: AssetCategory
    symbol: str
    price: float
    currency: str = "USD"
    change: float | None = None
    change_percent: float | None = None
    previous_close: float | None = None
    as_of: datetime | None = None
    source: str
    delayed: bool = True
    raw: dict = Field(default_factory=dict)

    def money(self) -> str:
        prefix = _CURRENCY_SYMBOLS.get(self.currency.upper())
        value = f"{self.price:,.2f}"
        return f"{prefix} {value}" if prefix else f"{value} {self.currency}"

    def to_prompt_line(self) -> str:
        parts = [f"{self.name}: {self.money()}"]
        if self.change_percent is not None:
            arrow = "▲" if self.change_percent >= 0 else "▼"
            parts.append(f"({arrow} {self.change_percent:+.2f}% no dia)")
        meta = [f"fonte {self.source}"]
        if self.as_of is not None:
            meta.append(self.as_of.strftime("%d/%m %H:%M"))
        parts.append("— " + ", ".join(meta))
        return " ".join(parts)


class MarketQuoteOut(BaseModel):
    """Public API representation of a quote."""

    asset_key: str
    name: str
    category: AssetCategory
    symbol: str
    price: float
    currency: str
    change: float | None = None
    change_percent: float | None = None
    previous_close: float | None = None
    as_of: datetime | None = None
    source: str
    delayed: bool

    model_config = {"from_attributes": True}


class AssetOut(BaseModel):
    """Catalog entry exposed by the API."""

    key: str
    name: str
    category: AssetCategory
    provider: str
    symbol: str
