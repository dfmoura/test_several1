from __future__ import annotations

from typing import Annotated

import redis.asyncio as redis
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    decode_access_token,
    extract_session_token,
    require_admin_token,
)
from app.domain.exceptions import AppError
from app.models import Account, Sender
from app.queue.topology import QueuePublisher
from app.services.account import AccountService
from app.services.auth import SenderAuthService
from app.services.rate_limit import RateLimiter


async def get_redis(request: Request) -> redis.Redis:
    return request.app.state.redis


async def get_publisher(request: Request) -> QueuePublisher:
    return request.app.state.publisher


async def get_rate_limiter(
    redis_client: Annotated[redis.Redis, Depends(get_redis)],
) -> RateLimiter:
    return RateLimiter(redis_client)


async def get_current_account(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> Account:
    token = extract_session_token(request, authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "Faça login para continuar"},
        )
    account_id = decode_access_token(token)
    try:
        return await AccountService(db).get(account_id)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc


async def get_current_sender(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
    x_sender_key: Annotated[str | None, Header(alias="X-Sender-Key")] = None,
) -> Sender:
    api_key: str | None = None
    if x_sender_key:
        api_key = x_sender_key
    elif authorization and authorization.lower().startswith("bearer "):
        api_key = authorization[7:].strip()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "Missing API key"},
        )

    try:
        return await SenderAuthService(db).authenticate(api_key, for_send=True)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc


AdminAuth = Annotated[None, Depends(require_admin_token)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentAccount = Annotated[Account, Depends(get_current_account)]
CurrentSender = Annotated[Sender, Depends(get_current_sender)]
PublisherDep = Annotated[QueuePublisher, Depends(get_publisher)]
RateLimiterDep = Annotated[RateLimiter, Depends(get_rate_limiter)]
RedisDep = Annotated[redis.Redis, Depends(get_redis)]
