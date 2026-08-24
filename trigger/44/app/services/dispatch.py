from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.ids import mask_phone, truncate_body
from app.core.logging import get_logger
from app.domain.enums import DeliveryEventType, MessageStatus, SenderStatus, WhatsAppProviderKind
from app.domain.exceptions import PermanentSendError, TransientSendError
from app.integrations.whatsapp.factory import build_whatsapp_provider
from app.queue.topology import QueuePublisher
from app.repositories import DeliveryEventRepository, MessageRepository, SenderRepository
from app.services.rate_limit import RateLimiter
from app.services.sender import SenderService

logger = get_logger(__name__)


class DispatchService:
    def __init__(
        self,
        session: AsyncSession,
        publisher: QueuePublisher,
        rate_limiter: RateLimiter,
    ):
        self.session = session
        self.messages = MessageRepository(session)
        self.senders = SenderRepository(session)
        self.events = DeliveryEventRepository(session)
        self.publisher = publisher
        self.rate_limiter = rate_limiter
        self.settings = get_settings()

    async def process_job(self, payload: dict[str, Any]) -> None:
        message_id = payload["message_id"]
        sender_id = payload["sender_id"]

        existing = await self.messages.get(message_id)
        if not existing:
            logger.warning("job_missing_message", message_id=message_id)
            return
        if existing.status in (MessageStatus.SENT.value, MessageStatus.DEAD.value):
            return

        msg = await self.messages.claim(message_id)
        if not msg:
            return

        if msg.sender_id != sender_id:
            await self.messages.mark_dead(msg, "sender_id mismatch — isolation violation")
            await self.events.add(
                msg.id, DeliveryEventType.DEAD, {"reason": "sender_mismatch"}
            )
            await self.session.commit()
            return

        sender = await self.senders.get(sender_id)
        if not sender:
            await self.messages.mark_dead(msg, "sender not found")
            await self.events.add(
                msg.id, DeliveryEventType.DEAD, {"reason": "sender_missing"}
            )
            await self.session.commit()
            return

        await self.events.add(
            msg.id, DeliveryEventType.PROCESSING, {"attempt": msg.attempts}
        )

        try:
            await self._send(sender, msg)
            await self.session.commit()
        except PermanentSendError as exc:
            await self.messages.mark_dead(msg, f"{exc.code}: {exc.message}")
            await self.events.add(
                msg.id,
                DeliveryEventType.DEAD,
                {"code": exc.code, "error": exc.message},
            )
            await self.publisher.publish_dead(
                sender_id,
                {**payload, "error": exc.message, "permanent": True},
            )
            await self.session.commit()
            logger.error(
                "send_dead_permanent",
                message_id=msg.id,
                sender_id=sender_id,
                error=exc.message,
            )
        except TransientSendError as exc:
            await self._handle_retry(sender_id, msg, payload, exc)
        except Exception as exc:
            await self._handle_retry(
                sender_id,
                msg,
                payload,
                TransientSendError("unexpected", str(exc)),
            )

    async def _send(self, sender, msg) -> None:
        if sender.status != SenderStatus.ACTIVE.value:
            raise PermanentSendError(
                "sender_inactive", f"sender status={sender.status}"
            )
        if sender.channel != "whatsapp_business":
            raise PermanentSendError("business_only", "channel is not WhatsApp Business")

        allowed = await self.rate_limiter.allow(
            f"sender:{sender.id}:send",
            sender.rate_limit_per_minute,
        )
        if not allowed:
            raise TransientSendError(
                "rate_limited",
                f"rate limit {sender.rate_limit_per_minute}/min",
            )

        if msg.sender_id != sender.id:
            raise PermanentSendError("isolation", "sender mismatch")

        token = SenderService.decrypt_token(sender)
        provider = build_whatsapp_provider(sender.provider)
        provider_ref = (
            sender.evolution_instance
            if sender.provider == WhatsAppProviderKind.BAILEYS.value
            and sender.evolution_instance
            else sender.phone_number_id
        ) or ""
        try:
            if sender.provider == WhatsAppProviderKind.CLOUD.value:
                healthy = await provider.health(
                    phone_number_id=provider_ref,
                    access_token=token,
                )
                if not healthy:
                    sender.status = SenderStatus.CREDENTIALS_INVALID.value
                    await self.senders.save(sender)
                    raise PermanentSendError(
                        "credentials_invalid",
                        "Cloud API token rejected — update credentials in the portal",
                    )

            logger.info(
                "sending_message",
                message_id=msg.id,
                sender_id=sender.id,
                provider=sender.provider,
                to=mask_phone(msg.to_phone),
                body=truncate_body(msg.body) if self.settings.is_development else None,
            )
            result = await provider.send_text(
                phone_number_id=provider_ref,
                access_token=token,
                to=msg.to_phone,
                body=msg.body,
            )
        finally:
            await provider.close()

        await self.messages.mark_sent(msg, result.provider_message_id)
        await self.events.add(
            msg.id,
            DeliveryEventType.SENT,
            {"provider_message_id": result.provider_message_id},
        )
        logger.info(
            "message_sent",
            message_id=msg.id,
            sender_id=sender.id,
            provider_message_id=result.provider_message_id,
        )

    async def _handle_retry(
        self,
        sender_id: str,
        msg,
        payload: dict[str, Any],
        exc: TransientSendError,
    ) -> None:
        max_attempts = self.settings.max_send_attempts
        await self.messages.mark_failed(msg, f"{exc.code}: {exc.message}")
        await self.events.add(
            msg.id,
            DeliveryEventType.FAILED,
            {"code": exc.code, "error": exc.message, "attempt": msg.attempts},
        )

        if msg.attempts >= max_attempts:
            await self.messages.mark_dead(
                msg, f"max attempts: {exc.code}: {exc.message}"
            )
            await self.events.add(
                msg.id,
                DeliveryEventType.DEAD,
                {"reason": "max_attempts", "error": exc.message},
            )
            await self.publisher.publish_dead(
                sender_id,
                {**payload, "error": exc.message, "attempts": msg.attempts},
            )
            await self.session.commit()
            return

        next_attempt = msg.attempts
        await self.messages.mark_queued(msg)
        await self.events.add(
            msg.id,
            DeliveryEventType.RETRY,
            {"next_attempt": next_attempt + 1},
        )
        await self.publisher.publish_retry(
            sender_id,
            payload,
            attempt=min(next_attempt, len(self.settings.retry_backoff_seconds)),
        )
        await self.session.commit()
        logger.warning(
            "send_retry_scheduled",
            message_id=msg.id,
            attempt=next_attempt,
            error=exc.message,
        )
