"""Health check — usado por Compose, monitores e probes da VM."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.database import SessionLocal

router = APIRouter(tags=["health"])


def check_db() -> tuple[bool, str | None]:
    """Retorna (ok, erro_opcional) com SELECT 1 no SQLite."""
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
        return True, None
    except Exception as exc:  # noqa: BLE001 — reportado no payload do health
        return False, str(exc)


@router.get("/api/health")
def health():
    """Sem auth. 200 se app+DB ok; 503 se o banco não responde."""
    db_ok, db_err = check_db()
    body = {
        "status": "ok" if db_ok else "degraded",
        "fontes": ["compras", "powerbi"],
        "checks": {
            "database": {"ok": db_ok, "error": db_err},
        },
    }
    return JSONResponse(content=body, status_code=200 if db_ok else 503)
