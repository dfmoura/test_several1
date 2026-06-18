"""API Power BI / Dados Abertos PMU — módulo isolado (removível)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.config import POWERBI_DATASETS, POWERBI_PANEL_URL
from app.database import (
    PowerBiContrato,
    PowerBiGestorFiscal,
    PowerBiLicitacao,
    SessionLocal,
    get_db,
)
from app.powerbi_coletor import coletar as coletar_powerbi

router = APIRouter(tags=["powerbi"])

_coleta_status: dict[str, Any] = {"running": False, "log": [], "resultado": None}


class PowerBiColetaRequest(BaseModel):
    anos: list[int] = Field(min_length=1)
    datasets: list[str] = Field(
        default=["licitacoes", "contratos", "gestores"],
        description="licitacoes | contratos | gestores",
    )


class PowerBiLicitacaoOut(BaseModel):
    id: int
    ano_processo: int
    chave: str | None = None
    processo: str
    modalidade: str
    objeto: str | None = None
    solicitante: str | None = None
    empresa: str
    situacao: str | None = None
    ds_habilitacao: str | None = None
    dt_abertura: str | None = None
    dt_habilitacao: str | None = None
    dt_julgamento: str | None = None
    dt_homologacao: str | None = None
    valor_licitacao: str | None = None
    fonte_ano_coleta: int
    observador_id: int | None = None
    observador_nome: str | None = None
    coletado_em: datetime | None = None

    model_config = {"from_attributes": True}


class PowerBiContratoOut(BaseModel):
    id: int
    ano_contrato: int
    ano_processo: int | None = None
    ds_objeto_contrato: str | None = None
    dt_assinatura: str | None = None
    empresa: str
    nm_pessoa: str | None = None
    nr_aditivo: str | None = None
    nr_contrato: str
    nr_parcela: str | None = None
    processo: str | None = None
    vr_inicial: str | None = None
    fonte_ano_coleta: int
    observador_id: int | None = None
    observador_nome: str | None = None
    coletado_em: datetime | None = None

    model_config = {"from_attributes": True}


class PowerBiGestorOut(BaseModel):
    id: int
    ano_contrato: int
    ds_orgao: str | None = None
    ds_papeis: str | None = None
    dt_assinatura: str | None = None
    dt_fim: str | None = None
    dt_inicio: str | None = None
    fornecedor: str | None = None
    nm_pessoa_papel: str
    nr_contrato: str
    objeto_contrato: str | None = None
    observador_id: int | None = None
    observador_nome: str | None = None
    coletado_em: datetime | None = None

    model_config = {"from_attributes": True}


class PowerBiObservadorUpdate(BaseModel):
    observador_id: int | None = None


def _lic_out(row: PowerBiLicitacao) -> PowerBiLicitacaoOut:
    data = {c: getattr(row, c) for c in PowerBiLicitacaoOut.model_fields if c != "observador_nome"}
    data["observador_nome"] = row.observador.nome if row.observador else None
    return PowerBiLicitacaoOut(**data)


def _con_out(row: PowerBiContrato) -> PowerBiContratoOut:
    data = {c: getattr(row, c) for c in PowerBiContratoOut.model_fields if c != "observador_nome"}
    data["observador_nome"] = row.observador.nome if row.observador else None
    return PowerBiContratoOut(**data)


def _gest_out(row: PowerBiGestorFiscal) -> PowerBiGestorOut:
    data = {c: getattr(row, c) for c in PowerBiGestorOut.model_fields if c != "observador_nome"}
    data["observador_nome"] = row.observador.nome if row.observador else None
    return PowerBiGestorOut(**data)


def _run_coleta(anos: list[int], datasets: list[str]) -> None:
    db = SessionLocal()
    try:
        resultado = coletar_powerbi(
            db,
            anos,
            datasets,
            on_log=lambda m: _coleta_status["log"].append(m),
        )
        _coleta_status["resultado"] = {"ok": True, **resultado}
    except Exception as exc:
        _coleta_status["log"].append(f"Erro: {exc}")
        _coleta_status["resultado"] = {"ok": False, "erro": str(exc)}
    finally:
        db.close()
        _coleta_status["running"] = False


@router.get("/api/powerbi/fontes")
def fontes():
    return {
        "painel_url": POWERBI_PANEL_URL,
        "datasets": [
            {"id": k, "nome": v["nome"], "endpoint": v["endpoint"]}
            for k, v in POWERBI_DATASETS.items()
        ],
    }


@router.get("/api/powerbi/stats")
def stats(db: Session = Depends(get_db)):
    return {
        "licitacoes": db.scalar(select(func.count()).select_from(PowerBiLicitacao)) or 0,
        "contratos": db.scalar(select(func.count()).select_from(PowerBiContrato)) or 0,
        "gestores": db.scalar(select(func.count()).select_from(PowerBiGestorFiscal)) or 0,
    }


@router.post("/api/powerbi/coletar")
def iniciar_coleta(req: PowerBiColetaRequest, bg: BackgroundTasks):
    invalidos = [d for d in req.datasets if d not in POWERBI_DATASETS]
    if invalidos:
        raise HTTPException(400, f"Datasets inválidos: {', '.join(invalidos)}")
    precisa_ano = any(d in req.datasets for d in ("licitacoes", "contratos"))
    if precisa_ano and not req.anos:
        raise HTTPException(400, "Informe ao menos um ano para licitações/contratos")
    if _coleta_status["running"]:
        raise HTTPException(409, "Já existe uma coleta Power BI em andamento")

    _coleta_status.update(running=True, log=[], resultado=None)
    bg.add_task(_run_coleta, req.anos, req.datasets)
    return {"status": "iniciada", "anos": req.anos, "datasets": req.datasets}


@router.get("/api/powerbi/coletar/status")
def status_coleta():
    return _coleta_status


@router.get("/api/powerbi/licitacoes/empresas")
def licitacoes_empresas(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PowerBiLicitacao.empresa)
        .distinct()
        .where(PowerBiLicitacao.empresa.isnot(None), PowerBiLicitacao.empresa != "")
        .order_by(PowerBiLicitacao.empresa)
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/licitacoes/situacoes")
def licitacoes_situacoes(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PowerBiLicitacao.situacao)
        .distinct()
        .where(PowerBiLicitacao.situacao.isnot(None), PowerBiLicitacao.situacao != "")
        .order_by(PowerBiLicitacao.situacao)
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/licitacoes/modalidades")
def licitacoes_modalidades(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PowerBiLicitacao.modalidade)
        .distinct()
        .where(PowerBiLicitacao.modalidade.isnot(None), PowerBiLicitacao.modalidade != "")
        .order_by(PowerBiLicitacao.modalidade)
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/contratos/empresas")
def contratos_empresas(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PowerBiContrato.empresa)
        .distinct()
        .where(PowerBiContrato.empresa.isnot(None), PowerBiContrato.empresa != "")
        .order_by(PowerBiContrato.empresa)
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/gestores/orgaos")
def gestores_orgaos(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PowerBiGestorFiscal.ds_orgao)
        .distinct()
        .where(PowerBiGestorFiscal.ds_orgao.isnot(None), PowerBiGestorFiscal.ds_orgao != "")
        .order_by(PowerBiGestorFiscal.ds_orgao)
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/gestores/papeis")
def gestores_papeis(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PowerBiGestorFiscal.ds_papeis)
        .distinct()
        .where(PowerBiGestorFiscal.ds_papeis.isnot(None), PowerBiGestorFiscal.ds_papeis != "")
        .order_by(PowerBiGestorFiscal.ds_papeis)
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/licitacoes")
def listar_licitacoes(
    db: Session = Depends(get_db),
    ano_processo: int | None = None,
    fonte_ano: int | None = None,
    empresa: str | None = None,
    situacao: str | None = None,
    modalidade: str | None = None,
    processo: str | None = None,
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(PowerBiLicitacao).options(selectinload(PowerBiLicitacao.observador))
    count_stmt = select(func.count()).select_from(PowerBiLicitacao)

    if ano_processo:
        stmt = stmt.where(PowerBiLicitacao.ano_processo == ano_processo)
        count_stmt = count_stmt.where(PowerBiLicitacao.ano_processo == ano_processo)
    if fonte_ano:
        stmt = stmt.where(PowerBiLicitacao.fonte_ano_coleta == fonte_ano)
        count_stmt = count_stmt.where(PowerBiLicitacao.fonte_ano_coleta == fonte_ano)
    if empresa:
        stmt = stmt.where(PowerBiLicitacao.empresa == empresa)
        count_stmt = count_stmt.where(PowerBiLicitacao.empresa == empresa)
    if situacao:
        stmt = stmt.where(PowerBiLicitacao.situacao == situacao)
        count_stmt = count_stmt.where(PowerBiLicitacao.situacao == situacao)
    if modalidade:
        stmt = stmt.where(PowerBiLicitacao.modalidade == modalidade)
        count_stmt = count_stmt.where(PowerBiLicitacao.modalidade == modalidade)
    if processo:
        p = f"%{processo.strip()}%"
        stmt = stmt.where(PowerBiLicitacao.processo.ilike(p))
        count_stmt = count_stmt.where(PowerBiLicitacao.processo.ilike(p))
    if texto:
        t = f"%{texto.strip()}%"
        filtro = or_(
            PowerBiLicitacao.objeto.ilike(t),
            PowerBiLicitacao.solicitante.ilike(t),
            PowerBiLicitacao.empresa.ilike(t),
            PowerBiLicitacao.modalidade.ilike(t),
        )
        stmt = stmt.where(filtro)
        count_stmt = count_stmt.where(filtro)

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(
        stmt.order_by(
            PowerBiLicitacao.ano_processo.desc(),
            PowerBiLicitacao.empresa,
            PowerBiLicitacao.processo,
        )
        .offset(offset)
        .limit(limit)
    ).all()
    return {"total": total, "items": [_lic_out(r) for r in rows]}


@router.get("/api/powerbi/licitacoes/{lid}", response_model=PowerBiLicitacaoOut)
def obter_licitacao(lid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(PowerBiLicitacao)
        .options(selectinload(PowerBiLicitacao.observador))
        .where(PowerBiLicitacao.id == lid)
    )
    if not row:
        raise HTTPException(404, "Não encontrada")
    return _lic_out(row)


@router.get("/api/powerbi/contratos")
def listar_contratos(
    db: Session = Depends(get_db),
    ano_contrato: int | None = None,
    ano_processo: int | None = None,
    fonte_ano: int | None = None,
    empresa: str | None = None,
    processo: str | None = None,
    nr_contrato: str | None = None,
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(PowerBiContrato).options(selectinload(PowerBiContrato.observador))
    count_stmt = select(func.count()).select_from(PowerBiContrato)

    if ano_contrato:
        stmt = stmt.where(PowerBiContrato.ano_contrato == ano_contrato)
        count_stmt = count_stmt.where(PowerBiContrato.ano_contrato == ano_contrato)
    if ano_processo:
        stmt = stmt.where(PowerBiContrato.ano_processo == ano_processo)
        count_stmt = count_stmt.where(PowerBiContrato.ano_processo == ano_processo)
    if fonte_ano:
        stmt = stmt.where(PowerBiContrato.fonte_ano_coleta == fonte_ano)
        count_stmt = count_stmt.where(PowerBiContrato.fonte_ano_coleta == fonte_ano)
    if empresa:
        stmt = stmt.where(PowerBiContrato.empresa == empresa)
        count_stmt = count_stmt.where(PowerBiContrato.empresa == empresa)
    if processo:
        p = f"%{processo.strip()}%"
        stmt = stmt.where(PowerBiContrato.processo.ilike(p))
        count_stmt = count_stmt.where(PowerBiContrato.processo.ilike(p))
    if nr_contrato:
        n = f"%{nr_contrato.strip()}%"
        stmt = stmt.where(PowerBiContrato.nr_contrato.ilike(n))
        count_stmt = count_stmt.where(PowerBiContrato.nr_contrato.ilike(n))
    if texto:
        t = f"%{texto.strip()}%"
        filtro = or_(
            PowerBiContrato.ds_objeto_contrato.ilike(t),
            PowerBiContrato.nm_pessoa.ilike(t),
            PowerBiContrato.empresa.ilike(t),
        )
        stmt = stmt.where(filtro)
        count_stmt = count_stmt.where(filtro)

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(
        stmt.order_by(
            PowerBiContrato.ano_contrato.desc(),
            PowerBiContrato.nr_contrato,
        )
        .offset(offset)
        .limit(limit)
    ).all()
    return {"total": total, "items": [_con_out(r) for r in rows]}


@router.get("/api/powerbi/contratos/{cid}", response_model=PowerBiContratoOut)
def obter_contrato(cid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(PowerBiContrato)
        .options(selectinload(PowerBiContrato.observador))
        .where(PowerBiContrato.id == cid)
    )
    if not row:
        raise HTTPException(404, "Não encontrado")
    return _con_out(row)


@router.get("/api/powerbi/gestores")
def listar_gestores(
    db: Session = Depends(get_db),
    ano_contrato: int | None = None,
    ds_orgao: str | None = None,
    ds_papeis: str | None = None,
    nr_contrato: str | None = None,
    fornecedor: str | None = None,
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(PowerBiGestorFiscal).options(selectinload(PowerBiGestorFiscal.observador))
    count_stmt = select(func.count()).select_from(PowerBiGestorFiscal)

    if ano_contrato:
        stmt = stmt.where(PowerBiGestorFiscal.ano_contrato == ano_contrato)
        count_stmt = count_stmt.where(PowerBiGestorFiscal.ano_contrato == ano_contrato)
    if ds_orgao:
        stmt = stmt.where(PowerBiGestorFiscal.ds_orgao == ds_orgao)
        count_stmt = count_stmt.where(PowerBiGestorFiscal.ds_orgao == ds_orgao)
    if ds_papeis:
        stmt = stmt.where(PowerBiGestorFiscal.ds_papeis == ds_papeis)
        count_stmt = count_stmt.where(PowerBiGestorFiscal.ds_papeis == ds_papeis)
    if nr_contrato:
        n = f"%{nr_contrato.strip()}%"
        stmt = stmt.where(PowerBiGestorFiscal.nr_contrato.ilike(n))
        count_stmt = count_stmt.where(PowerBiGestorFiscal.nr_contrato.ilike(n))
    if fornecedor:
        f = f"%{fornecedor.strip()}%"
        stmt = stmt.where(PowerBiGestorFiscal.fornecedor.ilike(f))
        count_stmt = count_stmt.where(PowerBiGestorFiscal.fornecedor.ilike(f))
    if texto:
        t = f"%{texto.strip()}%"
        filtro = or_(
            PowerBiGestorFiscal.nm_pessoa_papel.ilike(t),
            PowerBiGestorFiscal.objeto_contrato.ilike(t),
            PowerBiGestorFiscal.fornecedor.ilike(t),
        )
        stmt = stmt.where(filtro)
        count_stmt = count_stmt.where(filtro)

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(
        stmt.order_by(
            PowerBiGestorFiscal.ano_contrato.desc(),
            PowerBiGestorFiscal.nr_contrato,
            PowerBiGestorFiscal.nm_pessoa_papel,
        )
        .offset(offset)
        .limit(limit)
    ).all()
    return {"total": total, "items": [_gest_out(r) for r in rows]}


@router.get("/api/powerbi/gestores/{gid}", response_model=PowerBiGestorOut)
def obter_gestor(gid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(PowerBiGestorFiscal)
        .options(selectinload(PowerBiGestorFiscal.observador))
        .where(PowerBiGestorFiscal.id == gid)
    )
    if not row:
        raise HTTPException(404, "Não encontrado")
    return _gest_out(row)


@router.patch("/api/powerbi/licitacoes/{lid}", response_model=PowerBiLicitacaoOut)
def atualizar_licitacao_pbi(lid: int, payload: PowerBiObservadorUpdate, db: Session = Depends(get_db)):
    from app.database import Observador

    row = db.scalar(
        select(PowerBiLicitacao)
        .options(selectinload(PowerBiLicitacao.observador))
        .where(PowerBiLicitacao.id == lid)
    )
    if not row:
        raise HTTPException(404, "Não encontrada")
    if payload.observador_id is not None:
        if payload.observador_id == 0:
            row.observador_id = None
        else:
            obs = db.get(Observador, payload.observador_id)
            if not obs or not obs.ativo:
                raise HTTPException(400, "Observador inválido ou inativo")
            row.observador_id = payload.observador_id
    db.commit()
    db.refresh(row)
    return _lic_out(row)


@router.patch("/api/powerbi/contratos/{cid}", response_model=PowerBiContratoOut)
def atualizar_contrato_pbi(cid: int, payload: PowerBiObservadorUpdate, db: Session = Depends(get_db)):
    from app.database import Observador

    row = db.scalar(
        select(PowerBiContrato)
        .options(selectinload(PowerBiContrato.observador))
        .where(PowerBiContrato.id == cid)
    )
    if not row:
        raise HTTPException(404, "Não encontrado")
    if payload.observador_id is not None:
        if payload.observador_id == 0:
            row.observador_id = None
        else:
            obs = db.get(Observador, payload.observador_id)
            if not obs or not obs.ativo:
                raise HTTPException(400, "Observador inválido ou inativo")
            row.observador_id = payload.observador_id
    db.commit()
    db.refresh(row)
    return _con_out(row)


@router.patch("/api/powerbi/gestores/{gid}", response_model=PowerBiGestorOut)
def atualizar_gestor_pbi(gid: int, payload: PowerBiObservadorUpdate, db: Session = Depends(get_db)):
    from app.database import Observador

    row = db.scalar(
        select(PowerBiGestorFiscal)
        .options(selectinload(PowerBiGestorFiscal.observador))
        .where(PowerBiGestorFiscal.id == gid)
    )
    if not row:
        raise HTTPException(404, "Não encontrado")
    if payload.observador_id is not None:
        if payload.observador_id == 0:
            row.observador_id = None
        else:
            obs = db.get(Observador, payload.observador_id)
            if not obs or not obs.ativo:
                raise HTTPException(400, "Observador inválido ou inativo")
            row.observador_id = payload.observador_id
    db.commit()
    db.refresh(row)
    return _gest_out(row)
