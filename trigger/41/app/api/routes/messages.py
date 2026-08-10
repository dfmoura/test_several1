from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import (
    CurrentSender,
    DbSession,
    PublisherDep,
    RateLimiterDep,
)
from app.domain.exceptions import AppError
from app.schemas import MessageCreate, MessageOut
from app.services.ingest import IngestService

router = APIRouter(prefix="/v1/messages", tags=["messages"])


def _to_out(msg) -> MessageOut:
    return MessageOut(
        id=msg.id,
        external_id=msg.external_id,
        status=msg.status,
        sender_id=msg.sender_id,
        to=msg.to_phone,
        type=msg.type,
        body=msg.body,
        attempts=msg.attempts,
        last_error=msg.last_error,
        evolution_message_id=msg.evolution_message_id,
        created_at=msg.created_at,
        queued_at=msg.queued_at,
        processing_at=msg.processing_at,
        sent_at=msg.sent_at,
        failed_at=msg.failed_at,
        dead_at=msg.dead_at,
        metadata=msg.metadata_json,
    )


@router.post(
    "",
    response_model=MessageOut,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        200: {"model": MessageOut, "description": "Idempotent replay"},
        401: {"description": "Unauthorized"},
        403: {"description": "Sender paused / not paired"},
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
        msg, created = await svc.enqueue(sender, payload)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    if not created:
        response.status_code = status.HTTP_200_OK
    return _to_out(msg)


@router.get("/by-external/{external_id}", response_model=MessageOut)
async def get_by_external(
    external_id: str,
    sender: CurrentSender,
    db: DbSession,
    publisher: PublisherDep,
) -> MessageOut:
    svc = IngestService(db, publisher)
    msg = await svc.get_by_external_for_sender(sender, external_id)
    if not msg:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Message not found"},
        )
    return _to_out(msg)


@router.get("/{message_id}", response_model=MessageOut)
async def get_message(
    message_id: str,
    sender: CurrentSender,
    db: DbSession,
    publisher: PublisherDep,
) -> MessageOut:
    svc = IngestService(db, publisher)
    msg = await svc.get_for_sender(sender, message_id)
    if not msg:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Message not found"},
        )
    return _to_out(msg)
