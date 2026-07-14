"""Consulta unificada por processo — agrega Compras.gov (PNCP) e Power BI (PMU)."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.dashboard_gerencial import (
    ChaveProcesso,
    _chave_api,
    _chave_powerbi,
    _chaves_modalidade,
    _mapa_modalidades,
    _mapa_orgaos,
    _norm_ids,
    extrair_numero_processo_api,
    normalizar_processo_powerbi,
)
from app.database import (
    CompraContratacao,
    CompraContratacaoItem,
    ComprasContratacaoResultado,
    ComprasPgcItem,
    ModalidadeConsolidada,
    ModalidadeVinculo,
    OrgaoConsolidado,
    PbiOrgao,
    PbiProcessoLicitatorio,
    get_db,
)
from app.powerbi import (
    ArvoreLicitacaoOut,
    ContratoGrupoOut,
    _ctr_out,
    _proc_out,
    _resp_out,
)
from app.powerbi_arvore import agrupar_eventos, eventos_do_processo, responsaveis_do_contrato

router = APIRouter(tags=["consulta-processo"])

_PROC_OPTS = (
    selectinload(PbiProcessoLicitatorio.orgao),
    selectinload(PbiProcessoLicitatorio.observador),
)


def _extrair_numero_busca(termo: str) -> int | None:
    """Tenta interpretar o termo digitado como número de processo."""
    t = termo.strip()
    if not t:
        return None
    for fn in (extrair_numero_processo_api, normalizar_processo_powerbi):
        n = fn(t)
        if n is not None:
            return n
    m = re.match(r"^(\d+)$", t)
    return int(m.group(1)) if m else None


def _filtro_processo_api(termo: str, numero: int | None) -> list[Any]:
    p = f"%{termo.strip()}%"
    conds = [CompraContratacao.processo.ilike(p)]
    if numero is not None:
        conds.append(CompraContratacao.processo.ilike(f"%{numero}%"))
    return [or_(*conds)]


def _filtro_processo_pbi(termo: str, numero: int | None) -> list[Any]:
    p = f"%{termo.strip()}%"
    conds = [PbiProcessoLicitatorio.processo.ilike(p)]
    if numero is not None:
        conds.append(PbiProcessoLicitatorio.processo == str(numero))
    return [or_(*conds)]


def _norm_modalidade_texto(valor: str | None) -> str:
    """Normaliza rótulos de modalidade para comparação entre bases."""
    if not valor:
        return ""
    texto = valor.strip().lower().replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", texto)


def _mapa_modalidades_por_nome(
    db: Session,
) -> tuple[dict[str, ModalidadeConsolidada], dict[str, ModalidadeConsolidada]]:
    """Nomes consolidados e rótulos PNCP (Compras.gov) normalizados → entidade."""
    por_nome: dict[str, ModalidadeConsolidada] = {}
    por_rotulo: dict[str, ModalidadeConsolidada] = {}
    mods = db.scalars(
        select(ModalidadeConsolidada).where(ModalidadeConsolidada.ativo.is_(True))
    ).all()
    for mod in mods:
        chave = _norm_modalidade_texto(mod.nome)
        if chave:
            por_nome[chave] = mod
    for vinculo in db.scalars(
        select(ModalidadeVinculo)
        .options(selectinload(ModalidadeVinculo.modalidade_consolidada))
        .where(ModalidadeVinculo.fonte == "compras_api")
    ).all():
        if not vinculo.rotulo or not vinculo.modalidade_consolidada.ativo:
            continue
        chave = _norm_modalidade_texto(vinculo.rotulo)
        if chave:
            por_rotulo[chave] = vinculo.modalidade_consolidada
    return por_nome, por_rotulo


def _crit_modalidade_fonte(
    modalidade_id: int | list[int] | None,
    chaves_mod: dict[str, set[str]],
    fonte: str,
    col: Any,
) -> list[Any]:
    """Restringe SQL às chaves vinculadas; sem vínculo na fonte, filtra depois em memória."""
    if not _norm_ids(modalidade_id):
        return []
    mods = chaves_mod.get(fonte) or set()
    if mods:
        return [col.in_(mods)]
    return []


def _crit_uma_modalidade_compras_api(
    db: Session,
    modalidade_id: int,
) -> Any | None:
    """Critério OR interno de uma modalidade consolidada (código / rótulo / nome)."""
    conds: list[Any] = []
    vinculos = db.scalars(
        select(ModalidadeVinculo).where(
            ModalidadeVinculo.modalidade_consolidada_id == modalidade_id,
            ModalidadeVinculo.fonte == "compras_api",
        )
    ).all()
    codigos_um = {v.chave for v in vinculos if v.chave}
    if codigos_um:
        conds.append(CompraContratacao.modalidade_codigo.in_(codigos_um))

    mod = db.get(ModalidadeConsolidada, modalidade_id)
    if mod and mod.ativo:
        rotulos = {
            v.rotulo.strip()
            for v in vinculos
            if v.rotulo and v.rotulo.strip()
        }
        if rotulos:
            conds.append(CompraContratacao.modalidade_descricao.in_(rotulos))
        tokens = [
            t
            for t in re.split(r"[\s\-–—]+", mod.nome)
            if len(t) >= 4
        ]
        if tokens:
            conds.append(
                or_(*[
                    CompraContratacao.modalidade_descricao.ilike(f"%{tok}%")
                    for tok in tokens[:3]
                ])
            )
    if not conds:
        return None
    return or_(*conds)


def _crit_modalidade_compras_api(
    db: Session,
    modalidade_id: int | list[int] | None,
    chaves_mod: dict[str, set[str]],
) -> list[Any]:
    """Filtro SQL da API PNCP — código vinculado e/ou descrição alinhada ao nome consolidado."""
    ids = _norm_ids(modalidade_id)
    if not ids:
        return []
    partes: list[Any] = []
    for mid in ids:
        crit = _crit_uma_modalidade_compras_api(db, mid)
        if crit is not None:
            partes.append(crit)
    if not partes:
        codigos = chaves_mod.get("compras_api") or set()
        if codigos:
            return [CompraContratacao.modalidade_codigo.in_(codigos)]
        return []
    if len(partes) == 1:
        return [partes[0]]
    return [or_(*partes)]


def _modalidade_por_descricao(
    descricao: str,
    mapa_nome: dict[str, ModalidadeConsolidada],
    mapa_rotulo: dict[str, ModalidadeConsolidada] | None = None,
) -> ModalidadeConsolidada | None:
    """Associa descrição da API ao nome consolidado (exato ou por prefixo)."""
    if not descricao:
        return None
    mod = mapa_nome.get(descricao)
    if mod:
        return mod
    for nome_norm, candidato in mapa_nome.items():
        if nome_norm.startswith(descricao + " ") or descricao.startswith(nome_norm + " "):
            return candidato
    if mapa_rotulo:
        mod = mapa_rotulo.get(descricao)
        if mod:
            return mod
    return None


def _modalidade_registro_id(
    fonte: str,
    registro: Any,
    mapa_mod: dict[tuple[str, str], ModalidadeConsolidada],
    mapa_nome: dict[str, ModalidadeConsolidada] | None = None,
    mapa_rotulo: dict[str, ModalidadeConsolidada] | None = None,
) -> int | None:
    if fonte == "compras_api":
        descricao = _norm_modalidade_texto(registro.modalidade_descricao)
        mod = _modalidade_por_descricao(descricao, mapa_nome or {}, mapa_rotulo)
        if mod:
            return mod.id
        codigo = (registro.modalidade_codigo or "").strip()
        if codigo:
            mod = mapa_mod.get((fonte, codigo))
            if mod:
                return mod.id
        return None

    chave = (registro.modalidade or "").strip()
    if not chave:
        return None
    mod = mapa_mod.get((fonte, chave))
    return mod.id if mod else None


def _filtrar_registros_modalidade(
    api_rows: list[CompraContratacao],
    pbi_rows: list[tuple[PbiProcessoLicitatorio, str]],
    modalidade_id: int | list[int] | None,
    mapa_mod: dict[tuple[str, str], ModalidadeConsolidada],
    mapa_nome: dict[str, ModalidadeConsolidada] | None = None,
    mapa_rotulo: dict[str, ModalidadeConsolidada] | None = None,
) -> tuple[list[CompraContratacao], list[tuple[PbiProcessoLicitatorio, str]]]:
    """Garante que cada registro pertence a uma das modalidades consolidadas selecionadas."""
    ids = set(_norm_ids(modalidade_id))
    if not ids:
        return api_rows, pbi_rows
    api_rows = [
        r for r in api_rows
        if _modalidade_registro_id("compras_api", r, mapa_mod, mapa_nome, mapa_rotulo) in ids
    ]
    pbi_rows = [
        (proc, org_nome) for proc, org_nome in pbi_rows
        if _modalidade_registro_id("powerbi", proc, mapa_mod, mapa_nome, mapa_rotulo) in ids
    ]
    return api_rows, pbi_rows


def _chaves_orgao(db: Session, orgao_id: int | None) -> dict[str, set[str]]:
    from app.dashboard_gerencial import _chaves_orgao as _co

    return _co(db, orgao_id)


def _compra_out(row: CompraContratacao) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": row.id,
        "id_compra": row.id_compra or row.chave_compra,
        "unidade_compradora": row.unidade_compradora,
        "unidade_nome": row.unidade_nome,
        "ano": row.ano,
        "chave_compra": row.chave_compra,
        "numero": row.numero,
        "numero_controle_pncp": row.numero_controle_pncp,
        "processo": row.processo,
        "modalidade_codigo": row.modalidade_codigo,
        "modalidade_descricao": row.modalidade_descricao,
        "objeto": row.objeto,
        "situacao_lista": row.situacao_lista,
        "url_acompanhamento": row.url_acompanhamento,
        "data_divulgacao_pncp": row.data_divulgacao_pncp,
        "data_publicacao_pncp": row.data_publicacao_pncp,
        "data_abertura_proposta_pncp": row.data_abertura_proposta_pncp,
        "data_encerramento_proposta_pncp": row.data_encerramento_proposta_pncp,
        "situacao_pncp": row.situacao_pncp,
        "inicio_recebimento_propostas": row.inicio_recebimento_propostas,
        "fim_recebimento_propostas": row.fim_recebimento_propostas,
        "id_contratacao_pncp": row.id_contratacao_pncp,
        "informacao_complementar": row.informacao_complementar,
        "valor_total_estimado": row.valor_total_estimado,
        "valor_total_homologado": row.valor_total_homologado,
        "link_pncp": row.link_pncp,
        "orgao_entidade_razao_social": row.orgao_entidade_razao_social,
        "observador_id": row.observador_id,
        "observador_nome": row.observador.nome if row.observador else None,
        "coletado_em": row.coletado_em.isoformat() if row.coletado_em else None,
    }
    if row.dados_pncp_json:
        try:
            data["dados_pncp"] = json.loads(row.dados_pncp_json)
        except json.JSONDecodeError:
            data["dados_pncp"] = None
    return data


def _item_out(row: CompraContratacaoItem, resultados: list[ComprasContratacaoResultado] | None = None) -> dict[str, Any]:
    vencedores = []
    if resultados:
        for res in resultados:
            vencedores.append({
                "nome": res.nome_razao_social_fornecedor,
                "ni": res.ni_fornecedor,
                "valor_homologado": res.valor_total_homologado,
                "classificacao_srp": res.ordem_classificacao_srp,
                "situacao": res.situacao_compra_item_resultado_nome,
            })
    nome_forn = row.nome_fornecedor
    valor_hom = row.valor_total_resultado
    if vencedores and not nome_forn:
        nome_forn = vencedores[0].get("nome")
        valor_hom = vencedores[0].get("valor_homologado")
    data = {
        "id": row.id,
        "id_compra_item": row.id_compra_item,
        "numero_item_pncp": row.numero_item_pncp,
        "descricao_resumida": row.descricao_resumida,
        "descricao_detalhada": row.descricao_detalhada,
        "material_ou_servico_nome": row.material_ou_servico_nome,
        "unidade_medida": row.unidade_medida,
        "situacao_compra_item_nome": row.situacao_compra_item_nome,
        "quantidade": row.quantidade,
        "valor_unitario_estimado": row.valor_unitario_estimado,
        "valor_total": row.valor_total,
        "nome_fornecedor": nome_forn,
        "valor_total_resultado": valor_hom,
        "resultados_homologados": vencedores,
    }
    return data


def _itens_compra(db: Session, row: CompraContratacao) -> list[dict[str, Any]]:
    filtro = or_(
        CompraContratacaoItem.contratacao_id == row.id,
        CompraContratacaoItem.id_compra == row.id_compra,
    )
    itens = db.scalars(
        select(CompraContratacaoItem)
        .where(filtro)
        .order_by(CompraContratacaoItem.numero_item_pncp)
        .limit(500)
    ).all()
    if not itens:
        return []
    ids = [i.id_compra_item for i in itens]
    res_map: dict[str, list[ComprasContratacaoResultado]] = defaultdict(list)
    for res in db.scalars(
        select(ComprasContratacaoResultado).where(
            ComprasContratacaoResultado.id_compra_item.in_(ids)
        )
    ):
        res_map[res.id_compra_item].append(res)
    return [_item_out(i, res_map.get(i.id_compra_item)) for i in itens]


def _pgc_vinculo(db: Session, row: CompraContratacao) -> list[dict[str, Any]]:
    cnpj = (row.orgao_entidade_cnpj or "").replace(".", "").replace("/", "").replace("-", "")
    if not cnpj:
        return []
    itens = db.scalars(
        select(ComprasPgcItem)
        .where(
            ComprasPgcItem.orgao.contains(cnpj[-8:]),
            ComprasPgcItem.ano_pca_projeto_compra == row.ano,
            ComprasPgcItem.codigo_uasg == row.unidade_compradora,
        )
        .limit(20)
    ).all()
    return [
        {
            "codigo_item_catalogo": p.codigo_item_catalogo,
            "descricao": p.descricao_item_catalogo,
            "valor_planejado": p.valor_total_item,
            "status": p.status_contratacao_execucao,
        }
        for p in itens
    ]


def _arvore_powerbi(db: Session, proc: PbiProcessoLicitatorio) -> dict[str, Any]:
    eventos = eventos_do_processo(db, proc)
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
    arvore = ArvoreLicitacaoOut(
        licitacao=_proc_out(proc, db),
        contratos=grupos,
        sem_contrato=len(grupos) == 0,
    )
    return arvore.model_dump(mode="json")


def _rotulo_grupo(
    api: list[CompraContratacao],
    pbi: list[tuple[PbiProcessoLicitatorio, str]],
) -> str:
    for r in api:
        if r.processo:
            return r.processo
    for proc, _ in pbi:
        return proc.processo
    return "Processo"


def _info_chave(
    chave: ChaveProcesso | None,
    mapa_org: dict,
    api: list[CompraContratacao],
    pbi: list[tuple[PbiProcessoLicitatorio, str]],
) -> dict[str, Any] | None:
    if not chave:
        return None
    oid, ano, num = chave
    org = next((o for o in mapa_org.values() if o.id == oid), None)
    return {
        "orgao_id": oid,
        "orgao_nome": (org.sigla or org.nome) if org else None,
        "ano": ano,
        "numero": num,
        "rotulo": _rotulo_grupo(api, pbi),
    }


def _comparativo(
    api: list[CompraContratacao],
    pbi: list[tuple[PbiProcessoLicitatorio, str]],
) -> dict[str, Any]:
    sit_api = api[0].situacao_lista or api[0].situacao_pncp if api else None
    sit_pbi = pbi[0][0].situacao if pbi else None

    val_api_est = api[0].valor_total_estimado if api else None
    val_api_hom = api[0].valor_total_homologado if api else None
    val_pbi = pbi[0][0].valor_licitacao if pbi else None

    obj_api = api[0].objeto if api else None
    obj_pbi = pbi[0][0].objeto if pbi else None

    mod_api = api[0].modalidade_descricao if api else None
    mod_pbi = pbi[0][0].modalidade if pbi else None

    return {
        "situacao": {"api": sit_api, "powerbi": sit_pbi},
        "modalidade": {"api": mod_api, "powerbi": mod_pbi},
        "valores": {
            "api_estimado": val_api_est,
            "api_homologado": val_api_hom,
            "powerbi": val_pbi,
        },
        "objeto": {"api": obj_api, "powerbi": obj_pbi},
        "datas": {
            "api_publicacao": api[0].data_publicacao_pncp if api else None,
            "api_abertura": api[0].data_abertura_proposta_pncp if api else None,
            "powerbi_abertura": pbi[0][0].dt_abertura if pbi else None,
            "powerbi_homologacao": pbi[0][0].dt_homologacao if pbi else None,
        },
    }


def _buscar_registros(
    db: Session,
    termo: str,
    ano: int | None,
    orgao_id: int | None,
    modalidade_id: int | list[int] | None = None,
) -> tuple[list[CompraContratacao], list[tuple[PbiProcessoLicitatorio, str]]]:
    numero = _extrair_numero_busca(termo)
    ids_mod = _norm_ids(modalidade_id)
    chaves_org = _chaves_orgao(db, orgao_id)
    chaves_mod = _chaves_modalidade(db, ids_mod)
    mapa_mod = _mapa_modalidades(db)
    mapa_nome, mapa_rotulo = _mapa_modalidades_por_nome(db)

    crit_a: list[Any] = _filtro_processo_api(termo, numero)
    if ano:
        crit_a.append(CompraContratacao.ano == ano)
    api_org = chaves_org.get("compras_api")
    if api_org:
        crit_a.append(CompraContratacao.unidade_compradora.in_(api_org))
    crit_a.extend(_crit_modalidade_compras_api(db, ids_mod, chaves_mod))

    crit_b: list[Any] = _filtro_processo_pbi(termo, numero)
    if ano:
        crit_b.append(PbiProcessoLicitatorio.ano_processo == ano)
    pbi_org = chaves_org.get("powerbi")
    if pbi_org:
        crit_b.append(
            PbiProcessoLicitatorio.orgao_id.in_(
                select(PbiOrgao.id).where(PbiOrgao.nome.in_(pbi_org))
            )
        )
    crit_b.extend(
        _crit_modalidade_fonte(ids_mod, chaves_mod, "powerbi", PbiProcessoLicitatorio.modalidade)
    )

    api_rows = list(
        db.scalars(
            select(CompraContratacao)
            .options(selectinload(CompraContratacao.observador))
            .where(*crit_a)
            .order_by(CompraContratacao.ano.desc(), CompraContratacao.numero)
            .limit(200)
        ).all()
    )
    pbi_rows = list(
        db.execute(
            select(PbiProcessoLicitatorio, PbiOrgao.nome)
            .join(PbiOrgao, PbiProcessoLicitatorio.orgao_id == PbiOrgao.id)
            .options(*_PROC_OPTS)
            .where(*crit_b)
            .order_by(PbiProcessoLicitatorio.ano_processo.desc(), PbiProcessoLicitatorio.processo)
            .limit(200)
        ).all()
    )
    return _filtrar_registros_modalidade(
        api_rows, pbi_rows, ids_mod, mapa_mod, mapa_nome, mapa_rotulo
    )


def _agrupar_resultados(
    api_rows: list[CompraContratacao],
    pbi_rows: list[tuple[PbiProcessoLicitatorio, str]],
    mapa_org: dict,
) -> list[dict[str, Any]]:
    grupos: dict[str, dict[str, Any]] = {}

    def _slot(chave: ChaveProcesso | None, origem: str, item: Any) -> None:
        key = f"chave:{chave}" if chave else f"soltos:{origem}:{getattr(item, 'id', id(item))}"
        if key not in grupos:
            grupos[key] = {
                "chave": None,
                "sem_chave": chave is None,
                "api": [],
                "pbi": [],
            }
        g = grupos[key]
        if chave and not g["chave"]:
            oid, ano, num = chave
            org = next((o for o in mapa_org.values() if o.id == oid), None)
            g["chave"] = {
                "orgao_id": oid,
                "orgao_nome": (org.sigla or org.nome) if org else None,
                "ano": ano,
                "numero": num,
            }
        if origem == "api":
            g["api"].append(item)
        else:
            g["pbi"].append(item)

    for row in api_rows:
        _slot(_chave_api(row, mapa_org), "api", row)
    for proc, org_nome in pbi_rows:
        _slot(_chave_powerbi(proc, org_nome, mapa_org), "pbi", (proc, org_nome))

    resultado: list[dict[str, Any]] = []
    for g in grupos.values():
        api = g["api"]
        pbi = g["pbi"]
        chave_info = g["chave"]
        rotulo = _rotulo_grupo(api, pbi)
        if chave_info:
            chave_info = {**chave_info, "rotulo": rotulo}
        resultado.append(
            {
                "chave": chave_info,
                "sem_chave": g["sem_chave"],
                "rotulo": rotulo,
                "cobertura": {
                    "api": len(api) > 0,
                    "powerbi": len(pbi) > 0,
                },
                "api_count": len(api),
                "powerbi_count": len(pbi),
                "ano": chave_info["ano"] if chave_info else (
                    api[0].ano if api else pbi[0][0].ano_processo if pbi else None
                ),
                "orgao": chave_info["orgao_nome"] if chave_info else (
                    api[0].unidade_nome if api else pbi[0][1] if pbi else None
                ),
            }
        )

    def _sort_key(item: dict[str, Any]) -> tuple:
        bases = sum(item["cobertura"].values())
        ano = item.get("ano") or 0
        return (-bases, -ano, item.get("rotulo") or "")

    return sorted(resultado, key=_sort_key)


@router.get("/api/consulta-processo/filtros")
def filtros_consulta(db: Session = Depends(get_db)):
    anos_api = db.scalars(select(CompraContratacao.ano).distinct()).all()
    anos_pbi = db.scalars(select(PbiProcessoLicitatorio.ano_processo).distinct()).all()
    anos = sorted(set(anos_api) | set(anos_pbi), reverse=True)
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
    return {
        "anos": anos,
        "orgaos": [{"id": o.id, "nome": o.nome, "sigla": o.sigla} for o in orgaos],
        "modalidades": [{"id": m.id, "nome": m.nome} for m in modalidades],
    }


@router.get("/api/consulta-processo/buscar")
def buscar_processo(
    db: Session = Depends(get_db),
    processo: str = Query(..., min_length=1),
    ano: int | None = Query(None, ge=2000, le=2100),
    orgao_id: int | None = Query(None),
    modalidade_id: list[int] = Query(default=[]),
    limit: int = Query(30, ge=1, le=100),
):
    termo = processo.strip()
    if not termo:
        raise HTTPException(400, "Informe o número ou texto do processo")

    mapa_org = _mapa_orgaos(db)
    api_rows, pbi_rows = _buscar_registros(db, termo, ano, orgao_id, modalidade_id)
    grupos = _agrupar_resultados(api_rows, pbi_rows, mapa_org)[:limit]

    return {
        "termo": termo,
        "numero_interpretado": _extrair_numero_busca(termo),
        "total_grupos": len(grupos),
        "total_registros": len(api_rows) + len(pbi_rows),
        "grupos": grupos,
    }


def _registros_por_chave(
    db: Session,
    chave_alvo: ChaveProcesso,
    mapa_org: dict,
    modalidade_id: int | list[int] | None = None,
) -> tuple[list[CompraContratacao], list[tuple[PbiProcessoLicitatorio, str]]]:
    oid, ano, _ = chave_alvo
    ids_mod = _norm_ids(modalidade_id)
    chaves_org = _chaves_orgao(db, oid)
    chaves_mod = _chaves_modalidade(db, ids_mod)
    mapa_mod = _mapa_modalidades(db)
    mapa_nome, mapa_rotulo = _mapa_modalidades_por_nome(db)

    crit_a: list[Any] = [CompraContratacao.ano == ano]
    api_org = chaves_org.get("compras_api")
    if api_org:
        crit_a.append(CompraContratacao.unidade_compradora.in_(api_org))
    crit_a.extend(_crit_modalidade_compras_api(db, ids_mod, chaves_mod))

    crit_b: list[Any] = [PbiProcessoLicitatorio.ano_processo == ano]
    pbi_org = chaves_org.get("powerbi")
    if pbi_org:
        crit_b.append(
            PbiProcessoLicitatorio.orgao_id.in_(
                select(PbiOrgao.id).where(PbiOrgao.nome.in_(pbi_org))
            )
        )
    crit_b.extend(
        _crit_modalidade_fonte(ids_mod, chaves_mod, "powerbi", PbiProcessoLicitatorio.modalidade)
    )

    api_rows = [
        r
        for r in db.scalars(
            select(CompraContratacao)
            .options(selectinload(CompraContratacao.observador))
            .where(*crit_a)
        ).all()
        if _chave_api(r, mapa_org) == chave_alvo
    ]
    pbi_rows = [
        (proc, org_nome)
        for proc, org_nome in db.execute(
            select(PbiProcessoLicitatorio, PbiOrgao.nome)
            .join(PbiOrgao, PbiProcessoLicitatorio.orgao_id == PbiOrgao.id)
            .options(*_PROC_OPTS)
            .where(*crit_b)
        ).all()
        if _chave_powerbi(proc, org_nome, mapa_org) == chave_alvo
    ]
    return _filtrar_registros_modalidade(
        api_rows, pbi_rows, ids_mod, mapa_mod, mapa_nome, mapa_rotulo
    )


def _agrupar_para_detalhe(
    api_rows: list[CompraContratacao],
    pbi_rows: list[tuple[PbiProcessoLicitatorio, str]],
    mapa_org: dict,
) -> list[dict[str, Any]]:
    """Agrupa registros mantendo objetos ORM para detalhe."""
    buckets: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"api": [], "pbi": [], "chave": None}
    )

    def _bucket_key(chave: ChaveProcesso | None, origem: str, item_id: int) -> str:
        return f"chave:{chave}" if chave else f"solo:{origem}:{item_id}"

    for row in api_rows:
        ch = _chave_api(row, mapa_org)
        k = _bucket_key(ch, "api", row.id)
        buckets[k]["api"].append(row)
        if ch and not buckets[k]["chave"]:
            buckets[k]["chave"] = ch
    for proc, org_nome in pbi_rows:
        ch = _chave_powerbi(proc, org_nome, mapa_org)
        k = _bucket_key(ch, "pbi", proc.id)
        buckets[k]["pbi"].append((proc, org_nome))
        if ch and not buckets[k]["chave"]:
            buckets[k]["chave"] = ch

    def _score(g: dict[str, Any]) -> tuple:
        bases = (1 if g["api"] else 0) + (1 if g["pbi"] else 0)
        total = len(g["api"]) + len(g["pbi"])
        return (-bases, -total)

    return sorted(buckets.values(), key=_score)


def _montar_resposta_detalhe(
    db: Session,
    mapa_org: dict,
    api_rows: list[CompraContratacao],
    pbi_rows: list[tuple[PbiProcessoLicitatorio, str]],
) -> dict[str, Any]:
    chave_raw = None
    if api_rows:
        chave_raw = _chave_api(api_rows[0], mapa_org)
    elif pbi_rows:
        chave_raw = _chave_powerbi(pbi_rows[0][0], pbi_rows[0][1], mapa_org)

    chave_info = _info_chave(chave_raw, mapa_org, api_rows, pbi_rows)

    api_detalhe = []
    for row in api_rows:
        item = _compra_out(row)
        item["itens"] = _itens_compra(db, row)
        item["pgc_planejamento"] = _pgc_vinculo(db, row)
        api_detalhe.append(item)

    pbi_detalhe = [_arvore_powerbi(db, proc) for proc, _ in pbi_rows]

    return {
        "multiplos": False,
        "chave": chave_info,
        "cobertura": {
            "api": len(api_rows) > 0,
            "powerbi": len(pbi_rows) > 0,
            "nas_duas": len(api_rows) > 0 and len(pbi_rows) > 0,
        },
        "comparativo": _comparativo(api_rows, pbi_rows),
        "api": api_detalhe,
        "powerbi": pbi_detalhe,
    }


@router.get("/api/consulta-processo/detalhe")
def detalhe_processo(
    db: Session = Depends(get_db),
    processo: str | None = Query(None),
    ano: int | None = Query(None, ge=2000, le=2100),
    orgao_id: int | None = Query(None),
    modalidade_id: list[int] = Query(default=[]),
    chave_orgao_id: int | None = Query(None),
    chave_ano: int | None = Query(None, ge=2000, le=2100),
    chave_numero: int | None = Query(None),
):
    mapa_org = _mapa_orgaos(db)

    if chave_orgao_id is not None and chave_ano is not None and chave_numero is not None:
        chave_alvo: ChaveProcesso = (chave_orgao_id, chave_ano, chave_numero)
        api_rows, pbi_rows = _registros_por_chave(
            db, chave_alvo, mapa_org, modalidade_id
        )
        if not api_rows and not pbi_rows:
            raise HTTPException(404, "Nenhum registro encontrado para esta chave de cruzamento")
        return _montar_resposta_detalhe(db, mapa_org, api_rows, pbi_rows)

    if not processo or not processo.strip():
        raise HTTPException(400, "Informe processo ou chave de cruzamento")

    api_rows, pbi_rows = _buscar_registros(
        db, processo.strip(), ano, orgao_id, modalidade_id
    )
    if not api_rows and not pbi_rows:
        raise HTTPException(404, "Nenhum registro encontrado para este processo")

    grupos = _agrupar_para_detalhe(api_rows, pbi_rows, mapa_org)
    if len(grupos) > 1:
        resumo = _agrupar_resultados(api_rows, pbi_rows, mapa_org)
        return {
            "multiplos": True,
            "grupos": resumo,
            "mensagem": "Encontrados vários processos. Selecione um ou refine com ano, órgão e modalidade.",
        }

    g = grupos[0]
    return _montar_resposta_detalhe(db, mapa_org, g["api"], g["pbi"])
