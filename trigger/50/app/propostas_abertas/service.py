"""Regras de Propostas abertas — fila operacional por item (sem IA).

Universo: itens de contratações com ``data_encerramento_proposta_pncp``
posterior ao momento atual, no escopo UASG da visão filial.

Referência de preço: mediana local (mesmo CATMAT/CATSER ou mesma descrição)
sobre a base já coletada — estatística, não mercado externo / IA.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from statistics import median
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import Contratacao, ItemContratacao, ResultadoItem, Uasg, UsuarioContratacao

Horizonte = Literal["24h", "72h", "7d", "30d", "todos"]

_FMT_DATAS = (
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
)

SORT_WHITELIST = {
    "horas_restantes",
    "numero_compra",
    "processo",
    "numero_item",
    "descricao_resumida",
    "codigo_ncm",
    "quantidade",
    "valor_unitario_estimado_num",
    "valor_total_num",
    "desvio_pct",
    "uasg",
}


def parse_data_pncp(val: str | None) -> datetime | None:
    """Interpreta ``data_encerramento_proposta_pncp`` (ex.: 13/07/2026 08:00)."""
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


def _horizonte_delta(horizonte: Horizonte) -> timedelta | None:
    return {
        "24h": timedelta(hours=24),
        "72h": timedelta(hours=72),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "todos": None,
    }.get(horizonte)


def urgencia(horas: float) -> str:
    if horas <= 24:
        return "critica"
    if horas <= 72:
        return "alta"
    if horas <= 168:
        return "media"
    return "normal"


def _norm_desc(val: str | None) -> str | None:
    if not val:
        return None
    texto = " ".join(str(val).upper().split())
    return texto or None


def parse_valor(val: Any) -> Decimal | None:
    """Aceita número, BR (1.234,56) e decimal com ponto sem milhar."""
    if val is None or val == "":
        return None
    if isinstance(val, (int, float, Decimal)):
        try:
            return Decimal(str(val))
        except (InvalidOperation, ValueError):
            return None
    texto = str(val).strip().replace("R$", "").strip().replace(" ", "")
    if not texto:
        return None
    if "," in texto:
        limpo = texto.replace(".", "").replace(",", ".")
        try:
            return Decimal(limpo)
        except (InvalidOperation, ValueError):
            return None
    try:
        return Decimal(texto)
    except (InvalidOperation, ValueError):
        return None


def _fmt_moeda_num(d: Decimal | None) -> float | None:
    if d is None:
        return None
    return float(d)


def decimal_to_br(d: Decimal | float | None) -> str | None:
    if d is None:
        return None
    n = Decimal(str(d))
    return f"R$ {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def ncm_do_item(item: ItemContratacao) -> tuple[str | None, str | None]:
    raw = item.dados_json
    if not raw:
        return None, None
    try:
        dados = json.loads(raw) if isinstance(raw, str) else raw
    except (TypeError, ValueError, json.JSONDecodeError):
        return None, None
    if not isinstance(dados, dict):
        return None, None

    codigo = None
    for chave in ("codigo_ncm", "codigo_n_c_m", "codigoNCM", "codigoNcm"):
        val = dados.get(chave)
        if val is None or val == "":
            continue
        texto = str(val).strip()
        if texto and texto != "0":
            codigo = texto
            break

    descricao = None
    for chave in ("descricao_ncm", "descricao_n_c_m", "descricaoNCM", "descricaoNcm"):
        val = dados.get(chave)
        if val is None or val == "":
            continue
        texto = str(val).strip()
        if texto:
            descricao = texto
            break
    return codigo, descricao


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
        "minimo_fmt": decimal_to_br(vals[0]),
        "maximo_fmt": decimal_to_br(vals[-1]),
        "mediana_fmt": decimal_to_br(med),
        "media_fmt": decimal_to_br(media),
    }


def desvio_vs_mediana(
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


def _preco_ref_item(
    estimado: Any, homologado: Any | None = None
) -> Decimal | None:
    for raw in (homologado, estimado):
        d = parse_valor(raw)
        if d is not None and d > 0:
            return d
    return None


def _norm_codigos(valor: str | list[str] | None) -> list[str]:
    if valor is None:
        return []
    if isinstance(valor, str):
        c = valor.strip()
        return [c] if c else []
    return [c.strip() for c in valor if c and str(c).strip()]


def uasgs_da_filial_visao(
    db: Session, *, escopo_uasgs: list[str] | None
) -> list[dict[str, Any]]:
    """UASGs do cadastro da filial filtrada (FilialUasg → códigos do escopo)."""
    if escopo_uasgs is not None and not escopo_uasgs:
        return []
    if escopo_uasgs is None:
        return []
    codigos = sorted({str(c).strip() for c in escopo_uasgs if c and str(c).strip()})
    if not codigos:
        return []
    nomes = {
        str(cod): (nome or "").strip() or None
        for cod, nome in db.execute(
            select(Uasg.codigo_uasg, Uasg.nome_uasg).where(Uasg.codigo_uasg.in_(codigos))
        ).all()
        if cod
    }
    return [{"codigo": cod, "nome": nomes.get(cod)} for cod in codigos]


def carregar_contratacoes_abertas(
    db: Session,
    *,
    agora: datetime | None = None,
    horizonte: Horizonte = "todos",
    escopo_uasgs: list[str] | None,
    codigo_uasg: str | None = None,
    modalidade_codigos: list[str] | None = None,
    acompanhamento: str | None = None,
    acompanhamento_usuario_id: int | None = None,
    acompanhamento_unidade_ids: list[int] | None = None,
) -> list[tuple[Contratacao, datetime]]:
    """Contratações com encerramento PNCP futuro no escopo (ordenado por prazo)."""
    agora = agora or datetime.now()
    if escopo_uasgs is not None and not escopo_uasgs:
        return []

    delta = _horizonte_delta(horizonte)
    limite = (agora + delta) if delta is not None else None

    stmt = select(Contratacao).where(
        Contratacao.data_encerramento_proposta_pncp.isnot(None),
        Contratacao.data_encerramento_proposta_pncp != "",
    )
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    if codigo_uasg:
        codigo = codigo_uasg.strip()
        if escopo_uasgs is not None and codigo not in escopo_uasgs:
            return []
        stmt = stmt.where(Contratacao.unidade_compradora == codigo)
    mods = _norm_codigos(modalidade_codigos)
    if mods:
        stmt = stmt.where(Contratacao.modalidade_codigo.in_(mods))

    modo_acomp = (acompanhamento or "").strip().lower()
    if modo_acomp in ("minhas", "sem") and acompanhamento_usuario_id is not None:
        sub = select(UsuarioContratacao.contratacao_id).where(
            UsuarioContratacao.usuario_id == acompanhamento_usuario_id,
            UsuarioContratacao.ativo.is_(True),
        )
        if modo_acomp == "minhas":
            stmt = stmt.where(Contratacao.id.in_(sub))
        else:
            stmt = stmt.where(~Contratacao.id.in_(sub))
    elif modo_acomp in ("com", "sem_resp"):
        from app.acompanhamento.service import subquery_cobertura_ids

        sub_cob = subquery_cobertura_ids(acompanhamento_unidade_ids)
        if modo_acomp == "com":
            stmt = stmt.where(Contratacao.id.in_(sub_cob))
        else:
            stmt = stmt.where(~Contratacao.id.in_(sub_cob))

    out: list[tuple[Contratacao, datetime]] = []
    for row in db.scalars(stmt):
        dt = parse_data_pncp(row.data_encerramento_proposta_pncp)
        if dt is None or dt <= agora:
            continue
        if limite is not None and dt > limite:
            continue
        out.append((row, dt))
    out.sort(key=lambda x: x[1])
    return out


def _mapa_homologado_unitario(
    db: Session, item_ids: list[int]
) -> dict[int, Decimal]:
    """Primeiro valor unitário homologado positivo por item (se houver)."""
    if not item_ids:
        return {}
    rows = db.execute(
        select(
            ResultadoItem.item_id,
            ResultadoItem.valor_unitario_homologado,
        ).where(
            ResultadoItem.item_id.in_(item_ids),
            ResultadoItem.valor_unitario_homologado.isnot(None),
            ResultadoItem.valor_unitario_homologado != "",
        )
    ).all()
    out: dict[int, Decimal] = {}
    for item_id, valor in rows:
        if item_id is None or int(item_id) in out:
            continue
        d = parse_valor(valor)
        if d is not None and d > 0:
            out[int(item_id)] = d
    return out


def _benchmark_catalogo(
    db: Session, codigos: set[int]
) -> dict[int, dict[str, Any]]:
    if not codigos:
        return {}
    rows = list(
        db.scalars(
            select(ItemContratacao).where(
                ItemContratacao.cod_item_catalogo.in_(list(codigos))
            )
        )
    )
    homs = _mapa_homologado_unitario(db, [r.id for r in rows])
    por_codigo: dict[int, list[Decimal]] = {}
    for r in rows:
        if r.cod_item_catalogo is None:
            continue
        d = _preco_ref_item(r.valor_unitario_estimado, homs.get(r.id))
        if d is not None:
            por_codigo.setdefault(int(r.cod_item_catalogo), []).append(d)
    out: dict[int, dict[str, Any]] = {}
    for cod, vals in por_codigo.items():
        stats = _stats_valores(vals)
        if stats:
            out[cod] = {**stats, "origem": "catalogo"}
    return out


def _benchmark_descricoes(
    db: Session, descricoes: set[str]
) -> dict[str, dict[str, Any]]:
    if not descricoes:
        return {}
    rows = list(
        db.scalars(
            select(ItemContratacao).where(
                ItemContratacao.descricao_resumida.isnot(None),
                ItemContratacao.descricao_resumida != "",
            )
        )
    )
    homs = _mapa_homologado_unitario(db, [r.id for r in rows])
    por_desc: dict[str, list[Decimal]] = {}
    for r in rows:
        chave = _norm_desc(r.descricao_resumida)
        if not chave or chave not in descricoes:
            continue
        d = _preco_ref_item(r.valor_unitario_estimado, homs.get(r.id))
        if d is not None:
            por_desc.setdefault(chave, []).append(d)
    out: dict[str, dict[str, Any]] = {}
    for chave, vals in por_desc.items():
        stats = _stats_valores(vals)
        if stats:
            out[chave] = {**stats, "origem": "descricao"}
    return out


def _item_linha(
    item: ItemContratacao,
    contratacao: Contratacao,
    encerramento: datetime,
    *,
    agora: datetime,
    benchmark: dict[str, Any] | None,
    acompanhada_por_mim: bool = False,
    responsavel: dict[str, Any] | None = None,
) -> dict[str, Any]:
    restante = encerramento - agora
    horas = max(restante.total_seconds() / 3600, 0)
    dias = max(restante.total_seconds() / 86400, 0)
    unitario = parse_valor(item.valor_unitario_estimado)
    if unitario is not None and unitario <= 0:
        unitario = None
    total = parse_valor(item.valor_total)
    if total is not None and total <= 0:
        total = None
    if total is None and unitario is not None:
        qtd = parse_valor(item.quantidade)
        if qtd is not None:
            total = unitario * qtd

    desvio = None
    if benchmark:
        desvio = desvio_vs_mediana(unitario, benchmark.get("mediana"))

    codigo_ncm, descricao_ncm = ncm_do_item(item)
    qtd_num = parse_valor(item.quantidade)

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
        "quantidade_num": _fmt_moeda_num(qtd_num),
        "valor_unitario_estimado": item.valor_unitario_estimado,
        "valor_unitario_estimado_num": _fmt_moeda_num(unitario),
        "valor_total": item.valor_total,
        "valor_total_num": _fmt_moeda_num(total),
        "situacao_item": item.situacao_compra_item_nome,
        "numero_compra": contratacao.numero or contratacao.id_compra,
        "processo": contratacao.processo,
        "ano": contratacao.ano,
        "unidade_compradora": contratacao.unidade_compradora,
        "unidade_nome": contratacao.unidade_nome,
        "modalidade_codigo": contratacao.modalidade_codigo,
        "modalidade_descricao": contratacao.modalidade_descricao,
        "situacao": contratacao.situacao,
        "objeto": contratacao.objeto,
        "numero_controle_pncp": contratacao.numero_controle_pncp,
        "link_pncp": contratacao.link_pncp,
        "data_abertura_proposta_pncp": contratacao.data_abertura_proposta_pncp,
        "data_encerramento_proposta_pncp": contratacao.data_encerramento_proposta_pncp,
        "encerramento_iso": encerramento.isoformat(timespec="minutes"),
        "horas_restantes": round(horas, 1),
        "dias_restantes": round(dias, 2),
        "urgencia": urgencia(horas),
        "benchmark_catalogo": benchmark,
        "desvio_preco": desvio,
        "acompanhada_por_mim": acompanhada_por_mim,
        "responsavel": responsavel,
    }


def _sort_key_fn(sort: str | None, sort_dir: str | None):
    key = (sort or "horas_restantes").strip()
    if key not in SORT_WHITELIST:
        key = "horas_restantes"
    desc = (sort_dir or "asc").strip().lower() == "desc"

    def _val(row: dict[str, Any]):
        if key == "desvio_pct":
            d = row.get("desvio_preco") or {}
            v = d.get("percentual")
            return v
        if key == "uasg":
            return row.get("unidade_compradora") or ""
        if key == "quantidade":
            return row.get("quantidade_num")
        return row.get(key)

    def _cmp(row: dict[str, Any]):
        v = _val(row)
        # None por último em asc; primeiro em desc (via tipagem estável).
        missing = v is None
        if isinstance(v, str):
            return (missing, v.lower() if not missing else "")
        return (missing, v if not missing else 0)

    return _cmp, desc


def listar_itens_abertos(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    horizonte: Horizonte = "todos",
    codigo_uasg: str | None = None,
    modalidade_codigos: list[str] | None = None,
    material_ou_servico: str | None = None,
    q: str | None = None,
    acompanhamento: str | None = None,
    acompanhamento_usuario_id: int | None = None,
    acompanhamento_unidade_ids: list[int] | None = None,
    acompanhamento_filial_id: int | None = None,
    sort: str | None = None,
    sort_dir: str | None = None,
    page: int = 1,
    page_size: int = 50,
    agora: datetime | None = None,
) -> dict[str, Any]:
    agora = agora or datetime.now()
    abertas = carregar_contratacoes_abertas(
        db,
        agora=agora,
        horizonte=horizonte,
        escopo_uasgs=escopo_uasgs,
        codigo_uasg=codigo_uasg,
        modalidade_codigos=modalidade_codigos,
        acompanhamento=acompanhamento,
        acompanhamento_usuario_id=acompanhamento_usuario_id,
        acompanhamento_unidade_ids=acompanhamento_unidade_ids,
    )
    aviso = (
        "Prazo com base em data_encerramento_proposta_pncp. "
        "Referência de preço usa outros itens do mesmo código de catálogo "
        "(ou mesma descrição) já coletados na base local."
    )
    if not abertas:
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": page_size,
            "gerado_em": agora.isoformat(timespec="seconds"),
            "aviso": aviso,
        }

    mapa = {c.id: (c, dt) for c, dt in abertas}
    ids = list(mapa.keys())
    stmt = select(ItemContratacao).where(ItemContratacao.contratacao_id.in_(ids))
    tipo = (material_ou_servico or "").strip().upper()[:1]
    if tipo in ("M", "S"):
        stmt = stmt.where(ItemContratacao.material_ou_servico == tipo)

    rows = list(db.scalars(stmt))
    termo = (q or "").strip().lower()

    def _match_texto(item: ItemContratacao, c: Contratacao) -> bool:
        if not termo:
            return True
        campos = [
            c.objeto,
            c.processo,
            c.numero,
            c.numero_controle_pncp,
            c.id_compra,
            item.descricao_resumida,
            item.descricao_detalhada,
            item.id_compra_item,
            str(item.cod_item_catalogo or ""),
            ncm_do_item(item)[0] or "",
        ]
        return any(termo in str(v).lower() for v in campos if v)

    codigos = {
        int(r.cod_item_catalogo) for r in rows if r.cod_item_catalogo is not None
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

    flags: dict[int, bool] = {}
    responsaveis: dict[int, dict[str, Any]] = {}
    from app.acompanhamento.service import mapa_acompanhadas, mapa_responsaveis

    filial_id = acompanhamento_filial_id
    if acompanhamento_filial_id is None and acompanhamento_unidade_ids:
        filial_id = (
            int(acompanhamento_unidade_ids[0])
            if len(acompanhamento_unidade_ids) == 1
            else None
        )
    responsaveis = mapa_responsaveis(
        db, contratacao_ids=ids, unidade_id=filial_id
    )
    if acompanhamento_usuario_id is not None:
        flags = mapa_acompanhadas(
            db,
            usuario_id=acompanhamento_usuario_id,
            contratacao_ids=ids,
            unidade_id=filial_id,
        )

    linhas: list[dict[str, Any]] = []
    for item in rows:
        if item.contratacao_id not in mapa:
            continue
        c, dt = mapa[item.contratacao_id]
        if not _match_texto(item, c):
            continue
        if item.cod_item_catalogo:
            bench = benches_cat.get(int(item.cod_item_catalogo))
        else:
            chave = _norm_desc(item.descricao_resumida)
            bench = benches_desc.get(chave) if chave else None
        linhas.append(
            _item_linha(
                item,
                c,
                dt,
                agora=agora,
                benchmark=bench,
                acompanhada_por_mim=flags.get(c.id, False),
                responsavel=responsaveis.get(c.id),
            )
        )

    key_name = (sort or "horas_restantes").strip()
    if key_name not in SORT_WHITELIST:
        key_name = "horas_restantes"
    cmp_fn, desc = _sort_key_fn(key_name, sort_dir)
    # Default operacional: prazo asc · maior valor · nº item.
    if key_name == "horas_restantes" and not desc:
        linhas.sort(
            key=lambda r: (
                r["horas_restantes"],
                -(r["valor_total_num"] or 0),
                r["numero_item"] or 0,
            )
        )
    else:
        linhas.sort(key=cmp_fn, reverse=desc)

    total = len(linhas)
    size = max(1, min(100, int(page_size or 50)))
    page_n = max(1, int(page or 1))
    max_page = max(1, (total + size - 1) // size) if total else 1
    if page_n > max_page:
        page_n = max_page
    offset = (page_n - 1) * size
    page_rows = linhas[offset : offset + size]

    return {
        "items": page_rows,
        "total": total,
        "page": page_n,
        "page_size": size,
        "gerado_em": agora.isoformat(timespec="seconds"),
        "aviso": aviso,
    }


def resumo_abertas(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    horizonte: Horizonte = "todos",
    codigo_uasg: str | None = None,
    modalidade_codigos: list[str] | None = None,
    material_ou_servico: str | None = None,
    q: str | None = None,
    acompanhamento: str | None = None,
    acompanhamento_usuario_id: int | None = None,
    acompanhamento_unidade_ids: list[int] | None = None,
    agora: datetime | None = None,
) -> dict[str, Any]:
    agora = agora or datetime.now()
    # Reusa a listagem completa (sem paginação) via page_size alto interno.
    # Para resumo, percorre abertas + itens sem sort caro de página.
    abertas = carregar_contratacoes_abertas(
        db,
        agora=agora,
        horizonte=horizonte,
        escopo_uasgs=escopo_uasgs,
        codigo_uasg=codigo_uasg,
        modalidade_codigos=modalidade_codigos,
        acompanhamento=acompanhamento,
        acompanhamento_usuario_id=acompanhamento_usuario_id,
        acompanhamento_unidade_ids=acompanhamento_unidade_ids,
    )
    vazio = {
        "gerado_em": agora.isoformat(timespec="seconds"),
        "contratacoes": 0,
        "itens": 0,
        "valor_estimado_total": 0.0,
        "valor_estimado_total_fmt": decimal_to_br(Decimal("0")),
        "urgentes_24h": 0,
        "urgentes_72h": 0,
        "por_urgencia": {"critica": 0, "alta": 0, "media": 0, "normal": 0},
    }
    if not abertas:
        return vazio

    mapa = {c.id: (c, dt) for c, dt in abertas}
    ids = list(mapa.keys())
    stmt = select(ItemContratacao).where(ItemContratacao.contratacao_id.in_(ids))
    tipo = (material_ou_servico or "").strip().upper()[:1]
    if tipo in ("M", "S"):
        stmt = stmt.where(ItemContratacao.material_ou_servico == tipo)
    itens = list(db.scalars(stmt))
    termo = (q or "").strip().lower()

    valor_total = Decimal("0")
    por_urg = {"critica": 0, "alta": 0, "media": 0, "normal": 0}
    urgentes_24h = urgentes_72h = 0
    n_itens = 0

    for item in itens:
        c, dt = mapa[item.contratacao_id]  # type: ignore[index]
        if termo:
            campos = [
                c.objeto,
                c.processo,
                c.numero,
                c.numero_controle_pncp,
                item.descricao_resumida,
                item.descricao_detalhada,
            ]
            if not any(termo in str(v).lower() for v in campos if v):
                continue
        n_itens += 1
        horas = max((dt - agora).total_seconds() / 3600, 0)
        urg = urgencia(horas)
        por_urg[urg] += 1
        if horas <= 24:
            urgentes_24h += 1
        if horas <= 72:
            urgentes_72h += 1
        tot = parse_valor(item.valor_total)
        if tot is None:
            u = parse_valor(item.valor_unitario_estimado)
            qtd = parse_valor(item.quantidade)
            if u is not None and qtd is not None:
                tot = u * qtd
        if tot is not None:
            valor_total += tot

    return {
        "gerado_em": agora.isoformat(timespec="seconds"),
        "contratacoes": len(abertas),
        "itens": n_itens,
        "valor_estimado_total": float(valor_total),
        "valor_estimado_total_fmt": decimal_to_br(valor_total),
        "urgentes_24h": urgentes_24h,
        "urgentes_72h": urgentes_72h,
        "por_urgencia": por_urg,
    }


def detalhe_item(
    db: Session,
    *,
    item_id: int,
    escopo_uasgs: list[str] | None,
    agora: datetime | None = None,
) -> dict[str, Any] | None:
    """Detalhe do item + mediana local + comparáveis. ``None`` = não encontrado."""
    agora = agora or datetime.now()
    item = db.scalar(
        select(ItemContratacao)
        .options(selectinload(ItemContratacao.contratacao))
        .where(ItemContratacao.id == item_id)
    )
    if not item:
        return None

    contratacao = item.contratacao
    if contratacao is None and item.contratacao_id:
        contratacao = db.get(Contratacao, item.contratacao_id)
    if contratacao is None:
        return None
    if escopo_uasgs is not None and contratacao.unidade_compradora not in escopo_uasgs:
        return None

    enc = parse_data_pncp(contratacao.data_encerramento_proposta_pncp)
    unitario = parse_valor(item.valor_unitario_estimado)
    if unitario is not None and unitario <= 0:
        unitario = None

    comparaveis: list[dict[str, Any]] = []
    benchmark = None
    origem_ref = None
    outros: list[ItemContratacao] = []

    if item.cod_item_catalogo is not None:
        origem_ref = "catalogo"
        outros = list(
            db.scalars(
                select(ItemContratacao)
                .options(selectinload(ItemContratacao.contratacao))
                .where(
                    ItemContratacao.cod_item_catalogo == item.cod_item_catalogo,
                    ItemContratacao.id != item.id,
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
                    select(ItemContratacao)
                    .options(selectinload(ItemContratacao.contratacao))
                    .where(
                        ItemContratacao.descricao_resumida.ilike(
                            item.descricao_resumida.strip()
                        ),
                        ItemContratacao.id != item.id,
                    )
                    .limit(80)
                )
            )
            outros = [o for o in outros if _norm_desc(o.descricao_resumida) == chave]

    homs = _mapa_homologado_unitario(db, [o.id for o in outros])
    if outros:
        valores: list[Decimal] = []
        for o in outros:
            preco = _preco_ref_item(o.valor_unitario_estimado, homs.get(o.id))
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
                    "valor_unitario": decimal_to_br(preco),
                    "valor_unitario_num": float(preco),
                    "origem_preco": "homologado" if o.id in homs else "estimado",
                    "data_encerramento_proposta_pncp": (
                        c.data_encerramento_proposta_pncp if c else None
                    ),
                }
            )
        benchmark = _stats_valores(valores)
        if benchmark and origem_ref:
            benchmark = {**benchmark, "origem": origem_ref}

    horas = None
    urg = None
    if enc and enc > agora:
        horas = round(max((enc - agora).total_seconds() / 3600, 0), 1)
        urg = urgencia(horas)

    codigo_ncm, descricao_ncm = ncm_do_item(item)
    desvio = desvio_vs_mediana(
        unitario, benchmark.get("mediana") if benchmark else None
    )

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
            "material_ou_servico": item.material_ou_servico,
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
            "unidade_compradora": contratacao.unidade_compradora,
            "unidade_nome": contratacao.unidade_nome,
            "modalidade_descricao": contratacao.modalidade_descricao,
            "objeto": contratacao.objeto,
            "data_encerramento_proposta_pncp": contratacao.data_encerramento_proposta_pncp,
            "link_pncp": contratacao.link_pncp,
            "horas_restantes": horas,
            "urgencia": urg,
        },
        "benchmark_catalogo": benchmark,
        "desvio_preco": desvio,
        "comparaveis": sorted(
            comparaveis, key=lambda x: x["valor_unitario_num"] or 0
        )[:40],
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
        desvio = desvio_vs_mediana(unitario, benchmark.get("mediana"))
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
