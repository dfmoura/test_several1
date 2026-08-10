from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ids import mask_phone
from app.core.logging import get_logger
from app.domain.enums import DeliveryEventType, MessageStatus
from app.domain.exceptions import RateLimitError
from app.models import Message, Sender
from app.queue.topology import QueuePublisher
from app.repositories import DeliveryEventRepository, MessageRepository
from app.schemas import MessageCreate
from app.services.rate_limit import RateLimiter

logger = get_logger(__name__)


class IngestService:
    def __init__(
        self,
        session: AsyncSession,
        publisher: QueuePublisher,
        rate_limiter: RateLimiter | None = None,
    ):
        self.session = session
        self.messages = MessageRepository(session)
        self.events = DeliveryEventRepository(session)
        self.publisher = publisher
        self.rate_limiter = rate_limiter

    async def enqueue(
        self, sender: Sender, payload: MessageCreate
    ) -> tuple[Message, bool]:
        """Returns (message, created). created=False means idempotent replay."""
        existing = await self.messages.get_by_external(
            sender.id, payload.external_id
        )
        if existing:
            await self.events.add(
                existing.id,
                DeliveryEventType.IDEMPOTENT_HIT,
                {"external_id": payload.external_id},
            )
            logger.info(
                "idempotent_hit",
                sender_id=sender.id,
                message_id=existing.id,
                external_id=payload.external_id,
            )
            return existing, False

        if self.rate_limiter:
            allowed = await self.rate_limiter.allow(
                f"sender:{sender.id}:ingest",
                sender.rate_limit_per_minute,
            )
            if not allowed:
                raise RateLimitError(
                    f"Rate limit {sender.rate_limit_per_minute}/min exceeded"
                )

        now = datetime.now(timezone.utc)
        msg = Message(
            sender_id=sender.id,
            external_id=payload.external_id,
            to_phone=payload.to,
            type=payload.type.value,
            body=payload.body,
            metadata_json=payload.metadata,
            priority=payload.priority.value,
            status=MessageStatus.QUEUED.value,
            attempts=0,
            queued_at=now,
        )
        try:
            await self.messages.create(msg)
        except IntegrityError:
            await self.session.rollback()
            existing = await self.messages.get_by_external(
                sender.id, payload.external_id
            )
            if existing:
                return existing, False
            raise

        await self.events.add(
            msg.id,
            DeliveryEventType.QUEUED,
            {
                "to": mask_phone(msg.to_phone),
                "external_id": msg.external_id,
            },
        )

        await self.publisher.publish_send(
            sender.id,
            {
                "message_id": msg.id,
                "sender_id": sender.id,
                "external_id": msg.external_id,
                "to": msg.to_phone,
                "priority": msg.priority,
            },
        )

        logger.info(
            "message_queued",
            sender_id=sender.id,
            message_id=msg.id,
            external_id=msg.external_id,
            to=mask_phone(msg.to_phone),
        )
        return msg, True

    async def get_for_sender(
        self, sender: Sender, message_id: str
    ) -> Message | None:
        msg = await self.messages.get(message_id)
        if msg and msg.sender_id == sender.id:
            return msg
        return None

    async def get_by_external_for_sender(
        self, sender: Sender, external_id: str
    ) -> Message | None:
        return await self.messages.get_by_external(sender.id, external_id)
