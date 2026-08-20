from __future__ import annotations

import hashlib
import hmac
import json

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, status
from fastapi.responses import PlainTextResponse

from app.config import get_settings
from app.core.database import async_session_factory
from app.core.logging import get_logger
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
