from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.core.ids import validate_phone_e164
from app.domain.enums import MessagePriority, MessageType, SenderStatus


class MessageCreate(BaseModel):
    external_id: str = Field(..., min_length=1, max_length=200)
    to: str
    type: MessageType = MessageType.TEXT
    body: str = Field(..., min_length=1, max_length=4096)
    metadata: dict[str, Any] | None = None
    priority: MessagePriority = MessagePriority.NORMAL
    schedule_at: datetime | None = None

    @field_validator("to")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone_e164(v)

    @field_validator("type")
    @classmethod
    def only_text(cls, v: MessageType) -> MessageType:
        if v != MessageType.TEXT:
            raise ValueError("only type=text is supported in v1")
        return v

    @field_validator("schedule_at")
    @classmethod
    def no_schedule(cls, v: datetime | None) -> datetime | None:
        if v is not None:
            raise ValueError("schedule_at is not supported in v1")
        return v


class MessageOut(BaseModel):
    id: str
    external_id: str
    status: str
    sender_id: str
    to: str | None = None
    type: str | None = None
    body: str | None = None
    attempts: int | None = None
    last_error: str | None = None
    evolution_message_id: str | None = None
    created_at: datetime
    queued_at: datetime | None = None
    processing_at: datetime | None = None
    sent_at: datetime | None = None
    failed_at: datetime | None = None
    dead_at: datetime | None = None
    metadata: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class SenderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    rate_limit_per_minute: int | None = Field(default=None, ge=1, le=120)


class SenderOut(BaseModel):
    id: str
    name: str
    phone_e164: str | None
    evolution_instance: str
    api_key_prefix: str
    status: SenderStatus | str
    rate_limit_per_minute: int
    created_at: datetime
    updated_at: datetime
    last_connected_at: datetime | None

    model_config = {"from_attributes": True}


class SenderCreated(SenderOut):
    api_key: str = Field(..., description="Shown once — store in a vault")


class PairResponse(BaseModel):
    sender_id: str
    status: str
    qrcode_base64: str | None = None
    pairing_code: str | None = None
    instance: str
    detail: str | None = None


class QueueStats(BaseModel):
    senders: list[dict[str, Any]]
    total_queued: int = 0
    total_processing: int = 0
    total_failed: int = 0
    total_dead: int = 0


class HealthOut(BaseModel):
    status: str
    service: str


class ReadyOut(BaseModel):
    status: str
    checks: dict[str, str]


class ErrorOut(BaseModel):
    code: str
    message: str
