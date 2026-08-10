from enum import StrEnum


class SenderStatus(StrEnum):
    PENDING_PAIR = "pending_pair"
    ACTIVE = "active"
    PAUSED = "paused"
    REVOKED = "revoked"
    REBIND_REQUIRED = "rebind_required"


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
    FAILED = "failed"
    RETRY = "retry"
    DEAD = "dead"
    IDEMPOTENT_HIT = "idempotent_hit"
