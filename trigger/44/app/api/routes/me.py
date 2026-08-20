from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentAccount, DbSession, PublisherDep, RateLimiterDep
from app.core.ids import new_id
from app.domain.enums import MessageType, SenderStatus
from app.domain.exceptions import AppError
from app.repositories import MessageRepository
from app.schemas import AccountOut, MeOut, MessageCreate, MessageOut, MessagePortalCreate
from app.services.billing import (
    BillingService,
    build_api_docs,
    onboarding_step,
    sender_out,
)
from app.services.ingest import IngestService
from app.services.sender import SenderService
from app.api.routes.messages import _to_out

router = APIRouter(prefix="/v1/me", tags=["me"])


@router.get("", response_model=MeOut)
async def me(account: CurrentAccount, db: DbSession) -> MeOut:
    billing = BillingService(db)
    sub = await billing.subs.get_for_account(account.id)
    sender = await SenderService(db).get_for_account(account.id)
    sub_active = billing.is_active(sub)
    step = onboarding_step(sub_active, sender)
    ready = (
        sub_active
        and sender is not None
        and sender.status == SenderStatus.ACTIVE.value
    )
    return MeOut(
        account=AccountOut.model_validate(account),
        subscription=billing.to_out(sub),
        sender=sender_out(sender) if sender else None,
        onboarding_step=step,
        ready_to_send=ready,
        api_docs=build_api_docs(sender) if ready else None,
    )


@router.get("/messages", response_model=list[MessageOut])
async def my_messages(account: CurrentAccount, db: DbSession) -> list[MessageOut]:
    rows = await MessageRepository(db).list_for_account(account.id, limit=80)
    return [_to_out(m) for m in rows]


@router.post(
    "/messages",
    response_model=MessageOut,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        200: {"model": MessageOut, "description": "Idempotent replay"},
        403: {"description": "Account not ready to send"},
    },
)
async def send_from_portal(
    payload: MessagePortalCreate,
    response: Response,
    account: CurrentAccount,
    db: DbSession,
    publisher: PublisherDep,
    rate_limiter: RateLimiterDep,
) -> MessageOut:
    billing = BillingService(db)
    sub = await billing.subs.get_for_account(account.id)
    sender = await SenderService(db).get_for_account(account.id)
    if not billing.is_active(sub):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "subscription_inactive",
                "message": "Mensalidade inativa. Regularize no painel.",
            },
        )
    if not sender or sender.status != SenderStatus.ACTIVE.value:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "not_ready",
                "message": "Conecte o WhatsApp Business antes de enviar.",
            },
        )

    external_id = payload.external_id or new_id("portal")
    create = MessageCreate(
        external_id=external_id,
        to=payload.to,
        type=MessageType.TEXT,
        body=payload.body,
    )
    svc = IngestService(db, publisher, rate_limiter)
    try:
        msg, created = await svc.enqueue(sender, create)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    if not created:
        response.status_code = status.HTTP_200_OK
    return _to_out(msg)
