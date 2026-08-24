from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.security import API_KEY_PREFIX, verify_api_key
from app.domain.enums import SenderStatus
from app.domain.exceptions import UnauthorizedError
from app.models import Sender
from app.repositories import SenderRepository, SubscriptionRepository
from app.services.billing import BillingService
from app.services.send_gate import SenderGate

logger = get_logger(__name__)


class SenderAuthService:
    def __init__(self, session: AsyncSession):
        self.repo = SenderRepository(session)
        self.subs = SubscriptionRepository(session)
        self.billing = BillingService(session)

    async def authenticate(self, api_key: str, *, for_send: bool = True) -> Sender:
        if not api_key or not api_key.startswith(API_KEY_PREFIX):
            raise UnauthorizedError("API key inválida")

        display_prefix = api_key[:16] + "…"
        candidates = await self.repo.find_by_prefix(display_prefix)
        if not candidates:
            all_senders = await self.repo.list_all()
            candidates = [
                s for s in all_senders if s.api_key_prefix.startswith(api_key[:12])
            ]

        matched: Sender | None = None
        for sender in candidates:
            if verify_api_key(api_key, sender.api_key_hash):
                matched = sender
                break

        if not matched:
            raise UnauthorizedError("API key inválida")

        if matched.status == SenderStatus.REVOKED.value:
            raise UnauthorizedError("Remetente revogado")

        if for_send:
            await SenderGate(billing=self.billing, subs=self.subs).require_ready(
                matched
            )

        return matched
