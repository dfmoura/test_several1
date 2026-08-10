from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.security import generate_api_key, verify_api_key
from app.domain.enums import SenderStatus
from app.domain.exceptions import ForbiddenError, UnauthorizedError
from app.models import Sender
from app.repositories import SenderRepository

logger = get_logger(__name__)


class SenderAuthService:
    def __init__(self, session: AsyncSession):
        self.repo = SenderRepository(session)

    async def authenticate(
        self, api_key: str, *, for_send: bool = True
    ) -> Sender:
        if not api_key or not api_key.startswith("zpg_live_"):
            raise UnauthorizedError("Invalid API key")

        # Exact prefix stored at creation is first 16 chars + …
        # Lookup candidates: we store display prefix; also try shorter match.
        display_prefix = api_key[:16] + "…"
        candidates = await self.repo.find_by_prefix(display_prefix)
        if not candidates:
            # Fallback: scan all prefixes starting with first 12 chars (rare)
            all_senders = await self.repo.list_all()
            candidates = [
                s
                for s in all_senders
                if s.api_key_prefix.startswith(api_key[:12])
            ]

        matched: Sender | None = None
        for sender in candidates:
            if verify_api_key(api_key, sender.api_key_hash):
                matched = sender
                break

        if not matched:
            raise UnauthorizedError("Invalid API key")

        if matched.status == SenderStatus.REVOKED.value:
            raise UnauthorizedError("Sender revoked")

        if for_send:
            if matched.status == SenderStatus.PAUSED.value:
                raise ForbiddenError("sender_paused", "Sender is paused")
            if matched.status == SenderStatus.REBIND_REQUIRED.value:
                raise ForbiddenError(
                    "rebind_required",
                    "Sender requires device rebind; retry after pairing",
                )
            if matched.status == SenderStatus.PENDING_PAIR.value:
                raise ForbiddenError(
                    "not_paired",
                    "Sender is not paired yet; complete QR pairing first",
                )
            if matched.status != SenderStatus.ACTIVE.value:
                raise ForbiddenError(
                    "sender_inactive",
                    f"Sender status is {matched.status}",
                )

        return matched

    @staticmethod
    def mint_key() -> tuple[str, str, str]:
        return generate_api_key()
