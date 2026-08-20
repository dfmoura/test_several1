from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.config import get_settings
from app.core.ids import new_id


@dataclass
class CheckoutResult:
    status: str
    provider: str
    external_id: str
    period_end: datetime


class SandboxBillingProvider:
    """Ativa a mensalidade imediatamente — suficiente para o fluxo local."""

    kind = "sandbox"

    async def checkout(self, account_id: str) -> CheckoutResult:
        settings = get_settings()
        now = datetime.now(timezone.utc)
        return CheckoutResult(
            status="active",
            provider="sandbox",
            external_id=new_id("inv"),
            period_end=now + timedelta(days=settings.plan_interval_days),
        )
