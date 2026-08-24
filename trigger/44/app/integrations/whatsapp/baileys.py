from __future__ import annotations

from app.core.ids import new_id, validate_phone_e164
from app.domain.enums import WhatsAppProviderKind
from app.domain.exceptions import PermanentSendError, TransientSendError
from app.integrations.evolution import EvolutionClient
from app.integrations.whatsapp.base import PhoneProfile, SendResult


class BaileysWhatsAppProvider:
    """Outbound WhatsApp via Evolution (Baileys). Session lives in Evolution volume."""

    kind = WhatsAppProviderKind.BAILEYS.value

    def __init__(self, client: EvolutionClient | None = None):
        self._owned = client is None
        self._client = client or EvolutionClient()

    async def verify_and_activate(
        self,
        *,
        phone_e164: str,
        phone_number_id: str | None,
        waba_id: str | None,
        access_token: str | None,
    ) -> PhoneProfile:
        # Pairing is QR-driven; this path is not used for activation.
        phone = validate_phone_e164(phone_e164)
        instance = phone_number_id or f"baileys_{phone}"
        return PhoneProfile(
            phone_e164=phone,
            phone_number_id=instance,
            display_name=None,
            waba_id=waba_id,
        )

    async def health(
        self,
        *,
        phone_number_id: str,
        access_token: str | None,
    ) -> bool:
        if not phone_number_id:
            return False
        try:
            payload = await self._client.connection_state(phone_number_id)
        except Exception:
            return False
        state = EvolutionClient.extract_connection_state(payload)
        return state in ("open", "connected")

    async def send_text(
        self,
        *,
        phone_number_id: str,
        access_token: str | None,
        to: str,
        body: str,
    ) -> SendResult:
        if not phone_number_id:
            raise PermanentSendError(
                "instance_missing",
                "Instância Evolution não configurada no remetente",
            )
        state_payload = await self._client.connection_state(phone_number_id)
        state = EvolutionClient.extract_connection_state(state_payload)
        if state not in ("open", "connected"):
            raise TransientSendError(
                "not_connected",
                f"WhatsApp desconectado (state={state}). Escaneie o QR novamente.",
            )
        try:
            payload = await self._client.send_text(phone_number_id, to, body)
        except (PermanentSendError, TransientSendError):
            raise
        except Exception as exc:
            raise TransientSendError("evolution_send_failed", str(exc)) from exc
        msg_id = EvolutionClient.extract_message_id(payload) or new_id("wamid")
        return SendResult(provider_message_id=msg_id)

    async def close(self) -> None:
        if self._owned:
            await self._client.close()
