"""API Power BI / Dados Abertos PMU — modelo normalizado ER."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.config import POWERBI_DATASETS, POWERBI_PANEL_URL
from app.database import (
    PbiContrato,
    PbiContratoResponsavel,
    PbiFornecedor,
    PbiOrgao,
    PbiPapel,
    PbiPessoa,
    PbiProcessoLicitatorio,
    SessionLocal,
    get_db,
)
from app.filtros_periodo import (
    TipoPeriodo,
    anos_disponiveis,
    condicao_periodo,
    data_filtro_powerbi,
    resolver_periodo,
)
from app.powerbi_arvore import agrupar_eventos, contagem_contratos, eventos_do_processo, responsaveis_do_contrato
from app.powerbi_coletor import coletar as coletar_powerbi

router = APIRouter(tags=["powerbi"])

_coleta_status: dict[str, Any] = {"running": False, "log": [], "resultado": None}


class PowerBiColetaRequest(BaseModel):
    anos: list[int] = Field(min_length=1)
    datasets: list[str] = Field(
        default=["licitacoes", "contratos", "gestores"],
        description="licitacoes | contratos | gestores",
    )


class PowerBiObservadorUpdate(BaseModel):
    observador_id: int | None = None


class ProcessoOut(BaseModel):
    id: int
    orgao_id: int
    orgao_nome: str | None = None
    ano_processo: int
    chave: str | None = None
    processo: str
    modalidade: str
    objeto: str | None = None
    solicitante: str | None = None
    situacao: str | None = None
    ds_habilitacao: str | None = None
    dt_abertura: str | None = None
    dt_habilitacao: str | None = None
    dt_julgamento: str | None = None
    dt_homologacao: str | None = None
    valor_licitacao: str | None = None
    fonte_ano_coleta: int
    tem_contrato: bool | None = None
    qtd_contratos: int | None = None
    qtd_eventos: int | None = None
    observador_id: int | None = None
    observador_nome: str | None = None
    coletado_em: datetime | None = None

    model_config = {"from_attributes": True}


class ContratoOut(BaseModel):
    """Evento de contrato — linha do CSV contratos (aditivo / renovação / parcela)."""

    id: int
    orgao_id: int
    orgao_nome: str | None = None
    fornecedor_id: int | None = None
    fornecedor_nome: str | None = None
    processo_id: int | None = None
    processo_ref: str | None = None
    ano_contrato: int
    ano_processo: int | None = None
    ds_objeto_contrato: str | None = None
    dt_assinatura: str | None = None
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


class ContratoGrupoOut(BaseModel):
    """Contrato lógico — agrupa eventos (aditivos / renovações)."""

    orgao_id: int
    orgao_nome: str | None = None
    ano_contrato: int
    nr_contrato: str
    fornecedor_id: int | None = None
    fornecedor_nome: str | None = None
    processo: str | None = None
    ano_processo: int | None = None
    processo_id: int | None = None
    ds_objeto_contrato: str | None = None
    qtd_eventos: int
    valor_total: str | None = None
    eventos: list[ContratoOut]
    responsaveis: list["ResponsavelOut"]


class ArvoreLicitacaoOut(BaseModel):
    licitacao: ProcessoOut
    contratos: list[ContratoGrupoOut]
    sem_contrato: bool


class ResponsavelOut(BaseModel):
    id: int
    contrato_id: int | None = None
    pessoa_id: int
    pessoa_nome: str | None = None
    papel_id: int | None = None
    papel_descricao: str | None = None
    orgao_id: int | None = None
    orgao_nome: str | None = None
    fornecedor_id: int | None = None
    fornecedor_nome: str | None = None
    ano_contrato: int
    dt_assinatura: str | None = None
    dt_fim: str | None = None
    dt_inicio: str | None = None
    nr_contrato: str
    objeto_contrato: str | None = None
    observador_id: int | None = None
    observador_nome: str | None = None
    coletado_em: datetime | None = None

    model_config = {"from_attributes": True}


class CatalogoOut(BaseModel):
    id: int
    nome: str | None = None
    descricao: str | None = None
    razao_social: str | None = None
    total_processos: int | None = None
    total_contratos: int | None = None
    total_responsaveis: int | None = None

    model_config = {"from_attributes": True}


def _proc_out(row: PbiProcessoLicitatorio, db: Session | None = None) -> ProcessoOut:
    qtd_ctr = qtd_evt = None
    tem = None
    if db is not None:
        qtd_ctr, qtd_evt = contagem_contratos(db, row)
        tem = qtd_ctr > 0
    return ProcessoOut(
        id=row.id,
        orgao_id=row.orgao_id,
        orgao_nome=row.orgao.nome if row.orgao else None,
        ano_processo=row.ano_processo,
        chave=row.chave,
        processo=row.processo,
        modalidade=row.modalidade,
        objeto=row.objeto,
        solicitante=row.solicitante,
        situacao=row.situacao,
        ds_habilitacao=row.ds_habilitacao,
        dt_abertura=row.dt_abertura,
        dt_habilitacao=row.dt_habilitacao,
        dt_julgamento=row.dt_julgamento,
        dt_homologacao=row.dt_homologacao,
        valor_licitacao=row.valor_licitacao,
        fonte_ano_coleta=row.fonte_ano_coleta,
        tem_contrato=tem,
        qtd_contratos=qtd_ctr,
        qtd_eventos=qtd_evt,
        observador_id=row.observador_id,
        observador_nome=row.observador.nome if row.observador else None,
        coletado_em=row.coletado_em,
    )


def _ctr_out(row: PbiContrato) -> ContratoOut:
    return ContratoOut(
        id=row.id,
        orgao_id=row.orgao_id,
        orgao_nome=row.orgao.nome if row.orgao else None,
        fornecedor_id=row.fornecedor_id,
        fornecedor_nome=row.fornecedor.razao_social if row.fornecedor else None,
        processo_id=row.processo_id,
        processo_ref=row.processo_licitatorio.processo if row.processo_licitatorio else row.processo,
        ano_contrato=row.ano_contrato,
        ano_processo=row.ano_processo,
        ds_objeto_contrato=row.ds_objeto_contrato,
        dt_assinatura=row.dt_assinatura,
        nr_aditivo=row.nr_aditivo,
        nr_contrato=row.nr_contrato,
        nr_parcela=row.nr_parcela,
        processo=row.processo,
        vr_inicial=row.vr_inicial,
        fonte_ano_coleta=row.fonte_ano_coleta,
        observador_id=row.observador_id,
        observador_nome=row.observador.nome if row.observador else None,
        coletado_em=row.coletado_em,
    )


def _resp_out(row: PbiContratoResponsavel) -> ResponsavelOut:
    return ResponsavelOut(
        id=row.id,
        contrato_id=row.contrato_id,
        pessoa_id=row.pessoa_id,
        pessoa_nome=row.pessoa.nome if row.pessoa else None,
        papel_id=row.papel_id,
        papel_descricao=row.papel.descricao if row.papel else None,
        orgao_id=row.orgao_id,
        orgao_nome=row.orgao.nome if row.orgao else None,
        fornecedor_id=row.fornecedor_id,
        fornecedor_nome=row.fornecedor.razao_social if row.fornecedor else None,
        ano_contrato=row.ano_contrato,
        dt_assinatura=row.dt_assinatura,
        dt_fim=row.dt_fim,
        dt_inicio=row.dt_inicio,
        nr_contrato=row.nr_contrato,
        objeto_contrato=row.objeto_contrato,
        observador_id=row.observador_id,
        observador_nome=row.observador.nome if row.observador else None,
        coletado_em=row.coletado_em,
    )


_PROC_OPTS = (
    selectinload(PbiProcessoLicitatorio.orgao),
    selectinload(PbiProcessoLicitatorio.observador),
)
_CTR_OPTS = (
    selectinload(PbiContrato.orgao),
    selectinload(PbiContrato.fornecedor),
    selectinload(PbiContrato.processo_licitatorio),
    selectinload(PbiContrato.observador),
)
_RESP_OPTS = (
    selectinload(PbiContratoResponsavel.pessoa),
    selectinload(PbiContratoResponsavel.papel),
    selectinload(PbiContratoResponsavel.orgao),
    selectinload(PbiContratoResponsavel.fornecedor),
    selectinload(PbiContratoResponsavel.observador),
)


def _pbi_like(texto: str) -> str | None:
    termo = texto.strip()
    if not termo:
        return None
    return f"%{termo}%"


def _filtro_texto_licitacao(t: str):
    return or_(
        PbiProcessoLicitatorio.objeto.ilike(t),
        PbiProcessoLicitatorio.solicitante.ilike(t),
        PbiProcessoLicitatorio.modalidade.ilike(t),
        PbiProcessoLicitatorio.situacao.ilike(t),
        PbiProcessoLicitatorio.processo.ilike(t),
        PbiOrgao.nome.ilike(t),
    )


def _filtro_texto_contrato(t: str):
    return or_(
        PbiContrato.ds_objeto_contrato.ilike(t),
        PbiContrato.processo.ilike(t),
        PbiContrato.nr_contrato.ilike(t),
        PbiFornecedor.razao_social.ilike(t),
        PbiOrgao.nome.ilike(t),
    )


def _filtro_texto_gestor(t: str):
    return or_(
        PbiPessoa.nome.ilike(t),
        PbiContratoResponsavel.objeto_contrato.ilike(t),
        PbiContratoResponsavel.nr_contrato.ilike(t),
        PbiFornecedor.razao_social.ilike(t),
        PbiOrgao.nome.ilike(t),
        PbiPapel.descricao.ilike(t),
    )


def _run_coleta(anos: list[int], datasets: list[str]) -> None:
    db = SessionLocal()
    try:
        resultado = coletar_powerbi(
            db, anos, datasets,
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
        "modelo": "FORNECEDORES → PROCESSOS/CONTRATOS → CONTRATO_RESPONSAVEIS (+ PESSOAS, PAPÉIS, ÓRGÃOS)",
        "datasets": [
            {"id": k, "nome": v["nome"], "endpoint": v["endpoint"]}
            for k, v in POWERBI_DATASETS.items()
        ],
    }


@router.get("/api/powerbi/stats")
def stats(db: Session = Depends(get_db)):
    return {
        "orgaos": db.scalar(select(func.count()).select_from(PbiOrgao)) or 0,
        "fornecedores": db.scalar(select(func.count()).select_from(PbiFornecedor)) or 0,
        "pessoas": db.scalar(select(func.count()).select_from(PbiPessoa)) or 0,
        "papeis": db.scalar(select(func.count()).select_from(PbiPapel)) or 0,
        "processos": db.scalar(select(func.count()).select_from(PbiProcessoLicitatorio)) or 0,
        "contratos": db.scalar(select(func.count()).select_from(PbiContrato)) or 0,
        "responsaveis": db.scalar(select(func.count()).select_from(PbiContratoResponsavel)) or 0,
    }


@router.post("/api/powerbi/coletar")
def iniciar_coleta(req: PowerBiColetaRequest, bg: BackgroundTasks):
    invalidos = [d for d in req.datasets if d not in POWERBI_DATASETS]
    if invalidos:
        raise HTTPException(400, f"Datasets inválidos: {', '.join(invalidos)}")
    if _coleta_status["running"]:
        raise HTTPException(409, "Já existe uma coleta Power BI em andamento")
    _coleta_status.update(running=True, log=[], resultado=None)
    bg.add_task(_run_coleta, req.anos, req.datasets)
    return {"status": "iniciada", "anos": req.anos, "datasets": req.datasets}


@router.get("/api/powerbi/coletar/status")
def status_coleta():
    return _coleta_status


# --- Catálogos ER ---

@router.get("/api/powerbi/orgaos")
def listar_orgaos(
    db: Session = Depends(get_db),
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(PbiOrgao)
    count = select(func.count()).select_from(PbiOrgao)
    if texto:
        p = f"%{texto.strip()}%"
        stmt = stmt.where(PbiOrgao.nome.ilike(p))
        count = count.where(PbiOrgao.nome.ilike(p))
    total = db.scalar(count) or 0
    rows = db.scalars(stmt.order_by(PbiOrgao.nome).offset(offset).limit(limit)).all()
    items = [
        CatalogoOut(id=r.id, nome=r.nome)
        for r in rows
    ]
    return {"total": total, "items": items}


@router.get("/api/powerbi/fornecedores")
def listar_fornecedores(
    db: Session = Depends(get_db),
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(PbiFornecedor)
    count = select(func.count()).select_from(PbiFornecedor)
    if texto:
        p = f"%{texto.strip()}%"
        stmt = stmt.where(PbiFornecedor.razao_social.ilike(p))
        count = count.where(PbiFornecedor.razao_social.ilike(p))
    total = db.scalar(count) or 0
    rows = db.scalars(stmt.order_by(PbiFornecedor.razao_social).offset(offset).limit(limit)).all()
    return {
        "total": total,
        "items": [CatalogoOut(id=r.id, razao_social=r.razao_social) for r in rows],
    }


@router.get("/api/powerbi/pessoas")
def listar_pessoas(
    db: Session = Depends(get_db),
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(PbiPessoa)
    count = select(func.count()).select_from(PbiPessoa)
    if texto:
        p = f"%{texto.strip()}%"
        stmt = stmt.where(PbiPessoa.nome.ilike(p))
        count = count.where(PbiPessoa.nome.ilike(p))
    total = db.scalar(count) or 0
    rows = db.scalars(stmt.order_by(PbiPessoa.nome).offset(offset).limit(limit)).all()
    return {"total": total, "items": [CatalogoOut(id=r.id, nome=r.nome) for r in rows]}


@router.get("/api/powerbi/papeis")
def listar_papeis(db: Session = Depends(get_db)):
    rows = db.scalars(select(PbiPapel).order_by(PbiPapel.descricao)).all()
    return {"total": len(rows), "items": [CatalogoOut(id=r.id, descricao=r.descricao) for r in rows]}


# --- Filtros auxiliares (compat) ---

@router.get("/api/powerbi/licitacoes/empresas")
def licitacoes_empresas(db: Session = Depends(get_db)):
    rows = db.scalars(select(PbiOrgao.nome).order_by(PbiOrgao.nome)).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/licitacoes/situacoes")
def licitacoes_situacoes(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PbiProcessoLicitatorio.situacao)
        .distinct()
        .where(PbiProcessoLicitatorio.situacao.isnot(None), PbiProcessoLicitatorio.situacao != "")
        .order_by(PbiProcessoLicitatorio.situacao)
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/licitacoes/solicitantes")
def licitacoes_solicitantes(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PbiProcessoLicitatorio.solicitante)
        .distinct()
        .where(
            PbiProcessoLicitatorio.solicitante.isnot(None),
            PbiProcessoLicitatorio.solicitante != "",
        )
        .order_by(PbiProcessoLicitatorio.solicitante)
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/licitacoes/modalidades")
def licitacoes_modalidades(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PbiProcessoLicitatorio.modalidade)
        .distinct()
        .order_by(PbiProcessoLicitatorio.modalidade)
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/licitacoes/anos")
def licitacoes_anos(
    db: Session = Depends(get_db),
    fallback_homologacao: bool = Query(True),
):
    return anos_disponiveis(
        db,
        data_filtro_powerbi(
            PbiProcessoLicitatorio.dt_abertura,
            PbiProcessoLicitatorio.dt_homologacao,
            fallback_homologacao=fallback_homologacao,
        ),
    )


@router.get("/api/powerbi/contratos/anos")
def contratos_anos(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(PbiContrato.ano_contrato)
        .distinct()
        .order_by(PbiContrato.ano_contrato.desc())
    ).all()
    return [r for r in rows if r]


@router.get("/api/powerbi/contratos/empresas")
def contratos_empresas(db: Session = Depends(get_db)):
    return licitacoes_empresas(db)


@router.get("/api/powerbi/gestores/orgaos")
def gestores_orgaos(db: Session = Depends(get_db)):
    return licitacoes_empresas(db)


@router.get("/api/powerbi/gestores/papeis")
def gestores_papeis(db: Session = Depends(get_db)):
    rows = db.scalars(select(PbiPapel.descricao).order_by(PbiPapel.descricao)).all()
    return [r for r in rows if r]


# --- Consultas principais ---

@router.get("/api/powerbi/licitacoes")
def listar_licitacoes(
    db: Session = Depends(get_db),
    ano_processo: int | None = None,
    periodo: TipoPeriodo | None = None,
    ano: int | None = Query(None, ge=2000, le=2100),
    quadrimestre: int | None = Query(None, ge=1, le=3),
    data_inicial: date | None = None,
    data_final: date | None = None,
    fallback_homologacao: bool = Query(True),
    fonte_ano: int | None = None,
    empresa: str | None = None,
    orgao_id: int | None = None,
    situacao: str | None = None,
    solicitante: str | None = None,
    modalidade: list[str] = Query(default=[]),
    processo: str | None = None,
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(PbiProcessoLicitatorio).options(*_PROC_OPTS)
    count = select(func.count()).select_from(PbiProcessoLicitatorio)
    orgao_joined = False
    try:
        periodo_resolvido = resolver_periodo(
            periodo=periodo,
            ano=ano,
            quadrimestre=quadrimestre,
            data_inicial=data_inicial,
            data_final=data_final,
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    filtro_periodo = condicao_periodo(
        data_filtro_powerbi(
            PbiProcessoLicitatorio.dt_abertura,
            PbiProcessoLicitatorio.dt_homologacao,
            fallback_homologacao=fallback_homologacao,
        ),
        periodo_resolvido,
    )
    if filtro_periodo is not None:
        stmt = stmt.where(filtro_periodo)
        count = count.where(filtro_periodo)
    elif ano_processo:
        stmt = stmt.where(PbiProcessoLicitatorio.ano_processo == ano_processo)
        count = count.where(PbiProcessoLicitatorio.ano_processo == ano_processo)
    if fonte_ano:
        stmt = stmt.where(PbiProcessoLicitatorio.fonte_ano_coleta == fonte_ano)
        count = count.where(PbiProcessoLicitatorio.fonte_ano_coleta == fonte_ano)
    if orgao_id:
        stmt = stmt.where(PbiProcessoLicitatorio.orgao_id == orgao_id)
        count = count.where(PbiProcessoLicitatorio.orgao_id == orgao_id)
    if empresa:
        stmt = stmt.join(PbiOrgao).where(PbiOrgao.nome == empresa)
        count = count.join(PbiOrgao).where(PbiOrgao.nome == empresa)
        orgao_joined = True
    if situacao:
        stmt = stmt.where(PbiProcessoLicitatorio.situacao == situacao)
        count = count.where(PbiProcessoLicitatorio.situacao == situacao)
    if solicitante:
        stmt = stmt.where(PbiProcessoLicitatorio.solicitante == solicitante)
        count = count.where(PbiProcessoLicitatorio.solicitante == solicitante)
    mods = [m.strip() for m in modalidade if m and m.strip()]
    if mods:
        stmt = stmt.where(PbiProcessoLicitatorio.modalidade.in_(mods))
        count = count.where(PbiProcessoLicitatorio.modalidade.in_(mods))
    if processo:
        p = f"%{processo.strip()}%"
        stmt = stmt.where(PbiProcessoLicitatorio.processo.ilike(p))
        count = count.where(PbiProcessoLicitatorio.processo.ilike(p))
    if texto and (t := _pbi_like(texto)):
        if not orgao_joined:
            stmt = stmt.join(PbiOrgao)
            count = count.join(PbiOrgao)
        f = _filtro_texto_licitacao(t)
        stmt = stmt.where(f)
        count = count.where(f)
    total = db.scalar(count) or 0
    rows = db.scalars(
        stmt.order_by(PbiProcessoLicitatorio.ano_processo.desc(), PbiProcessoLicitatorio.processo)
        .offset(offset).limit(limit)
    ).all()
    return {"total": total, "items": [_proc_out(r, db) for r in rows]}


@router.get("/api/powerbi/licitacoes/{lid}", response_model=ProcessoOut)
def obter_licitacao(lid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(PbiProcessoLicitatorio).options(*_PROC_OPTS).where(PbiProcessoLicitatorio.id == lid)
    )
    if not row:
        raise HTTPException(404, "Não encontrada")
    return _proc_out(row, db)


@router.get("/api/powerbi/licitacoes/{lid}/arvore", response_model=ArvoreLicitacaoOut)
def arvore_licitacao(lid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(PbiProcessoLicitatorio).options(*_PROC_OPTS).where(PbiProcessoLicitatorio.id == lid)
    )
    if not row:
        raise HTTPException(404, "Licitação não encontrada")

    eventos = eventos_do_processo(db, row)
    grupos_raw = agrupar_eventos(eventos)
    grupos: list[ContratoGrupoOut] = []
    for g in grupos_raw:
        ch = g["chave"]
        resps = responsaveis_do_contrato(
            db,
            ano_contrato=ch["ano_contrato"],
            nr_contrato=ch["nr_contrato"],
            fornecedor_id=ch.get("fornecedor_id") or None,
            objeto_contrato=g.get("ds_objeto_contrato"),
        )
        grupos.append(
            ContratoGrupoOut(
                orgao_id=ch["orgao_id"],
                orgao_nome=g["orgao_nome"],
                ano_contrato=ch["ano_contrato"],
                nr_contrato=ch["nr_contrato"],
                fornecedor_id=ch.get("fornecedor_id") or None,
                fornecedor_nome=g["fornecedor_nome"],
                processo=ch.get("processo"),
                ano_processo=ch.get("ano_processo"),
                processo_id=g.get("processo_id"),
                ds_objeto_contrato=g["ds_objeto_contrato"],
                qtd_eventos=g["qtd_eventos"],
                valor_total=g["valor_total"],
                eventos=[_ctr_out(ev) for ev in g["eventos"]],
                responsaveis=[_resp_out(r) for r in resps],
            )
        )

    return ArvoreLicitacaoOut(
        licitacao=_proc_out(row, db),
        contratos=grupos,
        sem_contrato=len(grupos) == 0,
    )


@router.get("/api/powerbi/contratos-agrupados")
def listar_contratos_agrupados(
    db: Session = Depends(get_db),
    ano_contrato: int | None = None,
    ano_processo: int | None = None,
    empresa: str | None = None,
    orgao_id: int | None = None,
    processo: str | None = None,
    nr_contrato: str | None = None,
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Contratos lógicos — agrupa eventos (aditivos / renovações) do CSV."""
    stmt = select(PbiContrato).options(*_CTR_OPTS)
    orgao_joined = False
    if ano_contrato:
        stmt = stmt.where(PbiContrato.ano_contrato == ano_contrato)
    if ano_processo:
        stmt = stmt.where(PbiContrato.ano_processo == ano_processo)
    if orgao_id:
        stmt = stmt.where(PbiContrato.orgao_id == orgao_id)
    if empresa:
        stmt = stmt.join(PbiOrgao).where(PbiOrgao.nome == empresa)
        orgao_joined = True
    if processo:
        p = f"%{processo.strip()}%"
        stmt = stmt.where(PbiContrato.processo.ilike(p))
    if nr_contrato:
        n = f"%{nr_contrato.strip()}%"
        stmt = stmt.where(PbiContrato.nr_contrato.ilike(n))
    if texto and (t := _pbi_like(texto)):
        if not orgao_joined:
            stmt = stmt.join(PbiOrgao)
        stmt = stmt.join(PbiFornecedor, isouter=True).where(_filtro_texto_contrato(t))

    eventos = list(db.scalars(stmt).all())
    grupos = agrupar_eventos(eventos)
    total = len(grupos)
    fatia = grupos[offset : offset + limit]
    items: list[ContratoGrupoOut] = []
    for g in fatia:
        ch = g["chave"]
        resps = responsaveis_do_contrato(
            db,
            ano_contrato=ch["ano_contrato"],
            nr_contrato=ch["nr_contrato"],
            fornecedor_id=ch.get("fornecedor_id") or None,
            objeto_contrato=g.get("ds_objeto_contrato"),
        )
        items.append(
            ContratoGrupoOut(
                orgao_id=ch["orgao_id"],
                orgao_nome=g["orgao_nome"],
                ano_contrato=ch["ano_contrato"],
                nr_contrato=ch["nr_contrato"],
                fornecedor_id=ch.get("fornecedor_id") or None,
                fornecedor_nome=g["fornecedor_nome"],
                processo=ch.get("processo"),
                ano_processo=ch.get("ano_processo"),
                processo_id=g.get("processo_id"),
                ds_objeto_contrato=g["ds_objeto_contrato"],
                qtd_eventos=g["qtd_eventos"],
                valor_total=g["valor_total"],
                eventos=[_ctr_out(ev) for ev in g["eventos"]],
                responsaveis=[_resp_out(r) for r in resps],
            )
        )
    return {"total": total, "items": items, "limit": limit, "offset": offset}


@router.get("/api/powerbi/contratos")
def listar_contratos(
    db: Session = Depends(get_db),
    ano_contrato: int | None = None,
    ano_processo: int | None = None,
    fonte_ano: int | None = None,
    empresa: str | None = None,
    orgao_id: int | None = None,
    fornecedor_id: int | None = None,
    processo: str | None = None,
    nr_contrato: str | None = None,
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(PbiContrato).options(*_CTR_OPTS)
    count = select(func.count()).select_from(PbiContrato)
    orgao_joined = False
    if ano_contrato:
        stmt = stmt.where(PbiContrato.ano_contrato == ano_contrato)
        count = count.where(PbiContrato.ano_contrato == ano_contrato)
    if ano_processo:
        stmt = stmt.where(PbiContrato.ano_processo == ano_processo)
        count = count.where(PbiContrato.ano_processo == ano_processo)
    if fonte_ano:
        stmt = stmt.where(PbiContrato.fonte_ano_coleta == fonte_ano)
        count = count.where(PbiContrato.fonte_ano_coleta == fonte_ano)
    if orgao_id:
        stmt = stmt.where(PbiContrato.orgao_id == orgao_id)
        count = count.where(PbiContrato.orgao_id == orgao_id)
    if fornecedor_id:
        stmt = stmt.where(PbiContrato.fornecedor_id == fornecedor_id)
        count = count.where(PbiContrato.fornecedor_id == fornecedor_id)
    if empresa:
        stmt = stmt.join(PbiOrgao).where(PbiOrgao.nome == empresa)
        count = count.join(PbiOrgao).where(PbiOrgao.nome == empresa)
        orgao_joined = True
    if processo:
        p = f"%{processo.strip()}%"
        stmt = stmt.where(PbiContrato.processo.ilike(p))
        count = count.where(PbiContrato.processo.ilike(p))
    if nr_contrato:
        n = f"%{nr_contrato.strip()}%"
        stmt = stmt.where(PbiContrato.nr_contrato.ilike(n))
        count = count.where(PbiContrato.nr_contrato.ilike(n))
    if texto and (t := _pbi_like(texto)):
        if not orgao_joined:
            stmt = stmt.join(PbiOrgao)
            count = count.join(PbiOrgao)
        f = _filtro_texto_contrato(t)
        stmt = stmt.join(PbiFornecedor, isouter=True).where(f)
        count = count.join(PbiFornecedor, isouter=True).where(f)
    total = db.scalar(count) or 0
    rows = db.scalars(
        stmt.order_by(PbiContrato.ano_contrato.desc(), PbiContrato.nr_contrato)
        .offset(offset).limit(limit)
    ).all()
    return {"total": total, "items": [_ctr_out(r) for r in rows]}


@router.get("/api/powerbi/contratos/{cid}", response_model=ContratoOut)
def obter_contrato(cid: int, db: Session = Depends(get_db)):
    row = db.scalar(select(PbiContrato).options(*_CTR_OPTS).where(PbiContrato.id == cid))
    if not row:
        raise HTTPException(404, "Não encontrado")
    return _ctr_out(row)


@router.get("/api/powerbi/gestores")
def listar_gestores(
    db: Session = Depends(get_db),
    ano_contrato: int | None = None,
    ds_orgao: str | None = None,
    orgao_id: int | None = None,
    ds_papeis: str | None = None,
    papel_id: int | None = None,
    nr_contrato: str | None = None,
    fornecedor: str | None = None,
    fornecedor_id: int | None = None,
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(PbiContratoResponsavel).options(*_RESP_OPTS)
    count = select(func.count()).select_from(PbiContratoResponsavel)
    orgao_joined = False
    papel_joined = False
    fornecedor_joined = False
    if ano_contrato:
        stmt = stmt.where(PbiContratoResponsavel.ano_contrato == ano_contrato)
        count = count.where(PbiContratoResponsavel.ano_contrato == ano_contrato)
    if orgao_id:
        stmt = stmt.where(PbiContratoResponsavel.orgao_id == orgao_id)
        count = count.where(PbiContratoResponsavel.orgao_id == orgao_id)
    if ds_orgao:
        stmt = stmt.join(PbiOrgao).where(PbiOrgao.nome == ds_orgao)
        count = count.join(PbiOrgao).where(PbiOrgao.nome == ds_orgao)
        orgao_joined = True
    if papel_id:
        stmt = stmt.where(PbiContratoResponsavel.papel_id == papel_id)
        count = count.where(PbiContratoResponsavel.papel_id == papel_id)
    if ds_papeis:
        stmt = stmt.join(PbiPapel).where(PbiPapel.descricao == ds_papeis)
        count = count.join(PbiPapel).where(PbiPapel.descricao == ds_papeis)
        papel_joined = True
    if nr_contrato:
        n = f"%{nr_contrato.strip()}%"
        stmt = stmt.where(PbiContratoResponsavel.nr_contrato.ilike(n))
        count = count.where(PbiContratoResponsavel.nr_contrato.ilike(n))
    if fornecedor_id:
        stmt = stmt.where(PbiContratoResponsavel.fornecedor_id == fornecedor_id)
        count = count.where(PbiContratoResponsavel.fornecedor_id == fornecedor_id)
    if fornecedor:
        f = f"%{fornecedor.strip()}%"
        stmt = stmt.join(PbiFornecedor).where(PbiFornecedor.razao_social.ilike(f))
        count = count.join(PbiFornecedor).where(PbiFornecedor.razao_social.ilike(f))
        fornecedor_joined = True
    if texto and (t := _pbi_like(texto)):
        if not orgao_joined:
            stmt = stmt.join(PbiOrgao, isouter=True)
            count = count.join(PbiOrgao, isouter=True)
        if not fornecedor_joined:
            stmt = stmt.join(PbiFornecedor, isouter=True)
            count = count.join(PbiFornecedor, isouter=True)
        if not papel_joined:
            stmt = stmt.join(PbiPapel, isouter=True)
            count = count.join(PbiPapel, isouter=True)
        f = _filtro_texto_gestor(t)
        stmt = stmt.join(PbiPessoa).where(f)
        count = count.join(PbiPessoa).where(f)
    total = db.scalar(count) or 0
    rows = db.scalars(
        stmt.order_by(
            PbiContratoResponsavel.ano_contrato.desc(),
            PbiContratoResponsavel.nr_contrato,
        ).offset(offset).limit(limit)
    ).all()
    return {"total": total, "items": [_resp_out(r) for r in rows]}


@router.get("/api/powerbi/gestores/{gid}", response_model=ResponsavelOut)
def obter_gestor(gid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(PbiContratoResponsavel).options(*_RESP_OPTS).where(PbiContratoResponsavel.id == gid)
    )
    if not row:
        raise HTTPException(404, "Não encontrado")
    return _resp_out(row)


def _patch_observador(db: Session, row: Any, payload: PowerBiObservadorUpdate) -> None:
    from app.database import Observador

    if payload.observador_id is not None:
        if payload.observador_id == 0:
            row.observador_id = None
        else:
            obs = db.get(Observador, payload.observador_id)
            if not obs or not obs.ativo:
                raise HTTPException(400, "Observador inválido ou inativo")
            row.observador_id = payload.observador_id


@router.patch("/api/powerbi/licitacoes/{lid}", response_model=ProcessoOut)
def atualizar_licitacao_pbi(lid: int, payload: PowerBiObservadorUpdate, db: Session = Depends(get_db)):
    row = db.scalar(
        select(PbiProcessoLicitatorio).options(*_PROC_OPTS).where(PbiProcessoLicitatorio.id == lid)
    )
    if not row:
        raise HTTPException(404, "Não encontrada")
    _patch_observador(db, row, payload)
    db.commit()
    db.refresh(row)
    return _proc_out(row)


@router.patch("/api/powerbi/contratos/{cid}", response_model=ContratoOut)
def atualizar_contrato_pbi(cid: int, payload: PowerBiObservadorUpdate, db: Session = Depends(get_db)):
    row = db.scalar(select(PbiContrato).options(*_CTR_OPTS).where(PbiContrato.id == cid))
    if not row:
        raise HTTPException(404, "Não encontrado")
    _patch_observador(db, row, payload)
    db.commit()
    db.refresh(row)
    return _ctr_out(row)


@router.patch("/api/powerbi/gestores/{gid}", response_model=ResponsavelOut)
def atualizar_gestor_pbi(gid: int, payload: PowerBiObservadorUpdate, db: Session = Depends(get_db)):
    row = db.scalar(
        select(PbiContratoResponsavel).options(*_RESP_OPTS).where(PbiContratoResponsavel.id == gid)
    )
    if not row:
        raise HTTPException(404, "Não encontrado")
    _patch_observador(db, row, payload)
    db.commit()
    db.refresh(row)
    return _resp_out(row)
