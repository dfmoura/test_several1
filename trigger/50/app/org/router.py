"""API organizacional — Fase 1."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import require_admin, require_login
from app.database import Usuario, Unidade, UsuarioUnidade, get_db
from app.org.service import (
    OrgError,
    atualizar_organizacao,
    atualizar_unidade,
    atualizar_vinculo,
    criar_organizacao,
    criar_unidade,
    desvincular_usuario,
    excluir_organizacao,
    excluir_unidade,
    excluir_vinculo,
    impacto_exclusao_organizacao,
    impacto_exclusao_unidade,
    is_admin_plataforma,
    listar_organizacoes,
    listar_unidades_org,
    listar_usuarios_unidade,
    listar_vinculos_usuario,
    obter_organizacao,
    obter_unidade,
    unidades_acessiveis,
    usuario_acessa_unidade,
    vincular_usuario,
)

router = APIRouter(prefix="/api/org", tags=["org"])


class OrganizacaoIn(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    codigo: str | None = Field(default=None, max_length=40)


class OrganizacaoUpdateIn(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=200)
    codigo: str | None = Field(default=None, max_length=40)
    ativo: bool | None = None


class OrganizacaoExclusaoIn(BaseModel):
    """Confirmação tipada: código da org (ou nome, se sem código)."""

    confirmacao: str = Field(min_length=1, max_length=200)


class UnidadeExclusaoIn(BaseModel):
    """Confirmação tipada: código da unidade (ou nome, se sem código)."""

    confirmacao: str = Field(min_length=1, max_length=200)


class OrganizacaoOut(BaseModel):
    id: int
    nome: str
    codigo: str | None
    ativo: bool
    criado_em: datetime | None = None

    model_config = {"from_attributes": True}


class UnidadeIn(BaseModel):
    tipo: str = Field(max_length=20)
    nome: str = Field(min_length=2, max_length=200)
    codigo: str | None = Field(default=None, max_length=40)
    matriz_id: int | None = None
    cnpj: str | None = Field(default=None, max_length=18)
    observacoes: str | None = None


class UnidadeUpdateIn(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=200)
    codigo: str | None = Field(default=None, max_length=40)
    cnpj: str | None = Field(default=None, max_length=18)
    ativo: bool | None = None
    observacoes: str | None = None


class UnidadeOut(BaseModel):
    id: int
    organizacao_id: int
    tipo: str
    nome: str
    codigo: str | None
    matriz_id: int | None
    cnpj: str | None
    ativo: bool
    excecoes_config_autorizadas: bool = False
    organizacao_nome: str | None = None
    observacoes: str | None = None

    model_config = {"from_attributes": True}


class VinculoIn(BaseModel):
    usuario_id: int
    papel: str = Field(max_length=40)


class VinculoUpdateIn(BaseModel):
    """Atualização parcial do vínculo (papel e/ou ativo)."""

    papel: str | None = Field(default=None, max_length=40)
    ativo: bool | None = None


class VinculoOut(BaseModel):
    id: int
    usuario_id: int
    unidade_id: int
    papel: str
    ativo: bool
    username: str | None = None


def _http(exc: OrgError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


def _unidade_out(u: Unidade) -> UnidadeOut:
    return UnidadeOut(
        id=u.id,
        organizacao_id=u.organizacao_id,
        tipo=u.tipo,
        nome=u.nome,
        codigo=u.codigo,
        matriz_id=u.matriz_id,
        cnpj=u.cnpj,
        ativo=u.ativo,
        excecoes_config_autorizadas=bool(getattr(u, "excecoes_config_autorizadas", False)),
        organizacao_nome=u.organizacao.nome if u.organizacao else None,
        observacoes=u.observacoes,
    )


def _vinculo_out(v: UsuarioUnidade) -> VinculoOut:
    return VinculoOut(
        id=v.id,
        usuario_id=v.usuario_id,
        unidade_id=v.unidade_id,
        papel=v.papel,
        ativo=v.ativo,
        username=v.usuario.username if v.usuario else None,
    )


def _exigir_acesso_unidade(db: Session, user: Usuario, unidade_id: int) -> None:
    if not usuario_acessa_unidade(db, user, unidade_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta unidade.")


@router.get("/organizacoes", response_model=list[OrganizacaoOut])
def get_organizacoes(
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> list[OrganizacaoOut]:
    return [OrganizacaoOut.model_validate(o) for o in listar_organizacoes(db, user)]


@router.post("/organizacoes", response_model=OrganizacaoOut, status_code=201)
def post_organizacao(
    body: OrganizacaoIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> OrganizacaoOut:
    try:
        org = criar_organizacao(db, nome=body.nome, codigo=body.codigo)
    except OrgError as exc:
        raise _http(exc) from exc
    return OrganizacaoOut.model_validate(org)


@router.get("/organizacoes/{org_id}", response_model=OrganizacaoOut)
def get_organizacao(
    org_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> OrganizacaoOut:
    try:
        org = obter_organizacao(db, org_id)
    except OrgError as exc:
        raise _http(exc) from exc
    if not is_admin_plataforma(user):
        acessiveis = {u.organizacao_id for u in unidades_acessiveis(db, user)}
        if org.id not in acessiveis:
            raise HTTPException(status_code=403, detail="Sem acesso a esta organização.")
    return OrganizacaoOut.model_validate(org)


@router.patch("/organizacoes/{org_id}", response_model=OrganizacaoOut)
def patch_organizacao(
    org_id: int,
    body: OrganizacaoUpdateIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> OrganizacaoOut:
    try:
        org = atualizar_organizacao(
            db,
            org_id,
            nome=body.nome,
            codigo=body.codigo,
            ativo=body.ativo,
        )
    except OrgError as exc:
        raise _http(exc) from exc
    return OrganizacaoOut.model_validate(org)


@router.get("/organizacoes/{org_id}/impacto-exclusao")
def get_impacto_exclusao(
    org_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> dict:
    """Prévia do que a exclusão definitiva remove (admin plataforma)."""
    try:
        return impacto_exclusao_organizacao(db, org_id)
    except OrgError as exc:
        raise _http(exc) from exc


@router.delete("/organizacoes/{org_id}")
def delete_organizacao(
    org_id: int,
    body: OrganizacaoExclusaoIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> dict:
    """Exclusão definitiva: organização + unidades + vínculos + território/config de escopo."""
    try:
        return excluir_organizacao(db, org_id, confirmacao=body.confirmacao)
    except OrgError as exc:
        raise _http(exc) from exc


@router.get("/organizacoes/{org_id}/unidades", response_model=list[UnidadeOut])
def get_unidades_org(
    org_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> list[UnidadeOut]:
    try:
        rows = listar_unidades_org(db, org_id, user)
    except OrgError as exc:
        raise _http(exc) from exc
    return [_unidade_out(u) for u in rows]


@router.post(
    "/organizacoes/{org_id}/unidades",
    response_model=UnidadeOut,
    status_code=201,
)
def post_unidade(
    org_id: int,
    body: UnidadeIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> UnidadeOut:
    try:
        criada = criar_unidade(
            db,
            organizacao_id=org_id,
            tipo=body.tipo,
            nome=body.nome,
            codigo=body.codigo,
            matriz_id=body.matriz_id,
            cnpj=body.cnpj,
            observacoes=body.observacoes,
        )
        from sqlalchemy import select
        from sqlalchemy.orm import joinedload

        u = db.scalar(
            select(Unidade)
            .where(Unidade.id == criada.id)
            .options(joinedload(Unidade.organizacao))
        )
    except OrgError as exc:
        raise _http(exc) from exc
    assert u is not None
    return _unidade_out(u)


@router.get("/unidades", response_model=list[UnidadeOut])
def get_minhas_unidades(
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> list[UnidadeOut]:
    return [_unidade_out(u) for u in unidades_acessiveis(db, user)]


@router.get("/unidades/{unidade_id}", response_model=UnidadeOut)
def get_unidade(
    unidade_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> UnidadeOut:
    try:
        from sqlalchemy import select
        from sqlalchemy.orm import joinedload

        u = db.scalar(
            select(Unidade)
            .where(Unidade.id == unidade_id)
            .options(joinedload(Unidade.organizacao))
        )
        if u is None:
            raise OrgError("Unidade não encontrada.", status_code=404)
    except OrgError as exc:
        raise _http(exc) from exc
    _exigir_acesso_unidade(db, user, unidade_id)
    return _unidade_out(u)


@router.patch("/unidades/{unidade_id}", response_model=UnidadeOut)
def patch_unidade(
    unidade_id: int,
    body: UnidadeUpdateIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> UnidadeOut:
    try:
        u = atualizar_unidade(
            db,
            unidade_id,
            nome=body.nome,
            codigo=body.codigo,
            cnpj=body.cnpj,
            ativo=body.ativo,
            observacoes=body.observacoes,
        )
        from sqlalchemy import select
        from sqlalchemy.orm import joinedload

        u = db.scalar(
            select(Unidade)
            .where(Unidade.id == u.id)
            .options(joinedload(Unidade.organizacao))
        )
    except OrgError as exc:
        raise _http(exc) from exc
    assert u is not None
    return _unidade_out(u)


@router.get("/unidades/{unidade_id}/impacto-exclusao")
def get_impacto_exclusao_unidade(
    unidade_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> dict:
    """Prévia do que a exclusão definitiva da unidade remove (admin plataforma)."""
    try:
        return impacto_exclusao_unidade(db, unidade_id)
    except OrgError as exc:
        raise _http(exc) from exc


@router.delete("/unidades/{unidade_id}")
def delete_unidade(
    unidade_id: int,
    body: UnidadeExclusaoIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> dict:
    """Exclusão definitiva: unidade + vínculos + território/config de escopo."""
    try:
        return excluir_unidade(db, unidade_id, confirmacao=body.confirmacao)
    except OrgError as exc:
        raise _http(exc) from exc


@router.get("/unidades/{unidade_id}/usuarios", response_model=list[VinculoOut])
def get_usuarios_unidade(
    unidade_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> list[VinculoOut]:
    _exigir_acesso_unidade(db, user, unidade_id)
    if not is_admin_plataforma(user):
        # gestores/admin da unidade: por enquanto só admin plataforma gerencia vínculos
        # leitura liberada a quem acessa a unidade
        pass
    try:
        rows = listar_usuarios_unidade(db, unidade_id)
    except OrgError as exc:
        raise _http(exc) from exc
    return [_vinculo_out(v) for v in rows]


@router.post(
    "/unidades/{unidade_id}/usuarios",
    response_model=VinculoOut,
    status_code=201,
)
def post_vinculo(
    unidade_id: int,
    body: VinculoIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> VinculoOut:
    try:
        v = vincular_usuario(
            db,
            unidade_id=unidade_id,
            usuario_id=body.usuario_id,
            papel=body.papel,
        )
        rows = listar_usuarios_unidade(db, unidade_id)
        v = next(r for r in rows if r.id == v.id)
    except OrgError as exc:
        raise _http(exc) from exc
    return _vinculo_out(v)


@router.patch(
    "/unidades/{unidade_id}/usuarios/{usuario_id}",
    response_model=VinculoOut,
)
def patch_vinculo(
    unidade_id: int,
    usuario_id: int,
    body: VinculoUpdateIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> VinculoOut:
    try:
        v = atualizar_vinculo(
            db,
            unidade_id=unidade_id,
            usuario_id=usuario_id,
            papel=body.papel,
            ativo=body.ativo,
        )
        rows = listar_usuarios_unidade(db, unidade_id)
        v = next(r for r in rows if r.id == v.id)
    except OrgError as exc:
        raise _http(exc) from exc
    return _vinculo_out(v)


@router.delete("/unidades/{unidade_id}/usuarios/{usuario_id}")
def delete_vinculo(
    unidade_id: int,
    usuario_id: int,
    permanente: bool = False,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> dict:
    """Por padrão desativa o vínculo. Com permanente=1 remove o registro."""
    try:
        if permanente:
            return excluir_vinculo(db, unidade_id, usuario_id)
        desvincular_usuario(db, unidade_id, usuario_id)
    except OrgError as exc:
        raise _http(exc) from exc
    return {"ok": True}


@router.get("/me/vinculos", response_model=list[VinculoOut])
def get_meus_vinculos(
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> list[VinculoOut]:
    if is_admin_plataforma(user):
        return []
    return [_vinculo_out(v) for v in listar_vinculos_usuario(db, user.id)]
