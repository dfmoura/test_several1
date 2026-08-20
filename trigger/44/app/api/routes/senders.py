from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentAccount, DbSession, PublisherDep
from app.domain.exceptions import AppError
from app.schemas import SenderConnectIn, SenderCreated, SenderOut
from app.services.billing import sender_out
from app.services.sender import SenderService

router = APIRouter(prefix="/v1/senders", tags=["senders"])


@router.post("/connect", response_model=SenderCreated, status_code=201)
async def connect_sender(
    body: SenderConnectIn,
    account: CurrentAccount,
    db: DbSession,
    publisher: PublisherDep,
) -> SenderCreated:
    svc = SenderService(db, publisher)
    try:
        sender, api_key = await svc.connect(
            account,
            name=body.name,
            phone=body.phone,
            business_confirmed=body.business_confirmed,
            phone_number_id=body.phone_number_id,
            waba_id=body.waba_id,
            access_token=body.access_token,
        )
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    base = sender_out(sender)
    return SenderCreated(**base.model_dump(), api_key=api_key)


@router.get("/me", response_model=SenderOut)
async def my_sender(account: CurrentAccount, db: DbSession) -> SenderOut:
    sender = await SenderService(db).get_for_account(account.id)
    if not sender:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Nenhum WhatsApp Business cadastrado"},
        )
    return sender_out(sender)


@router.post("/rotate-key", response_model=SenderCreated)
async def rotate_key(account: CurrentAccount, db: DbSession) -> SenderCreated:
    try:
        sender, api_key = await SenderService(db).rotate_key(account)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    base = sender_out(sender)
    return SenderCreated(**base.model_dump(), api_key=api_key)
