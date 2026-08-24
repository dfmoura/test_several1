from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
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
from app.domain.enums import (
    AccountStatus,
    ChannelKind,
    MessageStatus,
    SenderStatus,
    SubscriptionStatus,
    WhatsAppProviderKind,
)


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("acc")
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=AccountStatus.ACTIVE.value
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

    subscription: Mapped[Subscription | None] = relationship(
        back_populates="account", uselist=False
    )
    senders: Mapped[list[Sender]] = relationship(back_populates="account")

    __table_args__ = (Index("ix_accounts_email", "email"),)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("sub")
    )
    account_id: Mapped[str] = mapped_column(
        String(40),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    plan_code: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=SubscriptionStatus.PENDING.value
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="sandbox")
    external_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(
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

    account: Mapped[Account] = relationship(back_populates="subscription")


class Sender(Base):
    __tablename__ = "senders"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("snd")
    )
    account_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    phone_e164: Mapped[str | None] = mapped_column(String(20), nullable=True)
    channel: Mapped[str] = mapped_column(
        String(40), nullable=False, default=ChannelKind.WHATSAPP_BUSINESS.value
    )
    provider: Mapped[str] = mapped_column(
        String(20), nullable=False, default=WhatsAppProviderKind.SANDBOX.value
    )
    phone_number_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    waba_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    access_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    evolution_instance: Mapped[str | None] = mapped_column(String(80), nullable=True)
    api_key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key_prefix: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=SenderStatus.PENDING.value
    )
    rate_limit_per_minute: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30
    )
    business_confirmed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    last_healthy_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_connected_at: Mapped[datetime | None] = mapped_column(
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

    account: Mapped[Account] = relationship(back_populates="senders")
    messages: Mapped[list[Message]] = relationship(back_populates="sender")

    __table_args__ = (
        Index("ix_senders_api_key_prefix", "api_key_prefix"),
        Index("ix_senders_account_id", "account_id"),
        Index("ix_senders_evolution_instance", "evolution_instance"),
        Index("ix_senders_account_label", "account_id", "label"),
        UniqueConstraint("account_id", "phone_e164", name="uq_senders_account_phone"),
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("msg")
    )
    sender_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("senders.id", ondelete="RESTRICT"), nullable=False
    )
    account_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False
    )
    external_id: Mapped[str] = mapped_column(String(200), nullable=False)
    to_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")
    body: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="api")
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="normal")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=MessageStatus.QUEUED.value
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_message_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
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
        Index("ix_messages_account_id", "account_id"),
        Index("ix_messages_queued_recovery", "status", "attempts", "queued_at"),
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


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: new_id("aud")
    )
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    account_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    sender_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    detail_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_audit_account_id", "account_id"),
        Index("ix_audit_sender_id", "sender_id"),
    )
