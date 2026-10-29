"""API de configuração herdada — Fase 3."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import require_admin, require_login
from app.config_coleta.service import (
    ConfigError,
    autorizar_excecoes_filial,
    definir_valor,
    garantir_configuracao,
    limpar_excecao_filial,
    listar_historico,
    listar_parametros,
    pode_editar_escopo,
    resolver_efetiva,
)
from app.database import Usuario, get_db
from app.org.service import is_admin_plataforma

router = APIRouter(prefix="/api/config", tags=["config"])


class ParametroOut(BaseModel):
    id: int
    chave: str
    nome: str
    descricao: str | None
    tipo_valor: str
    modulo: str | None
    valor_padrao: str | None
    permite_excecao_filial: bool

    model_config = {"from_attributes": True}


class ValorEfetivoOut(BaseModel):
    parametro_id: int
    chave: str
    nome: str
    descricao: str | None = None
    tipo_valor: str
    modulo: str | None = None
    valor: str | None
    origem: str
    escopo_fonte: str | None = None
    permite_excecao_filial: bool
    valor_padrao: str | None = None
    excecoes_filial_autorizadas: bool | None = None


class DefinirValorIn(BaseModel):
    escopo: str = Field(max_length=20)
    chave: str = Field(max_length=80)
    valor: str | None = None
    unidade_id: int | None = None
    motivo: str | None = Field(default=None, max_length=300)


class AutorizarExcecaoIn(BaseModel):
    autorizar: bool


class HistoricoOut(BaseModel):
    id: int
    configuracao_id: int
    usuario_id: int | None
    data_alteracao: datetime | None
    valores_anteriores: str | None
    valores_novos: str | None
    motivo: str | None


def _http(exc: ConfigError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/parametros", response_model=list[ParametroOut])
def get_parametros(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_login),
) -> list[ParametroOut]:
    return [ParametroOut.model_validate(p) for p in listar_parametros(db)]


@router.get("/efetiva", response_model=list[ValorEfetivoOut])
def get_efetiva(
    unidade_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> list[ValorEfetivoOut]:
    from app.org.service import usuario_acessa_unidade

    if unidade_id is not None and not is_admin_plataforma(user):
        if not usuario_acessa_unidade(db, user, unidade_id):
            raise HTTPException(status_code=403, detail="Sem acesso a esta unidade.")
    try:
        rows = resolver_efetiva(db, unidade_id=unidade_id)
    except ConfigError as exc:
        raise _http(exc) from exc
    return [ValorEfetivoOut(**r) for r in rows]


@router.put("/valores")
def put_valor(
    body: DefinirValorIn,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> dict:
    if not pode_editar_escopo(db, user, body.escopo, body.unidade_id):
        raise HTTPException(status_code=403, detail="Sem permissão para este escopo.")
    try:
        return definir_valor(
            db,
            escopo=body.escopo,
            chave=body.chave,
            valor=body.valor,
            usuario_id=user.id if user.id else None,
            unidade_id=body.unidade_id,
            motivo=body.motivo,
        )
    except ConfigError as exc:
        raise _http(exc) from exc


@router.delete("/filiais/{unidade_id}/excecoes/{chave}")
def delete_excecao(
    unidade_id: int,
    chave: str,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> dict:
    if not pode_editar_escopo(db, user, "filial", unidade_id):
        raise HTTPException(status_code=403, detail="Sem permissão.")
    try:
        return limpar_excecao_filial(
            db,
            unidade_id=unidade_id,
            chave=chave,
            usuario_id=user.id if user.id else None,
        )
    except ConfigError as exc:
        raise _http(exc) from exc


@router.post("/filiais/{unidade_id}/autorizar-excecoes")
def post_autorizar(
    unidade_id: int,
    body: AutorizarExcecaoIn,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> dict:
    # Admin plataforma ou gestor/admin da matriz da filial
    from app.database import Unidade
    from app.org.service import papel_na_unidade

    unidade = db.get(Unidade, unidade_id)
    if unidade is None:
        raise HTTPException(status_code=404, detail="Unidade não encontrada.")
    if not is_admin_plataforma(user):
        matriz_id = unidade.matriz_id
        if matriz_id is None:
            raise HTTPException(status_code=400, detail="Filial sem matriz.")
        papel = papel_na_unidade(db, user, matriz_id)
        if papel not in {"admin_matriz", "gestor_matriz", "admin_plataforma"}:
            raise HTTPException(
                status_code=403,
                detail="Somente a matriz (ou admin geral) autoriza exceções.",
            )
    try:
        u = autorizar_excecoes_filial(db, unidade_id=unidade_id, autorizar=body.autorizar)
    except ConfigError as exc:
        raise _http(exc) from exc
    return {
        "unidade_id": u.id,
        "excecoes_config_autorizadas": u.excecoes_config_autorizadas,
    }


@router.post("/garantir")
def post_garantir(
    escopo: str = Query(...),
    unidade_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_login),
) -> dict:
    if not pode_editar_escopo(db, user, escopo, unidade_id):
        # leitura/criação inicial: admin pode sempre; demais precisam editar
        if not is_admin_plataforma(user) and not pode_editar_escopo(db, user, escopo, unidade_id):
            raise HTTPException(status_code=403, detail="Sem permissão.")
    try:
        cfg = garantir_configuracao(db, escopo=escopo, unidade_id=unidade_id)
    except ConfigError as exc:
        raise _http(exc) from exc
    return {
        "id": cfg.id,
        "escopo": cfg.escopo,
        "unidade_id": cfg.unidade_id,
        "versao": cfg.versao,
        "situacao": cfg.situacao,
    }


@router.get("/historico/{configuracao_id}", response_model=list[HistoricoOut])
def get_historico(
    configuracao_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
) -> list[HistoricoOut]:
    rows = listar_historico(db, configuracao_id)
    return [
        HistoricoOut(
            id=r.id,
            configuracao_id=r.configuracao_id,
            usuario_id=r.usuario_id,
            data_alteracao=r.data_alteracao,
            valores_anteriores=r.valores_anteriores,
            valores_novos=r.valores_novos,
            motivo=r.motivo,
        )
        for r in rows
    ]
