"""CNPJs vencedores — consolidação de fornecedores homologados (07.3).

Fonte canônica: ``resultados_item`` (módulo 07.3).
Recorte: escopo UASG da visão + período canônico do sistema.
Enriquecimento: join em ``fornecedores``; atualização individual via
``POST /api/enriquecimento/cnpj`` (não duplicar job de lote nesta tela).
"""

from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal, InvalidOperation
from functools import cmp_to_key
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import config as app_config
from app.compras.normalizers import fmt_valor_br, normalizar_ni
from app.consultas.periodo import PeriodoAplicado, contratacao_no_periodo
from app.database import Contratacao, Fornecedor, ItemContratacao, ResultadoItem
from app.enriquecimento.service import cache_cnpj_valido

StatusCache = Literal["atualizado", "vencido", "pendente", "cpf", "invalido"]

# Ordenação server-side da grade CNPJs vencedores (whitelist = data-sort da UI).
VENCEDORES_SORT_KEYS = frozenset(
    {
        "nome",
        "ni",
        "itens",
        "compras",
        "valor",
        "municipio",
        "atualizacao",
    }
)


def _normalize_sort_dir(sort_dir: str | None) -> str:
    return "desc" if (sort_dir or "").strip().lower() == "desc" else "asc"


def _vencedor_sort_value(row: dict[str, Any], key: str) -> Any:
    if key == "nome":
        return row.get("nome_fornecedor") or ""
    if key == "ni":
        return row.get("cod_fornecedor") or ""
    if key == "itens":
        return int(row.get("qtd_itens") or 0)
    if key == "compras":
        return int(row.get("qtd_compras") or 0)
    if key == "valor":
        return row.get("valor_total_homologado")
    if key == "municipio":
        mun = row.get("municipio")
        if not mun:
            return ""
        uf = row.get("uf")
        return f"{mun}/{uf}" if uf else str(mun)
    if key == "atualizacao":
        return row.get("cnpj_enriquecido_em") or ""
    return None


def _ordenar_vencedores(
    items: list[dict[str, Any]],
    *,
    sort: str | None,
    sort_dir: str | None,
) -> None:
    """Ordena o conjunto filtrado **antes** do slice de página (in-place).

    Sem ``sort`` válido: ordem histórica (status cache → nome → NI).
    """
    key = (sort or "").strip().lower()
    if key not in VENCEDORES_SORT_KEYS:
        items.sort(
            key=lambda r: (
                0
                if r["status_cache"] == "vencido"
                else 1
                if r["status_cache"] == "pendente"
                else 2,
                (r["nome_fornecedor"] or "").upper(),
                r["cod_fornecedor"],
            )
        )
        return

    mul = -1 if _normalize_sort_dir(sort_dir) == "desc" else 1
    numeric = key in ("itens", "compras", "valor")

    def _cmp(a: dict[str, Any], b: dict[str, Any]) -> int:
        va = _vencedor_sort_value(a, key)
        vb = _vencedor_sort_value(b, key)
        if numeric:
            if va is None and vb is None:
                c = 0
            elif va is None:
                return 1
            elif vb is None:
                return -1
            else:
                c = (float(va) - float(vb)) * mul
                c = 0 if c == 0 else (1 if c > 0 else -1)
        else:
            sa = "" if va is None else str(va)
            sb = "" if vb is None else str(vb)
            if not sa and not sb:
                c = 0
            elif not sa:
                return 1
            elif not sb:
                return -1
            else:
                # casefold ≈ sensitivity base; NI/datas se beneficiam de ordem lexicográfica
                ca, cb = sa.casefold(), sb.casefold()
                if ca < cb:
                    c = -1 * mul
                elif ca > cb:
                    c = 1 * mul
                else:
                    c = 0
        if c != 0:
            return c
        # Desempate estável por NI (página não “treme” entre requests).
        na = str(a.get("cod_fornecedor") or "")
        nb = str(b.get("cod_fornecedor") or "")
        if na < nb:
            return -1
        if na > nb:
            return 1
        return 0

    items.sort(key=cmp_to_key(_cmp))


_UF_NOMES = {
    "AC": "Acre",
    "AL": "Alagoas",
    "AP": "Amapá",
    "AM": "Amazonas",
    "BA": "Bahia",
    "CE": "Ceará",
    "DF": "Distrito Federal",
    "ES": "Espírito Santo",
    "GO": "Goiás",
    "MA": "Maranhão",
    "MT": "Mato Grosso",
    "MS": "Mato Grosso do Sul",
    "MG": "Minas Gerais",
    "PA": "Pará",
    "PB": "Paraíba",
    "PR": "Paraná",
    "PE": "Pernambuco",
    "PI": "Piauí",
    "RJ": "Rio de Janeiro",
    "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul",
    "RO": "Rondônia",
    "RR": "Roraima",
    "SC": "Santa Catarina",
    "SP": "São Paulo",
    "SE": "Sergipe",
    "TO": "Tocantins",
}


def _parse_valor(v: str | None) -> Decimal | None:
    if v is None:
        return None
    s = str(v).strip().replace("R$", "").strip()
    if not s:
        return None
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return None


def _fmt_iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _status_cache(row: Fornecedor | None, *, ni: str) -> StatusCache:
    if len(ni) <= 11:
        return "cpf"
    if len(ni) != 14:
        return "invalido"
    if row is None or not row.cnpj_enriquecido_em or not row.fonte_cnpj:
        return "pendente"
    if cache_cnpj_valido(row):
        return "atualizado"
    return "vencido"


def _qsa_de_json(raw: str | None) -> list[dict[str, Any]]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except (TypeError, ValueError, json.JSONDecodeError):
        return []
    payload = data.get("payload") if isinstance(data, dict) else None
    fonte = (data.get("fonte") if isinstance(data, dict) else None) or ""
    src = payload if isinstance(payload, dict) else (data if isinstance(data, dict) else {})
    if not isinstance(src, dict):
        return []

    bruto: list[Any] = []
    if fonte == "cnpja" or "members" in src:
        bruto = src.get("members") or src.get("qsa") or []
    elif fonte == "publicacnpj" or "socios" in src:
        bruto = src.get("socios") or src.get("qsa") or []
    else:
        bruto = src.get("qsa") or src.get("socios") or src.get("members") or []

    out: list[dict[str, Any]] = []
    if not isinstance(bruto, list):
        return out
    for item in bruto:
        if not isinstance(item, dict):
            continue
        nome = (
            item.get("nome_socio")
            or item.get("nome")
            or item.get("name")
        )
        if not nome and isinstance(item.get("person"), dict):
            nome = item["person"].get("name")
        qual = (
            item.get("qualificacao_socio")
            or item.get("qualificacao")
            or item.get("role")
            or item.get("qualification")
        )
        if isinstance(qual, dict):
            qual = qual.get("text") or qual.get("descricao") or qual.get("name")
        out.append(
            {
                "nome": str(nome).strip() if nome else None,
                "qualificacao": str(qual).strip() if qual else None,
            }
        )
    return [x for x in out if x.get("nome")]


def _empresa_resumo(forn: Fornecedor | None) -> dict[str, Any] | None:
    if forn is None:
        return None
    return {
        "razao_social": forn.razao_social,
        "nome_fantasia": forn.nome_fantasia,
        "porte": forn.porte,
        "natureza_juridica": forn.natureza_juridica,
        "cnae_codigo": forn.codigo_cnae,
        "cnae": forn.nome_cnae,
        "situacao_cadastral": forn.situacao_cadastral,
        "municipio": forn.municipio,
        "uf": forn.uf,
        "cep": forn.cep,
        "logradouro": forn.logradouro,
        "numero": forn.numero,
        "bairro": forn.bairro,
        "fonte_cnpj": forn.fonte_cnpj,
        "qsa": _qsa_de_json(forn.cnpj_dados_json),
    }


def _ids_compra_no_recorte(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    periodo: PeriodoAplicado,
    codigo_uasg: str | None = None,
    modalidade_codigos: list[str] | None = None,
) -> set[str] | None:
    """IDs de compra no escopo/período/filtros; ``None`` = sem filtro temporal."""
    if escopo_uasgs is not None and not escopo_uasgs:
        return set()

    stmt = select(
        Contratacao.id_compra,
        Contratacao.ano,
        Contratacao.data_publicacao_pncp,
    )
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    if codigo_uasg:
        stmt = stmt.where(Contratacao.unidade_compradora == codigo_uasg.strip())
    mods = [str(m).strip() for m in (modalidade_codigos or []) if str(m).strip()]
    if mods:
        stmt = stmt.where(Contratacao.modalidade_codigo.in_(mods))

    if periodo.ativo:
        if periodo.modo in ("ano_atual", "ano_anterior") and periodo.ano is not None:
            stmt = stmt.where(Contratacao.ano == periodo.ano)
        elif periodo.data_inicio is not None and periodo.data_fim is not None:
            stmt = stmt.where(
                Contratacao.ano.between(
                    periodo.data_inicio.year, periodo.data_fim.year
                )
            )

    out: set[str] = set()
    for id_compra, ano, data_pub in db.execute(stmt).all():
        if not id_compra:
            continue
        if not contratacao_no_periodo(
            ano=int(ano or 0),
            data_publicacao_pncp=data_pub,
            periodo=periodo,
        ):
            continue
        out.add(str(id_compra))
    return out if periodo.ativo or codigo_uasg or mods else (
        out if escopo_uasgs is not None else None
    )


def _agregar_vencedores(
    db: Session,
    *,
    ids_compra_ok: set[str] | None,
) -> dict[str, dict[str, Any]]:
    if ids_compra_ok is not None and not ids_compra_ok:
        return {}

    agg: dict[str, dict[str, Any]] = {}
    stmt = select(
        ResultadoItem.ni_fornecedor,
        ResultadoItem.nome_razao_social_fornecedor,
        ResultadoItem.id_compra,
        ResultadoItem.valor_total_homologado,
        ResultadoItem.porte_fornecedor_nome,
    ).where(
        ResultadoItem.ni_fornecedor.is_not(None),
        ResultadoItem.ni_fornecedor != "",
    )
    if ids_compra_ok is not None:
        stmt = stmt.where(ResultadoItem.id_compra.in_(list(ids_compra_ok)))

    for ni_raw, nome, id_compra, valor, porte_res in db.execute(stmt).all():
        ni = normalizar_ni(ni_raw)
        if not ni:
            continue
        bucket = agg.get(ni)
        if bucket is None:
            bucket = {
                "cod_fornecedor": ni,
                "nome_fornecedor": None,
                "itens": 0,
                "compras": set(),
                "valor_total": Decimal("0"),
                "tem_valor": False,
                "porte_resultado": None,
            }
            agg[ni] = bucket
        bucket["itens"] += 1
        if id_compra:
            bucket["compras"].add(str(id_compra))
        if nome and (
            not bucket["nome_fornecedor"]
            or len(str(nome)) > len(bucket["nome_fornecedor"])
        ):
            bucket["nome_fornecedor"] = str(nome).strip()
        if porte_res and not bucket["porte_resultado"]:
            bucket["porte_resultado"] = str(porte_res).strip() or None
        dec = _parse_valor(valor)
        if dec is not None:
            bucket["valor_total"] += dec
            bucket["tem_valor"] = True
    return agg


def listar_filtros_vencedores(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
) -> dict[str, Any]:
    """Facetas UASG/modalidade (escopo) + UF/porte dos vencedores no escopo."""
    from app.consultas.service import facetas_contratacoes_escopo

    base = facetas_contratacoes_escopo(db, escopo_uasgs=escopo_uasgs)
    if escopo_uasgs is not None:
        ids_ok: set[str] | None = _ids_compra_escopo_simples(db, escopo_uasgs)
    else:
        ids_ok = None

    nis: set[str] = set()
    portes_brutos: set[str] = set()
    if ids_ok is not None and not ids_ok:
        return {**base, "ufs": [], "portes": []}

    stmt = select(
        ResultadoItem.ni_fornecedor,
        ResultadoItem.porte_fornecedor_nome,
    ).where(
        ResultadoItem.ni_fornecedor.is_not(None),
        ResultadoItem.ni_fornecedor != "",
    )
    if ids_ok is not None:
        stmt = stmt.where(ResultadoItem.id_compra.in_(list(ids_ok)))
    for ni_raw, porte in db.execute(stmt).all():
        ni = normalizar_ni(ni_raw)
        if ni:
            nis.add(ni)
        if porte and str(porte).strip():
            portes_brutos.add(str(porte).strip())

    ufs: list[str] = []
    if nis:
        ufs = [
            u
            for (u,) in db.execute(
                select(Fornecedor.uf)
                .where(
                    Fornecedor.ni.in_(list(nis)),
                    Fornecedor.uf.is_not(None),
                    Fornecedor.uf != "",
                )
                .distinct()
                .order_by(Fornecedor.uf)
            ).all()
            if u
        ]
        for (porte,) in db.execute(
            select(Fornecedor.porte)
            .where(
                Fornecedor.ni.in_(list(nis)),
                Fornecedor.porte.is_not(None),
                Fornecedor.porte != "",
            )
            .distinct()
        ).all():
            if porte and str(porte).strip():
                portes_brutos.add(str(porte).strip())

    return {
        **base,
        "ufs": [{"sigla": u, "nome": _UF_NOMES.get(u, u)} for u in ufs],
        "portes": sorted(portes_brutos, key=lambda s: s.upper()),
    }


def _ids_compra_escopo_simples(
    db: Session, escopo_uasgs: list[str]
) -> set[str]:
    if not escopo_uasgs:
        return set()
    return {
        str(id_compra)
        for (id_compra,) in db.execute(
            select(Contratacao.id_compra).where(
                Contratacao.unidade_compradora.in_(escopo_uasgs)
            )
        ).all()
        if id_compra
    }


def listar_vencedores(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    periodo: PeriodoAplicado,
    q: str | None = None,
    status: str | None = None,
    porte: str | None = None,
    uf: str | None = None,
    codigo_uasg: str | None = None,
    modalidade_codigos: list[str] | None = None,
    limit: int = 50,
    offset: int = 0,
    page: int | None = None,
    page_size: int | None = None,
    sort: str | None = None,
    sort_dir: str | None = None,
) -> dict[str, Any]:
    """Paginação no padrão Compras.gov: ``page``/``page_size`` (preferidos).

    ``limit``/``offset`` permanecem como alias legado.
    ``sort``/``sort_dir`` ordenam o conjunto filtrado **antes** do slice.
    """
    size = page_size if page_size is not None else limit
    size = max(1, min(100, int(size or 50)))
    if page is not None:
        page_n = max(1, int(page or 1))
        offset_safe = (page_n - 1) * size
    else:
        offset_safe = max(0, int(offset or 0))
        page_n = (offset_safe // size) + 1 if size else 1
    limit_safe = size
    cache_dias = int(app_config.CNPJ_PUBLICO_CACHE_DIAS)

    ids_ok = _ids_compra_no_recorte(
        db,
        escopo_uasgs=escopo_uasgs,
        periodo=periodo,
        codigo_uasg=codigo_uasg,
        modalidade_codigos=modalidade_codigos,
    )
    # Escopo sem período ativo ainda precisa limitar às UASGs.
    if ids_ok is None and escopo_uasgs is not None:
        ids_ok = _ids_compra_escopo_simples(db, escopo_uasgs)

    agg = _agregar_vencedores(db, ids_compra_ok=ids_ok)
    vazio = {
        "items": [],
        "total": 0,
        "page": page_n,
        "page_size": limit_safe,
        "limit": limit_safe,
        "offset": offset_safe,
        "resumo": {
            "atualizado": 0,
            "vencido": 0,
            "pendente": 0,
            "cpf": 0,
            "invalido": 0,
        },
        "portes": [],
        "cache_dias": cache_dias,
        "periodo_aplicado": periodo.to_dict(),
        "fonte_canonica": "resultados_item",
    }
    if not agg:
        return vazio

    fornecedores = {
        r.ni: r
        for r in db.scalars(
            select(Fornecedor).where(Fornecedor.ni.in_(list(agg.keys())))
        ).all()
    }

    q_norm = (q or "").strip().lower()
    q_digits = "".join(c for c in (q or "") if c.isdigit())
    status_filtro = (status or "").strip().lower() or None
    if status_filtro in ("todos", "all", ""):
        status_filtro = None
    porte_filtro = (porte or "").strip() or None
    if porte_filtro in ("todos", "all", ""):
        porte_filtro = None
    uf_filtro = (uf or "").strip().upper() or None

    items: list[dict[str, Any]] = []
    resumo = {"atualizado": 0, "vencido": 0, "pendente": 0, "cpf": 0, "invalido": 0}
    portes_brutos: list[str] = []

    for ni, bucket in agg.items():
        forn = fornecedores.get(ni)
        st = _status_cache(forn, ni=ni)
        nome = bucket["nome_fornecedor"] or (forn.razao_social if forn else None)
        porte_txt = (forn.porte if forn and forn.porte else None) or bucket.get(
            "porte_resultado"
        )

        if q_norm:
            nome_l = (nome or "").lower()
            bate_nome = q_norm in nome_l
            bate_ni = bool(q_digits) and q_digits in ni
            if not bate_nome and not bate_ni:
                continue
        if uf_filtro:
            forn_uf = ((forn.uf if forn else None) or "").strip().upper()
            if forn_uf != uf_filtro:
                continue
        if porte_txt:
            portes_brutos.append(porte_txt)
        if porte_filtro:
            if porte_filtro == "_vazio_":
                if porte_txt:
                    continue
            elif (porte_txt or "").strip().upper() != porte_filtro.strip().upper():
                continue

        resumo[st] = resumo.get(st, 0) + 1
        if status_filtro and st != status_filtro:
            continue

        valor_total = (
            float(bucket["valor_total"].quantize(Decimal("0.01")))
            if bucket.get("tem_valor")
            else None
        )
        enriquecido_em = forn.cnpj_enriquecido_em if forn else None
        items.append(
            {
                "cod_fornecedor": ni,
                "nome_fornecedor": nome,
                "tipo": "cpf" if len(ni) <= 11 else "cnpj",
                "qtd_itens": bucket["itens"],
                "qtd_compras": len(bucket["compras"]),
                "valor_total_homologado": valor_total,
                "status_cache": st,
                "cnpj_enriquecido_em": _fmt_iso(enriquecido_em),
                "municipio": forn.municipio if forn else None,
                "uf": forn.uf if forn else None,
                "porte": porte_txt,
                "pode_atualizar": len(ni) == 14,
            }
        )

    _ordenar_vencedores(items, sort=sort, sort_dir=sort_dir)
    total = len(items)
    max_page = max(1, (total + limit_safe - 1) // limit_safe) if limit_safe else 1
    if page_n > max_page:
        page_n = max_page
        offset_safe = (page_n - 1) * limit_safe
    if limit_safe:
        items = items[offset_safe : offset_safe + limit_safe]
    elif offset_safe:
        items = items[offset_safe:]

    return {
        "items": items,
        "total": total,
        "page": page_n,
        "page_size": limit_safe,
        "limit": limit_safe,
        "offset": offset_safe,
        "resumo": resumo,
        "portes": sorted(set(portes_brutos), key=lambda s: s.upper()),
        "cache_dias": cache_dias,
        "periodo_aplicado": periodo.to_dict(),
        "fonte_canonica": "resultados_item",
    }


def listar_homologacoes(
    db: Session,
    ni: str,
    *,
    escopo_uasgs: list[str] | None,
    periodo: PeriodoAplicado,
    codigo_uasg: str | None = None,
    modalidade_codigos: list[str] | None = None,
    uf: str | None = None,
    limit: int = 2000,
) -> dict[str, Any]:
    ni_norm = normalizar_ni(ni)
    if not ni_norm:
        raise ValueError("CNPJ/CPF inválido.")

    forn = db.scalar(select(Fornecedor).where(Fornecedor.ni == ni_norm))
    uf_filtro = (uf or "").strip().upper() or None
    if uf_filtro:
        forn_uf = ((forn.uf if forn else None) or "").strip().upper()
        if forn_uf != uf_filtro:
            return {
                "cod_fornecedor": ni_norm,
                "nome_fornecedor": forn.razao_social if forn else None,
                "tipo": "cpf" if len(ni_norm) <= 11 else "cnpj",
                "qtd_itens": 0,
                "qtd_compras": 0,
                "valor_total_homologado": None,
                "empresa": _empresa_resumo(forn),
                "items": [],
                "total": 0,
                "periodo_aplicado": periodo.to_dict(),
                "fonte_canonica": "resultados_item",
            }

    ids_ok = _ids_compra_no_recorte(
        db,
        escopo_uasgs=escopo_uasgs,
        periodo=periodo,
        codigo_uasg=codigo_uasg,
        modalidade_codigos=modalidade_codigos,
    )
    if ids_ok is None and escopo_uasgs is not None:
        ids_ok = _ids_compra_escopo_simples(db, escopo_uasgs)

    stmt = (
        select(ResultadoItem, ItemContratacao, Contratacao)
        .outerjoin(
            ItemContratacao,
            ItemContratacao.id_compra_item == ResultadoItem.id_compra_item,
        )
        .outerjoin(Contratacao, Contratacao.id_compra == ResultadoItem.id_compra)
        .where(
            ResultadoItem.ni_fornecedor.is_not(None),
            ResultadoItem.ni_fornecedor != "",
        )
    )
    if ids_ok is not None:
        if not ids_ok:
            stmt = stmt.where(ResultadoItem.id_compra.in_(()))
        else:
            stmt = stmt.where(ResultadoItem.id_compra.in_(list(ids_ok)))

    items: list[dict[str, Any]] = []
    valor_total = Decimal("0")
    tem_valor = False
    compras: set[str] = set()
    nome = forn.razao_social if forn else None

    for res, item, compra in db.execute(stmt).all():
        if normalizar_ni(res.ni_fornecedor) != ni_norm:
            continue
        if res.nome_razao_social_fornecedor and (
            not nome or len(str(res.nome_razao_social_fornecedor)) > len(nome)
        ):
            nome = str(res.nome_razao_social_fornecedor).strip()
        id_compra = res.id_compra or (item.id_compra if item else None)
        if id_compra:
            compras.add(str(id_compra))
        desc = None
        if item is not None:
            desc = (item.descricao_detalhada or "").strip() or (
                item.descricao_resumida or ""
            ).strip() or None
        valor_dec = _parse_valor(res.valor_total_homologado)
        if valor_dec is not None:
            valor_total += valor_dec
            tem_valor = True
        compra_label = None
        if compra is not None:
            compra_label = compra.numero or compra.id_compra
        elif id_compra:
            compra_label = str(id_compra)
        items.append(
            {
                "data": res.data_resultado_pncp,
                "compra": compra_label,
                "processo": compra.processo if compra else None,
                "objeto": compra.objeto if compra else None,
                "descricao_item": desc,
                "valor_homologado": fmt_valor_br(res.valor_total_homologado)
                if res.valor_total_homologado not in (None, "")
                else None,
                "valor_homologado_num": float(valor_dec.quantize(Decimal("0.01")))
                if valor_dec is not None
                else None,
                "id_compra": str(id_compra) if id_compra else None,
                "id_compra_item": res.id_compra_item,
                "contratacao_id": compra.id if compra else None,
                "numero_item": (
                    item.numero_item_compra or item.numero_item_pncp if item else None
                ),
                "fonte": "resultados",
            }
        )

    items.sort(
        key=lambda r: (
            0 if r.get("data") else 1,
            r.get("data") or "",
            r.get("id_compra") or "",
            r.get("numero_item") or 0,
        ),
        reverse=True,
    )
    total = len(items)
    if limit and len(items) > limit:
        items = items[:limit]

    empresa = _empresa_resumo(forn)
    if empresa and not empresa.get("razao_social") and nome:
        empresa = {**empresa, "razao_social": nome}

    return {
        "cod_fornecedor": ni_norm,
        "nome_fornecedor": nome,
        "tipo": "cpf" if len(ni_norm) <= 11 else "cnpj",
        "qtd_itens": total,
        "qtd_compras": len(compras),
        "valor_total_homologado": float(valor_total.quantize(Decimal("0.01")))
        if tem_valor
        else None,
        "empresa": empresa,
        "items": items,
        "total": total,
        "periodo_aplicado": periodo.to_dict(),
        "fonte_canonica": "resultados_item",
    }


def detalhe_vencedor(db: Session, ni: str) -> dict[str, Any]:
    """Cadastro + QSA do cache local (sem forçar API pública)."""
    ni_norm = normalizar_ni(ni)
    if not ni_norm:
        raise ValueError("CNPJ/CPF inválido.")
    forn = db.scalar(select(Fornecedor).where(Fornecedor.ni == ni_norm))
    st = _status_cache(forn, ni=ni_norm)
    return {
        "cod_fornecedor": ni_norm,
        "nome_fornecedor": forn.razao_social if forn else None,
        "tipo": "cpf" if len(ni_norm) <= 11 else "cnpj",
        "status_cache": st,
        "cnpj_enriquecido_em": _fmt_iso(forn.cnpj_enriquecido_em) if forn else None,
        "pode_atualizar": len(ni_norm) == 14,
        "empresa": _empresa_resumo(forn),
        "cache_dias": int(app_config.CNPJ_PUBLICO_CACHE_DIAS),
    }
