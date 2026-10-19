from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.db import SessionLocal

router = APIRouter(tags=["health"])


def check_db() -> bool:
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
        return True
    except Exception:
        return False


@router.get("/api/health")
def health():
    banco_ok = check_db()
    body = {
        "status": "ok" if banco_ok else "degraded",
        "banco": "ok" if banco_ok else "indisponivel",
    }
    return JSONResponse(content=body, status_code=200 if banco_ok else 503)
