from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import AdminAuth, DbSession, EvolutionDep, PublisherDep
from app.domain.exceptions import AppError, NotFoundError
from app.repositories import MessageRepository, SenderRepository
from app.schemas import (
    MessageOut,
    PairResponse,
    QueueStats,
    SenderCreate,
    SenderCreated,
    SenderOut,
)
from app.services.pairing import PairingService

router = APIRouter(prefix="/v1/admin", tags=["admin"])


def _sender_out(s) -> SenderOut:
    return SenderOut.model_validate(s)


@router.post("/senders", response_model=SenderCreated, status_code=201)
async def create_sender(
    body: SenderCreate,
    _: AdminAuth,
    db: DbSession,
    evolution: EvolutionDep,
    publisher: PublisherDep,
) -> SenderCreated:
    svc = PairingService(db, evolution, publisher)
    try:
        sender, api_key = await svc.create_sender(
            body.name, body.rate_limit_per_minute
        )
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    base = _sender_out(sender)
    return SenderCreated(**base.model_dump(), api_key=api_key)


@router.get("/senders", response_model=list[SenderOut])
async def list_senders(
    _: AdminAuth,
    db: DbSession,
    evolution: EvolutionDep,
) -> list[SenderOut]:
    svc = PairingService(db, evolution)
    senders = await svc.list_senders()
    return [_sender_out(s) for s in senders]


@router.get("/senders/{sender_id}", response_model=SenderOut)
async def get_sender(
    sender_id: str,
    _: AdminAuth,
    db: DbSession,
    evolution: EvolutionDep,
) -> SenderOut:
    svc = PairingService(db, evolution)
    try:
        sender = await svc.get_sender(sender_id)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    return _sender_out(sender)


@router.post("/senders/{sender_id}/pair", response_model=PairResponse)
async def pair_sender(
    sender_id: str,
    _: AdminAuth,
    db: DbSession,
    evolution: EvolutionDep,
    publisher: PublisherDep,
) -> PairResponse:
    svc = PairingService(db, evolution, publisher)
    try:
        result = await svc.pair(sender_id)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": "evolution_error", "message": str(exc)},
        ) from exc
    return PairResponse(**result)


@router.post("/senders/{sender_id}/rebind", response_model=PairResponse)
async def rebind_sender(
    sender_id: str,
    _: AdminAuth,
    db: DbSession,
    evolution: EvolutionDep,
    publisher: PublisherDep,
) -> PairResponse:
    svc = PairingService(db, evolution, publisher)
    try:
        result = await svc.rebind(sender_id)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": "evolution_error", "message": str(exc)},
        ) from exc
    return PairResponse(**result)


@router.post("/senders/{sender_id}/pause", response_model=SenderOut)
async def pause_sender(
    sender_id: str,
    _: AdminAuth,
    db: DbSession,
    evolution: EvolutionDep,
) -> SenderOut:
    svc = PairingService(db, evolution)
    try:
        sender = await svc.pause(sender_id)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    return _sender_out(sender)


@router.post("/senders/{sender_id}/resume", response_model=SenderOut)
async def resume_sender(
    sender_id: str,
    _: AdminAuth,
    db: DbSession,
    evolution: EvolutionDep,
) -> SenderOut:
    svc = PairingService(db, evolution)
    try:
        sender = await svc.resume(sender_id)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    return _sender_out(sender)


@router.post("/senders/{sender_id}/rotate-key", response_model=SenderCreated)
async def rotate_key(
    sender_id: str,
    _: AdminAuth,
    db: DbSession,
    evolution: EvolutionDep,
) -> SenderCreated:
    svc = PairingService(db, evolution)
    try:
        sender, api_key = await svc.rotate_key(sender_id)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    base = _sender_out(sender)
    return SenderCreated(**base.model_dump(), api_key=api_key)


@router.get("/queue/stats", response_model=QueueStats)
async def queue_stats(
    _: AdminAuth,
    db: DbSession,
    publisher: PublisherDep,
) -> QueueStats:
    senders = await SenderRepository(db).list_all()
    mq_stats = await publisher.queue_stats([s.id for s in senders])
    counts = await MessageRepository(db).count_by_status()
    return QueueStats(
        senders=mq_stats,
        total_queued=counts.get("queued", 0),
        total_processing=counts.get("processing", 0),
        total_failed=counts.get("failed", 0),
        total_dead=counts.get("dead", 0),
    )


@router.get("/messages", response_model=list[MessageOut])
async def list_messages(
    _: AdminAuth,
    db: DbSession,
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[MessageOut]:
    rows = await MessageRepository(db).list_by_status(status_filter, limit)
    return [
        MessageOut(
            id=m.id,
            external_id=m.external_id,
            status=m.status,
            sender_id=m.sender_id,
            to=m.to_phone,
            type=m.type,
            body=m.body,
            attempts=m.attempts,
            last_error=m.last_error,
            evolution_message_id=m.evolution_message_id,
            created_at=m.created_at,
            queued_at=m.queued_at,
            processing_at=m.processing_at,
            sent_at=m.sent_at,
            failed_at=m.failed_at,
            dead_at=m.dead_at,
            metadata=m.metadata_json,
        )
        for m in rows
    ]
