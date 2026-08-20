from __future__ import annotations

from fastapi import APIRouter, Request
from sqlalchemy import text

from app.config import get_settings
from app.queue.topology import connect_rabbitmq
from app.schemas import HealthOut, ReadyOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    settings = get_settings()
    return HealthOut(status="ok", service=settings.app_name)


@router.get("/ready", response_model=ReadyOut)
async def ready(request: Request) -> ReadyOut:
    checks: dict[str, str] = {}
    ok = True

    try:
        from app.core.database import async_session_factory

        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as exc:
        checks["postgres"] = f"fail:{exc}"
        ok = False

    try:
        pong = await request.app.state.redis.ping()
        checks["redis"] = "ok" if pong else "fail"
        ok = ok and bool(pong)
    except Exception as exc:
        checks["redis"] = f"fail:{exc}"
        ok = False

    try:
        conn = await connect_rabbitmq()
        await conn.close()
        checks["rabbitmq"] = "ok"
    except Exception as exc:
        checks["rabbitmq"] = f"fail:{exc}"
        ok = False

    return ReadyOut(status="ok" if ok else "degraded", checks=checks)
