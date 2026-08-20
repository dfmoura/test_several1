from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response

from app.api.deps import DbSession
from app.core.security import cookie_kwargs
from app.domain.exceptions import AppError
from app.schemas import LoginIn, RegisterIn, TokenOut
from app.services.account import AccountService, token_out

router = APIRouter(prefix="/v1/auth", tags=["auth"])


def _set_session(response: Response, token: str) -> None:
    kwargs = cookie_kwargs()
    response.set_cookie(value=token, **kwargs)


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(body: RegisterIn, response: Response, db: DbSession) -> TokenOut:
    try:
        account, token = await AccountService(db).register(
            body.name, body.email, body.password
        )
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    _set_session(response, token)
    return TokenOut(**token_out(account, token))


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, response: Response, db: DbSession) -> TokenOut:
    try:
        account, token = await AccountService(db).login(body.email, body.password)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    _set_session(response, token)
    return TokenOut(**token_out(account, token))


@router.post("/logout")
async def logout(response: Response) -> dict[str, str]:
    kwargs = cookie_kwargs()
    response.delete_cookie(key=kwargs["key"], path=kwargs["path"])
    return {"status": "ok"}
