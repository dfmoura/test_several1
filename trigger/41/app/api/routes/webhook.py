from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Request

from app.core.database import async_session_factory
from app.core.ids import normalize_phone
from app.core.logging import get_logger
from app.integrations.evolution import EvolutionClient
from app.services.pairing import PairingService

logger = get_logger(__name__)

router = APIRouter(tags=["webhook"])


def _extract_connection_event(payload: dict[str, Any]) -> tuple[str, str, str | None] | None:
    """Return (instance, state, phone) if this is a connection update."""
    event = (
        payload.get("event")
        or payload.get("type")
        or ""
    )
    event_l = str(event).lower().replace("_", ".")

    # Accept connection.update / CONNECTION_UPDATE
    if "connection" not in event_l and "connection.update" not in str(payload).lower():
        # Some payloads nest data without clear event name
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


async def _process_connection(payload: dict[str, Any]) -> None:
    parsed = _extract_connection_event(payload)
    if not parsed:
        return
    instance, state, phone = parsed
    async with async_session_factory() as session:
        evolution = EvolutionClient()
        try:
            svc = PairingService(session, evolution)
            await svc.handle_connection_update(instance, state, phone)
            await session.commit()
        finally:
            await evolution.close()


@router.post("/webhook/evolution")
async def evolution_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """Evolution CONNECTION_UPDATE only — no inbound AI processing."""
    try:
        payload = await request.json()
    except Exception:
        return {"status": "ignored"}

    event = str(payload.get("event") or payload.get("type") or "").lower()

    # Explicitly ignore message events (outbound gateway)
    if "messages" in event or "message" in event:
        return {"status": "ignored"}

    parsed = _extract_connection_event(payload)
    if parsed:
        logger.info(
            "evolution_connection_webhook",
            instance=parsed[0],
            state=parsed[1],
        )
        background_tasks.add_task(_process_connection, payload)

    return {"status": "accepted"}
