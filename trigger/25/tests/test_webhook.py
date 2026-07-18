import pytest

from app.services.webhook_service import WebhookService


SAMPLE_PAYLOAD = {
    "event": "messages.upsert",
    "instance": "personal",
    "data": {
        "key": {
            "remoteJid": "5511999999999@s.whatsapp.net",
            "fromMe": False,
            "id": "ABC123",
        },
        "pushName": "Maria",
        "message": {"conversation": "Oi, tudo bem?"},
        "messageType": "conversation",
    },
}


def test_parse_text_message() -> None:
    service = WebhookService()
    incoming = service.parse(SAMPLE_PAYLOAD)
    assert incoming is not None
    assert incoming.phone == "5511999999999"
    assert incoming.name == "Maria"
    assert incoming.text == "Oi, tudo bem?"
    assert incoming.from_me is False


def test_parse_extended_text() -> None:
    service = WebhookService()
    payload = {
        "event": "messages.upsert",
        "data": {
            "key": {"remoteJid": "5511888777666@s.whatsapp.net", "fromMe": False},
            "pushName": "João",
            "message": {"extendedTextMessage": {"text": "Me liga depois"}},
        },
    }
    incoming = service.parse(payload)
    assert incoming is not None
    assert incoming.text == "Me liga depois"


def test_ignore_from_me_still_parses() -> None:
    service = WebhookService()
    payload = {
        **SAMPLE_PAYLOAD,
        "data": {
            **SAMPLE_PAYLOAD["data"],
            "key": {**SAMPLE_PAYLOAD["data"]["key"], "fromMe": True},
        },
    }
    incoming = service.parse(payload)
    assert incoming is not None
    assert incoming.from_me is True


def test_ignore_group() -> None:
    service = WebhookService()
    payload = {
        "event": "messages.upsert",
        "data": {
            "key": {"remoteJid": "120363@g.us", "fromMe": False},
            "message": {"conversation": "oi"},
        },
    }
    assert service.parse(payload) is None


def test_ignore_unknown_event() -> None:
    service = WebhookService()
    payload = {**SAMPLE_PAYLOAD, "event": "connection.update"}
    assert service.parse(payload) is None


@pytest.mark.asyncio
async def test_webhook_endpoint_accepts(api_client, monkeypatch: pytest.MonkeyPatch) -> None:
    called: list[dict] = []

    async def fake_process(raw: dict) -> None:
        called.append(raw)

    monkeypatch.setattr(
        "app.api.routes.webhook._process_message",
        fake_process,
    )

    response = await api_client.post(
        "/webhook/evolution",
        json=SAMPLE_PAYLOAD,
        headers={"X-Webhook-Secret": "test-secret"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"
