"""Propostas abertas — itens com prazo PNCP ainda vigente + análise de preços."""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from decimal import Decimal
from statistics import median
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.compras.normalizers import parse_decimal
from app.database import (
    CompraContratacao,
    CompraContratacaoItem,
    ComprasPrecoPraticado,
    PropostaAnalisePreco,
    get_db,
)
from app.filtros_periodo import (
    Periodo,
    TipoPeriodo,
    condicao_periodo,
    data_iso_pncp,
    resolver_periodo,
)

router = APIRouter(prefix="/api/propostas-abertas", tags=["propostas-abertas"])

Horizonte = Literal["24h", "72h", "7d", "30d", "todos"]

_FMT_DATAS = (
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
)


def parse_data_pncp(val: str | None) -> datetime | None:
    """Interpreta `data_encerramento_proposta_pncp` (ex.: 13/07/2026 08:00)."""
    if not val:
        return None
    texto = str(val).strip()
    if not texto:
        return None
    for fmt in _FMT_DATAS:
        try:
            return datetime.strptime(texto[:19], fmt)
        except ValueError:
            continue
    return None




def _norm_desc(val: str | None) -> str | None:
    if not val:
        return None
    texto = " ".join(str(val).upper().split())
    return texto or None


def _ncm_do_item(item: CompraContratacaoItem) -> tuple[str | None, str | None]:
    """Extrai código e descrição NCM do JSON PNCP do item (quando disponível)."""
    raw = item.dados_pncp_json
    if not raw:
        return None, None
    try:
        dados = json.loads(raw) if isinstance(raw, str) else raw
    except (TypeError, ValueError, json.JSONDecodeError):
        return None, None
    if not isinstance(dados, dict):
        return None, None

    codigo = None
    for chave in ("codigo_ncm", "codigo_n_c_m", "codigoNCM"):
        val = dados.get(chave)
        if val is None or val == "":
            continue
        texto = str(val).strip()
        if texto and texto != "0":
            codigo = texto
            break

    descricao = None
    for chave in ("descricao_ncm", "descricao_n_c_m", "descricaoNCM"):
        val = dados.get(chave)
        if val is None or val == "":
            continue
        texto = str(val).strip()
        if texto:
            descricao = texto
            break

    return codigo, descricao


def _horizonte_delta(horizonte: Horizonte) -> timedelta | None:
    return {
        "24h": timedelta(hours=24),
        "72h": timedelta(hours=72),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "todos": None,
    }.get(horizonte)


def _urgencia(horas: float) -> str:
    if horas <= 24:
        return "critica"
    if horas <= 72:
        return "alta"
    if horas <= 168:
        return "media"
    return "normal"


def _fmt_moeda_num(d: Decimal | None) -> float | None:
    if d is None:
        return None
    return float(d)


def _decimal_to_br(d: Decimal | float | None) -> str | None:
    if d is None:
        return None
    n = Decimal(str(d))
    return f"R$ {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _stats_valores(valores: list[Decimal]) -> dict[str, Any] | None:
    if not valores:
        return None
    vals = sorted(valores)
    med = Decimal(str(median(vals)))
    media = sum(vals) / Decimal(len(vals))
    return {
        "amostras": len(vals),
        "minimo": _fmt_moeda_num(vals[0]),
        "maximo": _fmt_moeda_num(vals[-1]),
        "mediana": _fmt_moeda_num(med),
        "media": _fmt_moeda_num(media),
        "minimo_fmt": _decimal_to_br(vals[0]),
        "maximo_fmt": _decimal_to_br(vals[-1]),
        "mediana_fmt": _decimal_to_br(med),
        "media_fmt": _decimal_to_br(media),
    }


def _desvio_vs_mediana(
    unitario: Decimal | None, mediana_ref: float | None
) -> dict[str, Any] | None:
    if unitario is None or mediana_ref is None or mediana_ref == 0:
        return None
    med = Decimal(str(mediana_ref))
    pct = float(((unitario - med) / med) * 100)
    if pct >= 15:
        sinal = "acima"
    elif pct <= -15:
        sinal = "abaixo"
    else:
        sinal = "alinhado"
    return {
        "percentual": round(pct, 1),
        "sinal": sinal,
        "percentual_fmt": f"{pct:+.1f}%",
    }


def _ultimas_analises_ia(
    db: Session, item_ids: list[int]
) -> dict[int, dict[str, Any]]:
    """Resumo da análise mais recente de cada item, carregado em uma única consulta."""
    if not item_ids:
        return {}

    # Import tardio: evita ciclo com analise_preco (que usa helpers deste módulo).
    from app.analise_preco import normalizar_comparativo_mercado

    ultimos_ids = (
        select(func.max(PropostaAnalisePreco.id))
        .where(PropostaAnalisePreco.item_id.in_(item_ids))
        .group_by(PropostaAnalisePreco.item_id)
    )
    rows = db.scalars(
        select(PropostaAnalisePreco).where(PropostaAnalisePreco.id.in_(ultimos_ids))
    ).all()

    unitarios_raw = db.execute(
        select(
            CompraContratacaoItem.id,
            CompraContratacaoItem.valor_unitario_estimado,
        ).where(CompraContratacaoItem.id.in_(item_ids))
    ).all()
    unitarios: dict[int, float | None] = {}
    for item_id, valor in unitarios_raw:
        parsed = _parse_valor_item(valor)
        if parsed is not None and parsed > 0:
            unitarios[int(item_id)] = float(parsed)
        else:
            unitarios[int(item_id)] = None

    out: dict[int, dict[str, Any]] = {}
    for row in rows:
        estruturado: dict[str, Any] = {}
        if row.resposta_json:
            try:
                parsed = json.loads(row.resposta_json)
                if isinstance(parsed, dict):
                    normalizado = normalizar_comparativo_mercado(
                        parsed, unitarios.get(row.item_id)
                    )
                    estruturado = normalizado if isinstance(normalizado, dict) else parsed
            except (TypeError, ValueError, json.JSONDecodeError):
                pass
        out[row.item_id] = {
            "status": row.status,
            "comparativo": estruturado.get("comparativo"),
            "desvio_percentual_aprox": estruturado.get("desvio_percentual_aprox"),
            "criado_em": (
                row.criado_em.isoformat(timespec="seconds") if row.criado_em else None
            ),
        }
    return out


def _norm_codigos(valor: str | list[str] | None) -> list[str]:
    if valor is None:
        return []
    if isinstance(valor, str):
        c = valor.strip()
        return [c] if c else []
    return [c.strip() for c in valor if c and str(c).strip()]


def _carregar_contratacoes_abertas(
    db: Session,
    *,
    agora: datetime | None = None,
    horizonte: Horizonte = "todos",
    ano: int | None = None,
    periodo: Periodo | None = None,
    unidade_codigo: str | None = None,
    modalidade_codigo: str | list[str] | None = None,
    situacao: str | None = None,
    texto: str | None = None,
) -> list[tuple[CompraContratacao, datetime]]:
    agora = agora or datetime.now()
    delta = _horizonte_delta(horizonte)
    limite = (agora + delta) if delta is not None else None

    stmt = select(CompraContratacao).where(
        CompraContratacao.data_encerramento_proposta_pncp.isnot(None),
        CompraContratacao.data_encerramento_proposta_pncp != "",
    )
    filtro_periodo = condicao_periodo(
        data_iso_pncp(CompraContratacao.data_encerramento_proposta_pncp), periodo
    )
    if filtro_periodo is not None:
        stmt = stmt.where(filtro_periodo)
    elif ano:
        stmt = stmt.where(CompraContratacao.ano == ano)
    if unidade_codigo:
        stmt = stmt.where(CompraContratacao.unidade_compradora == unidade_codigo)
    codigos = _norm_codigos(modalidade_codigo)
    if codigos:
        stmt = stmt.where(CompraContratacao.modalidade_codigo.in_(codigos))
    if situacao:
        stmt = stmt.where(CompraContratacao.situacao_lista.ilike(f"%{situacao}%"))
    if texto:
        termo = texto.strip()
        if termo:
            p = f"%{termo}%"
            stmt = stmt.where(
                or_(
                    CompraContratacao.objeto.ilike(p),
                    CompraContratacao.processo.ilike(p),
                    CompraContratacao.numero.ilike(p),
                    CompraContratacao.numero_controle_pncp.ilike(p),
                    CompraContratacao.id_compra.ilike(p),
                    CompraContratacao.chave_compra.ilike(p),
                )
            )

    out: list[tuple[CompraContratacao, datetime]] = []
    for row in db.scalars(stmt):
        dt = parse_data_pncp(row.data_encerramento_proposta_pncp)
        if dt is None or dt <= agora:
            continue
        if limite is not None and dt > limite:
            continue
        out.append((row, dt))
    out.sort(key=lambda x: x[1])
    return out


def _parse_valor_item(val: Any) -> Decimal | None:
    """
    Aceita número, formato BR (1.234,56) e decimal com ponto (147.9)
    sem tratar o ponto como milhar quando não há vírgula.
    """
    if val is None or val == "":
        return None
    if isinstance(val, (int, float, Decimal)):
        try:
            return Decimal(str(val))
        except Exception:
            return None
    texto = str(val).strip().replace("R$", "").strip().replace(" ", "")
    if not texto:
        return None
    if "," in texto:
        return parse_decimal(texto)
    try:
        return Decimal(texto)
    except Exception:
        return parse_decimal(texto)


def _preco_ref_item(est: Any, res: Any) -> Decimal | None:
    for raw in (res, est):
        d = _parse_valor_item(raw)
        if d is not None and d > 0:
            return d
    return None


def _benchmark_catalogo(
    db: Session, codigos: set[int]
) -> dict[int, dict[str, Any]]:
    """Preços de referência por código CATMAT/CATSER a partir de itens já coletados."""
    if not codigos:
        return {}
    rows = db.execute(
        select(
            CompraContratacaoItem.cod_item_catalogo,
            CompraContratacaoItem.valor_unitario_estimado,
            CompraContratacaoItem.valor_unitario_resultado,
        ).where(CompraContratacaoItem.cod_item_catalogo.in_(list(codigos)))
    ).all()

    por_codigo: dict[int, list[Decimal]] = {}
    for cod, est, res in rows:
        if cod is None:
            continue
        d = _preco_ref_item(est, res)
        if d is not None:
            por_codigo.setdefault(int(cod), []).append(d)

    out: dict[int, dict[str, Any]] = {}
    for cod, vals in por_codigo.items():
        stats = _stats_valores(vals)
        if stats:
            stats = {**stats, "origem": "catalogo"}
            out[cod] = stats
    return out


def _benchmark_descricoes(
    db: Session, descricoes: set[str]
) -> dict[str, dict[str, Any]]:
    """Referência por descrição resumida normalizada (quando não há catálogo)."""
    if not descricoes:
        return {}
    # Carrega candidatos com descrição preenchida; filtra em Python pela norma.
    rows = db.execute(
        select(
            CompraContratacaoItem.descricao_resumida,
            CompraContratacaoItem.valor_unitario_estimado,
            CompraContratacaoItem.valor_unitario_resultado,
        ).where(
            CompraContratacaoItem.descricao_resumida.isnot(None),
            CompraContratacaoItem.descricao_resumida != "",
        )
    ).all()
    por_desc: dict[str, list[Decimal]] = {}
    for desc, est, res in rows:
        chave = _norm_desc(desc)
        if not chave or chave not in descricoes:
            continue
        d = _preco_ref_item(est, res)
        if d is not None:
            por_desc.setdefault(chave, []).append(d)
    out: dict[str, dict[str, Any]] = {}
    for chave, vals in por_desc.items():
        stats = _stats_valores(vals)
        if stats:
            out[chave] = {**stats, "origem": "descricao"}
    return out


def _item_linha(
    item: CompraContratacaoItem,
    contratacao: CompraContratacao,
    encerramento: datetime,
    *,
    agora: datetime,
    benchmark: dict[str, Any] | None,
) -> dict[str, Any]:
    restante = encerramento - agora
    horas = max(restante.total_seconds() / 3600, 0)
    dias = max(restante.total_seconds() / 86400, 0)
    unitario = _parse_valor_item(item.valor_unitario_estimado)
    if unitario is not None and unitario <= 0:
        unitario = None
    total = _parse_valor_item(item.valor_total)
    if total is not None and total <= 0:
        total = None
    if total is None and unitario is not None:
        qtd = _parse_valor_item(item.quantidade)
        if qtd is not None:
            total = unitario * qtd

    desvio = None
    if benchmark:
        desvio = _desvio_vs_mediana(unitario, benchmark.get("mediana"))

    codigo_ncm, descricao_ncm = _ncm_do_item(item)

    return {
        "item_id": item.id,
        "id_compra_item": item.id_compra_item,
        "id_compra": item.id_compra,
        "contratacao_id": contratacao.id,
        "numero_item": item.numero_item_pncp or item.numero_item_compra,
        "descricao_resumida": item.descricao_resumida,
        "descricao_detalhada": item.descricao_detalhada,
        "material_ou_servico": item.material_ou_servico,
        "material_ou_servico_nome": item.material_ou_servico_nome,
        "cod_item_catalogo": item.cod_item_catalogo,
        "codigo_ncm": codigo_ncm,
        "descricao_ncm": descricao_ncm,
        "unidade_medida": item.unidade_medida,
        "quantidade": item.quantidade,
        "valor_unitario_estimado": item.valor_unitario_estimado,
        "valor_unitario_estimado_num": _fmt_moeda_num(unitario),
        "valor_total": item.valor_total,
        "valor_total_num": _fmt_moeda_num(total),
        "situacao_item": item.situacao_compra_item_nome,
        "criterio_julgamento": item.criterio_julgamento_nome,
        "numero_compra": contratacao.numero or contratacao.id_compra,
        "processo": contratacao.processo,
        "ano": contratacao.ano,
        "unidade_codigo": contratacao.unidade_compradora,
        "unidade_nome": contratacao.unidade_nome,
        "modalidade_codigo": contratacao.modalidade_codigo,
        "modalidade_descricao": contratacao.modalidade_descricao,
        "situacao_lista": contratacao.situacao_lista,
        "objeto": contratacao.objeto,
        "numero_controle_pncp": contratacao.numero_controle_pncp,
        "link_pncp": contratacao.link_pncp,
        "data_abertura_proposta_pncp": contratacao.data_abertura_proposta_pncp,
        "data_encerramento_proposta_pncp": contratacao.data_encerramento_proposta_pncp,
        "encerramento_iso": encerramento.isoformat(timespec="minutes"),
        "horas_restantes": round(horas, 1),
        "dias_restantes": round(dias, 2),
        "urgencia": _urgencia(horas),
        "benchmark_catalogo": benchmark,
        "desvio_preco": desvio,
    }


@router.get("/resumo")
def resumo_propostas_abertas(
    db: Session = Depends(get_db),
    horizonte: Horizonte = Query("todos"),
    ano: int | None = None,
    periodo: TipoPeriodo | None = None,
    quadrimestre: int | None = Query(None, ge=1, le=3),
    data_inicial: date | None = None,
    data_final: date | None = None,
    unidade_codigo: str | None = None,
    modalidade_codigo: list[str] = Query(default=[]),
    situacao: str | None = None,
    texto: str | None = None,
):
    agora = datetime.now()
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
    abertas = _carregar_contratacoes_abertas(
        db,
        agora=agora,
        horizonte=horizonte,
        ano=ano,
        periodo=periodo_resolvido,
        unidade_codigo=unidade_codigo,
        modalidade_codigo=modalidade_codigo,
        situacao=situacao,
        texto=texto,
    )
    if not abertas:
        return {
            "gerado_em": agora.isoformat(timespec="seconds"),
            "contratacoes": 0,
            "itens": 0,
            "valor_estimado_total": 0.0,
            "valor_estimado_total_fmt": _decimal_to_br(Decimal("0")),
            "urgentes_24h": 0,
            "urgentes_72h": 0,
            "por_urgencia": {"critica": 0, "alta": 0, "media": 0, "normal": 0},
            "por_modalidade": [],
            "proximos_encerramentos": [],
        }

    mapa = {c.id: (c, dt) for c, dt in abertas}
    ids = list(mapa.keys())
    itens = db.scalars(
        select(CompraContratacaoItem).where(CompraContratacaoItem.contratacao_id.in_(ids))
    ).all()

    valor_total = Decimal("0")
    por_urg = {"critica": 0, "alta": 0, "media": 0, "normal": 0}
    por_mod: dict[str, int] = {}
    urgentes_24h = urgentes_72h = 0

    for item in itens:
        c, dt = mapa[item.contratacao_id]  # type: ignore[index]
        horas = max((dt - agora).total_seconds() / 3600, 0)
        urg = _urgencia(horas)
        por_urg[urg] += 1
        if horas <= 24:
            urgentes_24h += 1
        if horas <= 72:
            urgentes_72h += 1
        mod = c.modalidade_descricao or c.modalidade_codigo or "—"
        por_mod[mod] = por_mod.get(mod, 0) + 1
        tot = _parse_valor_item(item.valor_total)
        if tot is None:
            u = _parse_valor_item(item.valor_unitario_estimado)
            q = _parse_valor_item(item.quantidade)
            if u is not None and q is not None:
                tot = u * q
        if tot is not None:
            valor_total += tot

    proximos = []
    for c, dt in abertas[:8]:
        horas = max((dt - agora).total_seconds() / 3600, 0)
        proximos.append(
            {
                "contratacao_id": c.id,
                "numero": c.numero or c.id_compra,
                "processo": c.processo,
                "modalidade": c.modalidade_descricao,
                "unidade_nome": c.unidade_nome,
                "data_encerramento_proposta_pncp": c.data_encerramento_proposta_pncp,
                "horas_restantes": round(horas, 1),
                "urgencia": _urgencia(horas),
            }
        )

    return {
        "gerado_em": agora.isoformat(timespec="seconds"),
        "contratacoes": len(abertas),
        "itens": len(itens),
        "valor_estimado_total": float(valor_total),
        "valor_estimado_total_fmt": _decimal_to_br(valor_total),
        "urgentes_24h": urgentes_24h,
        "urgentes_72h": urgentes_72h,
        "por_urgencia": por_urg,
        "por_modalidade": [
            {"nome": k, "total": v}
            for k, v in sorted(por_mod.items(), key=lambda x: -x[1])
        ],
        "proximos_encerramentos": proximos,
    }


@router.get("/itens")
def listar_itens_propostas_abertas(
    db: Session = Depends(get_db),
    horizonte: Horizonte = Query("todos"),
    ano: int | None = None,
    periodo: TipoPeriodo | None = None,
    quadrimestre: int | None = Query(None, ge=1, le=3),
    data_inicial: date | None = None,
    data_final: date | None = None,
    unidade_codigo: str | None = None,
    modalidade_codigo: list[str] = Query(default=[]),
    situacao: str | None = None,
    texto: str | None = None,
    material_ou_servico: str | None = None,
    com_catalogo: bool | None = None,
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
):
    agora = datetime.now()
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
    abertas = _carregar_contratacoes_abertas(
        db,
        agora=agora,
        horizonte=horizonte,
        ano=ano,
        periodo=periodo_resolvido,
        unidade_codigo=unidade_codigo,
        modalidade_codigo=modalidade_codigo,
        situacao=situacao,
        texto=None,
    )
    if not abertas:
        return {
            "items": [],
            "total": 0,
            "limit": limit,
            "offset": offset,
            "gerado_em": agora.isoformat(timespec="seconds"),
            "aviso": (
                "Somente contratações com data_encerramento_proposta_pncp "
                "posterior ao momento atual."
            ),
        }

    mapa = {c.id: (c, dt) for c, dt in abertas}
    ids = list(mapa.keys())
    stmt = select(CompraContratacaoItem).where(
        CompraContratacaoItem.contratacao_id.in_(ids)
    )
    if material_ou_servico:
        tipo = material_ou_servico.strip().upper()[:1]
        if tipo in ("M", "S"):
            stmt = stmt.where(CompraContratacaoItem.material_ou_servico == tipo)
    if com_catalogo is True:
        stmt = stmt.where(CompraContratacaoItem.cod_item_catalogo.isnot(None))
    elif com_catalogo is False:
        stmt = stmt.where(CompraContratacaoItem.cod_item_catalogo.is_(None))

    rows = list(db.scalars(stmt))
    termo = (texto or "").strip().lower()

    def _match_texto(item: CompraContratacaoItem, c: CompraContratacao) -> bool:
        if not termo:
            return True
        campos = [
            c.objeto,
            c.processo,
            c.numero,
            c.numero_controle_pncp,
            c.id_compra,
            c.chave_compra,
            item.descricao_resumida,
            item.descricao_detalhada,
            item.id_compra_item,
            str(item.cod_item_catalogo or ""),
            _ncm_do_item(item)[0] or "",
        ]
        return any(termo in str(v).lower() for v in campos if v)

    codigos = {
        int(r.cod_item_catalogo)
        for r in rows
        if r.cod_item_catalogo is not None
    }
    descricoes = {
        d
        for r in rows
        if r.cod_item_catalogo is None
        for d in [_norm_desc(r.descricao_resumida)]
        if d
    }
    benches_cat = _benchmark_catalogo(db, codigos)
    benches_desc = _benchmark_descricoes(db, descricoes)

    linhas: list[dict[str, Any]] = []
    for item in rows:
        if item.contratacao_id not in mapa:
            continue
        c, dt = mapa[item.contratacao_id]
        if not _match_texto(item, c):
            continue
        horas = max((dt - agora).total_seconds() / 3600, 0)
        if item.cod_item_catalogo:
            bench = benches_cat.get(int(item.cod_item_catalogo))
        else:
            chave = _norm_desc(item.descricao_resumida)
            bench = benches_desc.get(chave) if chave else None
        linhas.append(
            _item_linha(item, c, dt, agora=agora, benchmark=bench)
        )

    linhas.sort(
        key=lambda r: (
            r["horas_restantes"],
            -(r["valor_total_num"] or 0),
            r["numero_item"] or 0,
        )
    )
    total = len(linhas)
    page = linhas[offset : offset + limit]
    analises_ia = _ultimas_analises_ia(db, [int(row["item_id"]) for row in page])
    for row in page:
        row["analise_ia"] = analises_ia.get(int(row["item_id"]))
    return {
        "items": page,
        "total": total,
        "limit": limit,
        "offset": offset,
        "gerado_em": agora.isoformat(timespec="seconds"),
        "aviso": (
            "Prazo com base em data_encerramento_proposta_pncp. "
            "Referência de preço usa outros itens do mesmo código de catálogo "
            "já coletados na base local."
        ),
    }


@router.get("/itens/{item_id}/analise-preco")
def analisar_preco_item(item_id: int, db: Session = Depends(get_db)):
    """Comparáveis locais (mesmo CATMAT/CATSER) + pesquisa de preço, se houver."""
    item = db.scalar(
        select(CompraContratacaoItem)
        .options(selectinload(CompraContratacaoItem.contratacao))
        .where(CompraContratacaoItem.id == item_id)
    )
    if not item:
        raise HTTPException(404, "Item não encontrado")

    contratacao = item.contratacao
    if contratacao is None and item.contratacao_id:
        contratacao = db.get(CompraContratacao, item.contratacao_id)
    if contratacao is None:
        raise HTTPException(404, "Contratação do item não encontrada")

    agora = datetime.now()
    enc = parse_data_pncp(contratacao.data_encerramento_proposta_pncp)
    unitario = _parse_valor_item(item.valor_unitario_estimado)
    if unitario is not None and unitario <= 0:
        unitario = None
    comparaveis: list[dict[str, Any]] = []
    benchmark = None
    origem_ref = None
    outros: list[CompraContratacaoItem] = []
    if item.cod_item_catalogo is not None:
        origem_ref = "catalogo"
        outros = list(
            db.scalars(
                select(CompraContratacaoItem)
                .options(selectinload(CompraContratacaoItem.contratacao))
                .where(
                    CompraContratacaoItem.cod_item_catalogo == item.cod_item_catalogo,
                    CompraContratacaoItem.id != item.id,
                )
                .limit(80)
            )
        )
    else:
        chave = _norm_desc(item.descricao_resumida)
        if chave and item.descricao_resumida:
            origem_ref = "descricao"
            outros = list(
                db.scalars(
                    select(CompraContratacaoItem)
                    .options(selectinload(CompraContratacaoItem.contratacao))
                    .where(
                        CompraContratacaoItem.descricao_resumida.ilike(
                            item.descricao_resumida.strip()
                        ),
                        CompraContratacaoItem.id != item.id,
                    )
                    .limit(80)
                )
            )
            # Garante igualdade normalizada (espaços / caixa).
            outros = [o for o in outros if _norm_desc(o.descricao_resumida) == chave]

    if outros:
        valores: list[Decimal] = []
        for o in outros:
            preco = _preco_ref_item(o.valor_unitario_estimado, o.valor_unitario_resultado)
            if preco is None:
                continue
            valores.append(preco)
            c = o.contratacao
            comparaveis.append(
                {
                    "item_id": o.id,
                    "id_compra_item": o.id_compra_item,
                    "contratacao_id": o.contratacao_id,
                    "numero_compra": (c.numero if c else None) or o.id_compra,
                    "ano": c.ano if c else None,
                    "processo": c.processo if c else None,
                    "unidade_nome": c.unidade_nome if c else None,
                    "descricao_resumida": o.descricao_resumida,
                    "valor_unitario": _decimal_to_br(preco),
                    "valor_unitario_num": float(preco),
                    "origem_preco": (
                        "resultado"
                        if _parse_valor_item(o.valor_unitario_resultado)
                        else "estimado"
                    ),
                    "data_encerramento_proposta_pncp": (
                        c.data_encerramento_proposta_pncp if c else None
                    ),
                }
            )
        benchmark = _stats_valores(valores)
        if benchmark and origem_ref:
            benchmark = {**benchmark, "origem": origem_ref}

    precos_pesquisa = []
    if item.id_compra_item:
        conds = [ComprasPrecoPraticado.id_item_compra == item.id_compra_item]
        if item.cod_item_catalogo is not None:
            conds.append(
                ComprasPrecoPraticado.codigo_item_catalogo == item.cod_item_catalogo
            )
        for p in db.scalars(
            select(ComprasPrecoPraticado)
            .where(or_(*conds))
            .order_by(ComprasPrecoPraticado.data_compra.desc())
            .limit(40)
        ):
            precos_pesquisa.append(
                {
                    "preco_unitario": p.preco_unitario,
                    "quantidade": p.quantidade,
                    "data_compra": p.data_compra,
                    "nome_fornecedor": p.nome_fornecedor,
                    "municipio": p.municipio,
                    "estado": p.estado,
                    "modalidade": p.modalidade,
                }
            )

    horas = None
    urgencia = None
    if enc and enc > agora:
        horas = round(max((enc - agora).total_seconds() / 3600, 0), 1)
        urgencia = _urgencia(horas)

    codigo_ncm, descricao_ncm = _ncm_do_item(item)

    return {
        "item": {
            "item_id": item.id,
            "id_compra_item": item.id_compra_item,
            "numero_item": item.numero_item_pncp or item.numero_item_compra,
            "descricao_resumida": item.descricao_resumida,
            "descricao_detalhada": item.descricao_detalhada,
            "cod_item_catalogo": item.cod_item_catalogo,
            "codigo_ncm": codigo_ncm,
            "descricao_ncm": descricao_ncm,
            "material_ou_servico_nome": item.material_ou_servico_nome,
            "quantidade": item.quantidade,
            "unidade_medida": item.unidade_medida,
            "valor_unitario_estimado": item.valor_unitario_estimado,
            "valor_total": item.valor_total,
            "situacao_item": item.situacao_compra_item_nome,
        },
        "contratacao": {
            "id": contratacao.id,
            "numero": contratacao.numero or contratacao.id_compra,
            "processo": contratacao.processo,
            "ano": contratacao.ano,
            "unidade_nome": contratacao.unidade_nome,
            "modalidade_descricao": contratacao.modalidade_descricao,
            "objeto": contratacao.objeto,
            "data_encerramento_proposta_pncp": contratacao.data_encerramento_proposta_pncp,
            "link_pncp": contratacao.link_pncp,
            "horas_restantes": horas,
            "urgencia": urgencia,
        },
        "benchmark_catalogo": benchmark,
        "desvio_preco": _desvio_vs_mediana(
            unitario, benchmark.get("mediana") if benchmark else None
        ),
        "comparaveis": sorted(
            comparaveis, key=lambda x: x["valor_unitario_num"] or 0
        )[:40],
        "pesquisa_preco": precos_pesquisa,
        "leitura": _montar_leitura(unitario, benchmark, horas),
    }


def _montar_leitura(
    unitario: Decimal | None,
    benchmark: dict[str, Any] | None,
    horas: float | None,
) -> str:
    partes: list[str] = []
    if horas is not None:
        if horas <= 24:
            partes.append("Prazo crítico: encerramento em menos de 24 horas.")
        elif horas <= 72:
            partes.append("Prazo apertado: encerramento em até 72 horas.")
        else:
            partes.append(
                f"Restam cerca de {horas / 24:.1f} dia(s) para o encerramento das propostas."
            )
    if unitario is None:
        partes.append("Item sem valor unitário estimado na base local.")
    elif not benchmark:
        partes.append(
            "Sem amostra local suficiente (catálogo ou mesma descrição) para comparar o preço."
        )
    else:
        base = (
            "do mesmo código de catálogo"
            if benchmark.get("origem") == "catalogo"
            else "com a mesma descrição resumida"
        )
        desvio = _desvio_vs_mediana(unitario, benchmark.get("mediana"))
        if desvio:
            if desvio["sinal"] == "acima":
                partes.append(
                    f"Valor unitário estimado {desvio['percentual_fmt']} acima da mediana "
                    f"local {base} ({benchmark.get('mediana_fmt')}, "
                    f"{benchmark['amostras']} amostra(s))."
                )
            elif desvio["sinal"] == "abaixo":
                partes.append(
                    f"Valor unitário estimado {desvio['percentual_fmt']} abaixo da mediana "
                    f"local {base} ({benchmark.get('mediana_fmt')}, "
                    f"{benchmark['amostras']} amostra(s))."
                )
            else:
                partes.append(
                    f"Valor unitário alinhado à mediana local {base} "
                    f"({benchmark.get('mediana_fmt')}, {benchmark['amostras']} amostra(s))."
                )
    return " ".join(partes)
