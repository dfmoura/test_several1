from __future__ import annotations

import pytest

from app.domain.enums import DeliveryEventType, MessageStatus
from app.services.webhook import WhatsAppWebhookService


class FakeMessage:
    def __init__(self):
        self.id = "msg_1"
        self.status = MessageStatus.SENT.value
        self.last_error = None


class FakeMessages:
    def __init__(self, msg: FakeMessage):
        self.msg = msg
        self.failed_with: str | None = None

    async def find_by_provider_message_id(self, provider_id: str):
        if provider_id == "wamid.TEST":
            return self.msg
        return None

    async def mark_failed(self, msg, error: str):
        msg.status = MessageStatus.FAILED.value
        msg.last_error = error
        self.failed_with = error


class FakeEvents:
    def __init__(self):
        self.events: list[tuple] = []

    async def add(self, message_id, event, detail=None):
        self.events.append((message_id, event, detail))
        return None


class FakeSession:
    async def commit(self):
        return None


@pytest.mark.asyncio
async def test_webhook_delivered_creates_event():
    msg = FakeMessage()
    events = FakeEvents()
    svc = WhatsAppWebhookService.__new__(WhatsAppWebhookService)
    svc.session = FakeSession()
    svc.messages = FakeMessages(msg)
    svc.events = events

    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "statuses": [
                                {
                                    "id": "wamid.TEST",
                                    "status": "delivered",
                                    "timestamp": "1710000000",
                                    "recipient_id": "5534999999999",
                                }
                            ]
                        }
                    }
                ]
            }
        ],
    }

    count = await svc.process_meta_payload(payload)
    assert count == 1
    assert events.events[0][1] == DeliveryEventType.DELIVERED
    assert msg.status == MessageStatus.SENT.value


@pytest.mark.asyncio
async def test_webhook_failed_marks_message():
    msg = FakeMessage()
    messages = FakeMessages(msg)
    events = FakeEvents()
    svc = WhatsAppWebhookService.__new__(WhatsAppWebhookService)
    svc.session = FakeSession()
    svc.messages = messages
    svc.events = events

    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "statuses": [
                                {
                                    "id": "wamid.TEST",
                                    "status": "failed",
                                    "errors": [{"title": "undeliverable"}],
                                }
                            ]
                        }
                    }
                ]
            }
        ],
    }

    await svc.process_meta_payload(payload)
    assert msg.status == MessageStatus.FAILED.value
    assert "undeliverable" in (messages.failed_with or "")
    assert events.events[0][1] == DeliveryEventType.PROVIDER_FAILED


@pytest.mark.asyncio
async def test_webhook_ignores_unknown_object():
    svc = WhatsAppWebhookService.__new__(WhatsAppWebhookService)
    count = await svc.process_meta_payload({"object": "page"})
    assert count == 0
