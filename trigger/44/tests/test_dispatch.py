from __future__ import annotations

import pytest
from app.domain.enums import MessageStatus, SenderStatus
from app.domain.exceptions import ForbiddenError
from app.integrations.whatsapp.sandbox import SandboxWhatsAppProvider
from app.services.dispatch import DispatchService
from app.services.sender import SenderService


@pytest.mark.asyncio
async def test_sandbox_activates_and_sends():
    provider = SandboxWhatsAppProvider()
    profile = await provider.verify_and_activate(
        phone_e164="5534999999999",
        phone_number_id=None,
        waba_id=None,
        access_token=None,
    )
    assert profile.phone_e164 == "5534999999999"
    assert await provider.health(phone_number_id=profile.phone_number_id, access_token=None)
    result = await provider.send_text(
        phone_number_id=profile.phone_number_id,
        access_token=None,
        to="5534988888888",
        body="Olá",
    )
    assert result.provider_message_id
    await provider.close()


@pytest.mark.asyncio
async def test_connect_requires_business_flag():
    svc = SenderService.__new__(SenderService)

    class Billing:
        async def require_active(self, _id):
            return True

    svc.billing = Billing()
    svc.session = None
    svc.senders = None
    svc.audit = None
    svc.publisher = None

    class Account:
        id = "acc_1"

    with pytest.raises(ForbiddenError) as ei:
        await svc.connect(
            Account(),
            name="x",
            phone="5534999999999",
            business_confirmed=False,
            phone_number_id=None,
            waba_id=None,
            access_token=None,
        )
    assert ei.value.code == "business_only"


class FakeMsg:
    def __init__(self):
        self.id = "msg_1"
        self.sender_id = "snd_1"
        self.account_id = "acc_1"
        self.to_phone = "5534988888888"
        self.body = "oi"
        self.status = MessageStatus.QUEUED.value
        self.attempts = 0
        self.last_error = None
        self.provider_message_id = None


class FakeSender:
    def __init__(self):
        self.id = "snd_1"
        self.status = SenderStatus.ACTIVE.value
        self.channel = "whatsapp_business"
        self.provider = "sandbox"
        self.phone_number_id = "sandbox_5534999999999"
        self.access_token_encrypted = None
        self.rate_limit_per_minute = 30


class FakePublisher:
    async def publish_dead(self, *a, **k):
        return None

    async def publish_retry(self, *a, **k):
        return None


class FakeLimiter:
    async def allow(self, *a, **k):
        return True


@pytest.mark.asyncio
async def test_dispatch_sends_via_sandbox(monkeypatch):
    msg = FakeMsg()
    sender = FakeSender()

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

    class Events:
        async def add(self, *a, **k):
            return None

    class Session:
        async def commit(self):
            return None

    svc = DispatchService.__new__(DispatchService)
    svc.session = Session()
    svc.messages = Messages()
    svc.senders = Senders()
    svc.events = Events()
    svc.publisher = FakePublisher()
    svc.rate_limiter = FakeLimiter()

    class Settings:
        is_development = True
        max_send_attempts = 5
        retry_backoff_seconds = (15, 45, 120, 300, 900)

    svc.settings = Settings()

    await svc.process_job({"message_id": "msg_1", "sender_id": "snd_1"})
    assert msg.status == MessageStatus.SENT.value
    assert msg.provider_message_id


@pytest.mark.asyncio
async def test_dispatch_rejects_non_business():
    msg = FakeMsg()
    sender = FakeSender()
    sender.channel = "whatsapp_personal"

    class Messages:
        async def get(self, _id):
            return msg

        async def claim(self, _id):
            msg.attempts += 1
            return msg

        async def mark_dead(self, m, err):
            m.status = MessageStatus.DEAD.value
            m.last_error = err

        async def mark_failed(self, *a, **k):
            return None

        async def mark_queued(self, *a, **k):
            return None

    class Senders:
        async def get(self, _id):
            return sender

    class Events:
        async def add(self, *a, **k):
            return None

    class Session:
        async def commit(self):
            return None

    svc = DispatchService.__new__(DispatchService)
    svc.session = Session()
    svc.messages = Messages()
    svc.senders = Senders()
    svc.events = Events()
    svc.publisher = FakePublisher()
    svc.rate_limiter = FakeLimiter()

    class Settings:
        is_development = True
        max_send_attempts = 5
        retry_backoff_seconds = (15,)

    svc.settings = Settings()
    await svc.process_job({"message_id": "msg_1", "sender_id": "snd_1"})
    assert msg.status == MessageStatus.DEAD.value
    assert "business_only" in (msg.last_error or "")
