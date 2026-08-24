from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings
from app.core.logging import get_logger
from app.domain.exceptions import PermanentSendError, TransientSendError

logger = get_logger(__name__)


class EvolutionClient:
    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float = 30.0,
    ):
        settings = get_settings()
        self._base_url = (base_url or settings.evolution_url).rstrip("/")
        self._api_key = api_key or settings.evolution_key
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "apikey": self._api_key,
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def create_instance(
        self, instance_name: str, *, qrcode: bool = True
    ) -> dict[str, Any]:
        payload = {
            "instanceName": instance_name,
            "integration": "WHATSAPP-BAILEYS",
            "qrcode": qrcode,
        }
        resp = await self._client.post("/instance/create", json=payload)
        if resp.status_code in (200, 201):
            return resp.json()
        if resp.status_code == 403 or "already" in resp.text.lower():
            logger.info("evolution_instance_exists", instance=instance_name)
            return {"instance": {"instanceName": instance_name}, "exists": True}
        logger.error(
            "evolution_create_failed",
            status=resp.status_code,
            body=resp.text[:300],
        )
        resp.raise_for_status()
        return resp.json()

    async def connect(self, instance_name: str) -> dict[str, Any]:
        resp = await self._client.get(f"/instance/connect/{instance_name}")
        if resp.status_code >= 500:
            raise TransientSendError(
                "evolution_unavailable",
                f"connect failed: {resp.status_code}",
            )
        if resp.status_code >= 400:
            try:
                return resp.json()
            except Exception as exc:
                raise TransientSendError(
                    "evolution_connect_error", str(exc)
                ) from exc
        return resp.json()

    async def connection_state(self, instance_name: str) -> dict[str, Any]:
        resp = await self._client.get(
            f"/instance/connectionState/{instance_name}"
        )
        if resp.status_code >= 400:
            return {"state": "close", "status": resp.status_code}
        return resp.json()

    async def logout(self, instance_name: str) -> None:
        try:
            await self._client.delete(f"/instance/logout/{instance_name}")
        except Exception as exc:
            logger.warning("evolution_logout_error", error=str(exc))

    async def delete_instance(self, instance_name: str) -> None:
        try:
            await self._client.delete(f"/instance/delete/{instance_name}")
        except Exception as exc:
            logger.warning("evolution_delete_error", error=str(exc))

    async def send_text(
        self, instance_name: str, number: str, text: str
    ) -> dict[str, Any]:
        url = f"/message/sendText/{instance_name}"
        payload = {"number": number, "text": text}
        try:
            resp = await self._client.post(url, json=payload)
        except httpx.TransportError as exc:
            raise TransientSendError(
                "evolution_unreachable", str(exc)
            ) from exc

        if resp.status_code in (200, 201):
            return resp.json()

        body = resp.text[:500]
        lower = body.lower()

        permanent_markers = (
            "exists",
            "invalid",
            "not registered",
            "not-registered",
            "jid",
            "number does not exist",
            "bad request",
        )
        if resp.status_code in (400, 404) or any(m in lower for m in permanent_markers):
            if resp.status_code == 404 and "instance" in lower:
                raise TransientSendError(
                    "instance_missing",
                    f"instance not found: {instance_name}",
                )
            raise PermanentSendError(
                "invalid_recipient",
                f"Evolution rejected send ({resp.status_code}): {body}",
            )

        if resp.status_code in (401, 403):
            raise PermanentSendError(
                "evolution_auth",
                f"Evolution auth error ({resp.status_code})",
            )

        raise TransientSendError(
            "evolution_send_failed",
            f"Evolution error ({resp.status_code}): {body}",
        )

    @staticmethod
    def extract_qrcode(payload: dict[str, Any]) -> str | None:
        """Normalize Evolution QR response shapes."""
        if not payload:
            return None
        for key in ("base64", "qrcode", "qr"):
            val = payload.get(key)
            if isinstance(val, str) and val:
                return val.removeprefix("data:image/png;base64,")
            if isinstance(val, dict):
                inner = val.get("base64") or val.get("code")
                if isinstance(inner, str) and inner:
                    return inner.removeprefix("data:image/png;base64,")
        nested = payload.get("qrcode")
        if isinstance(nested, dict):
            inner = nested.get("base64") or nested.get("code")
            if isinstance(inner, str):
                return inner.removeprefix("data:image/png;base64,")
        return None

    @staticmethod
    def extract_connection_state(payload: dict[str, Any]) -> str:
        if not payload:
            return "close"
        data = payload.get("instance") if isinstance(payload.get("instance"), dict) else payload
        if not isinstance(data, dict):
            return "close"
        state = data.get("state") or data.get("status") or payload.get("state") or ""
        if isinstance(state, dict):
            state = state.get("state") or state.get("status") or ""
        return str(state).lower()

    @staticmethod
    def extract_message_id(payload: dict[str, Any]) -> str | None:
        if not payload:
            return None
        key = payload.get("key")
        if isinstance(key, dict) and key.get("id"):
            return str(key["id"])
        msg = payload.get("message")
        if isinstance(msg, dict):
            k = msg.get("key")
            if isinstance(k, dict) and k.get("id"):
                return str(k["id"])
        if payload.get("id"):
            return str(payload["id"])
        return None
