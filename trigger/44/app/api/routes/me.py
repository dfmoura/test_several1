from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAccount, DbSession, PublisherDep, RateLimiterDep
from app.config import get_settings
from app.core.ids import new_id
from app.domain.enums import IntakeSource, MessageType, SenderStatus
from app.domain.exceptions import AppError
from app.repositories import MessageRepository
from app.schemas import AccountOut, MeOut, MessageCreate, MessageOut, MessagePortalCreate
from app.services.billing import (
    BillingService,
    build_api_docs,
    onboarding_step,
    pick_sender_for_docs,
    sender_out,
)
from app.services.ingest import IngestService
from app.services.send_gate import SenderGate
from app.services.sender import SenderService

router = APIRouter(prefix="/v1/me", tags=["me"])


@router.get("", response_model=MeOut)
async def me(
    account: CurrentAccount,
    db: DbSession,
    sender_id: str | None = Query(
        default=None,
        description="Remetente selecionado para docs/painel (opcional)",
    ),
) -> MeOut:
    billing = BillingService(db)
    settings = get_settings()
    sub = await billing.subs.get_for_account(account.id)
    senders = await SenderService(db).list_for_account(account.id)
    sub_active = billing.is_active(sub)
    step = onboarding_step(sub_active, senders=senders)
    selected = pick_sender_for_docs(senders, preferred_id=sender_id)
    ready = sub_active and any(
        s.status == SenderStatus.ACTIVE.value for s in senders
    )
    docs_sender = (
        selected
        if selected and selected.status == SenderStatus.ACTIVE.value
        else pick_sender_for_docs(
            [s for s in senders if s.status == SenderStatus.ACTIVE.value]
        )
    )
    return MeOut(
        account=AccountOut.model_validate(account),
        subscription=billing.to_out(sub),
        sender=sender_out(selected) if selected else None,
        senders=[sender_out(s) for s in senders],
        onboarding_step=step,
        ready_to_send=ready,
        pairing_enabled=settings.pairing_enabled,
        deployment_mode=settings.deployment_mode,
        registration_mode=settings.registration_mode_normalized,
        billing_auto_activate=settings.billing_auto_activate,
        api_docs=build_api_docs(docs_sender) if ready and docs_sender else None,
        selected_sender_id=selected.id if selected else None,
    )


@router.get("/messages", response_model=list[MessageOut])
async def my_messages(
    account: CurrentAccount,
    db: DbSession,
    sender_id: str | None = Query(default=None),
) -> list[MessageOut]:
    repo = MessageRepository(db)
    if sender_id:
        await SenderService(db).require_for_account(account.id, sender_id)
        rows = await repo.list_for_sender(sender_id, limit=80)
    else:
        rows = await repo.list_for_account(account.id, limit=80)
    return [MessageOut.from_message(m) for m in rows]


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
    sender = await SenderService(db).get_for_account(
        account.id, payload.sender_id
    )
    try:
        sender = await SenderGate(db).require_ready(sender)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    external_id = payload.external_id or new_id("portal")
    create = MessageCreate(
        external_id=external_id,
        to=payload.to,
        type=MessageType.TEXT,
        body=payload.body,
    )
    svc = IngestService(db, publisher, rate_limiter)
    try:
        msg, created = await svc.enqueue(
            sender, create, source=IntakeSource.PORTAL
        )
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    if not created:
        response.status_code = status.HTTP_200_OK
    return MessageOut.from_message(msg)
