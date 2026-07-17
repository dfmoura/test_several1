"""API REST Compras.gov / PNCP — rotas e jobs de coleta (ex-main).

Movido sem mudança de regra de negócio. O `main` apenas inclui este router.
"""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any, Callable

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import require_admin
from app.compras.atualizar_contratacao import atualizar_contratacao_da_api
from app.compras.cnpj_publico import obter_fornecedor_detalhe
from app.compras.job_pendentes_cnpj import (
    executar_job as executar_job_pendentes_cnpj,
    iniciar_job as iniciar_job_pendentes_cnpj,
    pedir_cancelamento as cancelar_job_pendentes_cnpj,
    status_publico as status_job_pendentes_cnpj,
)
from app.compras.orquestrador import executar_pipeline
from app.compras.repository import ensure_fornecedor_stub, upsert_resultado, vincular_fornecedores_resultados
from app.compras.coletor_resultados import coletar_resultados, resultado_para_db
from app.compras.vencedores_cnpj import (
    listar_homologacoes_fornecedor,
    listar_vencedores_consolidados,
)
from app.compras_pncp import coletar as coletar_compras
from app.compras_pncp import coletar_itens
from app.compras_pncp import item_itens_para_db
from app.compras_pncp import item_para_db
from app.config import MODALIDADES_PNCP
from app.database import (
    COMPRAS_CAMPOS_PRESERVADOS_SYNC,
    CompraContratacao,
    CompraContratacaoItem,
    ComprasContratacaoResultado,
    ComprasFornecedor,
    ComprasItemCatalogo,
    ComprasPgcItem,
    ComprasPrecoPraticado,
    ComprasUasg,
    Observador,
    SessionLocal,
    Usuario,
    get_db,
)
from app.filtros_periodo import (
    TipoPeriodo,
    anos_disponiveis,
    condicao_periodo,
    data_iso_pncp,
    resolver_periodo,
)
from app.unidades_compradoras import obter_unidades_compradoras

router = APIRouter(tags=["compras"])

_compras_coleta_status: dict[str, Any] = {
    "running": False,
    "fase": "idle",
    "log": [],
    "resultado": None,
    "contadores": {},
}


class ComprasColetaRequest(BaseModel):
    data_inicial: date | None = None
    data_final: date | None = None
    ano: int | None = Field(default=None, ge=2000, le=2100)
    unidades: list[str] | None = None
    modalidades: list[int] | None = Field(default=None)
    ano_filtro: int | None = Field(default=None, ge=2000, le=2100)


class ComprasColetaCompletaRequest(ComprasColetaRequest):
    fases: list[str] | None = Field(
        default=None,
        description="Ex.: 07,07-resultados,05,10,04,03",
    )
    ano_pgc: int | None = Field(default=None, ge=2000, le=2100)


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
    tipos_item: list[str] = Field(default_factory=list)
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
    resultados: list[dict[str, Any]] | None = None
    dados_pncp: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class CompraResultadoOut(BaseModel):
    id: int
    id_compra_item: str
    id_compra: str
    sequencial_resultado: int | None = None
    ni_fornecedor: str | None = None
    nome_razao_social_fornecedor: str | None = None
    ordem_classificacao_srp: int | None = None
    quantidade_homologada: str | None = None
    valor_unitario_homologado: str | None = None
    valor_total_homologado: str | None = None
    situacao_compra_item_resultado_nome: str | None = None
    porte_fornecedor_nome: str | None = None
    data_resultado_pncp: str | None = None
    percentual_desconto: str | None = None
    fornecedor_porte: str | None = None
    fornecedor_cnae: str | None = None
    fornecedor_municipio: str | None = None
    fornecedor_uf: str | None = None
    de_uberlandia: bool | None = None

    model_config = {"from_attributes": True}


def _compra_to_out(
    row: CompraContratacao,
    *,
    tipos_item: set[str] | None = None,
) -> CompraContratacaoOut:
    skip = {"observador_nome", "dados_pncp", "tipos_item"}
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
    data["tipos_item"] = sorted(tipos_item or [])
    if not data.get("id_compra"):
        data["id_compra"] = row.chave_compra
    return CompraContratacaoOut(**data)


def _tipos_item_por_contratacao(
    db: Session,
    contratacoes: list[CompraContratacao],
) -> dict[int, set[str]]:
    """Agrupa M/S dos itens sem uma consulta adicional por contratação."""
    if not contratacoes:
        return {}
    ids = [row.id for row in contratacoes]
    ids_compra = [row.id_compra for row in contratacoes if row.id_compra]
    filtro = CompraContratacaoItem.contratacao_id.in_(ids)
    if ids_compra:
        filtro = or_(filtro, CompraContratacaoItem.id_compra.in_(ids_compra))
    itens = db.execute(
        select(
            CompraContratacaoItem.contratacao_id,
            CompraContratacaoItem.id_compra,
            CompraContratacaoItem.material_ou_servico,
        ).where(filtro)
    ).all()
    por_id: dict[int, set[str]] = {row.id: set() for row in contratacoes}
    id_por_compra = {row.id_compra: row.id for row in contratacoes if row.id_compra}
    for contratacao_id, id_compra, tipo_bruto in itens:
        tipo = (tipo_bruto or "").strip().upper()[:1]
        if tipo not in {"M", "S"}:
            continue
        cid = contratacao_id if contratacao_id in por_id else id_por_compra.get(id_compra)
        if cid is not None:
            por_id[cid].add(tipo)
    return por_id


def _resultado_to_out(row: ComprasContratacaoResultado) -> CompraResultadoOut:
    data = {c: getattr(row, c, None) for c in CompraResultadoOut.model_fields if c not in (
        "fornecedor_porte",
        "fornecedor_cnae",
        "fornecedor_municipio",
        "fornecedor_uf",
        "de_uberlandia",
    )}
    if row.fornecedor:
        data["fornecedor_porte"] = row.fornecedor.porte_empresa_nome
        data["fornecedor_cnae"] = row.fornecedor.nome_cnae
        data["fornecedor_municipio"] = row.fornecedor.nome_municipio
        data["fornecedor_uf"] = row.fornecedor.uf_sigla
        data["de_uberlandia"] = row.fornecedor.de_uberlandia
    return CompraResultadoOut(**data)


def _item_to_out(
    row: CompraContratacaoItem,
    *,
    resultados: list[ComprasContratacaoResultado] | None = None,
) -> CompraItemOut:
    data = {
        c: getattr(row, c, None)
        for c in CompraItemOut.model_fields
        if c not in ("dados_pncp", "resultados")
    }
    if row.dados_pncp_json:
        try:
            data["dados_pncp"] = json.loads(row.dados_pncp_json)
        except json.JSONDecodeError:
            data["dados_pncp"] = None
    else:
        data["dados_pncp"] = None
    if resultados is not None:
        data["resultados"] = [_resultado_to_out(r).model_dump() for r in resultados]
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


def _resolver_periodo_coleta(req: ComprasColetaRequest) -> tuple[date, date]:
    if req.data_inicial and req.data_final:
        return req.data_inicial, req.data_final
    if req.ano:
        return date(req.ano, 1, 1), date(req.ano, 12, 31)
    ano_atual = datetime.utcnow().year
    return date(ano_atual, 1, 1), date(ano_atual, 12, 31)


def _persistir_resultados(
    db: Session,
    *,
    data_inicial: date,
    data_final: date,
    unidades: list[str] | None,
    on_log: Callable[[str], None],
    on_fase: Callable[[str], None],
) -> tuple[int, int]:
    mapa_itens = {
        row.id_compra_item: row.id
        for row in db.scalars(select(CompraContratacaoItem)).all()
    }
    mapa_forn = {
        row.ni_fornecedor: row.id
        for row in db.scalars(select(ComprasFornecedor)).all()
    }
    resultados = coletar_resultados(
        data_inicial=data_inicial,
        data_final=data_final,
        unidades=unidades,
        on_log=on_log,
        on_fase=on_fase,
    )
    novos = atualizados = 0
    for res in resultados:
        forn_id = None
        if res.ni_fornecedor:
            forn_id = mapa_forn.get(res.ni_fornecedor)
            if not forn_id:
                stub, _ = ensure_fornecedor_stub(
                    db,
                    res.ni_fornecedor,
                    nome=res.nome_razao_social_fornecedor,
                )
                forn_id = stub.id
                mapa_forn[res.ni_fornecedor] = forn_id
        data = resultado_para_db(
            res,
            contratacao_item_id=mapa_itens.get(res.id_compra_item),
            fornecedor_id=forn_id,
        )
        _, criado = upsert_resultado(db, data)
        if criado:
            novos += 1
        else:
            atualizados += 1
    vincular_fornecedores_resultados(db)
    return novos, atualizados


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
        unidades_cfg = obter_unidades_compradoras()
        if unidades:
            for u in unidades:
                if u not in unidades_cfg:
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
        res_novos = res_atualizados = 0
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

            res_novos = res_atualizados = 0
            on_fase("coletando_resultados")
            res_novos, res_atualizados = _persistir_resultados(
                db,
                data_inicial=data_inicial,
                data_final=data_final,
                unidades=unidades,
                on_log=on_log,
                on_fase=on_fase,
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
            "resultados_novos": res_novos,
            "resultados_atualizados": res_atualizados,
        }
    except Exception as exc:
        logs.append(f"Erro: {exc}")
        _compras_coleta_status["log"] = logs
        _compras_coleta_status["resultado"] = {"ok": False, "erro": str(exc)}
    finally:
        _compras_coleta_status["running"] = False
        _compras_coleta_status["fase"] = "idle"


def _run_compras_coleta_completa(req: ComprasColetaCompletaRequest) -> None:
    global _compras_coleta_status
    logs: list[str] = []

    def on_log(msg: str) -> None:
        logs.append(msg)
        _compras_coleta_status["log"] = logs.copy()

    def on_fase(fase: str) -> None:
        _compras_coleta_status["fase"] = fase

    try:
        data_inicial, data_final = _resolver_periodo_coleta(req)
        unidades_cfg = obter_unidades_compradoras()
        if req.unidades:
            for u in req.unidades:
                if u not in unidades_cfg:
                    raise ValueError(f"Unidade inválida: {u}")
        fases = req.fases or ["07", "07-resultados", "05", "10", "01", "02"]
        result = executar_pipeline(
            fases=fases,
            data_inicial=data_inicial,
            data_final=data_final,
            unidades=req.unidades,
            modalidades=req.modalidades,
            ano=req.ano_filtro or req.ano,
            ano_pgc=req.ano_pgc,
            on_log=on_log,
            on_fase=on_fase,
        )
        _compras_coleta_status["contadores"] = result.contadores
        _compras_coleta_status["resultado"] = {"ok": True, **result.contadores}
    except Exception as exc:
        logs.append(f"Erro: {exc}")
        _compras_coleta_status["log"] = logs
        _compras_coleta_status["resultado"] = {"ok": False, "erro": str(exc)}
    finally:
        _compras_coleta_status["running"] = False
        _compras_coleta_status["fase"] = "idle"

@router.get("/api/compras/unidades")
def compras_unidades(db: Session = Depends(get_db)):
    return [
        {"codigo": k, "nome": v}
        for k, v in obter_unidades_compradoras(db).items()
    ]


@router.get("/api/compras/stats")
def compras_stats(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(CompraContratacao)) or 0
    por_ano = dict(
        db.execute(select(CompraContratacao.ano, func.count()).group_by(CompraContratacao.ano)).all()
    )
    anos_periodo = anos_disponiveis(
        db, data_iso_pncp(CompraContratacao.data_encerramento_proposta_pncp)
    )
    return {"total": total, "por_ano": por_ano, "anos_periodo": anos_periodo}


@router.post("/api/compras/coletar")
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


@router.post("/api/compras/coletar-completo")
def iniciar_compras_coleta_completa(req: ComprasColetaCompletaRequest, bg: BackgroundTasks):
    if _compras_coleta_status["running"]:
        raise HTTPException(409, "Já existe uma coleta Compras.gov em andamento")
    try:
        data_inicial, data_final = _resolver_periodo_coleta(req)
    except Exception as exc:
        raise HTTPException(400, str(exc)) from exc
    _compras_coleta_status.update(
        running=True, fase="iniciando", log=[], resultado=None, contadores={}
    )
    bg.add_task(_run_compras_coleta_completa, req)
    return {
        "status": "iniciada",
        "modo": "orquestrador",
        "fases": req.fases or ["07", "07-resultados", "05", "10", "01", "02"],
        "data_inicial": data_inicial.isoformat(),
        "data_final": data_final.isoformat(),
    }


@router.get("/api/compras/coletar/status")
def status_compras_coleta():
    return _compras_coleta_status


@router.get("/api/compras/modalidades")
def compras_modalidades():
    return [{"codigo": k, "nome": v} for k, v in sorted(MODALIDADES_PNCP.items())]


@router.get("/api/compras/situacoes")
def compras_situacoes(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(CompraContratacao.situacao_lista)
        .where(CompraContratacao.situacao_lista.isnot(None), CompraContratacao.situacao_lista != "")
        .distinct()
        .order_by(CompraContratacao.situacao_lista)
    ).all()
    return [s for s in rows if s]


@router.get("/api/compras/contratacoes")
def listar_compras(
    db: Session = Depends(get_db),
    ano: int | None = None,
    periodo: TipoPeriodo | None = None,
    quadrimestre: int | None = Query(None, ge=1, le=3),
    data_inicial: date | None = None,
    data_final: date | None = None,
    unidade_codigo: str | None = None,
    situacao: str | None = None,
    modalidade_codigo: list[int] = Query(default=[]),
    processo: str | None = None,
    numero: str | None = None,
    texto: str | None = None,
    material_ou_servico: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(CompraContratacao).options(selectinload(CompraContratacao.observador))
    count = select(func.count()).select_from(CompraContratacao)
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
        data_iso_pncp(CompraContratacao.data_encerramento_proposta_pncp),
        periodo_resolvido,
    )
    if filtro_periodo is not None:
        stmt = stmt.where(filtro_periodo)
        count = count.where(filtro_periodo)
    elif ano:
        # Compatibilidade: chamadas antigas continuam filtrando pelo ano estrutural.
        stmt = stmt.where(CompraContratacao.ano == ano)
        count = count.where(CompraContratacao.ano == ano)
    if unidade_codigo:
        stmt = stmt.where(CompraContratacao.unidade_compradora == unidade_codigo)
        count = count.where(CompraContratacao.unidade_compradora == unidade_codigo)
    if situacao:
        stmt = stmt.where(CompraContratacao.situacao_lista.ilike(f"%{situacao}%"))
        count = count.where(CompraContratacao.situacao_lista.ilike(f"%{situacao}%"))
    codigos_pncp = set(modalidade_codigo)
    if codigos_pncp:
        stmt = stmt.where(CompraContratacao.modalidade_id_pncp.in_(codigos_pncp))
        count = count.where(CompraContratacao.modalidade_id_pncp.in_(codigos_pncp))
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
    if material_ou_servico:
        tipo = material_ou_servico.strip().upper()
        if tipo not in {"M", "S"}:
            raise HTTPException(422, "Tipo deve ser M (Material) ou S (Serviço)")
        item_do_tipo = (
            select(CompraContratacaoItem.id)
            .where(
                or_(
                    CompraContratacaoItem.contratacao_id == CompraContratacao.id,
                    CompraContratacaoItem.id_compra == CompraContratacao.id_compra,
                ),
                CompraContratacaoItem.material_ou_servico == tipo,
            )
            .exists()
        )
        stmt = stmt.where(item_do_tipo)
        count = count.where(item_do_tipo)

    total = db.scalar(count) or 0
    rows = db.scalars(stmt.order_by(CompraContratacao.id.desc()).offset(offset).limit(limit)).all()
    tipos_por_id = _tipos_item_por_contratacao(db, rows)
    return {
        "items": [_compra_to_out(r, tipos_item=tipos_por_id.get(r.id)) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/api/compras/contratacoes/{cid}/itens")
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
    resultados_por_item: dict[str, list[ComprasContratacaoResultado]] = {}
    if rows:
        ids = [r.id_compra_item for r in rows]
        for res in db.scalars(
            select(ComprasContratacaoResultado)
            .options(selectinload(ComprasContratacaoResultado.fornecedor))
            .where(ComprasContratacaoResultado.id_compra_item.in_(ids))
        ):
            resultados_por_item.setdefault(res.id_compra_item, []).append(res)
    return {
        "items": [
            _item_to_out(r, resultados=resultados_por_item.get(r.id_compra_item, []))
            for r in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
        "aviso_api": (
            "A API federal lista apenas resultados classificados/homologados, "
            "não todos os proponentes."
        ),
    }


@router.get("/api/compras/contratacoes/{cid}")
def detalhe_compra(cid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(CompraContratacao)
        .options(selectinload(CompraContratacao.observador))
        .where(CompraContratacao.id == cid)
    )
    if not row:
        raise HTTPException(404, "Não encontrada")
    return _compra_to_out(row)


@router.patch("/api/compras/contratacoes/{cid}", response_model=CompraContratacaoOut)
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


@router.post("/api/compras/contratacoes/{cid}/atualizar-api")
def atualizar_compra_da_api(cid: int, db: Session = Depends(get_db)):
    """Reconsulta a API Compras.gov / PNCP para esta contratação (itens + resultados)."""
    try:
        out = atualizar_contratacao_da_api(db, cid)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"Falha ao consultar a API Compras.gov: {exc}") from exc

    row = db.scalar(
        select(CompraContratacao)
        .options(selectinload(CompraContratacao.observador))
        .where(CompraContratacao.id == cid)
    )
    if not row:
        raise HTTPException(404, "Não encontrada após atualização")
    return {
        "ok": True,
        "contratacao": _compra_to_out(row),
        "contadores": out["contadores"],
    }


@router.get("/api/compras/contratacoes/{cid}/resultados")
def resultados_contratacao(cid: int, db: Session = Depends(get_db)):
    contratacao = db.scalar(select(CompraContratacao).where(CompraContratacao.id == cid))
    if not contratacao:
        raise HTTPException(404, "Não encontrada")
    rows = db.scalars(
        select(ComprasContratacaoResultado)
        .options(selectinload(ComprasContratacaoResultado.fornecedor))
        .where(ComprasContratacaoResultado.id_compra == contratacao.id_compra)
        .order_by(
            ComprasContratacaoResultado.id_compra_item,
            ComprasContratacaoResultado.sequencial_resultado,
        )
    ).all()
    return {"items": [_resultado_to_out(r) for r in rows], "total": len(rows)}


@router.get("/api/compras/itens/{id_compra_item}/resultados")
def resultados_item(id_compra_item: str, db: Session = Depends(get_db)):
    rows = db.scalars(
        select(ComprasContratacaoResultado)
        .options(selectinload(ComprasContratacaoResultado.fornecedor))
        .where(ComprasContratacaoResultado.id_compra_item == id_compra_item)
        .order_by(ComprasContratacaoResultado.sequencial_resultado)
    ).all()
    return {"items": [_resultado_to_out(r) for r in rows], "total": len(rows)}


@router.get("/api/compras/itens/{id_compra_item}/precos")
def precos_item(
    id_compra_item: str,
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
):
    rows = db.scalars(
        select(ComprasPrecoPraticado)
        .where(ComprasPrecoPraticado.id_item_compra == id_compra_item)
        .order_by(ComprasPrecoPraticado.data_compra.desc())
        .limit(limit)
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "tipo_item": r.tipo_item,
                "preco_unitario": r.preco_unitario,
                "quantidade": r.quantidade,
                "data_compra": r.data_compra,
                "nome_fornecedor": r.nome_fornecedor,
                "municipio": r.municipio,
                "estado": r.estado,
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/api/compras/fornecedores")
def listar_fornecedores(
    db: Session = Depends(get_db),
    ni: str | None = None,
    q: str | None = None,
    limit: int = Query(50, ge=1, le=200),
):
    stmt = select(ComprasFornecedor)
    if ni:
        ni_d = ni.replace(".", "").replace("/", "").replace("-", "")
        stmt = stmt.where(ComprasFornecedor.ni_fornecedor.contains(ni_d))
    if q:
        stmt = stmt.where(ComprasFornecedor.nome_razao_social_fornecedor.ilike(f"%{q}%"))
    rows = db.scalars(stmt.order_by(ComprasFornecedor.nome_razao_social_fornecedor).limit(limit)).all()
    return {
        "items": [
            {
                "id": r.id,
                "ni_fornecedor": r.ni_fornecedor,
                "nome": r.nome_razao_social_fornecedor,
                "porte": r.porte_empresa_nome,
                "cnae": r.nome_cnae,
                "uf": r.uf_sigla,
                "municipio": r.nome_municipio,
                "de_uberlandia": r.de_uberlandia,
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/api/compras/vencedores-cnpj")
def listar_vencedores_cnpj(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Busca por nome ou CNPJ/CPF"),
    status: str | None = Query(
        None,
        description="Filtro de cache: atualizado | vencido | pendente | cpf | invalido",
    ),
    limit: int = Query(500, ge=1, le=2000),
):
    """Fornecedores vencedores consolidados de `compras_contratacao_itens` + status do cache CNPJ."""
    return listar_vencedores_consolidados(db, q=q, status=status, limit=limit)


@router.get("/api/compras/vencedores-cnpj/{ni}/homologacoes")
def listar_homologacoes_vencedor_cnpj(
    ni: str,
    db: Session = Depends(get_db),
    limit: int = Query(2000, ge=1, le=5000),
):
    """Itens homologados de um fornecedor (data, objeto, descrição, valor)."""
    try:
        return listar_homologacoes_fornecedor(db, ni, limit=limit)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/api/compras/vencedores-cnpj/atualizar-pendentes")
def iniciar_atualizar_pendentes_cnpj(
    bg: BackgroundTasks,
    _: Usuario = Depends(require_admin),
):
    """Enriquece todos os CNPJs pendentes com cadência segura (padrão 3s entre chamadas)."""
    try:
        inicio = iniciar_job_pendentes_cnpj()
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc
    bg.add_task(executar_job_pendentes_cnpj)
    return inicio


@router.get("/api/compras/vencedores-cnpj/atualizar-pendentes/status")
def status_atualizar_pendentes_cnpj():
    return status_job_pendentes_cnpj()


@router.post("/api/compras/vencedores-cnpj/atualizar-pendentes/cancelar")
def cancelar_atualizar_pendentes_cnpj(
    _: Usuario = Depends(require_admin),
):
    return cancelar_job_pendentes_cnpj()


@router.get("/api/compras/fornecedores/{ni}")
def detalhe_fornecedor_cnpj(
    ni: str,
    db: Session = Depends(get_db),
    refresh: bool = Query(False, description="Força nova consulta à API pública de CNPJ"),
    nome: str | None = Query(None, description="Nome hint do resultado homologado"),
):
    try:
        return obter_fornecedor_detalhe(db, ni, refresh=refresh, nome_hint=nome)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/api/compras/uasgs")
def listar_uasgs(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(ComprasUasg).options(selectinload(ComprasUasg.orgao)).order_by(ComprasUasg.codigo_uasg)
    ).all()
    return {
        "items": [
            {
                "id": r.id,
                "codigo_uasg": r.codigo_uasg,
                "nome_uasg": r.nome_uasg,
                "municipio": r.nome_municipio_ibge,
                "orgao": r.orgao.nome_orgao if r.orgao else None,
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/api/compras/pgc")
def listar_pgc(
    db: Session = Depends(get_db),
    orgao: str | None = None,
    ano: int | None = None,
    uasg: str | None = None,
    limit: int = Query(200, ge=1, le=1000),
):
    stmt = select(ComprasPgcItem)
    if orgao:
        stmt = stmt.where(ComprasPgcItem.orgao.contains(orgao.replace(".", "").replace("/", "").replace("-", "")))
    if ano:
        stmt = stmt.where(ComprasPgcItem.ano_pca_projeto_compra == ano)
    if uasg:
        stmt = stmt.where(ComprasPgcItem.codigo_uasg == uasg)
    rows = db.scalars(stmt.order_by(ComprasPgcItem.id.desc()).limit(limit)).all()
    return {
        "items": [
            {
                "id": r.id,
                "orgao": r.orgao,
                "ano": r.ano_pca_projeto_compra,
                "codigo_uasg": r.codigo_uasg,
                "codigo_item_catalogo": r.codigo_item_catalogo,
                "descricao": r.descricao_item_catalogo,
                "valor_total_item": r.valor_total_item,
                "status": r.status_contratacao_execucao,
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/api/compras/catalogo/{tipo}/{codigo}")
def detalhe_catalogo(tipo: str, codigo: int, db: Session = Depends(get_db)):
    tipo_norm = "Servico" if tipo.lower().startswith("serv") else "Material"
    row = db.scalar(
        select(ComprasItemCatalogo).where(
            ComprasItemCatalogo.tipo_item == tipo_norm,
            ComprasItemCatalogo.codigo_item_catalogo == codigo,
        )
    )
    if not row:
        raise HTTPException(404, "Item de catálogo não encontrado no cache local")
    dados = None
    if row.dados_json:
        try:
            dados = json.loads(row.dados_json)
        except json.JSONDecodeError:
            dados = None
    return {
        "tipo_item": row.tipo_item,
        "codigo_item_catalogo": row.codigo_item_catalogo,
        "descricao": row.descricao,
        "codigo_grupo": row.codigo_grupo,
        "codigo_classe": row.codigo_classe,
        "dados": dados,
    }

