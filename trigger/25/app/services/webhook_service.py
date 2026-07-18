from typing import Any

from app.core.exceptions import WebhookValidationError
from app.core.logging import get_logger
from app.schemas.webhook import (
    EvolutionDataPayload,
    EvolutionWebhookPayload,
    IncomingMessage,
)
from app.utils.phone import is_group_jid, is_status_broadcast, normalize_phone

logger = get_logger(__name__)


class WebhookService:
    """Parse and validate Evolution webhook payloads (no business reply logic)."""

    def parse(self, raw: dict[str, Any]) -> IncomingMessage | None:
        try:
            payload = EvolutionWebhookPayload.model_validate(raw)
        except Exception as exc:
            raise WebhookValidationError(f"Invalid payload: {exc}") from exc

        event = (payload.event or "").lower()
        if event and event not in {
            "messages.upsert",
            "messages_upsert",
            "message",
        }:
            logger.debug("webhook_ignored_event", event_name=event)
            return None

        data = payload.data
        if data is None:
            return None

        if isinstance(data, list):
            if not data:
                return None
            data = data[0]

        if isinstance(data, dict):
            try:
                data_model = EvolutionDataPayload.model_validate(data)
            except Exception:
                logger.warning("webhook_data_parse_failed", data_keys=list(data.keys()))
                return None
        else:
            data_model = data

        key = data_model.key
        if key is None or not key.remoteJid:
            return None

        remote_jid = key.remoteJid
        if is_group_jid(remote_jid) or is_status_broadcast(remote_jid):
            logger.debug("webhook_skip_group_or_status", jid=remote_jid)
            return None

        text = self._extract_text(data_model)
        if text is None:
            return None

        phone = normalize_phone(remote_jid)
        if not phone:
            raise WebhookValidationError("Could not extract phone from remoteJid")

        return IncomingMessage(
            phone=phone,
            name=data_model.pushName,
            text=text,
            message_id=key.id,
            instance=payload.instance,
            from_me=bool(key.fromMe),
        )

    @staticmethod
    def _extract_text(data: EvolutionDataPayload) -> str | None:
        message = data.message
        if message is None:
            return None
        if message.conversation:
            return message.conversation.strip()
        if message.extendedTextMessage:
            text = message.extendedTextMessage.get("text")
            if isinstance(text, str) and text.strip():
                return text.strip()
        return None
