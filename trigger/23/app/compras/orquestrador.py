"""Pipeline de sincronização Compras.gov por níveis de dependência."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.compras.coletor_catalogo import enrich_catalogo
from app.compras.coletor_fornecedor import enrich_fornecedores, listar_pendentes_compras_gov
from app.compras.coletor_pgc import coletar_pgc
from app.compras.coletor_preco import coletar_precos_item
from app.compras.coletor_resultados import coletar_resultados, resultado_para_db
from app.compras.coletor_uasg import coletar_orgaos, coletar_uasgs
from app.compras.normalizers import tipo_item_catalogo
from app.compras.repository import (
    ensure_fornecedor_stub,
    registrar_sync_meta,
    upsert_catalogo,
    upsert_fornecedor,
    upsert_orgao,
    upsert_pgc,
    upsert_preco,
    upsert_resultado,
    upsert_uasg,
    vincular_fornecedores_resultados,
    vincular_uasg_contratacoes,
)
from app.compras_pncp import coletar, coletar_itens, item_itens_para_db, item_para_db
from app.config import (
    COMPRAS_COLETAR_PGC,
    COMPRAS_COLETAR_PRECO,
    COMPRAS_ENRICH_CATALOGO,
    COMPRAS_ENRICH_FORNECEDOR,
)
from app.database import (
    COMPRAS_CAMPOS_PRESERVADOS_SYNC,
    CompraContratacao,
    CompraContratacaoItem,
    ComprasFornecedor,
    ComprasItemCatalogo,
    SessionLocal,
)
from app.unidades_compradoras import obter_unidades_compradoras


@dataclass
class PipelineResult:
    contadores: dict[str, Any] = field(default_factory=dict)
    fase_atual: str = "idle"


def _mapa_itens(db: Session) -> dict[str, int]:
    return {
        row.id_compra_item: row.id
        for row in db.scalars(select(CompraContratacaoItem)).all()
    }


def _mapa_fornecedores(db: Session) -> dict[str, int]:
    return {
        row.ni_fornecedor: row.id
        for row in db.scalars(select(ComprasFornecedor)).all()
    }


def _persistir_contratacoes_e_itens(
    db: Session,
    *,
    data_inicial: date,
    data_final: date,
    unidades: list[str] | None,
    modalidades: list[int] | None,
    ano: int | None,
    on_log: Callable[[str], None],
    on_fase: Callable[[str], None],
) -> dict[str, Any]:
    from app.database import CompraContratacao as CC

    items = coletar(
        data_inicial=data_inicial,
        data_final=data_final,
        unidades=unidades,
        modalidades=modalidades,
        ano=ano,
        on_log=on_log,
        on_fase=on_fase,
    )
    novos = atualizados = 0
    mapa_contratacoes: dict[str, int] = {}
    for item in items:
        existing = db.scalar(select(CC).where(CC.id_compra == item.id_compra))
        if not existing:
            existing = db.scalar(select(CC).where(CC.chave_compra == item.id_compra))
        data = item_para_db(item)
        data["coletado_em"] = __import__("datetime").datetime.utcnow()
        if existing:
            for k, v in data.items():
                if k in COMPRAS_CAMPOS_PRESERVADOS_SYNC:
                    continue
                setattr(existing, k, v)
            atualizados += 1
            mapa_contratacoes[item.id_compra] = existing.id
        else:
            row = CC(**data)
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
    itens_novos = itens_atualizados = 0
    for chave, cid in db.execute(
        select(CompraContratacao.id_compra, CompraContratacao.id).where(
            CompraContratacao.id_compra.isnot(None)
        )
    ):
        if chave:
            mapa_contratacoes[chave] = cid
    for item in itens:
        existing = db.scalar(
            select(CompraContratacaoItem).where(
                CompraContratacaoItem.id_compra_item == item.id_compra_item
            )
        )
        data = item_itens_para_db(
            item, contratacao_id=mapa_contratacoes.get(item.id_compra)
        )
        data["coletado_em"] = __import__("datetime").datetime.utcnow()
        if existing:
            for k, v in data.items():
                setattr(existing, k, v)
            itens_atualizados += 1
        else:
            db.add(CompraContratacaoItem(**data))
            itens_novos += 1
    db.commit()
    return {
        "contratacoes_total": len(items),
        "contratacoes_novos": novos,
        "contratacoes_atualizados": atualizados,
        "itens_total": len(itens),
        "itens_novos": itens_novos,
        "itens_atualizados": itens_atualizados,
    }


def _persistir_resultados(
    db: Session,
    *,
    data_inicial: date,
    data_final: date,
    unidades: list[str] | None,
    on_log: Callable[[str], None],
    on_fase: Callable[[str], None],
) -> dict[str, int]:
    mapa_itens = _mapa_itens(db)
    mapa_forn = _mapa_fornecedores(db)
    resultados = coletar_resultados(
        data_inicial=data_inicial,
        data_final=data_final,
        unidades=unidades,
        on_log=on_log,
        on_fase=on_fase,
    )
    novos = atualizados = stubs_novos = 0
    for res in resultados:
        forn_id = None
        if res.ni_fornecedor:
            forn_id = mapa_forn.get(res.ni_fornecedor)
            if not forn_id:
                stub, criado_stub = ensure_fornecedor_stub(
                    db,
                    res.ni_fornecedor,
                    nome=res.nome_razao_social_fornecedor,
                )
                forn_id = stub.id
                mapa_forn[res.ni_fornecedor] = forn_id
                if criado_stub:
                    stubs_novos += 1
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
    vinculados = vincular_fornecedores_resultados(db)
    db.commit()
    if stubs_novos:
        on_log(f"  Fornecedores stub (NI do resultado): {stubs_novos} novo(s)")
    return {
        "resultados_total": len(resultados),
        "resultados_novos": novos,
        "resultados_atualizados": atualizados,
        "fornecedores_stub_novos": stubs_novos,
        "resultados_vinculados": vinculados,
    }


def executar_pipeline(
    *,
    fases: list[str] | None = None,
    data_inicial: date,
    data_final: date,
    unidades: list[str] | None = None,
    modalidades: list[int] | None = None,
    ano: int | None = None,
    ano_pgc: int | None = None,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
) -> PipelineResult:
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)
    alvo = set(fases or ["07", "07-resultados"])
    out = PipelineResult()

    db = SessionLocal()
    try:
        unidades_alvo = unidades or list(obter_unidades_compradoras(db).keys())
        if "05" in alvo:
            fase("sync_uasg_orgao")
            orgaos_map: dict[int, int] = {}
            try:
                for raw in coletar_orgaos(on_log=log, on_fase=fase):
                    row, criado = upsert_orgao(db, raw)
                    orgaos_map[row.codigo_orgao] = row.id
                    out.contadores["orgaos_novos" if criado else "orgaos_atualizados"] = (
                        out.contadores.get("orgaos_novos" if criado else "orgaos_atualizados", 0) + 1
                    )
            except Exception as exc:  # noqa: BLE001 — dimensão auxiliar; não aborta 07
                log(f"⚠ Órgãos (05): {exc} — seguindo com UASGs/contratações")
                out.contadores["orgaos_erro"] = 1
            try:
                for raw in coletar_uasgs(unidades=unidades_alvo, on_log=log, on_fase=fase):
                    cod_org = raw.pop("_codigo_orgao", None)
                    if cod_org is not None:
                        raw["orgao_id"] = orgaos_map.get(cod_org)
                    _, criado = upsert_uasg(db, raw)
                    out.contadores["uasgs_novos" if criado else "uasgs_atualizados"] = (
                        out.contadores.get("uasgs_novos" if criado else "uasgs_atualizados", 0) + 1
                    )
            except Exception as exc:  # noqa: BLE001
                log(f"⚠ UASGs (05): {exc} — seguindo com contratações")
                out.contadores["uasgs_erro"] = 1
            db.commit()
            vinc = vincular_uasg_contratacoes(db)
            db.commit()
            out.contadores["contratacoes_uasg_vinculadas"] = vinc
            registrar_sync_meta(db, "05", out.contadores)
            db.commit()

        if "04" in alvo or COMPRAS_COLETAR_PGC:
            fase("sync_pgc")
            ano_p = ano_pgc or ano or data_final.year
            for raw in coletar_pgc(ano=ano_p, on_log=log, on_fase=fase):
                _, criado = upsert_pgc(db, raw)
                out.contadores["pgc_novos" if criado else "pgc_atualizados"] = (
                    out.contadores.get("pgc_novos" if criado else "pgc_atualizados", 0) + 1
                )
            db.commit()
            registrar_sync_meta(db, "04", out.contadores)
            db.commit()

        if "07" in alvo:
            fase("sync_contratacoes")
            stats = _persistir_contratacoes_e_itens(
                db,
                data_inicial=data_inicial,
                data_final=data_final,
                unidades=unidades_alvo,
                modalidades=modalidades,
                ano=ano,
                on_log=log,
                on_fase=fase,
            )
            out.contadores.update(stats)
            registrar_sync_meta(db, "07", stats)
            db.commit()

        if "07-resultados" in alvo:
            fase("sync_resultados")
            try:
                stats = _persistir_resultados(
                    db,
                    data_inicial=data_inicial,
                    data_final=data_final,
                    unidades=unidades_alvo,
                    on_log=log,
                    on_fase=fase,
                )
                out.contadores.update(stats)
                registrar_sync_meta(db, "07-resultados", stats)
                db.commit()
            except Exception as exc:  # noqa: BLE001 — não aborta enriquecimento
                log(f"⚠ Resultados (07): {exc} — seguindo com demais fases")
                out.contadores["resultados_erro"] = 1
                db.rollback()

        if "10" in alvo and COMPRAS_ENRICH_FORNECEDOR:
            fase("enrich_fornecedores")
            try:
                # Pendentes = sem snapshot módulo 10 (stubs 07.3 e só-CNPJ continuam na fila).
                pendentes = listar_pendentes_compras_gov(db)
                log(f"  Fornecedores pendentes de enriquecimento (módulo 10): {len(pendentes)}")
                for raw in enrich_fornecedores(pendentes, on_log=log, on_fase=fase):
                    _, criado = upsert_fornecedor(db, raw)
                    out.contadores[
                        "fornecedores_novos" if criado else "fornecedores_atualizados"
                    ] = (
                        out.contadores.get(
                            "fornecedores_novos" if criado else "fornecedores_atualizados",
                            0,
                        )
                        + 1
                    )
                vinculados = vincular_fornecedores_resultados(db)
                out.contadores["resultados_vinculados_pos_10"] = vinculados
                db.commit()
                registrar_sync_meta(db, "10", out.contadores)
                db.commit()
            except Exception as exc:  # noqa: BLE001
                log(f"⚠ Fornecedores (10): {exc} — seguindo com demais fases")
                out.contadores["fornecedores_erro"] = 1
                db.rollback()

        if ("01" in alvo or "02" in alvo) and COMPRAS_ENRICH_CATALOGO:
            fase("enrich_catalogo")
            try:
                codigos = {
                    (r.cod_item_catalogo, r.material_ou_servico)
                    for r in db.scalars(select(CompraContratacaoItem))
                    if r.cod_item_catalogo
                }
                existentes = {
                    (c.tipo_item, c.codigo_item_catalogo)
                    for c in db.scalars(select(ComprasItemCatalogo))
                }
                pendentes = [
                    (c, m)
                    for c, m in codigos
                    if (tipo_item_catalogo(m or "M"), c) not in existentes
                ]
                log(f"  Catálogo pendente de enriquecimento (módulos 01/02): {len(pendentes)}")
                for raw in enrich_catalogo(pendentes, on_log=log, on_fase=fase):
                    row, criado = upsert_catalogo(db, raw)
                    out.contadores[
                        "catalogo_novos" if criado else "catalogo_atualizados"
                    ] = (
                        out.contadores.get(
                            "catalogo_novos" if criado else "catalogo_atualizados",
                            0,
                        )
                        + 1
                    )
                    for item_row in db.scalars(
                        select(CompraContratacaoItem).where(
                            CompraContratacaoItem.cod_item_catalogo
                            == row.codigo_item_catalogo
                        )
                    ):
                        if (
                            tipo_item_catalogo(item_row.material_ou_servico or "M")
                            == row.tipo_item
                        ):
                            item_row.item_catalogo_id = row.id
                db.commit()
                registrar_sync_meta(db, "01-02", out.contadores)
                db.commit()
            except Exception as exc:  # noqa: BLE001 — não aborta o restante do pipeline
                log(f"⚠ Catálogo (01/02): {exc} — seguindo com demais fases")
                out.contadores["catalogo_erro"] = 1
                db.rollback()

        if "03" in alvo or COMPRAS_COLETAR_PRECO:
            fase("sync_precos")
            precos_novos = 0
            for item_row in db.scalars(
                select(CompraContratacaoItem).where(
                    CompraContratacaoItem.cod_item_catalogo.isnot(None)
                ).limit(50)
            ):
                contr = db.scalar(
                    select(CompraContratacao).where(
                        CompraContratacao.id_compra == item_row.id_compra
                    )
                )
                if not contr:
                    continue
                for raw in coletar_precos_item(
                    codigo_item_catalogo=item_row.cod_item_catalogo,
                    codigo_uasg=contr.unidade_compradora,
                    material_ou_servico=item_row.material_ou_servico,
                    data_inicio=data_inicial,
                    data_fim=data_final,
                    on_log=log,
                ):
                    _, criado = upsert_preco(db, raw)
                    if criado:
                        precos_novos += 1
            db.commit()
            out.contadores["precos_novos"] = precos_novos
            registrar_sync_meta(db, "03", out.contadores)
            db.commit()

    finally:
        db.close()
        fase("idle")

    return out
