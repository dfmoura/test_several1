"""Health check — Compose, monitores externos e probes da VM."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app import database
from app.config import APP_VERSION, POWER_BI_ENABLED

router = APIRouter(tags=["health"])


def check_db() -> tuple[bool, str | None]:
    """Retorna (ok, erro_opcional) com SELECT 1 no SQLite."""
    try:
        db = database.SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
        return True, None
    except Exception as exc:  # noqa: BLE001 — reportado no payload do health
        return False, str(exc)


@router.get("/api/health")
def health():
    """Sem auth. 200 se app+DB ok; 503 se o banco não responde.

    Adequado a UptimeRobot/Hetrix e healthcheck do Compose.
    """
    db_ok, db_err = check_db()
    body = {
        "status": "ok" if db_ok else "degraded",
        "produto": "observatorio-social-brasil",
        "version": APP_VERSION,
        "fase": "9",
        "analytics": "nativo",
        "power_bi": POWER_BI_ENABLED,
        "checks": {
            "database": {"ok": db_ok, "error": db_err},
        },
    }
    return JSONResponse(content=body, status_code=200 if db_ok else 503)
