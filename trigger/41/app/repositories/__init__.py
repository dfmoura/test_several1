from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import DeliveryEventType, MessageStatus
from app.models import AdminAuditLog, DeliveryEvent, Message, Sender


class SenderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, sender: Sender) -> Sender:
        self.session.add(sender)
        await self.session.flush()
        return sender

    async def get(self, sender_id: str) -> Sender | None:
        return await self.session.get(Sender, sender_id)

    async def list_all(self) -> list[Sender]:
        result = await self.session.execute(
            select(Sender).order_by(Sender.created_at.desc())
        )
        return list(result.scalars().all())

    async def find_by_prefix(self, prefix: str) -> list[Sender]:
        result = await self.session.execute(
            select(Sender).where(Sender.api_key_prefix == prefix)
        )
        return list(result.scalars().all())

    async def find_by_instance(self, instance: str) -> Sender | None:
        result = await self.session.execute(
            select(Sender).where(Sender.evolution_instance == instance)
        )
        return result.scalar_one_or_none()

    async def save(self, sender: Sender) -> Sender:
        await self.session.flush()
        return sender


class MessageRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, message: Message) -> Message:
        self.session.add(message)
        await self.session.flush()
        return message

    async def get(self, message_id: str) -> Message | None:
        return await self.session.get(Message, message_id)

    async def get_by_external(
        self, sender_id: str, external_id: str
    ) -> Message | None:
        result = await self.session.execute(
            select(Message).where(
                Message.sender_id == sender_id,
                Message.external_id == external_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_status(
        self, status: str | None = None, limit: int = 50
    ) -> list[Message]:
        stmt = select(Message).order_by(Message.created_at.desc()).limit(limit)
        if status:
            stmt = stmt.where(Message.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_status(self) -> dict[str, int]:
        result = await self.session.execute(
            select(Message.status, func.count())
            .group_by(Message.status)
        )
        return {row[0]: row[1] for row in result.all()}

    async def claim(self, message_id: str) -> Message | None:
        msg = await self.get(message_id)
        if not msg:
            return None
        msg.status = MessageStatus.PROCESSING.value
        msg.attempts += 1
        msg.processing_at = datetime.now(timezone.utc)
        msg.last_error = None
        await self.session.flush()
        return msg

    async def mark_sent(self, msg: Message, evolution_message_id: str | None) -> None:
        msg.status = MessageStatus.SENT.value
        msg.evolution_message_id = evolution_message_id
        msg.sent_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def mark_failed(self, msg: Message, error: str) -> None:
        msg.status = MessageStatus.FAILED.value
        msg.last_error = error
        msg.failed_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def mark_dead(self, msg: Message, error: str) -> None:
        msg.status = MessageStatus.DEAD.value
        msg.last_error = error
        msg.dead_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def mark_queued(self, msg: Message) -> None:
        msg.status = MessageStatus.QUEUED.value
        msg.queued_at = datetime.now(timezone.utc)
        await self.session.flush()


class DeliveryEventRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(
        self,
        message_id: str,
        event: DeliveryEventType | str,
        detail: dict[str, Any] | None = None,
    ) -> DeliveryEvent:
        evt = DeliveryEvent(
            message_id=message_id,
            event=event.value if isinstance(event, DeliveryEventType) else event,
            detail_json=detail,
        )
        self.session.add(evt)
        await self.session.flush()
        return evt


class AuditRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def log(
        self,
        action: str,
        sender_id: str | None = None,
        detail: dict[str, Any] | None = None,
    ) -> AdminAuditLog:
        row = AdminAuditLog(
            action=action, sender_id=sender_id, detail_json=detail
        )
        self.session.add(row)
        await self.session.flush()
        return row
