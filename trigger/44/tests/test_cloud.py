from __future__ import annotations

import pytest

from app.domain.exceptions import PermanentSendError
from app.integrations.whatsapp.cloud import CloudWhatsAppProvider


class FakeResp:
    def __init__(self, status_code: int, payload: dict | None = None, text: str = ""):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text or str(payload)

    def json(self):
        return self._payload


@pytest.mark.asyncio
async def test_cloud_verify_and_send():
    provider = CloudWhatsAppProvider()

    async def fake_get(url, headers=None, params=None):
        return FakeResp(200, {"display_phone_number": "+55 34 99999-9999", "verified_name": "Loja"})

    async def fake_post(url, headers=None, json=None):
        return FakeResp(200, {"messages": [{"id": "wamid.abc"}]})

    provider._client.get = fake_get  # type: ignore[method-assign]
    provider._client.post = fake_post  # type: ignore[method-assign]

    profile = await provider.verify_and_activate(
        phone_e164="5534999999999",
        phone_number_id="12345",
        waba_id="waba1",
        access_token="EAAB",
    )
    assert profile.phone_number_id == "12345"

    sent = await provider.send_text(
        phone_number_id="12345",
        access_token="EAAB",
        to="5534988888888",
        body="oi",
    )
    assert sent.provider_message_id == "wamid.abc"
    await provider.close()


@pytest.mark.asyncio
async def test_cloud_invalid_token():
    provider = CloudWhatsAppProvider()

    async def fake_get(url, headers=None, params=None):
        return FakeResp(401, {"error": "x"}, text="unauthorized")

    provider._client.get = fake_get  # type: ignore[method-assign]

    with pytest.raises(PermanentSendError) as ei:
        await provider.verify_and_activate(
            phone_e164="5534999999999",
            phone_number_id="12345",
            waba_id=None,
            access_token="bad",
        )
    assert ei.value.code == "invalid_token"
    await provider.close()
