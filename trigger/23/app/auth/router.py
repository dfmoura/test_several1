"""Rotas HTTP de autenticação e gestão de usuários."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import require_admin, require_login
from app.auth.service import (
    AuthError,
    PAPEL_ADMIN,
    atualizar_usuario,
    autenticar,
    criar_sessao,
    criar_usuario,
    encerrar_sessao,
    encerrar_sessoes_usuario,
    limites_atual,
    listar_sessoes_ativas,
    listar_usuarios,
    obter_usuario,
    precisa_bootstrap,
)
from app.config import AUTH_SESSION_COOKIE, AUTH_SESSION_DIAS
from app.database import Usuario, get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class BootstrapIn(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=200)


class UsuarioCreateIn(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=200)
    papel: str = Field(default="consulta", max_length=20)


class UsuarioUpdateIn(BaseModel):
    ativo: bool | None = None
    password: str | None = Field(default=None, min_length=6, max_length=200)
    papel: str | None = Field(default=None, max_length=20)


class UsuarioOut(BaseModel):
    id: int
    username: str
    papel: str
    ativo: bool
    criado_em: datetime | None = None

    model_config = {"from_attributes": True}


class MeOut(UsuarioOut):
    permissoes: dict


class BootstrapStatusOut(BaseModel):
    precisa_bootstrap: bool
    limites: dict


class LimitesOut(BaseModel):
    limites: dict


def _permissoes(user: Usuario) -> dict:
    admin = user.papel == PAPEL_ADMIN
    return {
        "papel": user.papel,
        "admin": admin,
        "paginas": {
            "dashboard": True,
            "localidade": True,
            "consulta": True,
            "propostas": True,
            "compras": True,
            "powerbi": True,
            "vinculos": True,
            "observadores": True,
            "coleta": admin,
            "vencedores": True,
            "setup": admin,
        },
    }


def _usuario_out(user: Usuario) -> UsuarioOut:
    return UsuarioOut.model_validate(user)


def _me_out(user: Usuario) -> MeOut:
    return MeOut(**_usuario_out(user).model_dump(), permissoes=_permissoes(user))


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=AUTH_SESSION_DIAS * 24 * 3600,
        path="/",
    )


def _clear_cookie(response: Response) -> None:
    response.delete_cookie(key=AUTH_SESSION_COOKIE, path="/")


def _http_from_auth(exc: AuthError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/bootstrap-status", response_model=BootstrapStatusOut)
def bootstrap_status(db: Session = Depends(get_db)) -> BootstrapStatusOut:
    return BootstrapStatusOut(
        precisa_bootstrap=precisa_bootstrap(db),
        limites=limites_atual(db),
    )


@router.post("/bootstrap", response_model=MeOut)
def bootstrap_admin(
    body: BootstrapIn,
    response: Response,
    db: Session = Depends(get_db),
) -> MeOut:
    if not precisa_bootstrap(db):
        raise HTTPException(
            status_code=409,
            detail="Bootstrap já realizado. Use o login normal.",
        )
    try:
        user = criar_usuario(
            db,
            username=body.username,
            senha=body.password,
            papel=PAPEL_ADMIN,
        )
        sessao = criar_sessao(db, user)
    except AuthError as exc:
        raise _http_from_auth(exc) from exc
    _set_cookie(response, sessao.token)
    return _me_out(user)


@router.post("/login", response_model=MeOut)
def login(
    body: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> MeOut:
    """Login com sessão única por usuário (não derruba quem já está dentro)."""
    try:
        user = autenticar(db, body.username, body.password)
        sessao = criar_sessao(
            db,
            user,
            token_atual=request.cookies.get(AUTH_SESSION_COOKIE),
        )
    except AuthError as exc:
        raise _http_from_auth(exc) from exc
    _set_cookie(response, sessao.token)
    return _me_out(user)


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    token = request.cookies.get(AUTH_SESSION_COOKIE)
    encerrar_sessao(db, token)
    _clear_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=MeOut)
def me(user: Usuario = Depends(require_login)) -> MeOut:
    return _me_out(user)


@router.get("/limites", response_model=LimitesOut)
def limites(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> LimitesOut:
    return LimitesOut(limites=limites_atual(db))


@router.get("/usuarios", response_model=list[UsuarioOut])
def get_usuarios(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> list[UsuarioOut]:
    return [_usuario_out(u) for u in listar_usuarios(db)]


@router.post("/usuarios", response_model=UsuarioOut, status_code=201)
def post_usuario(
    body: UsuarioCreateIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> UsuarioOut:
    try:
        user = criar_usuario(
            db,
            username=body.username,
            senha=body.password,
            papel=body.papel,
        )
    except AuthError as exc:
        raise _http_from_auth(exc) from exc
    return _usuario_out(user)


@router.patch("/usuarios/{uid}", response_model=UsuarioOut)
def patch_usuario(
    uid: int,
    body: UsuarioUpdateIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> UsuarioOut:
    try:
        user = atualizar_usuario(
            db,
            uid,
            ativo=body.ativo,
            nova_senha=body.password,
            papel=body.papel,
        )
    except AuthError as exc:
        raise _http_from_auth(exc) from exc
    return _usuario_out(user)


@router.post("/usuarios/{uid}/liberar-sessao")
def liberar_sessao_usuario(
    uid: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> dict:
    """Encerra sessões ativas da conta (admin) — libera login após sessão órfã."""
    try:
        user = obter_usuario(db, uid)
    except AuthError as exc:
        raise _http_from_auth(exc) from exc
    ativas = listar_sessoes_ativas(db, user.id)
    encerrar_sessoes_usuario(db, user.id)
    return {
        "ok": True,
        "usuario_id": user.id,
        "username": user.username,
        "sessoes_encerradas": len(ativas),
    }
