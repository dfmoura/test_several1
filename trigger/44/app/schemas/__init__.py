from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.ids import validate_phone_e164
from app.domain.enums import MessagePriority, MessageType


class RegisterIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    account_id: str
    name: str
    email: str


class AccountOut(BaseModel):
    id: str
    name: str
    email: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionOut(BaseModel):
    id: str | None = None
    status: str
    plan_code: str | None = None
    plan_name: str | None = None
    price_label: str | None = None
    provider: str | None = None
    current_period_end: datetime | None = None


class CheckoutOut(BaseModel):
    status: str
    subscription: SubscriptionOut
    detail: str


class SenderConnectIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str
    business_confirmed: bool = False
    phone_number_id: str | None = Field(default=None, max_length=80)
    waba_id: str | None = Field(default=None, max_length=80)
    access_token: str | None = Field(default=None, max_length=4000)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone_e164(v)


class SenderOut(BaseModel):
    id: str
    name: str
    phone_e164: str
    channel: str
    provider: str
    phone_number_id: str | None
    waba_id: str | None
    api_key_prefix: str
    status: str
    rate_limit_per_minute: int
    last_healthy_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SenderCreated(SenderOut):
    api_key: str = Field(..., description="Exibida uma única vez")


class MessagePortalCreate(BaseModel):
    to: str
    body: str = Field(..., min_length=1, max_length=4096)
    external_id: str | None = Field(default=None, max_length=200)

    @field_validator("to")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone_e164(v)


class MessageCreate(BaseModel):
    external_id: str = Field(..., min_length=1, max_length=200)
    to: str
    type: MessageType = MessageType.TEXT
    body: str = Field(..., min_length=1, max_length=4096)
    metadata: dict[str, Any] | None = None
    priority: MessagePriority = MessagePriority.NORMAL

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
    provider_message_id: str | None = None
    created_at: datetime
    queued_at: datetime | None = None
    processing_at: datetime | None = None
    sent_at: datetime | None = None
    failed_at: datetime | None = None
    dead_at: datetime | None = None
    metadata: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class ApiDocsOut(BaseModel):
    method: str
    url: str
    headers: dict[str, str]
    body: dict[str, Any]
    curl: str
    notes: list[str]


class MeOut(BaseModel):
    account: AccountOut
    subscription: SubscriptionOut
    sender: SenderOut | None
    onboarding_step: str
    ready_to_send: bool
    api_docs: ApiDocsOut | None = None


class HealthOut(BaseModel):
    status: str
    service: str


class ReadyOut(BaseModel):
    status: str
    checks: dict[str, str]


class ErrorOut(BaseModel):
    code: str
    message: str
