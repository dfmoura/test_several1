from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentSender, DbSession, PublisherDep, RateLimiterDep
from app.domain.enums import IntakeSource
from app.domain.exceptions import AppError
from app.schemas import MessageCreate, MessageOut
from app.services.ingest import IngestService

router = APIRouter(prefix="/v1/messages", tags=["messages"])


@router.post(
    "",
    response_model=MessageOut,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        200: {"model": MessageOut, "description": "Idempotent replay"},
        401: {"description": "Unauthorized"},
        403: {"description": "Subscription or sender not ready"},
        422: {"description": "Invalid payload"},
        429: {"description": "Rate limited"},
    },
)
async def create_message(
    payload: MessageCreate,
    response: Response,
    sender: CurrentSender,
    db: DbSession,
    publisher: PublisherDep,
    rate_limiter: RateLimiterDep,
) -> MessageOut:
    svc = IngestService(db, publisher, rate_limiter)
    try:
        msg, created = await svc.enqueue(
            sender, payload, source=IntakeSource.API
        )
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    if not created:
        response.status_code = status.HTTP_200_OK
    return MessageOut.from_message(msg)


@router.get("/by-external/{external_id}", response_model=MessageOut)
async def get_by_external(
    external_id: str,
    sender: CurrentSender,
    db: DbSession,
) -> MessageOut:
    svc = IngestService(db)
    msg = await svc.get_by_external_for_sender(sender, external_id)
    if not msg:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Message not found"},
        )
    return MessageOut.from_message(msg)


@router.get("/{message_id}", response_model=MessageOut)
async def get_message(
    message_id: str,
    sender: CurrentSender,
    db: DbSession,
) -> MessageOut:
    svc = IngestService(db)
    msg = await svc.get_for_sender(sender, message_id)
    if not msg:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Message not found"},
        )
    return MessageOut.from_message(msg)
