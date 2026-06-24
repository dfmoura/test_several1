from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.compras_pncp import coletar as coletar_compras
from app.compras_pncp import coletar_itens
from app.compras_pncp import item_itens_para_db
from app.compras_pncp import item_para_db
from app.config import BASE_DIR, EMPRESAS, MODALIDADES_PNCP, UNIDADES_COMPRADORAS
from app.database import (
    CAMPOS_PRESERVADOS_SYNC,
    COMPRAS_CAMPOS_PRESERVADOS_SYNC,
    CompraContratacao,
    CompraContratacaoItem,
    Licitacao,
    Observador,
    SessionLocal,
    get_db,
    init_db,
)
from app.consulta_processo import router as consulta_processo_router
from app.dashboard_gerencial import router as dashboard_router
from app.modalidades_vinculo import router as modalidades_router
from app.orgaos_vinculo import router as orgaos_router
from app.powerbi import router as powerbi_router
from app.scraper import coletar

init_db()

app = FastAPI(title="Verificação de Licitações — Uberlândia", version="1.0.0")
app.include_router(dashboard_router)  # dashboard gerencial — removível
app.include_router(consulta_processo_router)  # consulta unificada por processo — removível
app.include_router(orgaos_router)  # vínculo órgãos entre bases — removível
app.include_router(modalidades_router)  # vínculo modalidades entre bases — removível
app.include_router(powerbi_router)  # power bi / dados abertos PMU — removível
STATIC = BASE_DIR / "app" / "static"
app.mount("/static", StaticFiles(directory=STATIC), name="static")

_coleta_status: dict[str, Any] = {"running": False, "log": [], "resultado": None}
_compras_coleta_status: dict[str, Any] = {
    "running": False,
    "fase": "idle",
    "log": [],
    "resultado": None,
}


class ColetaRequest(BaseModel):
    empresa_codigo: str | None = None
    empresas_codigo: list[str] | None = None
    ano: int = Field(ge=2000, le=2100)

    @model_validator(mode="after")
    def normalizar_empresas(self) -> ColetaRequest:
        if not self.empresas_codigo and self.empresa_codigo:
            self.empresas_codigo = [self.empresa_codigo]
        return self


class ComprasColetaRequest(BaseModel):
    data_inicial: date | None = None
    data_final: date | None = None
    ano: int | None = Field(default=None, ge=2000, le=2100)
    unidades: list[str] | None = None
    modalidades: list[int] | None = Field(default=None)
    ano_filtro: int | None = Field(default=None, ge=2000, le=2100)


class ObservadorOut(BaseModel):
    id: int
    nome: str
    email: str | None = None
    telefone: str | None = None
    ativo: bool = True
    criado_em: datetime | None = None

    model_config = {"from_attributes": True}


class ObservadorCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    email: str | None = Field(default=None, max_length=200)
    telefone: str | None = Field(default=None, max_length=40)


class ObservadorUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=200)
    email: str | None = Field(default=None, max_length=200)
    telefone: str | None = Field(default=None, max_length=40)
    ativo: bool | None = None


class LicitacaoOut(BaseModel):
    id: int
    empresa_codigo: str
    empresa_nome: str
    ano: int
    processo: str
    modalidade: str | None
    descricao_edital: str | None
    data_abertura: str | None
    habilitacao: str | None
    julgamento: str | None
    homologacao: str | None
    situacao: str | None
    local_abertura: str | None = None
    data_visita_tecnica: str | None = None
    responsavel_visita_tecnica: str | None = None
    local_saida_visita_tecnica: str | None = None
    detalhe_url: str | None
    valor_estimado: str | None = None
    observador_id: int | None = None
    observador_nome: str | None = None
    coletado_em: datetime | None

    model_config = {"from_attributes": True}


class LicitacaoUpdate(BaseModel):
    valor_estimado: str | None = Field(default=None, max_length=80)
    observador_id: int | None = None


class CompraContratacaoOut(BaseModel):
    id: int
    id_compra: str | None = None
    unidade_compradora: str
    unidade_nome: str
    ano: int
    chave_compra: str
    numero: str | None = None
    numero_controle_pncp: str | None = None
    processo: str | None = None
    modalidade_codigo: str | None = None
    modalidade_descricao: str | None = None
    objeto: str | None = None
    situacao_lista: str | None = None
    url_acompanhamento: str | None = None
    data_divulgacao_pncp: str | None = None
    data_publicacao_pncp: str | None = None
    data_abertura_proposta_pncp: str | None = None
    data_encerramento_proposta_pncp: str | None = None
    situacao_pncp: str | None = None
    inicio_recebimento_propostas: str | None = None
    fim_recebimento_propostas: str | None = None
    id_contratacao_pncp: str | None = None
    informacao_complementar: str | None = None
    valor_total_estimado: str | None = None
    valor_total_homologado: str | None = None
    link_pncp: str | None = None
    orgao_entidade_razao_social: str | None = None
    dados_pncp: dict[str, Any] | None = None
    observador_id: int | None = None
    observador_nome: str | None = None
    coletado_em: datetime | None = None

    model_config = {"from_attributes": True}


class CompraContratacaoUpdate(BaseModel):
    observador_id: int | None = None


class CompraItemOut(BaseModel):
    id: int
    id_compra_item: str
    id_compra: str
    numero_item_pncp: int | None = None
    numero_item_compra: int | None = None
    numero_grupo: int | None = None
    descricao_resumida: str | None = None
    descricao_detalhada: str | None = None
    material_ou_servico_nome: str | None = None
    cod_item_catalogo: int | None = None
    codigo_grupo: int | None = None
    unidade_medida: str | None = None
    item_categoria_nome: str | None = None
    criterio_julgamento_nome: str | None = None
    situacao_compra_item_nome: str | None = None
    quantidade: str | None = None
    valor_unitario_estimado: str | None = None
    valor_total: str | None = None
    tem_resultado: bool | None = None
    cod_fornecedor: str | None = None
    nome_fornecedor: str | None = None
    quantidade_resultado: str | None = None
    valor_unitario_resultado: str | None = None
    valor_total_resultado: str | None = None
    data_resultado: str | None = None
    dados_pncp: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


def _to_out(row: Licitacao) -> LicitacaoOut:
    data = {c: getattr(row, c) for c in LicitacaoOut.model_fields if c != "observador_nome"}
    data["observador_nome"] = row.observador.nome if row.observador else None
    return LicitacaoOut(**data)


def _compra_to_out(row: CompraContratacao) -> CompraContratacaoOut:
    skip = {"observador_nome", "dados_pncp"}
    data = {
        c: getattr(row, c, None)
        for c in CompraContratacaoOut.model_fields
        if c not in skip
    }
    data["observador_nome"] = row.observador.nome if row.observador else None
    if row.dados_pncp_json:
        try:
            data["dados_pncp"] = json.loads(row.dados_pncp_json)
        except json.JSONDecodeError:
            data["dados_pncp"] = None
    else:
        data["dados_pncp"] = None
    if not data.get("id_compra"):
        data["id_compra"] = row.chave_compra
    return CompraContratacaoOut(**data)


def _item_to_out(row: CompraContratacaoItem) -> CompraItemOut:
    data = {
        c: getattr(row, c, None)
        for c in CompraItemOut.model_fields
        if c != "dados_pncp"
    }
    if row.dados_pncp_json:
        try:
            data["dados_pncp"] = json.loads(row.dados_pncp_json)
        except json.JSONDecodeError:
            data["dados_pncp"] = None
    else:
        data["dados_pncp"] = None
    return CompraItemOut(**data)


def _persistir_itens(
    db: Session,
    itens: list,
    *,
    mapa_contratacoes: dict[str, int],
) -> tuple[int, int]:
    novos = atualizados = 0
    for item in itens:
        contratacao_id = mapa_contratacoes.get(item.id_compra)
        existing = db.scalar(
            select(CompraContratacaoItem).where(
                CompraContratacaoItem.id_compra_item == item.id_compra_item
            )
        )
        data = item_itens_para_db(item, contratacao_id=contratacao_id)
        data["coletado_em"] = datetime.utcnow()
        if existing:
            for k, v in data.items():
                setattr(existing, k, v)
            atualizados += 1
        else:
            db.add(CompraContratacaoItem(**data))
            novos += 1
    return novos, atualizados


def _run_coleta(empresas_codigo: list[str], ano: int) -> None:
    global _coleta_status
    logs: list[str] = []

    def on_log(msg: str) -> None:
        logs.append(msg)
        _coleta_status["log"] = logs.copy()

    try:
        items = coletar(empresa_codigos=empresas_codigo, ano=ano, on_log=on_log)
        db = SessionLocal()
        novos = atualizados = 0
        try:
            for item in items:
                existing = db.scalar(
                    select(Licitacao).where(
                        Licitacao.empresa_codigo == item.empresa_codigo,
                        Licitacao.processo == item.processo,
                        Licitacao.ano == item.ano,
                    )
                )
                data = {
                    "empresa_codigo": item.empresa_codigo,
                    "empresa_nome": item.empresa_nome,
                    "ano": item.ano,
                    "processo": item.processo,
                    "modalidade": item.modalidade,
                    "descricao_edital": item.descricao_edital,
                    "data_abertura": item.data_abertura,
                    "habilitacao": item.habilitacao,
                    "julgamento": item.julgamento,
                    "homologacao": item.homologacao,
                    "situacao": item.situacao,
                    "local_abertura": item.local_abertura,
                    "data_visita_tecnica": item.data_visita_tecnica,
                    "responsavel_visita_tecnica": item.responsavel_visita_tecnica,
                    "local_saida_visita_tecnica": item.local_saida_visita_tecnica,
                    "detalhe_url": item.detalhe_url,
                    "coletado_em": datetime.utcnow(),
                }
                if existing:
                    for k, v in data.items():
                        if k in CAMPOS_PRESERVADOS_SYNC:
                            continue
                        setattr(existing, k, v)
                    atualizados += 1
                else:
                    db.add(Licitacao(**data))
                    novos += 1
            db.commit()
        finally:
            db.close()

        _coleta_status["resultado"] = {
            "ok": True,
            "total": len(items),
            "novos": novos,
            "atualizados": atualizados,
            "empresas": len(empresas_codigo),
        }
    except Exception as exc:
        logs.append(f"Erro: {exc}")
        _coleta_status["log"] = logs
        _coleta_status["resultado"] = {"ok": False, "erro": str(exc)}
    finally:
        _coleta_status["running"] = False


def _resolver_periodo_coleta(req: ComprasColetaRequest) -> tuple[date, date]:
    if req.data_inicial and req.data_final:
        return req.data_inicial, req.data_final
    if req.ano:
        return date(req.ano, 1, 1), date(req.ano, 12, 31)
    ano_atual = datetime.utcnow().year
    return date(ano_atual, 1, 1), date(ano_atual, 12, 31)


def _run_compras_coleta(req: ComprasColetaRequest) -> None:
    global _compras_coleta_status
    logs: list[str] = []

    def on_log(msg: str) -> None:
        logs.append(msg)
        _compras_coleta_status["log"] = logs.copy()

    def on_fase(fase: str) -> None:
        _compras_coleta_status["fase"] = fase

    try:
        data_inicial, data_final = _resolver_periodo_coleta(req)
        unidades = req.unidades
        if unidades:
            for u in unidades:
                if u not in UNIDADES_COMPRADORAS:
                    raise ValueError(f"Unidade inválida: {u}")
        modalidades = req.modalidades
        if modalidades:
            for m in modalidades:
                if m not in MODALIDADES_PNCP:
                    raise ValueError(f"Modalidade inválida: {m}")

        items = coletar_compras(
            data_inicial=data_inicial,
            data_final=data_final,
            unidades=unidades,
            modalidades=modalidades,
            ano=req.ano_filtro or req.ano,
            on_log=on_log,
            on_fase=on_fase,
        )
        db = SessionLocal()
        novos = atualizados = 0
        itens_novos = itens_atualizados = 0
        itens: list = []
        mapa_contratacoes: dict[str, int] = {}
        try:
            for item in items:
                existing = db.scalar(
                    select(CompraContratacao).where(
                        CompraContratacao.id_compra == item.id_compra
                    )
                )
                if not existing:
                    existing = db.scalar(
                        select(CompraContratacao).where(
                            CompraContratacao.chave_compra == item.id_compra
                        )
                    )
                data = item_para_db(item)
                data["coletado_em"] = datetime.utcnow()
                if existing:
                    for k, v in data.items():
                        if k in COMPRAS_CAMPOS_PRESERVADOS_SYNC:
                            continue
                        setattr(existing, k, v)
                    atualizados += 1
                    mapa_contratacoes[item.id_compra] = existing.id
                else:
                    row = CompraContratacao(**data)
                    db.add(row)
                    db.flush()
                    mapa_contratacoes[item.id_compra] = row.id
                    novos += 1
            db.commit()

            itens = coletar_itens(
                data_inicial=data_inicial,
                data_final=data_final,
                unidades=unidades,
                on_log=on_log,
                on_fase=on_fase,
            )
            for chave, cid in db.execute(
                select(CompraContratacao.id_compra, CompraContratacao.id).where(
                    CompraContratacao.id_compra.isnot(None)
                )
            ):
                if chave:
                    mapa_contratacoes[chave] = cid

            itens_novos = itens_atualizados = 0
            if itens:
                itens_novos, itens_atualizados = _persistir_itens(
                    db, itens, mapa_contratacoes=mapa_contratacoes
                )
                db.commit()
        finally:
            db.close()

        _compras_coleta_status["resultado"] = {
            "ok": True,
            "total": len(items),
            "novos": novos,
            "atualizados": atualizados,
            "itens_total": len(itens) if itens else 0,
            "itens_novos": itens_novos if itens else 0,
            "itens_atualizados": itens_atualizados if itens else 0,
        }
    except Exception as exc:
        logs.append(f"Erro: {exc}")
        _compras_coleta_status["log"] = logs
        _compras_coleta_status["resultado"] = {"ok": False, "erro": str(exc)}
    finally:
        _compras_coleta_status["running"] = False
        _compras_coleta_status["fase"] = "idle"


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/api/empresas")
def empresas():
    return [{"codigo": k, "nome": v} for k, v in EMPRESAS.items()]


@app.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(Licitacao)) or 0
    por_ano = dict(db.execute(select(Licitacao.ano, func.count()).group_by(Licitacao.ano)).all())
    return {"total": total, "por_ano": por_ano}


@app.post("/api/coletar")
def iniciar_coleta(req: ColetaRequest, bg: BackgroundTasks):
    empresas = list(dict.fromkeys(req.empresas_codigo or []))
    if not empresas:
        raise HTTPException(400, "Selecione ao menos um órgão")
    for codigo in empresas:
        if codigo not in EMPRESAS:
            raise HTTPException(400, f"Código de empresa inválido: {codigo}")
    if _coleta_status["running"]:
        raise HTTPException(409, "Já existe uma coleta em andamento")
    _coleta_status.update(running=True, log=[], resultado=None)
    bg.add_task(_run_coleta, empresas, req.ano)
    return {
        "status": "iniciada",
        "empresas": [{"codigo": c, "nome": EMPRESAS[c]} for c in empresas],
        "ano": req.ano,
    }


@app.get("/api/coletar/status")
def status_coleta():
    return _coleta_status


@app.get("/api/observadores", response_model=list[ObservadorOut])
def listar_observadores(
    db: Session = Depends(get_db),
    ativos: bool = Query(True),
):
    stmt = select(Observador).order_by(Observador.nome)
    if ativos:
        stmt = stmt.where(Observador.ativo.is_(True))
    return [ObservadorOut.model_validate(o) for o in db.scalars(stmt).all()]


@app.post("/api/observadores", response_model=ObservadorOut, status_code=201)
def criar_observador(payload: ObservadorCreate, db: Session = Depends(get_db)):
    obs = Observador(
        nome=payload.nome.strip(),
        email=(payload.email or "").strip() or None,
        telefone=(payload.telefone or "").strip() or None,
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return ObservadorOut.model_validate(obs)


@app.patch("/api/observadores/{oid}", response_model=ObservadorOut)
def atualizar_observador(oid: int, payload: ObservadorUpdate, db: Session = Depends(get_db)):
    obs = db.get(Observador, oid)
    if not obs:
        raise HTTPException(404, "Observador não encontrado")
    for field in ("nome", "email", "telefone", "ativo"):
        value = getattr(payload, field)
        if value is not None:
            if field in ("nome", "email", "telefone") and isinstance(value, str):
                value = value.strip() or (None if field != "nome" else value)
            setattr(obs, field, value)
    db.commit()
    db.refresh(obs)
    return ObservadorOut.model_validate(obs)


@app.get("/api/modalidades")
def modalidades(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Licitacao.modalidade)
        .where(Licitacao.modalidade.isnot(None), Licitacao.modalidade != "")
        .distinct()
        .order_by(Licitacao.modalidade)
    ).all()
    return [m for m in rows if m]


@app.get("/api/situacoes")
def situacoes(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Licitacao.situacao)
        .where(Licitacao.situacao.isnot(None), Licitacao.situacao != "")
        .distinct()
        .order_by(Licitacao.situacao)
    ).all()
    return [s for s in rows if s]


@app.get("/api/licitacoes")
def listar(
    db: Session = Depends(get_db),
    ano: int | None = None,
    empresa_codigo: str | None = None,
    situacao: str | None = None,
    modalidade: str | None = None,
    processo: str | None = None,
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(Licitacao).options(selectinload(Licitacao.observador))
    count = select(func.count()).select_from(Licitacao)
    if ano:
        stmt = stmt.where(Licitacao.ano == ano)
        count = count.where(Licitacao.ano == ano)
    if empresa_codigo:
        stmt = stmt.where(Licitacao.empresa_codigo == empresa_codigo)
        count = count.where(Licitacao.empresa_codigo == empresa_codigo)
    if situacao:
        stmt = stmt.where(Licitacao.situacao.ilike(f"%{situacao}%"))
        count = count.where(Licitacao.situacao.ilike(f"%{situacao}%"))
    if modalidade:
        stmt = stmt.where(Licitacao.modalidade.ilike(f"%{modalidade}%"))
        count = count.where(Licitacao.modalidade.ilike(f"%{modalidade}%"))
    if processo:
        termo = processo.strip()
        if termo:
            p = f"%{termo}%"
            stmt = stmt.where(Licitacao.processo.ilike(p))
            count = count.where(Licitacao.processo.ilike(p))
    if texto:
        termo = texto.strip()
        if termo:
            p = f"%{termo}%"
            f = or_(
                Licitacao.descricao_edital.ilike(p),
                Licitacao.modalidade.ilike(p),
            )
            stmt = stmt.where(f)
            count = count.where(f)

    total = db.scalar(count) or 0
    rows = db.scalars(stmt.order_by(Licitacao.id.desc()).offset(offset).limit(limit)).all()
    return {"items": [_to_out(r) for r in rows], "total": total, "limit": limit, "offset": offset}


@app.get("/api/licitacoes/{lid}")
def detalhe(lid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(Licitacao).options(selectinload(Licitacao.observador)).where(Licitacao.id == lid)
    )
    if not row:
        raise HTTPException(404, "Não encontrada")
    return _to_out(row)


@app.get("/api/compras/unidades")
def compras_unidades():
    return [{"codigo": k, "nome": v} for k, v in UNIDADES_COMPRADORAS.items()]


@app.get("/api/compras/stats")
def compras_stats(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(CompraContratacao)) or 0
    por_ano = dict(
        db.execute(select(CompraContratacao.ano, func.count()).group_by(CompraContratacao.ano)).all()
    )
    return {"total": total, "por_ano": por_ano}


@app.post("/api/compras/coletar")
def iniciar_compras_coleta(req: ComprasColetaRequest, bg: BackgroundTasks):
    if _compras_coleta_status["running"]:
        raise HTTPException(409, "Já existe uma coleta Compras.gov em andamento")
    try:
        data_inicial, data_final = _resolver_periodo_coleta(req)
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc
    if (data_final - data_inicial).days >= 365 and data_final.year != data_inicial.year:
        pass  # coletor divide em janelas de 365 dias
    _compras_coleta_status.update(running=True, fase="coletando", log=[], resultado=None)
    bg.add_task(_run_compras_coleta, req)
    return {
        "status": "iniciada",
        "modo": "api_pncp",
        "data_inicial": data_inicial.isoformat(),
        "data_final": data_final.isoformat(),
    }


@app.get("/api/compras/coletar/status")
def status_compras_coleta():
    return _compras_coleta_status


@app.get("/api/compras/modalidades")
def compras_modalidades():
    return [{"codigo": k, "nome": v} for k, v in sorted(MODALIDADES_PNCP.items())]


@app.get("/api/compras/situacoes")
def compras_situacoes(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(CompraContratacao.situacao_lista)
        .where(CompraContratacao.situacao_lista.isnot(None), CompraContratacao.situacao_lista != "")
        .distinct()
        .order_by(CompraContratacao.situacao_lista)
    ).all()
    return [s for s in rows if s]


@app.get("/api/compras/contratacoes")
def listar_compras(
    db: Session = Depends(get_db),
    ano: int | None = None,
    unidade_codigo: str | None = None,
    situacao: str | None = None,
    processo: str | None = None,
    numero: str | None = None,
    texto: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(CompraContratacao).options(selectinload(CompraContratacao.observador))
    count = select(func.count()).select_from(CompraContratacao)
    if ano:
        stmt = stmt.where(CompraContratacao.ano == ano)
        count = count.where(CompraContratacao.ano == ano)
    if unidade_codigo:
        stmt = stmt.where(CompraContratacao.unidade_compradora == unidade_codigo)
        count = count.where(CompraContratacao.unidade_compradora == unidade_codigo)
    if situacao:
        stmt = stmt.where(CompraContratacao.situacao_lista.ilike(f"%{situacao}%"))
        count = count.where(CompraContratacao.situacao_lista.ilike(f"%{situacao}%"))
    if processo:
        termo = processo.strip()
        if termo:
            p = f"%{termo}%"
            stmt = stmt.where(CompraContratacao.processo.ilike(p))
            count = count.where(CompraContratacao.processo.ilike(p))
    if numero:
        termo = numero.strip()
        if termo:
            p = f"%{termo}%"
            stmt = stmt.where(CompraContratacao.numero.ilike(p))
            count = count.where(CompraContratacao.numero.ilike(p))
    if texto:
        termo = texto.strip()
        if termo:
            p = f"%{termo}%"
            f = or_(
                CompraContratacao.objeto.ilike(p),
                CompraContratacao.modalidade_descricao.ilike(p),
                CompraContratacao.id_contratacao_pncp.ilike(p),
                CompraContratacao.numero_controle_pncp.ilike(p),
                CompraContratacao.chave_compra.ilike(p),
                CompraContratacao.id_compra.ilike(p),
                CompraContratacao.processo.ilike(p),
            )
            stmt = stmt.where(f)
            count = count.where(f)

    total = db.scalar(count) or 0
    rows = db.scalars(stmt.order_by(CompraContratacao.id.desc()).offset(offset).limit(limit)).all()
    return {
        "items": [_compra_to_out(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/compras/contratacoes/{cid}/itens")
def itens_compra(
    cid: int,
    db: Session = Depends(get_db),
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
):
    contratacao = db.scalar(select(CompraContratacao).where(CompraContratacao.id == cid))
    if not contratacao:
        raise HTTPException(404, "Não encontrada")

    filtro = or_(
        CompraContratacaoItem.contratacao_id == cid,
        CompraContratacaoItem.id_compra == contratacao.id_compra,
    )
    stmt = select(CompraContratacaoItem).where(filtro)
    total = db.scalar(
        select(func.count()).select_from(CompraContratacaoItem).where(filtro)
    ) or 0
    rows = db.scalars(
        stmt.order_by(CompraContratacaoItem.numero_item_pncp).offset(offset).limit(limit)
    ).all()
    return {
        "items": [_item_to_out(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/api/compras/contratacoes/{cid}")
def detalhe_compra(cid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(CompraContratacao)
        .options(selectinload(CompraContratacao.observador))
        .where(CompraContratacao.id == cid)
    )
    if not row:
        raise HTTPException(404, "Não encontrada")
    return _compra_to_out(row)


@app.patch("/api/compras/contratacoes/{cid}", response_model=CompraContratacaoOut)
def atualizar_compra(cid: int, payload: CompraContratacaoUpdate, db: Session = Depends(get_db)):
    row = db.scalar(
        select(CompraContratacao)
        .options(selectinload(CompraContratacao.observador))
        .where(CompraContratacao.id == cid)
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
    return _compra_to_out(row)


@app.patch("/api/licitacoes/{lid}", response_model=LicitacaoOut)
def atualizar_licitacao(lid: int, payload: LicitacaoUpdate, db: Session = Depends(get_db)):
    row = db.scalar(
        select(Licitacao).options(selectinload(Licitacao.observador)).where(Licitacao.id == lid)
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

    if "valor_estimado" in payload.model_fields_set:
        val = (payload.valor_estimado or "").strip()
        row.valor_estimado = val or None

    db.commit()
    db.refresh(row)
    return _to_out(row)
