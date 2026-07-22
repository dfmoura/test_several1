from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import get_settings
from app.core.exceptions import NotFoundError

router = APIRouter(tags=["admin"])

_STATIC_ADMIN = Path(__file__).resolve().parents[2] / "static" / "admin" / "index.html"


class AdminMeta(BaseModel):
    admin_ui_enabled: bool
    contact_kb_enabled: bool
    lead_capture_enabled: bool
    owner_name: str


@router.get("/admin/meta", response_model=AdminMeta)
async def admin_meta() -> AdminMeta:
    settings = get_settings()
    if not settings.admin_ui_enabled:
        raise NotFoundError("Admin UI disabled")
    return AdminMeta(
        admin_ui_enabled=settings.admin_ui_enabled,
        contact_kb_enabled=settings.contact_kb_enabled,
        lead_capture_enabled=settings.lead_capture_enabled,
        owner_name=settings.owner_name,
    )


@router.get("/admin")
async def admin_page() -> FileResponse:
    settings = get_settings()
    if not settings.admin_ui_enabled:
        raise NotFoundError("Admin UI disabled")
    if not _STATIC_ADMIN.is_file():
        raise NotFoundError("Admin UI file missing")
    return FileResponse(
        _STATIC_ADMIN,
        media_type="text/html; charset=utf-8",
        headers={"Cache-Control": "no-store"},
    )
