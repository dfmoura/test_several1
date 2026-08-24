from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentAccount, DbSession, PublisherDep
from app.domain.exceptions import AppError
from app.schemas import (
    PairOut,
    SenderConnectIn,
    SenderCreated,
    SenderOut,
    SenderPairIn,
)
from app.services.billing import sender_out
from app.services.sender import SenderService

router = APIRouter(prefix="/v1/senders", tags=["senders"])


@router.get("", response_model=list[SenderOut])
async def list_senders(account: CurrentAccount, db: DbSession) -> list[SenderOut]:
    rows = await SenderService(db).list_for_account(account.id)
    return [sender_out(s) for s in rows]


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
            label=body.label,
            sender_id=body.sender_id,
            as_new=body.as_new,
        )
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    finally:
        await svc.close()
    base = sender_out(sender)
    return SenderCreated(**base.model_dump(), api_key=api_key)


@router.post("/pair", response_model=PairOut)
async def pair_sender(
    body: SenderPairIn,
    account: CurrentAccount,
    db: DbSession,
    publisher: PublisherDep,
) -> PairOut:
    svc = SenderService(db, publisher)
    try:
        sender, api_key, qr, detail = await svc.pair(
            account,
            name=body.name,
            business_confirmed=body.business_confirmed,
            label=body.label,
            sender_id=body.sender_id,
            as_new=body.as_new,
        )
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    finally:
        await svc.close()
    return PairOut(
        sender=sender_out(sender),
        qrcode_base64=qr,
        instance=sender.evolution_instance,
        detail=detail,
        api_key=api_key,
    )


@router.post("/rebind", response_model=PairOut)
async def rebind_sender(
    account: CurrentAccount,
    db: DbSession,
    publisher: PublisherDep,
    sender_id: str | None = Query(default=None),
) -> PairOut:
    svc = SenderService(db, publisher)
    try:
        sender, qr, detail = await svc.rebind(account, sender_id=sender_id)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    finally:
        await svc.close()
    return PairOut(
        sender=sender_out(sender),
        qrcode_base64=qr,
        instance=sender.evolution_instance,
        detail=detail,
        api_key=None,
    )


@router.get("/pair/status", response_model=SenderOut)
async def pair_status(
    account: CurrentAccount,
    db: DbSession,
    sender_id: str | None = Query(default=None),
) -> SenderOut:
    svc = SenderService(db)
    try:
        sender = await svc.pair_status(account, sender_id=sender_id)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    finally:
        await svc.close()
    return sender_out(sender)


@router.get("/me", response_model=SenderOut)
async def my_sender(
    account: CurrentAccount,
    db: DbSession,
    sender_id: str | None = Query(default=None),
) -> SenderOut:
    sender = await SenderService(db).get_for_account(account.id, sender_id)
    if not sender:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "not_found",
                "message": "Nenhum WhatsApp Business cadastrado",
            },
        )
    return sender_out(sender)


@router.post("/rotate-key", response_model=SenderCreated)
async def rotate_key(
    account: CurrentAccount,
    db: DbSession,
    sender_id: str | None = Query(default=None),
) -> SenderCreated:
    try:
        sender, api_key = await SenderService(db).rotate_key(
            account, sender_id=sender_id
        )
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    base = sender_out(sender)
    return SenderCreated(**base.model_dump(), api_key=api_key)


@router.get("/{sender_id}", response_model=SenderOut)
async def get_sender(
    sender_id: str, account: CurrentAccount, db: DbSession
) -> SenderOut:
    """Detalhe de um remetente. Registrado por último para não sombrear /me e /pair/status."""
    svc = SenderService(db)
    try:
        sender = await svc.require_for_account(account.id, sender_id)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    return sender_out(sender)
