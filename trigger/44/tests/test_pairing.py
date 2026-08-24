from __future__ import annotations

from app.api.routes.webhook import _extract_connection_event
from app.integrations.evolution.client import EvolutionClient


def test_extract_qrcode_shapes():
    assert EvolutionClient.extract_qrcode({"base64": "abc123"}) == "abc123"
    assert (
        EvolutionClient.extract_qrcode(
            {"qrcode": {"base64": "data:image/png;base64,xyz"}}
        )
        == "xyz"
    )
    assert EvolutionClient.extract_qrcode({}) is None


def test_extract_connection_state():
    assert (
        EvolutionClient.extract_connection_state({"instance": {"state": "open"}})
        == "open"
    )
    assert EvolutionClient.extract_connection_state({"state": "close"}) == "close"


def test_extract_connection_event_webhook():
    parsed = _extract_connection_event(
        {
            "event": "connection.update",
            "instance": "snd_abc",
            "data": {"state": "open", "ownerJid": "5534999999999@s.whatsapp.net"},
        }
    )
    assert parsed is not None
    instance, state, phone = parsed
    assert instance == "snd_abc"
    assert state == "open"
    assert phone == "5534999999999"


def test_pairing_enums():
    from app.domain.enums import SenderStatus, WhatsAppProviderKind

    assert SenderStatus.PENDING_PAIR == "pending_pair"
    assert SenderStatus.REBIND_REQUIRED == "rebind_required"
    assert WhatsAppProviderKind.BAILEYS == "baileys"
