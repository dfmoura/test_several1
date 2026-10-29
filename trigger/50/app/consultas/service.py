"""Indicadores e status operacional — contagens reais do banco, por escopo.

Duas lentes de produto (mesmo motor, layouts distintos na UI):
- rede (matriz/consolidado): totais + dimensão por filial
- unidade (filial): analítico local (UASG, modalidade, situação)
- plataforma (admin): visão geral; filtro de visão estreita o ACL
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import Float, and_, case, cast, exists, func, or_, select
from sqlalchemy.orm import Session

from app.consultas.periodo import (
    PeriodoAplicado,
    contratacao_no_periodo,
    periodo_tudo,
)
from app.enriquecimento.service import contar_pendentes_cnpj
from app.database import (
    Contratacao,
    ExecucaoColeta,
    FilialMunicipio,
    FilialUasg,
    Fornecedor,
    ItemContratacao,
    Municipio,
    ResultadoItem,
    Uasg,
    Unidade,
)

# Lentes oficiais — UI escolhe layout; dados sempre filtrados no servidor.
LENTE_REDE = "rede"
LENTE_UNIDADE = "unidade"
LENTE_PLATAFORMA = "plataforma"

# Ordenação server-side da grade Compras.gov (whitelist = data-sort da UI).
COMPRAS_SORT_KEYS = frozenset(
    {
        "numero",
        "processo",
        "uasg",
        "ano",
        "situacao",
        "valor_est",
        "valor_hom",
        "pncp",
        "tipo",
    }
)


def _normalize_sort_dir(sort_dir: str | None) -> str:
    return "desc" if (sort_dir or "").strip().lower() == "desc" else "asc"


def _expr_valor_br_num(col):
    """Converte string monetária BR (``1.234,56`` / ``R$ …``) em REAL para ORDER BY.

    Espelha ``parseValorSort`` do frontend — evita ordem lexical em ``String(80)``.
    """
    stripped = func.trim(
        func.replace(func.replace(func.coalesce(col, ""), "R$", ""), " ", "")
    )
    br_as_dot = func.replace(func.replace(stripped, ".", ""), ",", ".")
    return case(
        (or_(col.is_(None), stripped == ""), None),
        (
            func.instr(stripped, ",") > 0,
            cast(br_as_dot, Float),
        ),
        else_=cast(stripped, Float),
    )


def _expr_tipo_item_label():
    """Rótulo de tipo (Material / Serviço / ambos) alinhado a ``comprasTipoLabel``."""
    has_m = exists(
        select(ItemContratacao.id).where(
            ItemContratacao.id_compra == Contratacao.id_compra,
            func.upper(ItemContratacao.material_ou_servico) == "M",
        )
    )
    has_s = exists(
        select(ItemContratacao.id).where(
            ItemContratacao.id_compra == Contratacao.id_compra,
            func.upper(ItemContratacao.material_ou_servico) == "S",
        )
    )
    return case(
        (and_(has_m, has_s), "Material e Serviço"),
        (has_m, "Material"),
        (has_s, "Serviço"),
        else_="",
    )


def _order_by_compras(sort: str | None, sort_dir: str | None):
    """Cláusulas ORDER BY: coluna pedida (nulls/vazios por último) + ``id`` estável.

    Sem ``sort`` válido → ``id DESC`` (comportamento histórico).
    """
    key = (sort or "").strip().lower()
    if key not in COMPRAS_SORT_KEYS:
        return (Contratacao.id.desc(),)

    desc = _normalize_sort_dir(sort_dir) == "desc"
    if key == "numero":
        expr = func.coalesce(Contratacao.numero, Contratacao.id_compra)
    elif key == "processo":
        expr = Contratacao.processo
    elif key == "uasg":
        expr = Contratacao.unidade_compradora
    elif key == "ano":
        expr = Contratacao.ano
    elif key == "situacao":
        expr = Contratacao.situacao
    elif key == "valor_est":
        expr = _expr_valor_br_num(Contratacao.valor_total_estimado)
    elif key == "valor_hom":
        expr = _expr_valor_br_num(Contratacao.valor_total_homologado)
    elif key == "pncp":
        expr = Contratacao.numero_controle_pncp
    else:  # tipo
        expr = _expr_tipo_item_label()

    # Nulls / vazios sempre no fim (igual ao sort client antigo), independente da dir.
    if key in ("valor_est", "valor_hom", "ano"):
        empty_last = case((expr.is_(None), 1), else_=0)
    else:
        empty_last = case(
            (or_(expr.is_(None), func.trim(func.coalesce(expr, "")) == ""), 1),
            else_=0,
        )
    primary = expr.desc() if desc else expr.asc()
    return (empty_last.asc(), primary, Contratacao.id.desc())


def lente_de_modo(modo: str | None) -> str:
    """Mapa escopo.modo → lente de produto."""
    if modo == "consolidado":
        return LENTE_REDE
    if modo == "filial":
        return LENTE_UNIDADE
    return LENTE_PLATAFORMA


def _count(db: Session, stmt) -> int:
    return int(db.scalar(stmt) or 0)


def _ids_compra_no_periodo(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    periodo: PeriodoAplicado,
) -> set[str] | None:
    """IDs de compra no período; ``None`` = sem filtro temporal (tudo)."""
    if not periodo.ativo:
        return None
    if escopo_uasgs is not None and not escopo_uasgs:
        return set()

    stmt = select(
        Contratacao.id_compra,
        Contratacao.ano,
        Contratacao.data_publicacao_pncp,
    )
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
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
        if contratacao_no_periodo(
            ano=int(ano or 0),
            data_publicacao_pncp=data_pub,
            periodo=periodo,
        ):
            out.add(str(id_compra))
    return out


def _where_ids_periodo(stmt, ids_periodo: set[str] | None):
    """Aplica restrição por id_compra quando há período ativo."""
    if ids_periodo is None:
        return stmt
    if not ids_periodo:
        return stmt.where(Contratacao.id_compra.in_(()))
    return stmt.where(Contratacao.id_compra.in_(ids_periodo))


def _parse_valor_br(v: str | None) -> Decimal | None:
    """Converte texto BR (R$ 1.234,56) ou número em Decimal."""
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


def _soma_valores(valores: list[str | None]) -> float:
    total = Decimal("0")
    for v in valores:
        p = _parse_valor_br(v)
        if p is not None:
            total += p
    return float(total.quantize(Decimal("0.01")))


def _valores_indicadores(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    ids_periodo: set[str] | None = None,
) -> tuple[float, float]:
    """(valor estimado todas, valor homologado só homologadas)."""
    if escopo_uasgs is not None and not escopo_uasgs:
        return 0.0, 0.0
    if ids_periodo is not None and not ids_periodo:
        return 0.0, 0.0

    stmt = select(
        Contratacao.valor_total_estimado,
        Contratacao.valor_total_homologado,
        Contratacao.existe_resultado,
        Contratacao.id_compra,
    )
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    stmt = _where_ids_periodo(stmt, ids_periodo)
    rows = db.execute(stmt).all()
    if not rows:
        return 0.0, 0.0

    ids_com_resultado: set[str] = set()
    id_compras = [r[3] for r in rows if r[3]]
    if id_compras:
        ids_com_resultado = set(
            db.scalars(
                select(ResultadoItem.id_compra)
                .where(ResultadoItem.id_compra.in_(id_compras))
                .distinct()
            ).all()
        )

    estimados: list[str | None] = []
    homologados: list[str | None] = []
    for estimado, homologado, existe_res, id_compra in rows:
        estimados.append(estimado)
        if existe_res is True or (id_compra and id_compra in ids_com_resultado):
            homologados.append(homologado)
    return _soma_valores(estimados), _soma_valores(homologados)


def _mapa_uasg_filiais(
    db: Session, ids_filiais: list[int] | None
) -> dict[str, list[dict[str, Any]]]:
    """codigo_uasg → [{filial_id, filial_nome, filial_codigo}, ...] (UASG pode ser compartilhada)."""
    if ids_filiais is not None and not ids_filiais:
        return {}
    stmt = (
        select(
            Uasg.codigo_uasg,
            Unidade.id,
            Unidade.nome,
            Unidade.codigo,
        )
        .join(FilialUasg, FilialUasg.uasg_id == Uasg.id)
        .join(Unidade, Unidade.id == FilialUasg.unidade_id)
        .where(
            FilialUasg.ativo.is_(True),
            Unidade.tipo == "filial",
            Unidade.ativo.is_(True),
        )
    )
    if ids_filiais is not None:
        stmt = stmt.where(Unidade.id.in_(ids_filiais))
    out: dict[str, list[dict[str, Any]]] = {}
    for codigo, fid, nome, codigo_filial in db.execute(stmt).all():
        if not codigo:
            continue
        out.setdefault(str(codigo), []).append(
            {
                "filial_id": int(fid),
                "filial_nome": nome or f"Filial {fid}",
                "filial_codigo": codigo_filial,
            }
        )
    return out


def indicadores(
    db: Session,
    *,
    unidade: Unidade | None,
    escopo_uasgs: list[str] | None,
    ids_filiais: list[int] | None = None,
    escopo_modo: str | None = None,
    periodo: PeriodoAplicado | None = None,
    usuario_id: int | None = None,
) -> dict[str, Any]:
    """KPIs alinhados às tabelas — mesmos filtros da listagem de compras.

    KPIs compostos no topo: Contratações (total × homologadas), Valor
    (estimado × homologado) e, na lente rede, Acompanhamento (com × sem).
    Itens/resultados seguem no payload para a análise.

    Período afeta só métricas temporais (contratações/valores/itens/resultados).
    UASGs, municípios e filiais permanecem estruturais (escopo do login).

    ``acompanhamentos_meus`` (lente unidade): preferência pessoal — não é ACL.
    ``contratacoes_com_acompanhamento`` / ``_sem_`` (unidade, rede, plataforma):
    cobertura operacional distinct no escopo — não é soma das filiais.
    """
    periodo = periodo or periodo_tudo()
    ids_periodo = _ids_compra_no_periodo(
        db, escopo_uasgs=escopo_uasgs, periodo=periodo
    )

    if escopo_uasgs is not None and not escopo_uasgs:
        base = {
            "contratacoes": 0,
            "contratacoes_homologadas": 0,
            "valor_contratacoes": 0.0,
            "valor_contratacoes_homologadas": 0.0,
            "itens": 0,
            "resultados": 0,
            "fornecedores_pendentes_cnpj": 0,
            "uasgs_monitoradas": 0,
            "municipios_ativos": 0,
            "filiais_no_escopo": 0,
            "acompanhamentos_meus": 0,
            "contratacoes_com_acompanhamento": 0,
            "contratacoes_sem_acompanhamento": 0,
        }
    else:
        if ids_periodo is not None and not ids_periodo:
            valor_all, valor_hom = 0.0, 0.0
            n_c = n_hom = n_i = n_r = 0
        else:
            q_c = select(func.count()).select_from(Contratacao)
            q_i = select(func.count()).select_from(ItemContratacao)
            q_r = select(func.count()).select_from(ResultadoItem)
            tem_resultado = exists(
                select(ResultadoItem.id).where(
                    ResultadoItem.id_compra == Contratacao.id_compra
                )
            )
            q_hom = (
                select(func.count())
                .select_from(Contratacao)
                .where(or_(Contratacao.existe_resultado.is_(True), tem_resultado))
            )
            if escopo_uasgs is not None:
                q_c = q_c.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
                q_hom = q_hom.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
                ids_compra = select(Contratacao.id_compra).where(
                    Contratacao.unidade_compradora.in_(escopo_uasgs)
                )
                q_i = q_i.where(ItemContratacao.id_compra.in_(ids_compra))
                q_r = q_r.where(ResultadoItem.id_compra.in_(ids_compra))
            if ids_periodo is not None:
                q_c = q_c.where(Contratacao.id_compra.in_(ids_periodo))
                q_hom = q_hom.where(Contratacao.id_compra.in_(ids_periodo))
                q_i = q_i.where(ItemContratacao.id_compra.in_(ids_periodo))
                q_r = q_r.where(ResultadoItem.id_compra.in_(ids_periodo))

            valor_all, valor_hom = _valores_indicadores(
                db, escopo_uasgs=escopo_uasgs, ids_periodo=ids_periodo
            )
            n_c = _count(db, q_c)
            n_hom = _count(db, q_hom)
            n_i = _count(db, q_i)
            n_r = _count(db, q_r)

        base = {
            "contratacoes": n_c,
            "contratacoes_homologadas": n_hom,
            "valor_contratacoes": valor_all,
            "valor_contratacoes_homologadas": valor_hom,
            "itens": n_i,
            "resultados": n_r,
            "fornecedores_pendentes_cnpj": contar_pendentes_cnpj(db),
            "uasgs_monitoradas": len(escopo_uasgs) if escopo_uasgs is not None else None,
            "municipios_ativos": None,
            "filiais_no_escopo": None,
            "acompanhamentos_meus": 0,
            "contratacoes_com_acompanhamento": 0,
            "contratacoes_sem_acompanhamento": 0,
        }

        if ids_filiais is not None:
            base["filiais_no_escopo"] = len(ids_filiais)
        elif unidade is not None and unidade.tipo == "filial":
            base["filiais_no_escopo"] = 1

        if unidade is not None:
            if unidade.tipo == "filial":
                base["municipios_ativos"] = _count(
                    db,
                    select(func.count())
                    .select_from(FilialMunicipio)
                    .where(
                        FilialMunicipio.unidade_id == unidade.id,
                        FilialMunicipio.ativo.is_(True),
                    ),
                )
                base["uasgs_monitoradas"] = _count(
                    db,
                    select(func.count())
                    .select_from(FilialUasg)
                    .where(
                        FilialUasg.unidade_id == unidade.id,
                        FilialUasg.ativo.is_(True),
                    ),
                )
            elif unidade.tipo == "matriz":
                filiais = list(
                    db.scalars(
                        select(Unidade.id).where(
                            Unidade.organizacao_id == unidade.organizacao_id,
                            Unidade.tipo == "filial",
                            Unidade.ativo.is_(True),
                        )
                    ).all()
                )
                if base["filiais_no_escopo"] is None:
                    base["filiais_no_escopo"] = len(filiais)
                if filiais:
                    base["municipios_ativos"] = _count(
                        db,
                        select(func.count())
                        .select_from(FilialMunicipio)
                        .where(
                            FilialMunicipio.unidade_id.in_(filiais),
                            FilialMunicipio.ativo.is_(True),
                        ),
                    )
                    base["uasgs_monitoradas"] = _count(
                        db,
                        select(func.count())
                        .select_from(FilialUasg)
                        .where(
                            FilialUasg.unidade_id.in_(filiais),
                            FilialUasg.ativo.is_(True),
                        ),
                    )
                else:
                    base["municipios_ativos"] = 0
                    base["uasgs_monitoradas"] = 0

    lente = lente_de_modo(escopo_modo)

    # Preferência pessoal — só relevante na lente unidade (visão filial).
    if usuario_id is not None and lente == LENTE_UNIDADE:
        from app.acompanhamento.service import contar_meus

        unid = (
            unidade.id
            if unidade is not None and unidade.tipo == "filial"
            else (ids_filiais[0] if ids_filiais and len(ids_filiais) == 1 else None)
        )
        base["acompanhamentos_meus"] = contar_meus(
            db,
            usuario_id=usuario_id,
            unidade_id=unid,
            escopo_uasgs=escopo_uasgs,
            ids_periodo=ids_periodo,
        )

    # Cobertura operacional (com × sem responsável) — distinct no escopo.
    # Também na lente unidade: sinal primário da filial (não só “as minhas”).
    if lente in {LENTE_REDE, LENTE_PLATAFORMA, LENTE_UNIDADE}:
        from app.acompanhamento.service import cobertura_rede

        n_ctr = int(base.get("contratacoes") or 0)
        n_com = cobertura_rede(
            db,
            ids_filiais=ids_filiais,
            escopo_uasgs=escopo_uasgs,
            ids_periodo=ids_periodo,
        )
        n_com = min(n_com, n_ctr) if n_ctr >= 0 else n_com
        base["contratacoes_com_acompanhamento"] = n_com
        base["contratacoes_sem_acompanhamento"] = max(0, n_ctr - n_com)

    return {
        "unidade_id": unidade.id if unidade else None,
        "unidade_tipo": unidade.tipo if unidade else None,
        "unidade_nome": unidade.nome if unidade else None,
        "escopo_uasgs": escopo_uasgs,
        "lente": lente,
        "periodo_aplicado": periodo.to_dict(),
        **base,
    }


def status_operacional(db: Session) -> dict[str, Any]:
    """Status de coleta e enriquecimento (plataforma; não por filial)."""
    ultima = db.scalar(
        select(ExecucaoColeta).order_by(ExecucaoColeta.id.desc()).limit(1)
    )
    pend_cnpj = contar_pendentes_cnpj(db)
    return {
        "ultima_coleta": (
            {
                "id": ultima.id,
                "situacao": ultima.situacao,
                "origem": ultima.origem,
                "tarefas_ok": ultima.tarefas_ok,
                "tarefas_falha": ultima.tarefas_falha,
                "sequencias_http": ultima.sequencias_http,
                "terminado_em": (
                    ultima.terminado_em.isoformat() if ultima.terminado_em else None
                ),
            }
            if ultima
            else None
        ),
        "cnpj_pendentes": pend_cnpj,
        # v1: analytics nativos — Power BI fora do produto
        "analytics": "nativo",
    }


def onboarding(
    db: Session,
    *,
    unidade: Unidade | None,
    escopo_uasgs: list[str] | None,
    escopo_modo: str | None = None,
    user: Any | None = None,
) -> dict[str, Any]:
    """Checklist operacional para polish do início."""
    from app.org.service import is_admin_plataforma, unidades_acessiveis

    tem_org = _count(db, select(func.count()).select_from(Unidade)) > 0
    ind = indicadores(db, unidade=unidade, escopo_uasgs=escopo_uasgs)
    tem_escopo = False
    if user is not None:
        tem_escopo = is_admin_plataforma(user) or bool(unidades_acessiveis(db, user))
    elif escopo_modo == "plataforma" or unidade is not None:
        tem_escopo = True
    passos = [
        {
            "id": "unidade",
            "titulo": "Ter escopo pelo login (vínculo ou admin)",
            "ok": tem_escopo,
        },
        {
            "id": "territorio",
            "titulo": "Associar município e ativar UASG",
            "ok": bool(ind.get("uasgs_monitoradas")),
        },
        {
            "id": "coleta",
            "titulo": "Executar pelo menos uma coleta",
            "ok": db.scalar(select(ExecucaoColeta.id).limit(1)) is not None,
        },
        {
            "id": "compras",
            "titulo": "Ter contratações no escopo",
            "ok": (ind.get("contratacoes") or 0) > 0,
        },
    ]
    concluidos = sum(1 for p in passos if p["ok"])
    return {
        "tem_organizacao": tem_org,
        "passos": passos,
        "concluidos": concluidos,
        "total": len(passos),
        "pronto": concluidos == len(passos),
    }


def _row_filial_vazia(
    *,
    filial_id: int,
    filial_nome: str | None,
    filial_codigo: str | None,
) -> dict[str, Any]:
    return {
        "filial_id": filial_id,
        "filial_nome": filial_nome or f"Filial {filial_id}",
        "filial_codigo": filial_codigo,
        "total": 0,
        "homologadas": 0,
        "valor": 0.0,
        "valor_homologado": 0.0,
        "uasgs": 0,
        "municipios": 0,
        # Preferência operacional (não ACL): distinct processos com ≥1 acompanhante.
        "com_acompanhamento": 0,
        "sem_acompanhamento": 0,
        # Sede geográfica (município ativo mais antigo) — mapa da rede.
        "uf": None,
        "ibge": None,
        "municipio_sede": None,
    }


def _uf_from_nome_filial(nome: str | None) -> str | None:
    """Fallback leve: nomes no padrão «OSB Cidade/UF»."""
    if not nome or "/" not in nome:
        return None
    tail = nome.rsplit("/", 1)[-1].strip().upper()
    if len(tail) == 2 and tail.isalpha():
        return tail
    return None


def _sede_geo_por_filial(
    db: Session, ids_filiais: list[int]
) -> dict[int, dict[str, Any]]:
    """Município-sede ativo mais antigo por filial → uf, ibge, nome."""
    if not ids_filiais:
        return {}
    rows = db.execute(
        select(
            FilialMunicipio.unidade_id,
            FilialMunicipio.codigo_municipio_ibge,
            Municipio.uf,
            Municipio.nome,
            FilialMunicipio.id,
        )
        .join(Municipio, Municipio.codigo_ibge == FilialMunicipio.codigo_municipio_ibge)
        .where(
            FilialMunicipio.unidade_id.in_(ids_filiais),
            FilialMunicipio.ativo.is_(True),
        )
        .order_by(FilialMunicipio.unidade_id, FilialMunicipio.id)
    ).all()
    out: dict[int, dict[str, Any]] = {}
    for fid, ibge, uf, nome, _fm_id in rows:
        fid_i = int(fid)
        if fid_i in out:
            continue
        uf_ok = (uf or "").strip().upper() or None
        out[fid_i] = {
            "uf": uf_ok,
            "ibge": int(ibge) if ibge is not None else None,
            "municipio_sede": nome,
        }
    return out


def _aplicar_sede_geo(
    db: Session, acc: dict[int, dict[str, Any]]
) -> None:
    """Preenche uf/ibge/municipio_sede em cada linha de filial."""
    if not acc:
        return
    sedes = _sede_geo_por_filial(db, list(acc.keys()))
    for fid, row in acc.items():
        s = sedes.get(fid) or {}
        uf = s.get("uf") or _uf_from_nome_filial(row.get("filial_nome"))
        row["uf"] = uf
        row["ibge"] = s.get("ibge")
        row["municipio_sede"] = s.get("municipio_sede")


def _metricas_por_uasg(
    db: Session,
    escopo_uasgs: list[str] | None,
    ids_periodo: set[str] | None = None,
) -> dict[str, dict[str, float | int]]:
    """codigo_uasg → total, homologadas, valor, valor_homologado."""
    if escopo_uasgs is not None and not escopo_uasgs:
        return {}
    if ids_periodo is not None and not ids_periodo:
        return {}

    stmt = select(
        Contratacao.unidade_compradora,
        Contratacao.id_compra,
        Contratacao.existe_resultado,
        Contratacao.valor_total_estimado,
        Contratacao.valor_total_homologado,
    )
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    stmt = _where_ids_periodo(stmt, ids_periodo)
    rows = db.execute(stmt).all()
    if not rows:
        return {}

    id_compras = [r[1] for r in rows if r[1]]
    ids_com_resultado: set[str] = set()
    if id_compras:
        ids_com_resultado = set(
            db.scalars(
                select(ResultadoItem.id_compra)
                .where(ResultadoItem.id_compra.in_(id_compras))
                .distinct()
            ).all()
        )

    out: dict[str, dict[str, float | int]] = {}
    for codigo, id_compra, existe_res, estimado, homologado in rows:
        if not codigo:
            continue
        key = str(codigo)
        if key not in out:
            out[key] = {
                "total": 0,
                "homologadas": 0,
                "valor": 0.0,
                "valor_homologado": 0.0,
            }
        bucket = out[key]
        bucket["total"] = int(bucket["total"]) + 1
        pe = _parse_valor_br(estimado)
        if pe is not None:
            bucket["valor"] = float(
                (Decimal(str(bucket["valor"])) + pe).quantize(Decimal("0.01"))
            )
        is_hom = existe_res is True or (
            id_compra is not None and id_compra in ids_com_resultado
        )
        if is_hom:
            bucket["homologadas"] = int(bucket["homologadas"]) + 1
            ph = _parse_valor_br(homologado)
            if ph is not None:
                bucket["valor_homologado"] = float(
                    (Decimal(str(bucket["valor_homologado"])) + ph).quantize(
                        Decimal("0.01")
                    )
                )
    return out


def _municipios_por_filial(db: Session, ids_filiais: list[int]) -> dict[int, int]:
    if not ids_filiais:
        return {}
    rows = db.execute(
        select(FilialMunicipio.unidade_id, func.count())
        .where(
            FilialMunicipio.unidade_id.in_(ids_filiais),
            FilialMunicipio.ativo.is_(True),
        )
        .group_by(FilialMunicipio.unidade_id)
    ).all()
    return {int(fid): int(n) for fid, n in rows}


def _agregar_por_filial(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    ids_filiais: list[int] | None,
    limit: int | None = None,
    ids_periodo: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Totais por filial: contagens, valores e municípios.

    Se a mesma UASG estiver em duas filiais, a métrica conta em ambas —
    a soma das filiais pode superar o total único do escopo (esperado).
    UASGs/municípios por filial permanecem estruturais (não filtrados por período).

    ``limit`` None = rede completa do escopo (Andamento por filial + tabela).
    """
    if ids_filiais is not None and not ids_filiais:
        return []

    mapa = _mapa_uasg_filiais(db, ids_filiais)
    acc: dict[int, dict[str, Any]] = {}

    # Garante todas as filiais do escopo (mesmo sem UASG/dados).
    if ids_filiais is not None:
        seed_ids = ids_filiais
    else:
        # Plataforma (ACL sem filtro): rede completa de filiais ativas.
        seed_ids = list(
            db.scalars(
                select(Unidade.id).where(
                    Unidade.tipo == "filial",
                    Unidade.ativo.is_(True),
                )
            ).all()
        )
    if seed_ids:
        for u in db.scalars(select(Unidade).where(Unidade.id.in_(seed_ids))).all():
            acc[u.id] = _row_filial_vazia(
                filial_id=u.id,
                filial_nome=u.nome,
                filial_codigo=u.codigo,
            )

    if escopo_uasgs is not None and not escopo_uasgs:
        mun = _municipios_por_filial(db, list(acc.keys()))
        for fid, row in acc.items():
            row["municipios"] = mun.get(fid, 0)
        _aplicar_sede_geo(db, acc)
        rows = sorted(
            acc.values(), key=lambda x: (-int(x["total"]), str(x["filial_nome"]))
        )
        return rows if limit is None else rows[:limit]

    por_uasg = _metricas_por_uasg(db, escopo_uasgs, ids_periodo=ids_periodo)
    uasgs_por_filial: dict[int, set[str]] = {}

    for codigo, filiais in mapa.items():
        m = por_uasg.get(codigo) or {
            "total": 0,
            "homologadas": 0,
            "valor": 0.0,
            "valor_homologado": 0.0,
        }
        for f in filiais:
            fid = int(f["filial_id"])
            if fid not in acc:
                acc[fid] = _row_filial_vazia(
                    filial_id=fid,
                    filial_nome=f["filial_nome"],
                    filial_codigo=f["filial_codigo"],
                )
            acc[fid]["total"] += int(m["total"])
            acc[fid]["homologadas"] += int(m["homologadas"])
            acc[fid]["valor"] = float(
                (
                    Decimal(str(acc[fid]["valor"])) + Decimal(str(m["valor"]))
                ).quantize(Decimal("0.01"))
            )
            acc[fid]["valor_homologado"] = float(
                (
                    Decimal(str(acc[fid]["valor_homologado"]))
                    + Decimal(str(m["valor_homologado"]))
                ).quantize(Decimal("0.01"))
            )
            uasgs_por_filial.setdefault(fid, set()).add(codigo)

    for fid, codes in uasgs_por_filial.items():
        if fid in acc:
            acc[fid]["uasgs"] = len(codes)

    mun = _municipios_por_filial(db, list(acc.keys()))
    for fid, row in acc.items():
        row["municipios"] = mun.get(fid, 0)

    # Cobertura de acompanhamento pessoal por filial (preferência — não ACL).
    from app.acompanhamento.service import cobertura_por_filial

    cob = cobertura_por_filial(
        db,
        ids_filiais=list(acc.keys()),
        escopo_uasgs=escopo_uasgs,
        ids_periodo=ids_periodo,
    )
    for fid, row in acc.items():
        com = int((cob.get(fid) or {}).get("com_acompanhamento") or 0)
        total = int(row["total"])
        row["com_acompanhamento"] = com
        row["sem_acompanhamento"] = max(0, total - com)

    _aplicar_sede_geo(db, acc)

    if not acc:
        return []

    rows = sorted(acc.values(), key=lambda x: (-int(x["total"]), str(x["filial_nome"])))
    return rows if limit is None else rows[:limit]


def _metricas_bucket() -> dict[str, float | int]:
    return {
        "total": 0,
        "homologadas": 0,
        "valor": 0.0,
        "valor_homologado": 0.0,
    }


def _acumular_metricas(
    bucket: dict[str, float | int],
    *,
    estimado: str | None,
    homologado: str | None,
    is_hom: bool,
) -> None:
    bucket["total"] = int(bucket["total"]) + 1
    pe = _parse_valor_br(estimado)
    if pe is not None:
        bucket["valor"] = float(
            (Decimal(str(bucket["valor"])) + pe).quantize(Decimal("0.01"))
        )
    if is_hom:
        bucket["homologadas"] = int(bucket["homologadas"]) + 1
        ph = _parse_valor_br(homologado)
        if ph is not None:
            bucket["valor_homologado"] = float(
                (Decimal(str(bucket["valor_homologado"])) + ph).quantize(
                    Decimal("0.01")
                )
            )


def _ids_com_resultado(db: Session, id_compras: list[str]) -> set[str]:
    if not id_compras:
        return set()
    return set(
        db.scalars(
            select(ResultadoItem.id_compra)
            .where(ResultadoItem.id_compra.in_(id_compras))
            .distinct()
        ).all()
    )


def _top_buckets(
    acc: dict[str, dict[str, float | int]],
    *,
    label_key: str,
    limit: int,
) -> list[dict[str, Any]]:
    rows = sorted(
        acc.items(),
        key=lambda kv: (-int(kv[1]["total"]), str(kv[0])),
    )[:limit]
    out: list[dict[str, Any]] = []
    for label, m in rows:
        out.append(
            {
                label_key: label,
                "total": int(m["total"]),
                "homologadas": int(m["homologadas"]),
                "valor": float(m["valor"]),
                "valor_homologado": float(m["valor_homologado"]),
            }
        )
    return out


def _enriquecer_nomes_uasg(
    db: Session,
    por_uasg: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Anexa ``nome_uasg`` às barras Por UASG (catálogo; fallback unidade_nome).

    In-place + retorno da mesma lista. Código continua a chave; nome é contexto.
    """
    if not por_uasg:
        return por_uasg
    codigos = [str(r["codigo_uasg"]) for r in por_uasg if r.get("codigo_uasg")]
    if not codigos:
        for r in por_uasg:
            r.setdefault("nome_uasg", None)
        return por_uasg

    nomes: dict[str, str | None] = {c: None for c in codigos}
    for cod, nome in db.execute(
        select(Uasg.codigo_uasg, Uasg.nome_uasg).where(Uasg.codigo_uasg.in_(codigos))
    ).all():
        if cod and nome and str(nome).strip():
            nomes[str(cod)] = str(nome).strip()

    faltantes = [c for c, n in nomes.items() if not n]
    if faltantes:
        for cod, nome in db.execute(
            select(
                Contratacao.unidade_compradora,
                func.max(Contratacao.unidade_nome),
            )
            .where(Contratacao.unidade_compradora.in_(faltantes))
            .group_by(Contratacao.unidade_compradora)
        ).all():
            if cod and nome and str(nome).strip():
                nomes[str(cod)] = str(nome).strip()

    for r in por_uasg:
        cod = str(r.get("codigo_uasg") or "")
        r["nome_uasg"] = nomes.get(cod)
    return por_uasg


def _comparativos_contratacao(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    limit: int,
    ids_periodo: set[str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Uma passagem: UASG / modalidade / situação com Contratado × Homologado."""
    if escopo_uasgs is not None and not escopo_uasgs:
        return [], [], []
    if ids_periodo is not None and not ids_periodo:
        return [], [], []

    stmt = select(
        Contratacao.unidade_compradora,
        Contratacao.modalidade_descricao,
        Contratacao.situacao,
        Contratacao.id_compra,
        Contratacao.existe_resultado,
        Contratacao.valor_total_estimado,
        Contratacao.valor_total_homologado,
    )
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    stmt = _where_ids_periodo(stmt, ids_periodo)
    rows = db.execute(stmt).all()
    if not rows:
        return [], [], []

    ids_res = _ids_com_resultado(db, [r[3] for r in rows if r[3]])
    by_uasg: dict[str, dict[str, float | int]] = {}
    by_mod: dict[str, dict[str, float | int]] = {}
    by_sit: dict[str, dict[str, float | int]] = {}

    for codigo, modalidade, situacao, id_compra, existe_res, estimado, homologado in rows:
        is_hom = existe_res is True or (
            id_compra is not None and id_compra in ids_res
        )
        if codigo:
            key_u = str(codigo)
            if key_u not in by_uasg:
                by_uasg[key_u] = _metricas_bucket()
            _acumular_metricas(
                by_uasg[key_u],
                estimado=estimado,
                homologado=homologado,
                is_hom=is_hom,
            )
        key_m = (modalidade or "—").strip() or "—"
        if key_m not in by_mod:
            by_mod[key_m] = _metricas_bucket()
        _acumular_metricas(
            by_mod[key_m],
            estimado=estimado,
            homologado=homologado,
            is_hom=is_hom,
        )
        key_s = (situacao or "—").strip() or "—"
        if key_s not in by_sit:
            by_sit[key_s] = _metricas_bucket()
        _acumular_metricas(
            by_sit[key_s],
            estimado=estimado,
            homologado=homologado,
            is_hom=is_hom,
        )

    return (
        _top_buckets(by_uasg, label_key="codigo_uasg", limit=limit),
        _top_buckets(by_mod, label_key="modalidade", limit=limit),
        _top_buckets(by_sit, label_key="situacao", limit=limit),
    )


_PORTE_CANONICO = {
    "me": "ME",
    "epp": "EPP",
    "demais": "Demais",
    "não informado": "Não informado",
    "nao informado": "Não informado",
}


def _norm_porte(nome: str | None) -> str:
    """Rótulo estável — unifica caixa de portes conhecidos e «Não informado»."""
    s = (nome or "").strip()
    if not s:
        return "Não informado"
    return _PORTE_CANONICO.get(s.casefold(), s)


def _porte_dominante(itens: list[tuple[str, Decimal]]) -> str:
    """Porte predominante da contratação: maior valor de item; empate → mais itens."""
    if not itens:
        return "Não informado"
    soma_valor: dict[str, Decimal] = {}
    soma_qtd: dict[str, int] = {}
    for porte, valor in itens:
        soma_valor[porte] = soma_valor.get(porte, Decimal("0")) + valor
        soma_qtd[porte] = soma_qtd.get(porte, 0) + 1
    if any(v > 0 for v in soma_valor.values()):
        return max(
            soma_valor.keys(),
            key=lambda p: (soma_valor[p], soma_qtd[p], p),
        )
    return max(soma_qtd.keys(), key=lambda p: (soma_qtd[p], p))


def _comparativos_porte(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    limit: int,
    ids_periodo: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Porte por contratação homologada — mesmo universo do KPI.

    - Homologada com 07.3 → 1 porte predominante (por valor dos itens).
    - Homologada sem item 07.3 → «Não informado».
    - ``Σ total`` / ``Σ valor`` = KPIs de homologadas no escopo.
    """
    if escopo_uasgs is not None and not escopo_uasgs:
        return []
    if ids_periodo is not None and not ids_periodo:
        return []

    tem_resultado = exists(
        select(ResultadoItem.id).where(
            ResultadoItem.id_compra == Contratacao.id_compra
        )
    )
    stmt_hom = select(
        Contratacao.id_compra,
        Contratacao.valor_total_homologado,
    ).where(or_(Contratacao.existe_resultado.is_(True), tem_resultado))
    if escopo_uasgs is not None:
        stmt_hom = stmt_hom.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    stmt_hom = _where_ids_periodo(stmt_hom, ids_periodo)

    homologadas = db.execute(stmt_hom).all()
    if not homologadas:
        return []

    id_compras = [r[0] for r in homologadas if r[0]]
    itens_por_compra: dict[str, list[tuple[str, Decimal]]] = {}
    if id_compras:
        for id_compra, porte_nome, valor_item in db.execute(
            select(
                ResultadoItem.id_compra,
                ResultadoItem.porte_fornecedor_nome,
                ResultadoItem.valor_total_homologado,
            ).where(ResultadoItem.id_compra.in_(id_compras))
        ).all():
            if not id_compra:
                continue
            key = str(id_compra)
            itens_por_compra.setdefault(key, []).append(
                (
                    _norm_porte(porte_nome),
                    _parse_valor_br(valor_item) or Decimal("0"),
                )
            )

    acc: dict[str, dict[str, float | int]] = {}
    for id_compra, valor_ctr in homologadas:
        if not id_compra:
            continue
        key = str(id_compra)
        itens = itens_por_compra.get(key) or []
        dominante = _porte_dominante(itens) if itens else "Não informado"
        if dominante not in acc:
            acc[dominante] = {"total": 0, "valor": 0.0}
        acc[dominante]["total"] = int(acc[dominante]["total"]) + 1
        vh = _parse_valor_br(valor_ctr)
        if vh is not None:
            acc[dominante]["valor"] = float(
                (Decimal(str(acc[dominante]["valor"])) + vh).quantize(
                    Decimal("0.01")
                )
            )

    rows = sorted(
        acc.items(),
        key=lambda kv: (-int(kv[1]["total"]), str(kv[0])),
    )[:limit]
    return [
        {
            "porte": label,
            "total": int(m["total"]),
            "valor": float(m["valor"]),
            "serie": "homologado",
            "unidade": "contratacao",
        }
        for label, m in rows
    ]


def comparativos(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    ids_filiais: list[int] | None = None,
    escopo_modo: str | None = None,
    limit: int = 10,
    periodo: PeriodoAplicado | None = None,
) -> dict[str, Any]:
    """Agregações nativas — sem Power BI nem módulos 03/04.

    Lente rede: inclui ``por_filial`` (primeira dimensão gerencial).
    Lente unidade: foco em UASG / modalidade / situação / porte.
    Dimensões de contratação: total/homologadas + valor/valor_homologado.
    ``por_porte`` = homologadas do KPI; 1 porte predominante (ou Não informado).
    """
    periodo = periodo or periodo_tudo()
    ids_periodo = _ids_compra_no_periodo(
        db, escopo_uasgs=escopo_uasgs, periodo=periodo
    )
    lente = lente_de_modo(escopo_modo)
    empty = {
        "por_uasg": [],
        "por_modalidade": [],
        "por_situacao": [],
        "por_porte": [],
        "por_filial": [],
        "lente": lente,
        "escopo_modo": escopo_modo,
        "periodo_aplicado": periodo.to_dict(),
        "power_bi": False,
        "fonte": "sqlite_nativo",
    }
    if escopo_uasgs is not None and not escopo_uasgs:
        # Ainda lista filiais zeradas na lente rede (lista completa do escopo)
        if lente in {LENTE_REDE, LENTE_PLATAFORMA}:
            empty["por_filial"] = _agregar_por_filial(
                db,
                escopo_uasgs=escopo_uasgs,
                ids_filiais=ids_filiais,
                limit=None,
                ids_periodo=ids_periodo,
            )
        return empty

    por_uasg, por_mod, por_sit = _comparativos_contratacao(
        db,
        escopo_uasgs=escopo_uasgs,
        limit=limit,
        ids_periodo=ids_periodo,
    )
    _enriquecer_nomes_uasg(db, por_uasg)
    por_porte = _comparativos_porte(
        db,
        escopo_uasgs=escopo_uasgs,
        limit=limit,
        ids_periodo=ids_periodo,
    )

    # Andamento por filial: rede completa (UI com scroll); top-N só nas outras dims.
    por_filial: list[dict[str, Any]] = []
    if lente in {LENTE_REDE, LENTE_PLATAFORMA}:
        por_filial = _agregar_por_filial(
            db,
            escopo_uasgs=escopo_uasgs,
            ids_filiais=ids_filiais,
            limit=None,
            ids_periodo=ids_periodo,
        )

    return {
        "por_uasg": por_uasg,
        "por_modalidade": por_mod,
        "por_situacao": por_sit,
        "por_porte": por_porte,
        "por_filial": por_filial,
        "lente": lente,
        "escopo_modo": escopo_modo,
        "periodo_aplicado": periodo.to_dict(),
        "power_bi": False,
        "fonte": "sqlite_nativo",
    }


def _stmt_contratacoes_filtradas(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    q: str | None = None,
    codigo_uasg: str | None = None,
    situacao: str | None = None,
    modalidade_codigos: list[str] | None = None,
    processo: str | None = None,
    numero: str | None = None,
    material_ou_servico: str | None = None,
    periodo: PeriodoAplicado | None = None,
    acompanhamento: str | None = None,
    acompanhamento_usuario_id: int | None = None,
    acompanhamento_unidade_ids: list[int] | None = None,
):
    """Select base de contratações no escopo (sem limit/offset). ``None`` = vazio.

    ``acompanhamento``:
    - ``minhas`` | ``sem`` — preferência pessoal (requer ``acompanhamento_usuario_id``)
    - ``com`` | ``sem_resp`` — cobertura da filial (≥1 responsável;
      usa ``acompanhamento_unidade_ids`` quando informado)
    Não altera ACL.
    """
    if escopo_uasgs is not None and not escopo_uasgs:
        return None
    periodo = periodo or periodo_tudo()
    ids_periodo = _ids_compra_no_periodo(
        db, escopo_uasgs=escopo_uasgs, periodo=periodo
    )
    if ids_periodo is not None and not ids_periodo:
        return None
    if codigo_uasg:
        codigo = codigo_uasg.strip()
        if escopo_uasgs is not None and codigo not in escopo_uasgs:
            return None
    stmt = select(Contratacao)
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    stmt = _where_ids_periodo(stmt, ids_periodo)
    if codigo_uasg:
        stmt = stmt.where(Contratacao.unidade_compradora == codigo_uasg.strip())
    if situacao and situacao.strip():
        stmt = stmt.where(Contratacao.situacao == situacao.strip())
    mods = [m.strip() for m in (modalidade_codigos or []) if m and str(m).strip()]
    if mods:
        stmt = stmt.where(Contratacao.modalidade_codigo.in_(mods))
    if processo and processo.strip():
        like_p = f"%{processo.strip()}%"
        stmt = stmt.where(Contratacao.processo.ilike(like_p))
    if numero and numero.strip():
        like_n = f"%{numero.strip()}%"
        stmt = stmt.where(Contratacao.numero.ilike(like_n))
    tipo = (material_ou_servico or "").strip().upper()
    if tipo in ("M", "S"):
        stmt = stmt.where(
            exists(
                select(ItemContratacao.id).where(
                    ItemContratacao.contratacao_id == Contratacao.id,
                    ItemContratacao.material_ou_servico == tipo,
                )
            )
        )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            (Contratacao.objeto.ilike(like))
            | (Contratacao.numero_controle_pncp.ilike(like))
            | (Contratacao.id_compra.ilike(like))
            | (Contratacao.processo.ilike(like))
            | (Contratacao.numero.ilike(like))
        )

    modo_acomp = (acompanhamento or "").strip().lower()
    if modo_acomp in ("minhas", "sem") and acompanhamento_usuario_id is not None:
        from app.database import UsuarioContratacao

        sub_minhas = select(UsuarioContratacao.contratacao_id).where(
            UsuarioContratacao.usuario_id == acompanhamento_usuario_id,
            UsuarioContratacao.ativo.is_(True),
        )
        if modo_acomp == "minhas":
            stmt = stmt.where(Contratacao.id.in_(sub_minhas))
        else:
            stmt = stmt.where(~Contratacao.id.in_(sub_minhas))
    elif modo_acomp in ("com", "sem_resp"):
        from app.acompanhamento.service import subquery_cobertura_ids

        sub_cob = subquery_cobertura_ids(acompanhamento_unidade_ids)
        if modo_acomp == "com":
            stmt = stmt.where(Contratacao.id.in_(sub_cob))
        else:
            stmt = stmt.where(~Contratacao.id.in_(sub_cob))
    return stmt


def contar_contratacoes_escopo(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    q: str | None = None,
    codigo_uasg: str | None = None,
    situacao: str | None = None,
    modalidade_codigos: list[str] | None = None,
    processo: str | None = None,
    numero: str | None = None,
    material_ou_servico: str | None = None,
    periodo: PeriodoAplicado | None = None,
    acompanhamento: str | None = None,
    acompanhamento_usuario_id: int | None = None,
    acompanhamento_unidade_ids: list[int] | None = None,
) -> int:
    """Total de contratações que batem nos filtros (paginação)."""
    stmt = _stmt_contratacoes_filtradas(
        db,
        escopo_uasgs=escopo_uasgs,
        q=q,
        codigo_uasg=codigo_uasg,
        situacao=situacao,
        modalidade_codigos=modalidade_codigos,
        processo=processo,
        numero=numero,
        material_ou_servico=material_ou_servico,
        periodo=periodo,
        acompanhamento=acompanhamento,
        acompanhamento_usuario_id=acompanhamento_usuario_id,
        acompanhamento_unidade_ids=acompanhamento_unidade_ids,
    )
    if stmt is None:
        return 0
    return int(
        db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
        or 0
    )


def listar_contratacoes_escopo(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
    q: str | None = None,
    codigo_uasg: str | None = None,
    situacao: str | None = None,
    modalidade_codigos: list[str] | None = None,
    processo: str | None = None,
    numero: str | None = None,
    material_ou_servico: str | None = None,
    limit: int = 50,
    offset: int = 0,
    periodo: PeriodoAplicado | None = None,
    sort: str | None = None,
    sort_dir: str | None = None,
    acompanhamento: str | None = None,
    acompanhamento_usuario_id: int | None = None,
    acompanhamento_unidade_ids: list[int] | None = None,
) -> list[Contratacao]:
    """Lista contratações do escopo com filtros de domínio e período.

    ``material_ou_servico``: ``M`` ou ``S`` — exige item correspondente.
    Ordenação whitelist (``sort``/``sort_dir``) **antes** de ``offset``/``limit``.
    ``acompanhamento``: ``minhas``|``sem``|``com``|``sem_resp`` — não ACL.
    """
    stmt = _stmt_contratacoes_filtradas(
        db,
        escopo_uasgs=escopo_uasgs,
        q=q,
        codigo_uasg=codigo_uasg,
        situacao=situacao,
        modalidade_codigos=modalidade_codigos,
        processo=processo,
        numero=numero,
        material_ou_servico=material_ou_servico,
        periodo=periodo,
        acompanhamento=acompanhamento,
        acompanhamento_usuario_id=acompanhamento_usuario_id,
        acompanhamento_unidade_ids=acompanhamento_unidade_ids,
    )
    if stmt is None:
        return []
    off = max(0, int(offset or 0))
    lim = max(1, int(limit or 50))
    stmt = stmt.order_by(*_order_by_compras(sort, sort_dir)).offset(off).limit(lim)
    return list(db.scalars(stmt).all())


def facetas_contratacoes_escopo(
    db: Session,
    *,
    escopo_uasgs: list[str] | None,
) -> dict[str, Any]:
    """Opções de filtro no escopo (sem período — universo cadastral disponível)."""
    if escopo_uasgs is not None and not escopo_uasgs:
        return {"uasgs": [], "situacoes": [], "modalidades": []}

    def _escopo(stmt):
        if escopo_uasgs is not None:
            return stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
        return stmt

    uasg_rows = db.execute(
        _escopo(
            select(
                Contratacao.unidade_compradora,
                func.max(Contratacao.unidade_nome),
            )
        )
        .group_by(Contratacao.unidade_compradora)
        .order_by(Contratacao.unidade_compradora)
    ).all()
    uasgs_map = {
        str(cod): (nome or "").strip() or None for cod, nome in uasg_rows if cod
    }
    if escopo_uasgs is not None:
        for cod in escopo_uasgs:
            uasgs_map.setdefault(str(cod), None)
        faltantes = [c for c, n in uasgs_map.items() if not n]
        if faltantes:
            for cod, nome in db.execute(
                select(Uasg.codigo_uasg, Uasg.nome_uasg).where(
                    Uasg.codigo_uasg.in_(faltantes)
                )
            ).all():
                if cod and nome:
                    uasgs_map[str(cod)] = nome

    situacoes = [
        s
        for (s,) in db.execute(
            _escopo(
                select(Contratacao.situacao)
                .where(Contratacao.situacao.is_not(None))
                .where(Contratacao.situacao != "")
            )
            .distinct()
            .order_by(Contratacao.situacao)
        ).all()
        if s
    ]

    modalidades = [
        {"codigo": str(cod), "nome": (nome or "").strip() or str(cod)}
        for cod, nome in db.execute(
            _escopo(
                select(
                    Contratacao.modalidade_codigo,
                    func.max(Contratacao.modalidade_descricao),
                )
                .where(Contratacao.modalidade_codigo.is_not(None))
                .where(Contratacao.modalidade_codigo != "")
            )
            .group_by(Contratacao.modalidade_codigo)
            .order_by(Contratacao.modalidade_codigo)
        ).all()
        if cod
    ]

    return {
        "uasgs": [
            {"codigo": cod, "nome": uasgs_map.get(cod)}
            for cod in sorted(uasgs_map.keys())
        ],
        "situacoes": situacoes,
        "modalidades": modalidades,
    }
