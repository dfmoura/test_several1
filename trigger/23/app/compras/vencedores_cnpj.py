"""Consolidação de fornecedores vencedores + status do cache CNPJ.

Fonte canônica: ``compras_contratacao_resultados`` (módulo 07.3).
Fallback seguro: ``compras_contratacao_itens`` apenas para itens que ainda
não possuem linha de resultado (coleta 07-resultados pendente/parcial).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.compras.cnpj_publico import cache_cnpj_valido
from app.compras.normalizers import fmt_valor_br, normalizar_ni, parse_decimal
from app.config import CNPJ_PUBLICO_CACHE_DIAS
from app.database import (
    CompraContratacao,
    CompraContratacaoItem,
    ComprasContratacaoResultado,
    ComprasFornecedor,
)

StatusCache = Literal["atualizado", "vencido", "pendente", "cpf", "invalido"]


def _status_cache(row: ComprasFornecedor | None, *, ni: str) -> StatusCache:
    if len(ni) <= 11:
        return "cpf"
    if len(ni) != 14:
        return "invalido"
    if row is None:
        return "pendente"
    if not row.cnpj_enriquecido_em or not row.cnpj_dados_json:
        return "pendente"
    if cache_cnpj_valido(row):
        return "atualizado"
    return "vencido"


def _fmt_iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _bucket_vazio(ni: str, nome: str | None) -> dict[str, Any]:
    return {
        "cod_fornecedor": ni,
        "nome_fornecedor": (str(nome).strip() if nome else None) or None,
        "itens": 0,
        "compras": set(),
        "fontes": set(),  # "resultados" | "itens"
        "valor_total": Decimal("0"),
        "tem_valor": False,
    }


def _acumular(
    agg: dict[str, dict[str, Any]],
    *,
    ni: str,
    nome: str | None,
    id_compra: str | None,
    fonte: str,
    valor_raw: str | None = None,
) -> None:
    bucket = agg.get(ni)
    if bucket is None:
        bucket = _bucket_vazio(ni, nome)
        agg[ni] = bucket
    bucket["itens"] += 1
    bucket["fontes"].add(fonte)
    if id_compra:
        bucket["compras"].add(str(id_compra))
    if nome and (not bucket["nome_fornecedor"] or len(str(nome)) > len(bucket["nome_fornecedor"])):
        bucket["nome_fornecedor"] = str(nome).strip()
    valor = parse_decimal(valor_raw)
    if valor is not None:
        bucket["valor_total"] += valor
        bucket["tem_valor"] = True


def _agregar_vencedores(db: Session) -> dict[str, dict[str, Any]]:
    """
    Agrega NIs vencedores.

    1) Todos os resultados homologados (07.3).
    2) Itens com cod_fornecedor cujo id_compra_item ainda não tem resultado
       (fallback — não duplica item já coberto por 07.3).
    """
    agg: dict[str, dict[str, Any]] = {}

    itens_com_resultado: set[str] = set()
    for id_item, ni_raw, nome, id_compra, valor in db.execute(
        select(
            ComprasContratacaoResultado.id_compra_item,
            ComprasContratacaoResultado.ni_fornecedor,
            ComprasContratacaoResultado.nome_razao_social_fornecedor,
            ComprasContratacaoResultado.id_compra,
            ComprasContratacaoResultado.valor_total_homologado,
        ).where(
            ComprasContratacaoResultado.ni_fornecedor.isnot(None),
            ComprasContratacaoResultado.ni_fornecedor != "",
        )
    ).all():
        ni = normalizar_ni(ni_raw)
        if not ni:
            continue
        if id_item:
            itens_com_resultado.add(str(id_item))
        _acumular(
            agg,
            ni=ni,
            nome=nome,
            id_compra=id_compra,
            fonte="resultados",
            valor_raw=valor,
        )

    for id_item, cod, nome, id_compra, valor in db.execute(
        select(
            CompraContratacaoItem.id_compra_item,
            CompraContratacaoItem.cod_fornecedor,
            CompraContratacaoItem.nome_fornecedor,
            CompraContratacaoItem.id_compra,
            CompraContratacaoItem.valor_total_resultado,
        ).where(
            CompraContratacaoItem.cod_fornecedor.isnot(None),
            CompraContratacaoItem.cod_fornecedor != "",
        )
    ).all():
        # Já coberto pelo fato 07.3 — não usar atalho do item.
        if id_item and str(id_item) in itens_com_resultado:
            continue
        ni = normalizar_ni(cod)
        if not ni:
            continue
        _acumular(
            agg,
            ni=ni,
            nome=nome,
            id_compra=id_compra,
            fonte="itens",
            valor_raw=valor,
        )

    return agg


def listar_vencedores_consolidados(
    db: Session,
    *,
    q: str | None = None,
    status: str | None = None,
    limit: int = 500,
) -> dict[str, Any]:
    """
    Consolida vencedores (07.3 + fallback itens) e cruza com ``compras_fornecedores``.

    Contrato da API/UI permanece estável (mesmos campos públicos).
    """
    agg = _agregar_vencedores(db)

    if not agg:
        return {
            "items": [],
            "total": 0,
            "resumo": {
                "atualizado": 0,
                "vencido": 0,
                "pendente": 0,
                "cpf": 0,
                "invalido": 0,
            },
            "cache_dias": CNPJ_PUBLICO_CACHE_DIAS,
            "fonte_canonica": "compras_contratacao_resultados",
        }

    fornecedores = {
        r.ni_fornecedor: r
        for r in db.scalars(
            select(ComprasFornecedor).where(ComprasFornecedor.ni_fornecedor.in_(list(agg.keys())))
        ).all()
    }

    q_norm = (q or "").strip().lower()
    q_digits = "".join(c for c in (q or "") if c.isdigit())
    status_filtro = (status or "").strip().lower() or None
    if status_filtro in ("todos", "all", ""):
        status_filtro = None

    items: list[dict[str, Any]] = []
    resumo = {"atualizado": 0, "vencido": 0, "pendente": 0, "cpf": 0, "invalido": 0}

    for ni, bucket in agg.items():
        forn = fornecedores.get(ni)
        st = _status_cache(forn, ni=ni)
        resumo[st] = resumo.get(st, 0) + 1

        nome = bucket["nome_fornecedor"] or (forn.nome_razao_social_fornecedor if forn else None)
        if q_norm:
            nome_l = (nome or "").lower()
            if q_norm not in nome_l and q_digits not in ni:
                continue
        if status_filtro and st != status_filtro:
            continue

        fontes = bucket["fontes"]
        if fontes == {"resultados"}:
            fonte_agg = "resultados"
        elif fontes == {"itens"}:
            fonte_agg = "itens"
        else:
            fonte_agg = "misto"

        limite = datetime.utcnow() - timedelta(days=CNPJ_PUBLICO_CACHE_DIAS)
        enriquecido_em = forn.cnpj_enriquecido_em if forn else None
        valor_total = (
            float(bucket["valor_total"].quantize(Decimal("0.01")))
            if bucket.get("tem_valor")
            else None
        )
        items.append(
            {
                "cod_fornecedor": ni,
                "nome_fornecedor": nome,
                "tipo": "cpf" if len(ni) <= 11 else "cnpj",
                "qtd_itens": bucket["itens"],
                "qtd_compras": len(bucket["compras"]),
                "valor_total_homologado": valor_total,
                "status_cache": st,
                "cache_valido": st == "atualizado",
                "cnpj_enriquecido_em": _fmt_iso(enriquecido_em),
                "cache_expira_em": _fmt_iso(enriquecido_em + timedelta(days=CNPJ_PUBLICO_CACHE_DIAS))
                if enriquecido_em
                else None,
                "municipio": forn.nome_municipio if forn else None,
                "uf": forn.uf_sigla if forn else None,
                "situacao_cadastral": forn.situacao_cadastral if forn else None,
                "de_uberlandia": forn.de_uberlandia if forn else None,
                "compras_gov_enriquecido_em": _fmt_iso(forn.compras_gov_enriquecido_em)
                if forn and forn.compras_gov_enriquecido_em
                else None,
                "fonte_agregacao": fonte_agg,
                "pode_atualizar": len(ni) == 14,
                "referencia_cache": _fmt_iso(limite),
            }
        )

    items.sort(
        key=lambda r: (
            0 if r["status_cache"] == "vencido" else 1 if r["status_cache"] == "pendente" else 2,
            (r["nome_fornecedor"] or "").upper(),
            r["cod_fornecedor"],
        )
    )
    total = len(items)
    if limit and len(items) > limit:
        items = items[:limit]

    return {
        "items": items,
        "total": total,
        "resumo": resumo,
        "cache_dias": CNPJ_PUBLICO_CACHE_DIAS,
        "fonte_canonica": "compras_contratacao_resultados",
    }


def listar_pendentes_enriquecimento(db: Session) -> list[dict[str, Any]]:
    """CNPJs vencedores com cache pendente (somente 14 dígitos), sem truncar a fila."""
    data = listar_vencedores_consolidados(db, status="pendente", limit=20_000)
    return [
        {
            "cod_fornecedor": r["cod_fornecedor"],
            "nome_fornecedor": r["nome_fornecedor"],
        }
        for r in data["items"]
        if r.get("pode_atualizar") and r.get("cod_fornecedor")
    ]


def _descricao_item(item: CompraContratacaoItem | None) -> str | None:
    if item is None:
        return None
    detalhada = (item.descricao_detalhada or "").strip()
    if detalhada:
        return detalhada
    resumida = (item.descricao_resumida or "").strip()
    return resumida or None


def _linha_homologacao(
    *,
    data: str | None,
    objeto: str | None,
    descricao_item: str | None,
    valor_raw: str | None,
    id_compra: str | None,
    id_compra_item: str | None,
    contratacao_id: int | None,
    numero_item: int | None,
    compra: str | None,
    processo: str | None,
    fonte: str,
) -> dict[str, Any]:
    valor_dec = parse_decimal(valor_raw)
    compra_txt = (str(compra).strip() if compra else None) or None
    if not compra_txt and id_compra:
        compra_txt = str(id_compra)
    return {
        "data": (str(data).strip() if data else None) or None,
        "compra": compra_txt,
        "processo": (str(processo).strip() if processo else None) or None,
        "objeto": (str(objeto).strip() if objeto else None) or None,
        "descricao_item": (str(descricao_item).strip() if descricao_item else None) or None,
        "valor_homologado": fmt_valor_br(valor_raw) if valor_raw not in (None, "") else None,
        "valor_homologado_num": float(valor_dec.quantize(Decimal("0.01"))) if valor_dec is not None else None,
        "id_compra": id_compra,
        "id_compra_item": id_compra_item,
        "contratacao_id": contratacao_id,
        "numero_item": numero_item,
        "fonte": fonte,
    }


def listar_homologacoes_fornecedor(
    db: Session,
    ni: str,
    *,
    limit: int = 2000,
) -> dict[str, Any]:
    """
    Detalha itens homologados de um fornecedor (mesma regra da consolidação):

    1) ``compras_contratacao_resultados`` (07.3)
    2) Fallback em ``compras_contratacao_itens`` só quando o item ainda não tem resultado
    """
    ni_norm = normalizar_ni(ni)
    if not ni_norm:
        raise ValueError("CNPJ/CPF inválido")

    ids_compra: set[str] = set()
    itens_com_resultado: set[str] = set()
    bruto: list[dict[str, Any]] = []

    for res, item in db.execute(
        select(ComprasContratacaoResultado, CompraContratacaoItem)
        .outerjoin(
            CompraContratacaoItem,
            CompraContratacaoItem.id_compra_item == ComprasContratacaoResultado.id_compra_item,
        )
        .where(
            ComprasContratacaoResultado.ni_fornecedor.isnot(None),
            ComprasContratacaoResultado.ni_fornecedor != "",
        )
    ).all():
        if normalizar_ni(res.ni_fornecedor) != ni_norm:
            continue
        if res.id_compra_item:
            itens_com_resultado.add(str(res.id_compra_item))
        id_compra = res.id_compra or (item.id_compra if item else None)
        if id_compra:
            ids_compra.add(str(id_compra))
        bruto.append(
            {
                "data": res.data_resultado_pncp or (item.data_resultado if item else None),
                "descricao_item": _descricao_item(item),
                "valor_raw": res.valor_total_homologado,
                "id_compra": str(id_compra) if id_compra else None,
                "id_compra_item": res.id_compra_item,
                "numero_item": item.numero_item_compra or item.numero_item_pncp if item else None,
                "fonte": "resultados",
                "nome": res.nome_razao_social_fornecedor,
            }
        )

    for item in db.scalars(
        select(CompraContratacaoItem).where(
            CompraContratacaoItem.cod_fornecedor.isnot(None),
            CompraContratacaoItem.cod_fornecedor != "",
        )
    ).all():
        if item.id_compra_item and str(item.id_compra_item) in itens_com_resultado:
            continue
        if normalizar_ni(item.cod_fornecedor) != ni_norm:
            continue
        if item.id_compra:
            ids_compra.add(str(item.id_compra))
        bruto.append(
            {
                "data": item.data_resultado,
                "descricao_item": _descricao_item(item),
                "valor_raw": item.valor_total_resultado,
                "id_compra": str(item.id_compra) if item.id_compra else None,
                "id_compra_item": item.id_compra_item,
                "numero_item": item.numero_item_compra or item.numero_item_pncp,
                "fonte": "itens",
                "nome": item.nome_fornecedor,
            }
        )

    mapa_compra: dict[str, CompraContratacao] = {}
    if ids_compra:
        for c in db.scalars(
            select(CompraContratacao).where(
                or_(
                    CompraContratacao.id_compra.in_(list(ids_compra)),
                    CompraContratacao.chave_compra.in_(list(ids_compra)),
                )
            )
        ).all():
            if c.id_compra:
                mapa_compra[str(c.id_compra)] = c
            if c.chave_compra:
                mapa_compra.setdefault(str(c.chave_compra), c)

    forn = db.scalar(
        select(ComprasFornecedor).where(ComprasFornecedor.ni_fornecedor == ni_norm)
    )
    nome = forn.nome_razao_social_fornecedor if forn else None

    items: list[dict[str, Any]] = []
    valor_total = Decimal("0")
    tem_valor = False
    for row in bruto:
        if row.get("nome") and (not nome or len(str(row["nome"])) > len(nome)):
            nome = str(row["nome"]).strip()
        compra = mapa_compra.get(row["id_compra"] or "")
        compra_label = None
        if compra:
            compra_label = compra.numero or compra.id_compra or compra.chave_compra
        elif row["id_compra"]:
            compra_label = row["id_compra"]
        linha = _linha_homologacao(
            data=row["data"] or (compra.data_atualizacao_pncp if compra else None),
            objeto=compra.objeto if compra else None,
            descricao_item=row["descricao_item"],
            valor_raw=row["valor_raw"],
            id_compra=row["id_compra"],
            id_compra_item=row["id_compra_item"],
            contratacao_id=compra.id if compra else None,
            numero_item=row["numero_item"],
            compra=compra_label,
            processo=compra.processo if compra else None,
            fonte=row["fonte"],
        )
        if linha["valor_homologado_num"] is not None:
            valor_total += Decimal(str(linha["valor_homologado_num"]))
            tem_valor = True
        items.append(linha)

    def _sort_key(r: dict[str, Any]) -> tuple:
        data = r.get("data") or ""
        return (0 if data else 1, data, r.get("id_compra") or "", r.get("numero_item") or 0)

    items.sort(key=_sort_key, reverse=True)
    total = len(items)
    if limit and len(items) > limit:
        items = items[:limit]

    return {
        "cod_fornecedor": ni_norm,
        "nome_fornecedor": nome,
        "tipo": "cpf" if len(ni_norm) <= 11 else "cnpj",
        "qtd_itens": total,
        "qtd_compras": len({i["id_compra"] for i in items if i.get("id_compra")}),
        "valor_total_homologado": float(valor_total.quantize(Decimal("0.01"))) if tem_valor else None,
        "items": items,
        "total": total,
        "fonte_canonica": "compras_contratacao_resultados",
    }
