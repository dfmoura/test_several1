"""Dependências FastAPI: require_login / require_admin."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth.service import PAPEL_ADMIN, obter_usuario_por_token
from app.config import AUTH_SESSION_COOKIE, auth_disabled
from app.database import Usuario, get_db


def _token_da_request(request: Request) -> str | None:
    return request.cookies.get(AUTH_SESSION_COOKIE)


def require_login(
    request: Request,
    db: Session = Depends(get_db),
) -> Usuario:
    if auth_disabled():
        return Usuario(
            id=0,
            username="__auth_disabled__",
            senha_hash="",
            papel=PAPEL_ADMIN,
            ativo=True,
        )
    user = obter_usuario_por_token(db, _token_da_request(request))
    if user is None:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")
    return user


def require_admin(
    user: Annotated[Usuario, Depends(require_login)],
) -> Usuario:
    if auth_disabled():
        return user
    if user.papel != PAPEL_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Acesso restrito a administradores.",
        )
    return user


get_current_user = require_login
