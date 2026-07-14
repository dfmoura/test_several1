from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace

from app.application.market_service import MarketService


def test_dividends_12m_sums_only_recent_events() -> None:
    today = date.today()
    dividends = [
        SimpleNamespace(ex_date=today - timedelta(days=10), value_cash=Decimal("1.5")),
        SimpleNamespace(ex_date=today - timedelta(days=200), value_cash=Decimal("0.5")),
        SimpleNamespace(ex_date=today - timedelta(days=400), value_cash=Decimal("9.0")),
    ]
    total = MarketService._dividends_12m(dividends)  # type: ignore[arg-type]
    assert total == Decimal("2.0")
