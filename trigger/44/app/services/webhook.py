from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domain.enums import DeliveryEventType, MessageStatus
from app.repositories import DeliveryEventRepository, MessageRepository

logger = get_logger(__name__)

_STATUS_EVENT: dict[str, DeliveryEventType] = {
    "sent": DeliveryEventType.SENT,
    "delivered": DeliveryEventType.DELIVERED,
    "read": DeliveryEventType.READ,
    "failed": DeliveryEventType.PROVIDER_FAILED,
}


class WhatsAppWebhookService:
    """Processa status de entrega da Meta Cloud API (webhook)."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.messages = MessageRepository(session)
        self.events = DeliveryEventRepository(session)

    async def process_meta_payload(self, payload: dict[str, Any]) -> int:
        if payload.get("object") != "whatsapp_business_account":
            return 0

        processed = 0
        for entry in payload.get("entry") or []:
            if not isinstance(entry, dict):
                continue
            for change in entry.get("changes") or []:
                if not isinstance(change, dict):
                    continue
                value = change.get("value") or {}
                if not isinstance(value, dict):
                    continue
                for status in value.get("statuses") or []:
                    if isinstance(status, dict):
                        await self._handle_status(status)
                        processed += 1
        return processed

    async def _handle_status(self, status: dict[str, Any]) -> None:
        provider_id = status.get("id")
        state = str(status.get("status") or "").lower()
        if not provider_id or not state:
            return

        msg = await self.messages.find_by_provider_message_id(str(provider_id))
        if not msg:
            logger.debug("webhook_message_not_found", provider_message_id=provider_id)
            return

        event_type = _STATUS_EVENT.get(state)
        if not event_type:
            logger.debug("webhook_status_ignored", status=state, message_id=msg.id)
            return

        detail: dict[str, Any] = {
            "provider_status": state,
            "timestamp": status.get("timestamp"),
            "recipient_id": status.get("recipient_id"),
        }
        if status.get("errors"):
            detail["errors"] = status["errors"]

        await self.events.add(msg.id, event_type, detail)

        if state == "failed":
            errors = status.get("errors") or []
            err_txt = "; ".join(
                str(e.get("title") or e.get("message") or e) for e in errors
            ) or "provider reported failed"
            await self.messages.mark_failed(msg, f"provider_failed: {err_txt}")
        elif state in ("delivered", "read") and msg.status == MessageStatus.SENT.value:
            # Mantém status sent; o histórico de entrega fica nos eventos.
            pass

        logger.info(
            "webhook_status_applied",
            message_id=msg.id,
            provider_message_id=provider_id,
            status=state,
        )
