from datetime import date
from decimal import Decimal

from app.domain.market_models import DividendEvent
from app.infrastructure.b3_dividend_provider import B3DividendProvider


def test_dedupe_collapses_values_beyond_db_precision() -> None:
    events = [
        DividendEvent(
            ex_date=date(2025, 12, 15),
            approval_date=date(2025, 12, 8),
            corporate_action="DIVIDENDO",
            type_stock="PN",
            value_cash=Decimal("0.04559717225"),
        ),
        DividendEvent(
            ex_date=date(2025, 12, 15),
            approval_date=date(2025, 12, 8),
            corporate_action="DIVIDENDO",
            type_stock="PN",
            value_cash=Decimal("0.04559717224"),
        ),
    ]

    unique = B3DividendProvider._dedupe(events)

    assert len(unique) == 1
    assert unique[0].value_cash == Decimal("0.04559717")
