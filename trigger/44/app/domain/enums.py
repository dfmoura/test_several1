from enum import StrEnum


class AccountStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class SubscriptionStatus(StrEnum):
    NONE = "none"
    PENDING = "pending"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"


class SenderStatus(StrEnum):
    PENDING = "pending"
    PENDING_PAIR = "pending_pair"
    ACTIVE = "active"
    PAUSED = "paused"
    CREDENTIALS_INVALID = "credentials_invalid"
    REBIND_REQUIRED = "rebind_required"
    REVOKED = "revoked"


class WhatsAppProviderKind(StrEnum):
    SANDBOX = "sandbox"
    CLOUD = "cloud"
    BAILEYS = "baileys"


class ChannelKind(StrEnum):
    WHATSAPP_BUSINESS = "whatsapp_business"


class MessageStatus(StrEnum):
    RECEIVED = "received"
    QUEUED = "queued"
    PROCESSING = "processing"
    SENT = "sent"
    FAILED = "failed"
    DEAD = "dead"


class MessageType(StrEnum):
    TEXT = "text"


class MessagePriority(StrEnum):
    NORMAL = "normal"
    HIGH = "high"


class IntakeSource(StrEnum):
    """Origem da intenção de envio. Todas convergem no mesmo pipeline."""

    API = "api"
    PORTAL = "portal"


class DeliveryEventType(StrEnum):
    RECEIVED = "received"
    QUEUED = "queued"
    PROCESSING = "processing"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    PROVIDER_FAILED = "provider_failed"
    RETRY = "retry"
    DEAD = "dead"
    IDEMPOTENT_HIT = "idempotent_hit"


class OnboardingStep(StrEnum):
    BILLING = "billing"
    CONNECT = "connect"
    READY = "ready"
