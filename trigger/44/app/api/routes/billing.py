from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentAccount, DbSession
from app.domain.exceptions import AppError
from app.schemas import CheckoutOut
from app.services.billing import BillingService

router = APIRouter(prefix="/v1/billing", tags=["billing"])


@router.post("/checkout", response_model=CheckoutOut)
async def checkout(account: CurrentAccount, db: DbSession) -> CheckoutOut:
    svc = BillingService(db)
    try:
        sub = await svc.checkout(account)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    return CheckoutOut(
        status=sub.status,
        subscription=svc.to_out(sub),
        detail="Mensalidade ativada. Agora cadastre o WhatsApp Business.",
    )
