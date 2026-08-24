from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.ids import mask_phone
from app.core.logging import get_logger
from app.domain.enums import DeliveryEventType, IntakeSource, MessageStatus
from app.domain.exceptions import RateLimitError
from app.models import Message, Sender
from app.queue.jobs import outbound_job
from app.queue.topology import QueuePublisher
from app.repositories import DeliveryEventRepository, MessageRepository
from app.schemas import MessageCreate
from app.services.rate_limit import RateLimiter

logger = get_logger(__name__)


class IngestService:
    """Pipeline único de saída.

    Qualquer origem (API, portal) entrega um destino+texto já amarrado ao
    remetente Zap cadastrado. Persistimos no Postgres e só então publicamos
    em ``q.sender.{sender_id}``. O worker nunca escolhe outro número.
    """

    def __init__(
        self,
        session: AsyncSession,
        publisher: QueuePublisher | None = None,
        rate_limiter: RateLimiter | None = None,
    ):
        self.session = session
        self.messages = MessageRepository(session)
        self.events = DeliveryEventRepository(session)
        self.publisher = publisher
        self.rate_limiter = rate_limiter
        self.settings = get_settings()

    async def enqueue(
        self,
        sender: Sender,
        payload: MessageCreate,
        *,
        source: IntakeSource | str = IntakeSource.API,
    ) -> tuple[Message, bool]:
        source_value = (
            source.value if isinstance(source, IntakeSource) else str(source)
        )
        existing = await self.messages.get_by_external(
            sender.id, payload.external_id
        )
        if existing:
            await self.events.add(
                existing.id,
                DeliveryEventType.IDEMPOTENT_HIT,
                {"external_id": payload.external_id, "source": source_value},
            )
            logger.info(
                "idempotent_hit",
                sender_id=sender.id,
                message_id=existing.id,
                external_id=payload.external_id,
                source=source_value,
            )
            return existing, False

        if self.rate_limiter:
            allowed = await self.rate_limiter.allow(
                f"sender:{sender.id}:ingest",
                sender.rate_limit_per_minute,
            )
            if not allowed:
                raise RateLimitError(
                    f"Limite {sender.rate_limit_per_minute}/min excedido"
                )

        now = datetime.now(timezone.utc)
        meta = dict(payload.metadata or {})
        msg = Message(
            sender_id=sender.id,
            account_id=sender.account_id,
            external_id=payload.external_id,
            to_phone=payload.to,
            type=payload.type.value,
            body=payload.body,
            metadata_json=meta or None,
            source=source_value,
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
            DeliveryEventType.RECEIVED,
            {
                "source": source_value,
                "to": mask_phone(msg.to_phone),
                "external_id": msg.external_id,
            },
        )
        await self.events.add(
            msg.id,
            DeliveryEventType.QUEUED,
            {
                "sender_id": sender.id,
                "queue": f"q.sender.{sender.id}",
            },
        )

        # Commit before broker publish so the worker never acks a job
        # whose row can still roll back at the end of the HTTP request.
        await self._commit()

        job = outbound_job(
            message_id=msg.id,
            sender_id=sender.id,
            account_id=sender.account_id,
            external_id=msg.external_id,
            source=source_value,
            priority=msg.priority,
        )
        await self._publish(sender.id, job)
        logger.info(
            "message_queued",
            sender_id=sender.id,
            message_id=msg.id,
            external_id=msg.external_id,
            source=source_value,
            to=mask_phone(msg.to_phone),
        )
        return msg, True

    async def recover_unpublished(self) -> int:
        """Reinsere na fila do remetente mensagens QUEUED que nunca saíram (publish falhou)."""
        if self.publisher is None:
            return 0
        older = datetime.now(timezone.utc) - timedelta(
            seconds=self.settings.stuck_queued_seconds
        )
        rows = await self.messages.list_unpublished(older_than=older)
        republished = 0
        for msg in rows:
            job = outbound_job(
                message_id=msg.id,
                sender_id=msg.sender_id,
                account_id=msg.account_id,
                external_id=msg.external_id,
                source=msg.source,
                priority=msg.priority,
            )
            await self._publish(msg.sender_id, job)
            republished += 1
        if republished:
            logger.warning("unpublished_jobs_recovered", count=republished)
        return republished

    async def recover_stale_processing(self) -> int:
        """Worker caiu no meio do claim: devolve à fila do mesmo remetente."""
        if self.publisher is None:
            return 0
        older = datetime.now(timezone.utc) - timedelta(
            seconds=self.settings.stuck_processing_seconds
        )
        rows = await self.messages.list_stale_processing(older_than=older)
        recovered = 0
        for msg in rows:
            await self.messages.mark_queued(msg)
            await self.events.add(
                msg.id,
                DeliveryEventType.RETRY,
                {"reason": "stale_processing"},
            )
            job = outbound_job(
                message_id=msg.id,
                sender_id=msg.sender_id,
                account_id=msg.account_id,
                external_id=msg.external_id,
                source=msg.source,
                priority=msg.priority,
            )
            await self._publish(msg.sender_id, job)
            recovered += 1
        if recovered:
            await self._commit()
            logger.warning("stale_processing_recovered", count=recovered)
        return recovered

    async def _commit(self) -> None:
        if self.session is None:
            return
        commit = getattr(self.session, "commit", None)
        if commit is not None:
            await commit()

    async def _publish(self, sender_id: str, job: dict) -> None:
        if self.publisher is None:
            logger.error("ingest_missing_publisher", sender_id=sender_id, job=job)
            return
        try:
            await self.publisher.publish_send(sender_id, job)
        except Exception as exc:
            logger.error(
                "publish_failed_will_recover",
                sender_id=sender_id,
                message_id=job.get("message_id"),
                error=str(exc),
            )

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
