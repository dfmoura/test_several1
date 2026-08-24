from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import DbSession
from app.config import get_settings
from app.schemas import PublicMetaOut
from app.services.account import AccountService

router = APIRouter(tags=["meta"])


@router.get("/v1/meta", response_model=PublicMetaOut)
async def public_meta(db: DbSession) -> PublicMetaOut:
    """Configuração pública do portal: cadastro aberto ou instância privada."""
    settings = get_settings()
    open_ = await AccountService(db).registration_is_open()
    return PublicMetaOut(
        app=settings.app_name,
        deployment_mode=settings.deployment_mode,
        registration_mode=settings.registration_mode_normalized,
        registration_open=open_,
        pairing_enabled=settings.pairing_enabled,
        billing_auto_activate=settings.billing_auto_activate,
    )
