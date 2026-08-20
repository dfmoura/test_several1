from __future__ import annotations

import pytest

from app.domain.enums import MessageStatus
from app.schemas import MessageCreate
from app.services.ingest import IngestService


class FakeMsg:
    def __init__(self, **kw):
        self.id = kw.get("id", "msg_1")
        self.sender_id = kw.get("sender_id", "snd_1")
        self.account_id = "acc_1"
        self.external_id = kw.get("external_id", "pedido-1")
        self.to_phone = "5534988888888"
        self.type = "text"
        self.body = "oi"
        self.metadata_json = None
        self.priority = "normal"
        self.status = MessageStatus.QUEUED.value
        self.attempts = 0
        self.last_error = None
        self.provider_message_id = None
        self.queued_at = None
        self.processing_at = None
        self.sent_at = None
        self.failed_at = None
        self.dead_at = None
        self.created_at = None


class FakeSender:
    id = "snd_1"
    account_id = "acc_1"
    rate_limit_per_minute = 30


class FakePublisher:
    def __init__(self):
        self.payloads = []

    async def publish_send(self, sender_id, payload):
        self.payloads.append((sender_id, payload))


class FakeEvents:
    async def add(self, *a, **k):
        return None


@pytest.mark.asyncio
async def test_ingest_idempotent():
    existing = FakeMsg()

    class Messages:
        async def get_by_external(self, sender_id, external_id):
            return existing

        async def create(self, msg):
            raise AssertionError("should not create")

    pub = FakePublisher()
    svc = IngestService.__new__(IngestService)
    svc.session = None
    svc.messages = Messages()
    svc.events = FakeEvents()
    svc.publisher = pub
    svc.rate_limiter = None

    payload = MessageCreate(
        external_id="pedido-1", to="5534988888888", type="text", body="oi"
    )
    msg, created = await svc.enqueue(FakeSender(), payload)
    assert created is False
    assert msg is existing
    assert pub.payloads == []
