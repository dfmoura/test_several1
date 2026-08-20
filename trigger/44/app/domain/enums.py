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
    ACTIVE = "active"
    PAUSED = "paused"
    CREDENTIALS_INVALID = "credentials_invalid"
    REVOKED = "revoked"


class WhatsAppProviderKind(StrEnum):
    SANDBOX = "sandbox"
    CLOUD = "cloud"


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
