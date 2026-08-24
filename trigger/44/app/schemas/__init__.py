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
    label: str | None = Field(
        default=None,
        max_length=80,
        description="Rótulo interno (ex.: nome do sistema/cliente consumidor)",
    )
    sender_id: str | None = Field(
        default=None,
        max_length=40,
        description="Atualiza este remetente; omita para criar ou resolver pelo telefone",
    )
    as_new: bool = Field(
        default=False,
        description="Força criação de um novo remetente (multi-número na mesma conta)",
    )

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone_e164(v)


class SenderPairIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    business_confirmed: bool = False
    label: str | None = Field(
        default=None,
        max_length=80,
        description="Rótulo interno (ex.: nome do sistema/cliente consumidor)",
    )
    sender_id: str | None = Field(
        default=None,
        max_length=40,
        description="Renova o QR deste remetente; omita com 0/1 remetente ou use as_new",
    )
    as_new: bool = Field(
        default=False,
        description="Cadastra um novo número (novo remetente + fila + API key)",
    )


class SenderOut(BaseModel):
    id: str
    name: str
    label: str | None = None
    phone_e164: str | None = None
    channel: str
    provider: str
    phone_number_id: str | None
    waba_id: str | None
    evolution_instance: str | None = None
    api_key_prefix: str
    status: str
    rate_limit_per_minute: int
    last_healthy_at: datetime | None
    last_connected_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SenderCreated(SenderOut):
    api_key: str = Field(..., description="Exibida uma única vez")


class PairOut(BaseModel):
    sender: SenderOut
    qrcode_base64: str | None = None
    instance: str | None = None
    detail: str
    api_key: str | None = Field(
        default=None,
        description="Presente só na primeira criação do remetente",
    )


class MessagePortalCreate(BaseModel):
    to: str
    body: str = Field(..., min_length=1, max_length=4096)
    external_id: str | None = Field(default=None, max_length=200)
    sender_id: str | None = Field(
        default=None,
        max_length=40,
        description="Remetente da conta; padrão = o mais recente ativo",
    )

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
    source: str | None = None
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

    @classmethod
    def from_message(cls, msg: Any) -> MessageOut:
        return cls(
            id=msg.id,
            external_id=msg.external_id,
            status=msg.status,
            sender_id=msg.sender_id,
            to=msg.to_phone,
            type=msg.type,
            body=msg.body,
            source=getattr(msg, "source", None),
            attempts=msg.attempts,
            last_error=msg.last_error,
            provider_message_id=msg.provider_message_id,
            created_at=msg.created_at,
            queued_at=msg.queued_at,
            processing_at=msg.processing_at,
            sent_at=msg.sent_at,
            failed_at=msg.failed_at,
            dead_at=msg.dead_at,
            metadata=msg.metadata_json,
        )


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
    senders: list[SenderOut] = Field(default_factory=list)
    onboarding_step: str
    ready_to_send: bool
    pairing_enabled: bool = False
    deployment_mode: str = "saas"
    registration_mode: str = "open"
    billing_auto_activate: bool = False
    api_docs: ApiDocsOut | None = None
    selected_sender_id: str | None = None


class PublicMetaOut(BaseModel):
    app: str
    deployment_mode: str
    registration_mode: str
    registration_open: bool
    pairing_enabled: bool
    billing_auto_activate: bool


class HealthOut(BaseModel):
    status: str
    service: str


class ReadyOut(BaseModel):
    status: str
    checks: dict[str, str]


class ErrorOut(BaseModel):
    code: str
    message: str
