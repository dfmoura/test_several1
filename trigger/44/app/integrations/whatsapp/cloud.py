from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.core.ids import normalize_phone, validate_phone_e164
from app.core.logging import get_logger
from app.domain.exceptions import PermanentSendError, TransientSendError
from app.integrations.whatsapp.base import PhoneProfile, SendResult

logger = get_logger(__name__)


class CloudWhatsAppProvider:
    """WhatsApp Business Cloud API (Meta) — token persistente, sem sessão de aparelho."""

    kind = "cloud"

    def __init__(self) -> None:
        settings = get_settings()
        self._base = (
            f"{settings.whatsapp_graph_base_url.rstrip('/')}"
            f"/{settings.whatsapp_graph_version}"
        )
        self._client = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self._client.aclose()

    def _headers(self, token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def verify_and_activate(
        self,
        *,
        phone_e164: str,
        phone_number_id: str | None,
        waba_id: str | None,
        access_token: str | None,
    ) -> PhoneProfile:
        phone = validate_phone_e164(phone_e164)
        if not phone_number_id or not access_token:
            raise PermanentSendError(
                "cloud_credentials_required",
                "Informe Phone Number ID e o token permanente da Cloud API",
            )
        url = f"{self._base}/{phone_number_id}"
        params = {"fields": "display_phone_number,verified_name,quality_rating"}
        try:
            resp = await self._client.get(
                url, headers=self._headers(access_token), params=params
            )
        except httpx.TransportError as exc:
            raise TransientSendError("graph_unreachable", str(exc)) from exc

        if resp.status_code in (401, 403):
            raise PermanentSendError(
                "invalid_token",
                "Token da Cloud API rejeitado pela Meta",
            )
        if resp.status_code == 404:
            raise PermanentSendError(
                "unknown_phone_number_id",
                "Phone Number ID não encontrado na Cloud API",
            )
        if resp.status_code >= 500:
            raise TransientSendError(
                "graph_unavailable",
                f"Graph API {resp.status_code}",
            )
        if resp.status_code >= 400:
            raise PermanentSendError(
                "cloud_verify_failed",
                resp.text[:300],
            )

        data = resp.json()
        remote_phone = normalize_phone(str(data.get("display_phone_number") or ""))
        if remote_phone and remote_phone != phone and not phone.endswith(remote_phone[-8:]):
            logger.warning(
                "cloud_phone_mismatch",
                declared=phone,
                remote=remote_phone,
            )
        return PhoneProfile(
            phone_e164=phone,
            phone_number_id=phone_number_id,
            display_name=data.get("verified_name"),
            waba_id=waba_id,
        )

    async def health(
        self,
        *,
        phone_number_id: str,
        access_token: str | None,
    ) -> bool:
        if not phone_number_id or not access_token:
            return False
        url = f"{self._base}/{phone_number_id}"
        try:
            resp = await self._client.get(
                url,
                headers=self._headers(access_token),
                params={"fields": "display_phone_number"},
            )
        except httpx.TransportError:
            return True
        if resp.status_code in (401, 403):
            return False
        return resp.status_code < 500

    async def send_text(
        self,
        *,
        phone_number_id: str,
        access_token: str | None,
        to: str,
        body: str,
    ) -> SendResult:
        if not access_token:
            raise PermanentSendError("missing_token", "Sender sem token Cloud API")
        url = f"{self._base}/{phone_number_id}/messages"
        payload: dict[str, Any] = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": body},
        }
        try:
            resp = await self._client.post(
                url, headers=self._headers(access_token), json=payload
            )
        except httpx.TransportError as exc:
            raise TransientSendError("graph_unreachable", str(exc)) from exc

        if resp.status_code in (200, 201):
            data = resp.json()
            messages = data.get("messages") or []
            msg_id = None
            if messages and isinstance(messages[0], dict):
                msg_id = messages[0].get("id")
            return SendResult(provider_message_id=msg_id)

        body_txt = resp.text[:500]
        lower = body_txt.lower()
        if resp.status_code in (401, 403):
            raise PermanentSendError("invalid_token", body_txt)
        if resp.status_code in (400, 404) or "invalid parameter" in lower:
            raise PermanentSendError("invalid_recipient", body_txt)
        if resp.status_code == 429:
            raise TransientSendError("graph_rate_limited", body_txt)
        if resp.status_code >= 500:
            raise TransientSendError("graph_unavailable", body_txt)
        raise TransientSendError("cloud_send_failed", body_txt)
