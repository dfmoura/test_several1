"""API território — municípios IBGE e UASGs por filial (Fase 2)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import require_login
from app.database import FilialMunicipio, FilialUasg, Usuario, get_db
from app.territorial.service import (
    TerritorialError,
    associar_municipio,
    ativar_uasg,
    desassociar_municipio,
    desativar_uasg,
    exigir_acesso,
    exigir_configurar,
    listar_catalogo_uasg,
    listar_municipios_filial,
    listar_uasgs_filial,
    resolver_municipio_ibge,
    sync_municipio_filial,
)

router = APIRouter(prefix="/api/territorial", tags=["territorial"])


class MunicipioIn(BaseModel):
    codigo_ibge: int = Field(gt=0)
    # Opcionais: se omitidos, o backend resolve via IBGE Localidades.
    nome: str | None = Field(default=None, max_length=120)
    uf: str | None = Field(default=None, max_length=2)


class MunicipioIbgeOut(BaseModel):
    codigo_ibge: int
    nome: str
    uf: str
    fonte: str


class FilialMunicipioOut(BaseModel):
    id: int
    unidade_id: int
    codigo_municipio_ibge: int
    nome: str | None = None
    uf: str | None = None
    ativo: bool
    ativado_em: datetime | None = None
    desativado_em: datetime | None = None


class UasgCatalogoOut(BaseModel):
    id: int
    codigo_uasg: str
    nome_uasg: str | None
    sigla_uf: str | None
    codigo_municipio_ibge: int | None
    nome_municipio_ibge: str | None
    status_uasg: bool | None
    monitorando: bool = False
    monitoramento_ativo: bool = False


class FilialUasgOut(BaseModel):
    id: int
    unidade_id: int
    uasg_id: int
    codigo_uasg: str | None = None
    nome_uasg: str | None = None
    ativo: bool
    ativado_em: datetime | None = None
    desativado_em: datetime | None = None


class AtivarUasgIn(BaseModel):
    uasg_id: int


class SyncOut(BaseModel):
    ok: bool
    codigo_municipio_ibge: int
    uf: str
    total_catalogo: int
    sincronizado_em: str


def _http(exc: TerritorialError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


def _mun_out(row: FilialMunicipio) -> FilialMunicipioOut:
    mun = row.municipio
    return FilialMunicipioOut(
        id=row.id,
        unidade_id=row.unidade_id,
        codigo_municipio_ibge=row.codigo_municipio_ibge,
        nome=mun.nome if mun else None,
        uf=mun.uf if mun else None,
        ativo=row.ativo,
        ativado_em=row.ativado_em,
        desativado_em=row.desativado_em,
    )


def _fu_out(row: FilialUasg) -> FilialUasgOut:
    u = row.uasg
    return FilialUasgOut(
        id=row.id,
        unidade_id=row.unidade_id,
        uasg_id=row.uasg_id,
        codigo_uasg=u.codigo_uasg if u else None,
        nome_uasg=u.nome_uasg if u else None,
        ativo=row.ativo,
        ativado_em=row.ativado_em,
        desativado_em=row.desativado_em,
    )


@router.get("/ibge/municipios/{codigo_ibge}", response_model=MunicipioIbgeOut)
def get_municipio_ibge(
    codigo_ibge: int,
    forcar: bool = False,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_login),
) -> MunicipioIbgeOut:
    """Lookup oficial IBGE (com cache local) — preenche nome/UF no cadastro."""
    try:
        data = resolver_municipio_ibge(db, codigo_ibge, forcar_remoto=forcar)
    except TerritorialError as exc:
        raise _http(exc) from exc
    return MunicipioIbgeOut(
        codigo_ibge=int(data["codigo_ibge"]),
        nome=str(data["nome"]),
        uf=str(data["uf"]),
        fonte=str(data["fonte"]),
    )


@router.get("/filiais/{unidade_id}/municipios", response_model=list[FilialMunicipioOut])
def get_municipios(
    unidade_id: int,
    apenas_ativos: bool = False,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> list[FilialMunicipioOut]:
    try:
        exigir_acesso(db, user, unidade_id)
        rows = listar_municipios_filial(db, unidade_id, apenas_ativos=apenas_ativos)
    except TerritorialError as exc:
        raise _http(exc) from exc
    return [_mun_out(r) for r in rows]


@router.post(
    "/filiais/{unidade_id}/municipios",
    response_model=FilialMunicipioOut,
    status_code=201,
)
def post_municipio(
    unidade_id: int,
    body: MunicipioIn,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> FilialMunicipioOut:
    try:
        exigir_configurar(db, user, unidade_id)
        row = associar_municipio(
            db,
            unidade_id=unidade_id,
            codigo_ibge=body.codigo_ibge,
            nome=body.nome,
            uf=body.uf,
        )
        rows = listar_municipios_filial(db, unidade_id)
        row = next(r for r in rows if r.id == row.id)
    except TerritorialError as exc:
        raise _http(exc) from exc
    return _mun_out(row)


@router.delete(
    "/filiais/{unidade_id}/municipios/{codigo_ibge}",
    response_model=FilialMunicipioOut,
)
def delete_municipio(
    unidade_id: int,
    codigo_ibge: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> FilialMunicipioOut:
    try:
        exigir_configurar(db, user, unidade_id)
        row = desassociar_municipio(db, unidade_id=unidade_id, codigo_ibge=codigo_ibge)
        rows = listar_municipios_filial(db, unidade_id)
        row = next(r for r in rows if r.id == row.id)
    except TerritorialError as exc:
        raise _http(exc) from exc
    return _mun_out(row)


@router.post(
    "/filiais/{unidade_id}/municipios/{codigo_ibge}/sync",
    response_model=SyncOut,
)
def post_sync(
    unidade_id: int,
    codigo_ibge: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> SyncOut:
    try:
        exigir_configurar(db, user, unidade_id)
        result = sync_municipio_filial(db, unidade_id=unidade_id, codigo_ibge=codigo_ibge)
    except TerritorialError as exc:
        raise _http(exc) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return SyncOut(**result)


@router.get(
    "/filiais/{unidade_id}/municipios/{codigo_ibge}/uasgs",
    response_model=list[UasgCatalogoOut],
)
def get_catalogo_uasgs(
    unidade_id: int,
    codigo_ibge: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> list[UasgCatalogoOut]:
    try:
        exigir_acesso(db, user, unidade_id)
        catalogo = listar_catalogo_uasg(db, codigo_ibge)
        mon = {
            r.uasg_id: r
            for r in listar_uasgs_filial(db, unidade_id)
        }
    except TerritorialError as exc:
        raise _http(exc) from exc
    out: list[UasgCatalogoOut] = []
    for u in catalogo:
        m = mon.get(u.id)
        out.append(
            UasgCatalogoOut(
                id=u.id,
                codigo_uasg=u.codigo_uasg,
                nome_uasg=u.nome_uasg,
                sigla_uf=u.sigla_uf,
                codigo_municipio_ibge=u.codigo_municipio_ibge,
                nome_municipio_ibge=u.nome_municipio_ibge,
                status_uasg=u.status_uasg,
                monitorando=m is not None,
                monitoramento_ativo=bool(m and m.ativo),
            )
        )
    return out


@router.get("/filiais/{unidade_id}/uasgs", response_model=list[FilialUasgOut])
def get_uasgs_filial(
    unidade_id: int,
    apenas_ativos: bool = False,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> list[FilialUasgOut]:
    try:
        exigir_acesso(db, user, unidade_id)
        rows = listar_uasgs_filial(db, unidade_id, apenas_ativos=apenas_ativos)
    except TerritorialError as exc:
        raise _http(exc) from exc
    return [_fu_out(r) for r in rows]


@router.post(
    "/filiais/{unidade_id}/uasgs",
    response_model=FilialUasgOut,
    status_code=201,
)
def post_ativar_uasg(
    unidade_id: int,
    body: AtivarUasgIn,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> FilialUasgOut:
    try:
        exigir_configurar(db, user, unidade_id)
        row = ativar_uasg(db, unidade_id=unidade_id, uasg_id=body.uasg_id)
        rows = listar_uasgs_filial(db, unidade_id)
        row = next(r for r in rows if r.id == row.id)
    except TerritorialError as exc:
        raise _http(exc) from exc
    return _fu_out(row)


@router.delete(
    "/filiais/{unidade_id}/uasgs/{uasg_id}",
    response_model=FilialUasgOut,
)
def delete_uasg(
    unidade_id: int,
    uasg_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> FilialUasgOut:
    try:
        exigir_configurar(db, user, unidade_id)
        row = desativar_uasg(db, unidade_id=unidade_id, uasg_id=uasg_id)
        rows = listar_uasgs_filial(db, unidade_id)
        row = next(r for r in rows if r.id == row.id)
    except TerritorialError as exc:
        raise _http(exc) from exc
    return _fu_out(row)
