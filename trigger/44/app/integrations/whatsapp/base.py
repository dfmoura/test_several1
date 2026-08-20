from __future__ import annotations

from typing import Protocol

from app.domain.exceptions import PermanentSendError, TransientSendError


class PhoneProfile:
    def __init__(
        self,
        phone_e164: str,
        phone_number_id: str,
        display_name: str | None = None,
        waba_id: str | None = None,
    ):
        self.phone_e164 = phone_e164
        self.phone_number_id = phone_number_id
        self.display_name = display_name
        self.waba_id = waba_id


class SendResult:
    def __init__(self, provider_message_id: str | None):
        self.provider_message_id = provider_message_id


class WhatsAppProvider(Protocol):
    kind: str

    async def verify_and_activate(
        self,
        *,
        phone_e164: str,
        phone_number_id: str | None,
        waba_id: str | None,
        access_token: str | None,
    ) -> PhoneProfile: ...

    async def health(
        self,
        *,
        phone_number_id: str,
        access_token: str | None,
    ) -> bool: ...

    async def send_text(
        self,
        *,
        phone_number_id: str,
        access_token: str | None,
        to: str,
        body: str,
    ) -> SendResult: ...

    async def close(self) -> None: ...


__all__ = [
    "PermanentSendError",
    "PhoneProfile",
    "SendResult",
    "TransientSendError",
    "WhatsAppProvider",
]
