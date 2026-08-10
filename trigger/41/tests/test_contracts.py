from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.ids import mask_phone, validate_phone_e164
from app.core.security import generate_api_key, verify_api_key
from app.domain.enums import MessageStatus, SenderStatus
from app.schemas import MessageCreate


def test_phone_valid():
    assert validate_phone_e164("5534999999999") == "5534999999999"
    assert validate_phone_e164("+55 34 99999-9999") == "5534999999999"


def test_phone_invalid():
    with pytest.raises(ValueError):
        validate_phone_e164("123")


def test_mask_phone():
    assert mask_phone("5534999999999") == "5534****9999"


def test_api_key_roundtrip():
    plaintext, key_hash, prefix = generate_api_key()
    assert plaintext.startswith("zpg_live_")
    assert prefix.startswith("zpg_live_")
    assert verify_api_key(plaintext, key_hash)
    assert not verify_api_key(plaintext + "x", key_hash)


def test_message_create_schema():
    msg = MessageCreate(
        external_id="pedido-1",
        to="5534999999999",
        type="text",
        body="Olá",
    )
    assert msg.to == "5534999999999"


def test_message_create_rejects_media():
    with pytest.raises(ValidationError):
        MessageCreate(
            external_id="x",
            to="5534999999999",
            type="image",
            body="x",
        )


def test_message_create_rejects_schedule():
    with pytest.raises(ValidationError):
        MessageCreate(
            external_id="x",
            to="5534999999999",
            type="text",
            body="hi",
            schedule_at="2026-08-07T12:00:00Z",
        )


def test_enums():
    assert SenderStatus.ACTIVE == "active"
    assert MessageStatus.QUEUED == "queued"
