from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import DeliveryEventType, MessageStatus

_TERMINAL_MESSAGE_STATUSES = (
    MessageStatus.SENT.value,
    MessageStatus.FAILED.value,
    MessageStatus.DEAD.value,
)
from app.models import (
    Account,
    AuditLog,
    DeliveryEvent,
    Message,
    Sender,
    Subscription,
)


class AccountRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, account: Account) -> Account:
        self.session.add(account)
        await self.session.flush()
        return account

    async def get(self, account_id: str) -> Account | None:
        return await self.session.get(Account, account_id)

    async def find_by_email(self, email: str) -> Account | None:
        result = await self.session.execute(
            select(Account).where(Account.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def count(self) -> int:
        result = await self.session.execute(select(func.count()).select_from(Account))
        return int(result.scalar_one() or 0)

    async def save(self, account: Account) -> Account:
        await self.session.flush()
        return account


class SubscriptionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_for_account(self, account_id: str) -> Subscription | None:
        result = await self.session.execute(
            select(Subscription).where(Subscription.account_id == account_id)
        )
        return result.scalar_one_or_none()

    async def create(self, sub: Subscription) -> Subscription:
        self.session.add(sub)
        await self.session.flush()
        return sub

    async def save(self, sub: Subscription) -> Subscription:
        await self.session.flush()
        return sub


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

    async def list_for_account(self, account_id: str) -> list[Sender]:
        result = await self.session.execute(
            select(Sender)
            .where(Sender.account_id == account_id)
            .order_by(Sender.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_primary_for_account(self, account_id: str) -> Sender | None:
        """Most recently created sender (compat + default selection)."""
        result = await self.session.execute(
            select(Sender)
            .where(Sender.account_id == account_id)
            .order_by(Sender.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_for_account(
        self, account_id: str, sender_id: str
    ) -> Sender | None:
        result = await self.session.execute(
            select(Sender).where(
                Sender.id == sender_id,
                Sender.account_id == account_id,
            )
        )
        return result.scalar_one_or_none()

    async def find_by_account_phone(
        self, account_id: str, phone_e164: str
    ) -> Sender | None:
        result = await self.session.execute(
            select(Sender).where(
                Sender.account_id == account_id,
                Sender.phone_e164 == phone_e164,
            )
        )
        return result.scalar_one_or_none()

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

    async def find_by_provider_message_id(
        self, provider_message_id: str
    ) -> Message | None:
        result = await self.session.execute(
            select(Message).where(
                Message.provider_message_id == provider_message_id
            )
        )
        return result.scalar_one_or_none()

    async def list_for_account(
        self, account_id: str, limit: int = 50
    ) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.account_id == account_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_for_sender(
        self, sender_id: str, limit: int = 50
    ) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.sender_id == sender_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_status(self, account_id: str | None = None) -> dict[str, int]:
        stmt = select(Message.status, func.count()).group_by(Message.status)
        if account_id:
            stmt = stmt.where(Message.account_id == account_id)
        result = await self.session.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    async def list_unpublished(
        self, older_than: datetime, limit: int = 100
    ) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(
                Message.status == MessageStatus.QUEUED.value,
                Message.queued_at.is_not(None),
                Message.queued_at <= older_than,
                or_(
                    Message.attempts == 0,
                    Message.last_error.is_(None),
                ),
            )
            .order_by(Message.queued_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_stale_processing(
        self, older_than: datetime, limit: int = 50
    ) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(
                Message.status == MessageStatus.PROCESSING.value,
                Message.processing_at.is_not(None),
                Message.processing_at <= older_than,
            )
            .order_by(Message.processing_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def claim(self, message_id: str) -> Message | None:
        result = await self.session.execute(
            select(Message)
            .where(
                Message.id == message_id,
                Message.status == MessageStatus.QUEUED.value,
            )
            .with_for_update(skip_locked=True)
        )
        msg = result.scalar_one_or_none()
        if not msg:
            return None
        msg.status = MessageStatus.PROCESSING.value
        msg.attempts += 1
        msg.processing_at = datetime.now(timezone.utc)
        msg.last_error = None
        await self.session.flush()
        return msg

    async def mark_sent(self, msg: Message, provider_message_id: str | None) -> None:
        msg.status = MessageStatus.SENT.value
        msg.provider_message_id = provider_message_id
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

    async def purge_older_than(
        self, cutoff: datetime, *, limit: int = 500
    ) -> int:
        """Remove mensagens terminais antigas (delivery_events em CASCADE)."""
        result = await self.session.execute(
            select(Message.id)
            .where(
                Message.created_at < cutoff,
                Message.status.in_(_TERMINAL_MESSAGE_STATUSES),
            )
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        ids = list(result.scalars().all())
        if not ids:
            return 0
        await self.session.execute(delete(Message).where(Message.id.in_(ids)))
        await self.session.flush()
        return len(ids)


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
        account_id: str | None = None,
        sender_id: str | None = None,
        detail: dict[str, Any] | None = None,
    ) -> AuditLog:
        row = AuditLog(
            action=action,
            account_id=account_id,
            sender_id=sender_id,
            detail_json=detail,
        )
        self.session.add(row)
        await self.session.flush()
        return row
