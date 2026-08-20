from __future__ import annotations

from app.core.ids import new_id, validate_phone_e164
from app.domain.exceptions import PermanentSendError
from app.integrations.whatsapp.base import PhoneProfile, SendResult


class SandboxWhatsAppProvider:
    """Local/dev: autenticação persistente simulada, sem Meta e sem sessão QR."""

    kind = "sandbox"

    async def verify_and_activate(
        self,
        *,
        phone_e164: str,
        phone_number_id: str | None,
        waba_id: str | None,
        access_token: str | None,
    ) -> PhoneProfile:
        phone = validate_phone_e164(phone_e164)
        return PhoneProfile(
            phone_e164=phone,
            phone_number_id=phone_number_id or f"sandbox_{phone}",
            display_name="WhatsApp Business (sandbox)",
            waba_id=waba_id or "sandbox_waba",
        )

    async def health(
        self,
        *,
        phone_number_id: str,
        access_token: str | None,
    ) -> bool:
        return bool(phone_number_id)

    async def send_text(
        self,
        *,
        phone_number_id: str,
        access_token: str | None,
        to: str,
        body: str,
    ) -> SendResult:
        if not to or not body:
            raise PermanentSendError("invalid_payload", "to and body are required")
        return SendResult(provider_message_id=new_id("wamid"))

    async def close(self) -> None:
        return None
