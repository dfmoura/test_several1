from __future__ import annotations

from pydantic import ValidationError

from app.core.crypto import decrypt_secret, encrypt_secret
from app.core.ids import mask_phone, validate_phone_e164
from app.core.security import create_access_token, decode_access_token, generate_api_key, verify_api_key
from app.domain.enums import MessageStatus, OnboardingStep, SenderStatus
from app.schemas import MessageCreate, SenderConnectIn
from app.services.billing import build_api_docs, onboarding_step


def test_phone_valid():
    assert validate_phone_e164("5534999999999") == "5534999999999"
    assert validate_phone_e164("+55 34 99999-9999") == "5534999999999"


def test_phone_invalid():
    try:
        validate_phone_e164("123")
        assert False
    except ValueError:
        pass


def test_mask_phone():
    assert mask_phone("5534999999999") == "5534****9999"


def test_api_key_roundtrip():
    plaintext, key_hash, prefix = generate_api_key()
    assert plaintext.startswith("zpv_live_")
    assert prefix.startswith("zpv_live_")
    assert verify_api_key(plaintext, key_hash)
    assert not verify_api_key(plaintext + "x", key_hash)


def test_encrypt_roundtrip():
    token = "EAAB-secret-token"
    packed = encrypt_secret(token)
    assert packed != token
    assert decrypt_secret(packed) == token


def test_jwt_roundtrip():
    token = create_access_token("acc_test")
    assert decode_access_token(token) == "acc_test"


def test_message_create_schema():
    msg = MessageCreate(
        external_id="pedido-1",
        to="5534999999999",
        type="text",
        body="Olá",
    )
    assert msg.to == "5534999999999"


def test_message_create_rejects_media():
    try:
        MessageCreate(
            external_id="x",
            to="5534999999999",
            type="image",
            body="x",
        )
        assert False
    except ValidationError:
        pass


def test_connect_normalizes_phone():
    body = SenderConnectIn(
        name="comercial",
        phone="+55 34 99999-9999",
        business_confirmed=True,
    )
    assert body.phone == "5534999999999"


def test_onboarding_steps():
    assert onboarding_step(False, None) == OnboardingStep.BILLING.value
    class S:
        status = SenderStatus.PENDING.value
    assert onboarding_step(True, S()) == OnboardingStep.CONNECT.value
    S.status = SenderStatus.ACTIVE.value
    assert onboarding_step(True, S()) == OnboardingStep.READY.value


def test_api_docs_curl_does_not_splice_truncated_prefix():
    class S:
        api_key_prefix = "zpv_live_6KGQRKG…"

    docs = build_api_docs(S())
    assert "…" not in docs.curl
    assert "6KGQRKG" not in docs.curl
    assert "Bearer COLE_A_API_KEY_COMPLETA" in docs.curl
    with_key = build_api_docs(S(), api_key_hint="zpv_live_abc")
    assert "Bearer zpv_live_abc" in with_key.curl


def test_enums():
    assert SenderStatus.ACTIVE == "active"
    assert MessageStatus.QUEUED == "queued"
