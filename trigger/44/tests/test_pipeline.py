from __future__ import annotations

import pytest

from app.domain.enums import IntakeSource, MessageStatus, SenderStatus
from app.domain.exceptions import ForbiddenError, TransientSendError
from app.integrations.whatsapp.base import SendResult
from app.queue.jobs import outbound_job
from app.schemas import MessageCreate
from app.services.dispatch import DispatchService
from app.services.ingest import IngestService
from app.services.send_gate import SenderGate


class FakeMsg:
    def __init__(self, **kw):
        self.id = kw.get("id", "msg_1")
        self.sender_id = kw.get("sender_id", "snd_1")
        self.account_id = kw.get("account_id", "acc_1")
        self.external_id = kw.get("external_id", "pedido-1")
        self.to_phone = kw.get("to_phone", "5534988888888")
        self.type = "text"
        self.body = kw.get("body", "oi")
        self.metadata_json = None
        self.source = kw.get("source", "api")
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
    def __init__(self, **kw):
        self.id = kw.get("id", "snd_1")
        self.account_id = kw.get("account_id", "acc_1")
        self.rate_limit_per_minute = 30
        self.status = kw.get("status", SenderStatus.ACTIVE.value)
        self.channel = kw.get("channel", "whatsapp_business")
        self.provider = kw.get("provider", "sandbox")
        self.phone_number_id = "sandbox_5534999999999"
        self.evolution_instance = None
        self.access_token_encrypted = None


class FakePublisher:
    def __init__(self):
        self.payloads = []

    async def publish_send(self, sender_id, payload):
        self.payloads.append((sender_id, payload))

    async def publish_dead(self, *a, **k):
        return None

    async def publish_retry(self, *a, **k):
        self.payloads.append(("retry", a, k))


class FakeEvents:
    def __init__(self):
        self.events = []

    async def add(self, message_id, event, detail=None):
        self.events.append((message_id, event, detail))


def _ingest(messages, publisher, events=None):
    svc = IngestService.__new__(IngestService)
    svc.session = None
    svc.messages = messages
    svc.events = events or FakeEvents()
    svc.publisher = publisher
    svc.rate_limiter = None

    class Settings:
        stuck_queued_seconds = 20
        stuck_processing_seconds = 180

    svc.settings = Settings()
    return svc


@pytest.mark.asyncio
async def test_api_and_portal_bind_to_same_sender_queue():
    created = []

    class Messages:
        async def get_by_external(self, sender_id, external_id):
            return None

        async def create(self, msg):
            msg.id = f"msg_{len(created)+1}"
            created.append(msg)
            return msg

    pub = FakePublisher()
    svc = _ingest(Messages(), pub)
    sender = FakeSender()
    payload = MessageCreate(
        external_id="pedido-api", to="5534988888888", type="text", body="api"
    )
    msg, created_flag = await svc.enqueue(sender, payload, source=IntakeSource.API)
    assert created_flag is True
    assert msg.sender_id == sender.id
    assert msg.source == IntakeSource.API.value

    payload2 = MessageCreate(
        external_id="pedido-portal", to="5534988888888", type="text", body="portal"
    )
    msg2, _ = await svc.enqueue(sender, payload2, source=IntakeSource.PORTAL)
    assert msg2.source == IntakeSource.PORTAL.value

    assert len(pub.payloads) == 2
    for sender_id, job in pub.payloads:
        assert sender_id == sender.id
        assert job["sender_id"] == sender.id
        assert "to" not in job
        assert job["account_id"] == sender.account_id


@pytest.mark.asyncio
async def test_job_envelope_never_carries_destination():
    job = outbound_job(
        message_id="msg_1",
        sender_id="snd_1",
        account_id="acc_1",
        external_id="pedido-1",
        source="portal",
    )
    assert job["sender_id"] == "snd_1"
    assert "to" not in job
    assert "body" not in job


@pytest.mark.asyncio
async def test_gate_rejects_unready_sender():
    class Billing:
        def is_active(self, sub):
            return True

    class Subs:
        async def get_for_account(self, _id):
            return object()

    gate = SenderGate(billing=Billing(), subs=Subs())
    paused = FakeSender(status=SenderStatus.PAUSED.value)
    with pytest.raises(ForbiddenError) as ei:
        await gate.require_ready(paused)
    assert ei.value.code == "sender_paused"

    with pytest.raises(ForbiddenError) as ei2:
        await gate.require_ready(None)
    assert ei2.value.code == "not_ready"


@pytest.mark.asyncio
async def test_dispatch_sends_db_destination_not_payload_to(monkeypatch):
    msg = FakeMsg()
    sender = FakeSender()
    sent = {}

    class Provider:
        async def health(self, **k):
            return True

        async def send_text(self, **k):
            sent.update(k)
            return SendResult("wamid.ok")

        async def close(self):
            return None

    monkeypatch.setattr(
        "app.services.dispatch.build_whatsapp_provider", lambda kind: Provider()
    )

    class Messages:
        async def get(self, _id):
            return msg

        async def claim(self, _id):
            msg.status = MessageStatus.PROCESSING.value
            msg.attempts += 1
            return msg

        async def mark_sent(self, m, pid):
            m.status = MessageStatus.SENT.value
            m.provider_message_id = pid

        async def mark_dead(self, m, err):
            m.status = MessageStatus.DEAD.value
            m.last_error = err

        async def mark_failed(self, m, err):
            m.status = MessageStatus.FAILED.value
            m.last_error = err

        async def mark_queued(self, m):
            m.status = MessageStatus.QUEUED.value

    class Senders:
        async def get(self, _id):
            return sender

        async def save(self, s):
            return s

    class Session:
        async def commit(self):
            return None

    svc = DispatchService.__new__(DispatchService)
    svc.session = Session()
    svc.messages = Messages()
    svc.senders = Senders()
    svc.events = FakeEvents()
    svc.publisher = FakePublisher()

    class Limiter:
        async def allow(self, *a, **k):
            return True

    svc.rate_limiter = Limiter()

    class Settings:
        is_development = True
        max_send_attempts = 5
        retry_backoff_seconds = (15,)

    svc.settings = Settings()

    await svc.process_job(
        {
            "message_id": "msg_1",
            "sender_id": "snd_1",
            "to": "0000000000000",
        }
    )
    assert msg.status == MessageStatus.SENT.value
    assert sent["to"] == "5534988888888"


@pytest.mark.asyncio
async def test_baileys_disconnect_retries_instead_of_killing_sender(monkeypatch):
    msg = FakeMsg()
    sender = FakeSender(provider="baileys")
    sender.evolution_instance = "snd_1_inst"
    sender.phone_number_id = "snd_1_inst"

    class Provider:
        async def health(self, **k):
            return False

        async def send_text(self, **k):
            raise TransientSendError("not_connected", "state=close")

        async def close(self):
            return None

    monkeypatch.setattr(
        "app.services.dispatch.build_whatsapp_provider", lambda kind: Provider()
    )

    class Messages:
        async def get(self, _id):
            return msg

        async def claim(self, _id):
            msg.status = MessageStatus.PROCESSING.value
            msg.attempts += 1
            return msg

        async def mark_sent(self, m, pid):
            m.status = MessageStatus.SENT.value

        async def mark_dead(self, m, err):
            m.status = MessageStatus.DEAD.value
            m.last_error = err

        async def mark_failed(self, m, err):
            m.status = MessageStatus.FAILED.value
            m.last_error = err

        async def mark_queued(self, m):
            m.status = MessageStatus.QUEUED.value

    class Senders:
        async def get(self, _id):
            return sender

        async def save(self, s):
            return s

    class Session:
        async def commit(self):
            return None

    svc = DispatchService.__new__(DispatchService)
    svc.session = Session()
    svc.messages = Messages()
    svc.senders = Senders()
    svc.events = FakeEvents()
    svc.publisher = FakePublisher()

    class Limiter:
        async def allow(self, *a, **k):
            return True

    svc.rate_limiter = Limiter()

    class Settings:
        is_development = True
        max_send_attempts = 5
        retry_backoff_seconds = (15, 45)

    svc.settings = Settings()
    await svc.process_job({"message_id": "msg_1", "sender_id": "snd_1"})
    assert msg.status == MessageStatus.QUEUED.value
    assert sender.status == SenderStatus.ACTIVE.value
    assert msg.status != MessageStatus.DEAD.value
