from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.ids import new_id
from app.domain.enums import MessageStatus, SenderStatus


class Sender(Base):
    __tablename__ = "senders"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("snd")
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone_e164: Mapped[str | None] = mapped_column(String(20), nullable=True)
    evolution_instance: Mapped[str] = mapped_column(
        String(80), nullable=False, unique=True
    )
    api_key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key_prefix: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=SenderStatus.PENDING_PAIR.value
    )
    rate_limit_per_minute: Mapped[int] = mapped_column(
        Integer, nullable=False, default=20
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_connected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    messages: Mapped[list[Message]] = relationship(back_populates="sender")

    __table_args__ = (Index("ix_senders_api_key_prefix", "api_key_prefix"),)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("msg")
    )
    sender_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("senders.id", ondelete="RESTRICT"), nullable=False
    )
    external_id: Mapped[str] = mapped_column(String(200), nullable=False)
    to_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    body: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="normal")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=MessageStatus.QUEUED.value
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    evolution_message_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    queued_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    processing_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    failed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dead_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    sender: Mapped[Sender] = relationship(back_populates="messages")
    events: Mapped[list[DeliveryEvent]] = relationship(
        back_populates="message", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("sender_id", "external_id", name="uq_messages_sender_external"),
        Index("ix_messages_status", "status"),
        Index("ix_messages_sender_status", "sender_id", "status"),
    )


class DeliveryEvent(Base):
    __tablename__ = "delivery_events"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("evt")
    )
    message_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False
    )
    event: Mapped[str] = mapped_column(String(40), nullable=False)
    detail_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    message: Mapped[Message] = relationship(back_populates="events")

    __table_args__ = (Index("ix_delivery_events_message_id", "message_id"),)


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("aud")
    )
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    sender_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    detail_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (Index("ix_admin_audit_sender_id", "sender_id"),)
