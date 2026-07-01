from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from enum import Enum

from app.domain.b3_schema import TREASURY_PRODUCT_PREFIX


TICKER_PATTERN = re.compile(r"^([A-Z]{4}\d{1,2})\s*-")


class MovementKind(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    INCOME = "INCOME"
    BONUS = "BONUS"
    SPLIT = "SPLIT"
    POSITION_SET = "POSITION_SET"
    IGNORE = "IGNORE"


class IncomeType(str, Enum):
    DIVIDEND = "DIVIDEND"
    JCP = "JCP"
    RENDIMENTO = "RENDIMENTO"
    OTHER = "OTHER"


@dataclass(frozen=True)
class Ticker:
    code: str

    @classmethod
    def from_product(cls, product: str | None) -> Ticker | None:
        if not product:
            return None
        product = str(product).strip()
        if product.lower().startswith(TREASURY_PRODUCT_PREFIX):
            return None
        match = TICKER_PATTERN.match(product)
        if not match:
            return None
        return cls(code=match.group(1))


@dataclass(frozen=True)
class Money:
    amount: Decimal

    @classmethod
    def parse_br(cls, value: object) -> Money | None:
        if value is None or value == "-" or value == "":
            return None
        if isinstance(value, (int, float, Decimal)):
            return cls(amount=Decimal(str(value)))
        text = str(value).strip().replace(".", "").replace(",", ".")
        if not text:
            return None
        return cls(amount=Decimal(text))


@dataclass(frozen=True)
class BrazilianDate:
    value: date

    @classmethod
    def parse(cls, value: object) -> BrazilianDate | None:
        if value is None:
            return None
        if isinstance(value, date):
            return cls(value=value)
        text = str(value).strip()
        if not text:
            return None
        parts = text.split("/")
        if len(parts) != 3:
            return None
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
        return cls(value=date(year, month, day))
