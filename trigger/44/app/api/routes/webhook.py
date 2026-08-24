from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse

from app.config import get_settings
from app.core.database import async_session_factory
from app.core.ids import normalize_phone
from app.core.logging import get_logger
from app.services.sender import SenderService
from app.services.webhook import WhatsAppWebhookService

logger = get_logger(__name__)

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])


def _verify_meta_signature(body: bytes, signature: str | None, secret: str) -> bool:
    if not signature or not signature.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, f"sha256={expected}")


async def _process_payload(payload: dict) -> None:
    async with async_session_factory() as session:
        svc = WhatsAppWebhookService(session)
        count = await svc.process_meta_payload(payload)
        await session.commit()
        logger.info("webhook_processed", events=count)


def _extract_connection_event(
    payload: dict[str, Any],
) -> tuple[str, str, str | None] | None:
    """Return (instance, state, phone) if this is a connection update."""
    event = payload.get("event") or payload.get("type") or ""
    event_l = str(event).lower().replace("_", ".")

    if "connection" not in event_l and "connection.update" not in str(payload).lower():
        data = payload.get("data") or payload.get("instance") or {}
        if not isinstance(data, dict):
            return None
        state = data.get("state") or data.get("status")
        if not state:
            return None
    else:
        if "connection" not in event_l:
            return None

    instance = (
        payload.get("instance")
        or (payload.get("data") or {}).get("instance")
        or (payload.get("data") or {}).get("instanceName")
        or ""
    )
    if isinstance(instance, dict):
        instance = (
            instance.get("instanceName")
            or instance.get("name")
            or instance.get("instance")
            or ""
        )

    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    state = (
        (data or {}).get("state")
        or (data or {}).get("status")
        or payload.get("state")
        or ""
    )
    if isinstance(state, dict):
        state = state.get("state") or state.get("status") or ""

    phone = None
    for key in ("ownerJid", "wuid", "phone", "number"):
        raw = (data or {}).get(key) or payload.get(key)
        if raw:
            phone = normalize_phone(str(raw).split("@")[0])
            break

    if not instance or not state:
        return None
    return str(instance), str(state), phone


async def _process_evolution_connection(payload: dict[str, Any]) -> None:
    parsed = _extract_connection_event(payload)
    if not parsed:
        return
    instance, state, phone = parsed
    async with async_session_factory() as session:
        svc = SenderService(session)
        try:
            await svc.handle_connection_update(instance, state, phone)
            await session.commit()
        finally:
            await svc.close()


@router.get("/whatsapp")
async def whatsapp_verify(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
) -> PlainTextResponse:
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.webhook_secret:
        return PlainTextResponse(hub_challenge or "")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"code": "forbidden", "message": "Invalid verify token"},
    )


@router.post("/whatsapp")
async def whatsapp_events(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    settings = get_settings()
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    if settings.is_production:
        if not _verify_meta_signature(body, signature, settings.webhook_secret):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "forbidden", "message": "Invalid signature"},
            )
    elif signature and not _verify_meta_signature(
        body, signature, settings.webhook_secret
    ):
        logger.warning("webhook_signature_mismatch_dev")

    try:
        payload = json.loads(body.decode("utf-8"))
    except Exception:
        return {"status": "ignored"}

    if payload.get("object") != "whatsapp_business_account":
        return {"status": "ignored"}

    background_tasks.add_task(_process_payload, payload)
    return {"status": "accepted"}


@router.post("/evolution")
async def evolution_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """Evolution CONNECTION_UPDATE → ativa o remetente após o scan do QR."""
    try:
        payload = await request.json()
    except Exception:
        return {"status": "ignored"}

    event = str(payload.get("event") or payload.get("type") or "").lower()
    if "messages" in event or (
        "message" in event and "connection" not in event
    ):
        return {"status": "ignored"}

    parsed = _extract_connection_event(payload)
    if parsed:
        logger.info(
            "evolution_connection_webhook",
            instance=parsed[0],
            state=parsed[1],
        )
        background_tasks.add_task(_process_evolution_connection, payload)

    return {"status": "accepted"}
