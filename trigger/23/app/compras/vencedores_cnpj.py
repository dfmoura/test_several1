"""Consolidação de fornecedores vencedores + status do cache CNPJ.

Fonte canônica: ``compras_contratacao_resultados`` (módulo 07.3).
Fallback seguro: ``compras_contratacao_itens`` apenas para itens que ainda
não possuem linha de resultado (coleta 07-resultados pendente/parcial).

Filtros analíticos padrão (período / órgão consolidado / modalidade consolidada)
seguem a mesma semântica de Distribuição · localidade (fonte ``compras_api``).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.compras.cnpj_publico import cache_cnpj_valido, cnaes_secundarios_de_registro
from app.compras.normalizers import fmt_valor_br, normalizar_ni, parse_decimal
from app.compras.porte import (
    catalogar_portes,
    porte_de_fornecedor,
    porte_equivale,
)
from app.config import CNPJ_PUBLICO_CACHE_DIAS
from app.database import (
    CompraContratacao,
    CompraContratacaoItem,
    ComprasContratacaoResultado,
    ComprasFornecedor,
    ModalidadeConsolidada,
    ModalidadeVinculo,
    OrgaoConsolidado,
    OrgaoVinculo,
)
from app.filtros_periodo import (
    Periodo,
    anos_disponiveis,
    condicao_periodo,
    data_iso_pncp,
)

StatusCache = Literal["atualizado", "vencido", "pendente", "cpf", "invalido"]

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


def _chaves_orgao(db: Session, orgao_id: int | None) -> set[str]:
    if orgao_id is None:
        return set()
    return {
        v.chave
        for v in db.scalars(
            select(OrgaoVinculo).where(
                OrgaoVinculo.orgao_consolidado_id == orgao_id,
                OrgaoVinculo.fonte == "compras_api",
            )
        ).all()
    }


def _chaves_modalidade(db: Session, modalidade_id: int | list[int] | None) -> set[str]:
    if modalidade_id is None:
        return set()
    if isinstance(modalidade_id, int):
        ids = [modalidade_id] if modalidade_id else []
    else:
        ids = [int(v) for v in modalidade_id if v is not None]
    if not ids:
        return set()
    return {
        v.chave
        for v in db.scalars(
            select(ModalidadeVinculo).where(
                ModalidadeVinculo.modalidade_consolidada_id.in_(ids),
                ModalidadeVinculo.fonte == "compras_api",
            )
        ).all()
    }


def _ids_compra_no_escopo(
    db: Session,
    *,
    periodo_resolvido: Periodo | None = None,
    ano: int | None = None,
    orgao_id: int | None = None,
    modalidade_id: list[int] | int | None = None,
) -> set[str] | None:
    """IDs de compra permitidos pelos filtros padrão; ``None`` = sem recorte."""
    chaves_org = _chaves_orgao(db, orgao_id)
    chaves_mod = _chaves_modalidade(db, modalidade_id)
    if periodo_resolvido is None and not ano and not chaves_org and not chaves_mod:
        return None

    crit: list[Any] = []
    filtro_periodo = condicao_periodo(
        data_iso_pncp(CompraContratacao.data_encerramento_proposta_pncp),
        periodo_resolvido,
    )
    if filtro_periodo is not None:
        crit.append(filtro_periodo)
    elif ano:
        crit.append(CompraContratacao.ano == ano)
    if chaves_org:
        crit.append(CompraContratacao.unidade_compradora.in_(chaves_org))
    if chaves_mod:
        crit.append(CompraContratacao.modalidade_codigo.in_(chaves_mod))
    if not crit:
        return None

    ids: set[str] = set()
    for id_compra, chave in db.execute(
        select(CompraContratacao.id_compra, CompraContratacao.chave_compra).where(*crit)
    ).all():
        if id_compra:
            ids.add(str(id_compra))
        if chave:
            ids.add(str(chave))
    return ids


def _compra_no_escopo(id_compra: str | None, ids_ok: set[str] | None) -> bool:
    if ids_ok is None:
        return True
    if not id_compra:
        return False
    return str(id_compra) in ids_ok


def listar_filtros_vencedores(db: Session) -> dict[str, Any]:
    """Catálogo dos filtros analíticos padrão (mesma fonte da localidade)."""
    anos = anos_disponiveis(
        db, data_iso_pncp(CompraContratacao.data_encerramento_proposta_pncp)
    )
    orgaos = db.scalars(
        select(OrgaoConsolidado)
        .where(OrgaoConsolidado.ativo.is_(True))
        .order_by(OrgaoConsolidado.nome)
    ).all()
    modalidades = db.scalars(
        select(ModalidadeConsolidada)
        .where(ModalidadeConsolidada.ativo.is_(True))
        .order_by(ModalidadeConsolidada.nome)
    ).all()
    ufs = db.scalars(
        select(ComprasFornecedor.uf_sigla)
        .where(
            ComprasFornecedor.uf_sigla.isnot(None),
            ComprasFornecedor.uf_sigla != "",
        )
        .distinct()
        .order_by(ComprasFornecedor.uf_sigla)
    ).all()
    return {
        "anos": list(anos),
        "orgaos": [{"id": o.id, "nome": o.nome, "sigla": o.sigla} for o in orgaos],
        "modalidades": [{"id": m.id, "nome": m.nome} for m in modalidades],
        "ufs": [
            {"sigla": u, "nome": _UF_NOMES.get(u, u)}
            for u in ufs
            if u
        ],
    }


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


def _empresa_resumo(forn: ComprasFornecedor | None) -> dict[str, Any] | None:
    """Resumo cadastral + CNAE a partir do cache local (módulo 10 / CNPJ público)."""
    if forn is None:
        return None
    de_udi = forn.de_uberlandia
    if de_udi is True:
        origem = "Uberlândia"
    elif de_udi is False:
        origem = "Fora de Uberlândia"
    else:
        origem = None
    return {
        "razao_social": forn.nome_razao_social_fornecedor,
        "nome_fantasia": forn.nome_fantasia,
        "porte": forn.porte_empresa_nome,
        "natureza_juridica": forn.natureza_juridica_nome,
        "cnae_codigo": forn.codigo_cnae,
        "cnae": forn.nome_cnae,
        "cnaes_secundarios": cnaes_secundarios_de_registro(forn.cnpj_dados_json),
        "situacao_cadastral": forn.situacao_cadastral,
        "municipio": forn.nome_municipio,
        "uf": forn.uf_sigla,
        "de_uberlandia": de_udi,
        "origem_local": origem,
        "habilitado_licitar": forn.habilitado_licitar,
        "cep": forn.cep,
        "logradouro": forn.logradouro,
        "numero": forn.numero_endereco,
        "bairro": forn.bairro,
    }


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


def _agregar_vencedores(
    db: Session,
    *,
    ids_compra_ok: set[str] | None = None,
) -> dict[str, dict[str, Any]]:
    """
    Agrega NIs vencedores.

    1) Todos os resultados homologados (07.3).
    2) Itens com cod_fornecedor cujo id_compra_item ainda não tem resultado
       (fallback — não duplica item já coberto por 07.3).

    Quando ``ids_compra_ok`` é um set, restringe ao recorte analítico
    (período / órgão / modalidade). Set vazio → agregação vazia.
    """
    if ids_compra_ok is not None and not ids_compra_ok:
        return {}

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
        if not _compra_no_escopo(id_compra, ids_compra_ok):
            continue
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
        if not _compra_no_escopo(id_compra, ids_compra_ok):
            continue
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
    porte: str | None = None,
    uf: str | None = None,
    periodo_resolvido: Periodo | None = None,
    ano: int | None = None,
    orgao_id: int | None = None,
    modalidade_id: list[int] | int | None = None,
    limit: int = 500,
) -> dict[str, Any]:
    """
    Consolida vencedores (07.3 + fallback itens) e cruza com ``compras_fornecedores``.

    Contrato da API/UI permanece estável (mesmos campos públicos).
    Filtros padrão (período/órgão/modalidade) recortam a agregação antes do cruzamento.
    ``q`` filtra por nome (substring) ou dígitos do NI (CNPJ/CPF, com ou sem máscara).
    UF e porte filtram pela sede do fornecedor enriquecido (mesma semântica da localidade).
    """
    ids_ok = _ids_compra_no_escopo(
        db,
        periodo_resolvido=periodo_resolvido,
        ano=ano,
        orgao_id=orgao_id,
        modalidade_id=modalidade_id,
    )
    agg = _agregar_vencedores(db, ids_compra_ok=ids_ok)

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
            "portes": [],
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
        resumo[st] = resumo.get(st, 0) + 1

        porte_chave, porte_rotulo = porte_de_fornecedor(forn)
        porte_bruto = (forn.porte_empresa_nome if forn else None) or None
        if porte_bruto:
            porte_bruto = str(porte_bruto).strip() or None
        if porte_bruto:
            portes_brutos.append(porte_bruto)

        nome = bucket["nome_fornecedor"] or (forn.nome_razao_social_fornecedor if forn else None)
        if q_norm:
            # Nome parcial OU dígitos do NI (CNPJ/CPF). Não usar ``digits in ni`` com
            # string vazia: ``"" in ni`` é sempre True e anulava a busca por nome.
            nome_l = (nome or "").lower()
            bate_nome = q_norm in nome_l
            bate_ni = bool(q_digits) and q_digits in ni
            if not bate_nome and not bate_ni:
                continue
        if status_filtro and st != status_filtro:
            continue
        if uf_filtro:
            forn_uf = ((forn.uf_sigla if forn else None) or "").strip().upper()
            if forn_uf != uf_filtro:
                continue
        if not porte_equivale(
            porte_bruto,
            porte_filtro,
            porte_id=forn.porte_empresa_id if forn else None,
        ):
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
                "porte": porte_rotulo,
                "porte_id": porte_chave,
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
        "portes": catalogar_portes(portes_brutos),
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
    periodo_resolvido: Periodo | None = None,
    ano: int | None = None,
    orgao_id: int | None = None,
    modalidade_id: list[int] | int | None = None,
    uf: str | None = None,
    limit: int = 2000,
) -> dict[str, Any]:
    """
    Detalha itens homologados de um fornecedor (mesma regra da consolidação):

    1) ``compras_contratacao_resultados`` (07.3)
    2) Fallback em ``compras_contratacao_itens`` só quando o item ainda não tem resultado

    Aceita o mesmo recorte analítico da lista (período / órgão / modalidade / UF).
    """
    ni_norm = normalizar_ni(ni)
    if not ni_norm:
        raise ValueError("CNPJ/CPF inválido")

    uf_filtro = (uf or "").strip().upper() or None
    forn = db.scalar(
        select(ComprasFornecedor).where(ComprasFornecedor.ni_fornecedor == ni_norm)
    )
    if uf_filtro:
        forn_uf = ((forn.uf_sigla if forn else None) or "").strip().upper()
        if forn_uf != uf_filtro:
            empresa = _empresa_resumo(forn)
            nome = forn.nome_razao_social_fornecedor if forn else None
            if empresa and not empresa.get("razao_social") and nome:
                empresa = {**empresa, "razao_social": nome}
            return {
                "cod_fornecedor": ni_norm,
                "nome_fornecedor": nome,
                "tipo": "cpf" if len(ni_norm) <= 11 else "cnpj",
                "qtd_itens": 0,
                "qtd_compras": 0,
                "valor_total_homologado": None,
                "empresa": empresa,
                "items": [],
                "total": 0,
                "fonte_canonica": "compras_contratacao_resultados",
            }

    ids_ok = _ids_compra_no_escopo(
        db,
        periodo_resolvido=periodo_resolvido,
        ano=ano,
        orgao_id=orgao_id,
        modalidade_id=modalidade_id,
    )

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
        id_compra = res.id_compra or (item.id_compra if item else None)
        if not _compra_no_escopo(id_compra, ids_ok):
            continue
        if res.id_compra_item:
            itens_com_resultado.add(str(res.id_compra_item))
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
        if not _compra_no_escopo(item.id_compra, ids_ok):
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

    nome = forn.nome_razao_social_fornecedor if forn else None
    empresa = _empresa_resumo(forn)

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

    if empresa and not empresa.get("razao_social") and nome:
        empresa = {**empresa, "razao_social": nome}

    return {
        "cod_fornecedor": ni_norm,
        "nome_fornecedor": nome,
        "tipo": "cpf" if len(ni_norm) <= 11 else "cnpj",
        "qtd_itens": total,
        "qtd_compras": len({i["id_compra"] for i in items if i.get("id_compra")}),
        "valor_total_homologado": float(valor_total.quantize(Decimal("0.01"))) if tem_valor else None,
        "empresa": empresa,
        "items": items,
        "total": total,
        "fonte_canonica": "compras_contratacao_resultados",
    }
