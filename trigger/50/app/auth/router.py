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
    mapa_presenca_sessoes,
    obter_usuario,
    precisa_bootstrap,
)
from app.config import AUTH_SESSION_COOKIE, AUTH_SESSION_DIAS, cookie_secure_for_request
from app.database import Usuario, get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)
    encerrar_sessao_anterior: bool = False


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


class UsuarioListaOut(UsuarioOut):
    sessao_ativa: bool
    ultimo_acesso: datetime | None = None


class UnidadeContextoOut(BaseModel):
    id: int
    organizacao_id: int
    tipo: str
    nome: str
    codigo: str | None = None
    organizacao_nome: str | None = None
    papel_unidade: str | None = None


class EscopoOut(BaseModel):
    """Escopo efetivo derivado do login (+ filtro opcional de visão)."""

    modo: str
    rotulo: str
    filtro_unidade_id: int | None = None
    filiais_ids: list[int] = []


class MeOut(UsuarioOut):
    permissoes: dict
    unidades: list[UnidadeContextoOut] = []
    escopo: EscopoOut | None = None
    # Compat: filtro de visão opcional (não é mais a fonte de autorização)
    unidade_ativa: UnidadeContextoOut | None = None
    filtro_visao: UnidadeContextoOut | None = None


class UnidadeAtivaIn(BaseModel):
    """Filtro de visão opcional — estreita o escopo dentro do ACL do login."""

    unidade_id: int | None = None


class BootstrapStatusOut(BaseModel):
    precisa_bootstrap: bool
    limites: dict


class LimitesOut(BaseModel):
    limites: dict


def _permissoes(user: Usuario) -> dict:
    """ACL de UI/navegação — espelhado no menu e no guard de hash.

    Admin: todas as páginas do menu.
    Consulta: só o grupo Análise, sem Alertas. Compras/Propostas/CNPJs
    ainda dependem da visão filial no frontend (escopo ≠ papel).
    """
    admin = user.papel == PAPEL_ADMIN
    return {
        "papel": user.papel,
        "admin": admin,
        "paginas": {
            # Análise
            "inicio": True,
            "alertas": admin,
            "compras": True,
            "propostas": True,
            "vencedores": True,
            # Dados — só admin
            "coleta": admin,
            "enriquecimento": admin,
            "operacao": admin,
            # Cadastros — só admin
            "organizacao": admin,
            "territorio": admin,
            "configuracao": admin,
            "usuarios": admin,
            "backlog": admin,
            # Compat legada
            "consultas": True,
        },
    }


def _usuario_out(user: Usuario) -> UsuarioOut:
    return UsuarioOut.model_validate(user)


def _usuario_lista_out(user: Usuario, ultimo_acesso: datetime | None) -> UsuarioListaOut:
    return UsuarioListaOut(
        **_usuario_out(user).model_dump(),
        sessao_ativa=ultimo_acesso is not None,
        ultimo_acesso=ultimo_acesso,
    )


def _unidade_contexto(u, papel: str | None = None) -> UnidadeContextoOut:
    return UnidadeContextoOut(
        id=u.id,
        organizacao_id=u.organizacao_id,
        tipo=u.tipo,
        nome=u.nome,
        codigo=u.codigo,
        organizacao_nome=u.organizacao.nome if getattr(u, "organizacao", None) else None,
        papel_unidade=papel,
    )


def _me_out(db: Session, user: Usuario, token: str | None = None) -> MeOut:
    from app.auth.service import obter_sessao_por_token
    from app.escopo import resolver_escopo
    from app.org.service import (
        is_admin_plataforma,
        listar_vinculos_usuario,
        papel_na_unidade,
        unidades_acessiveis,
    )

    unidades = unidades_acessiveis(db, user)
    papeis: dict[int, str | None] = {}
    if is_admin_plataforma(user):
        for u in unidades:
            papeis[u.id] = "admin_plataforma"
    else:
        for u in unidades:
            papeis[u.id] = papel_na_unidade(db, user, u.id)
        for v in listar_vinculos_usuario(db, user.id):
            papeis.setdefault(v.unidade_id, v.papel)

    unidades_out = [_unidade_contexto(u, papeis.get(u.id)) for u in unidades]

    # Filtro de visão opcional (sessão) — nunca amplia o ACL
    filtro_out = None
    sessao = obter_sessao_por_token(db, token) if token else None
    filtro_id = sessao.unidade_ativa_id if sessao else None
    if filtro_id:
        match = next((u for u in unidades if u.id == filtro_id), None)
        if match:
            filtro_out = _unidade_contexto(
                match, papel_na_unidade(db, user, match.id)
            )
        else:
            from app.auth.service import definir_unidade_ativa

            definir_unidade_ativa(db, token, None, user)
            filtro_id = None

    # Escopo efetivo = login (+ filtro de visão se houver)
    ctx = resolver_escopo(
        db,
        user,
        filtro_unidade_id=filtro_id,
        usar_filtro_sessao=False,
    )
    escopo = EscopoOut(
        modo=ctx.modo,
        rotulo=ctx.rotulo,
        filtro_unidade_id=ctx.filtro_unidade_id,
        filiais_ids=list(ctx.ids_filiais or []),
    )

    return MeOut(
        **_usuario_out(user).model_dump(),
        permissoes=_permissoes(user),
        unidades=unidades_out,
        escopo=escopo,
        unidade_ativa=filtro_out,
        filtro_visao=filtro_out,
    )


def _set_cookie(response: Response, token: str, *, secure: bool = False) -> None:
    response.set_cookie(
        key=AUTH_SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=AUTH_SESSION_DIAS * 24 * 3600,
        path="/",
    )


def _clear_cookie(response: Response, *, secure: bool = False) -> None:
    response.delete_cookie(key=AUTH_SESSION_COOKIE, path="/", secure=secure)


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
    request: Request,
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
    _set_cookie(
        response,
        sessao.token,
        secure=cookie_secure_for_request(request.url.scheme),
    )
    return _me_out(db, user, sessao.token)


@router.post("/login", response_model=MeOut)
def login(
    body: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> MeOut:
    try:
        user = autenticar(db, body.username, body.password)
        from app.ops.acesso import (
            acesso_restrito_ativo,
            mensagem_acesso_restrito,
            usuario_pode_acessar_em_restricao,
        )

        if acesso_restrito_ativo(db) and not usuario_pode_acessar_em_restricao(user):
            raise AuthError(mensagem_acesso_restrito(db), status_code=403)
        sessao = criar_sessao(
            db,
            user,
            token_atual=request.cookies.get(AUTH_SESSION_COOKIE),
            substituir_ativa=bool(body.encerrar_sessao_anterior),
        )
    except AuthError as exc:
        raise _http_from_auth(exc) from exc
    _set_cookie(
        response,
        sessao.token,
        secure=cookie_secure_for_request(request.url.scheme),
    )
    return _me_out(db, user, sessao.token)


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    token = request.cookies.get(AUTH_SESSION_COOKIE)
    encerrar_sessao(db, token)
    _clear_cookie(
        response,
        secure=cookie_secure_for_request(request.url.scheme),
    )
    return {"ok": True}


@router.get("/me", response_model=MeOut)
def me(
    request: Request,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> MeOut:
    return _me_out(db, user, request.cookies.get(AUTH_SESSION_COOKIE))


@router.post("/unidade-ativa", response_model=MeOut)
@router.post("/filtro-visao", response_model=MeOut)
def post_filtro_visao(
    body: UnidadeAtivaIn,
    request: Request,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> MeOut:
    """Define filtro de visão opcional (compat: /unidade-ativa).

    Não altera autorização: o escopo vem dos vínculos do login.
    """
    from app.auth.service import definir_unidade_ativa

    token = request.cookies.get(AUTH_SESSION_COOKIE)
    try:
        definir_unidade_ativa(db, token, body.unidade_id, user)
    except AuthError as exc:
        raise _http_from_auth(exc) from exc
    return _me_out(db, user, token)


@router.get("/limites", response_model=LimitesOut)
def limites(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> LimitesOut:
    return LimitesOut(limites=limites_atual(db))


@router.get("/usuarios", response_model=list[UsuarioListaOut])
def get_usuarios(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> list[UsuarioListaOut]:
    presenca = mapa_presenca_sessoes(db)
    return [_usuario_lista_out(u, presenca.get(u.id)) for u in listar_usuarios(db)]


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
