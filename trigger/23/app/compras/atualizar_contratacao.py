"""Atualização pontual de uma contratação a partir da API Compras.gov / PNCP."""

from __future__ import annotations

from datetime import date
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.compras.coletor_resultados import coletar_resultados, resultado_para_db
from app.compras.repository import (
    ensure_fornecedor_stub,
    upsert_contratacao,
    upsert_item,
    upsert_resultado,
    vincular_fornecedores_resultados,
)
from app.compras_pncp import (
    coletar_contratacao,
    coletar_itens_contratacao,
    item_itens_para_db,
    item_para_db,
)
from app.database import CompraContratacao, CompraContratacaoItem, ComprasFornecedor


def atualizar_contratacao_da_api(
    db: Session,
    cid: int,
    *,
    on_log: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """
    Reconsulta a API federal para uma contratação já persistida.

    Preserva campos manuais (observador_id). Atualiza cabeçalho, itens e
    resultados homologados daquela contratação apenas.
    """
    log = on_log or (lambda _: None)
    row = db.scalar(
        select(CompraContratacao)
        .options(selectinload(CompraContratacao.observador))
        .where(CompraContratacao.id == cid)
    )
    if not row:
        raise LookupError("Contratação não encontrada")

    id_compra = (row.id_compra or row.chave_compra or "").strip() or None
    numero_pncp = (row.numero_controle_pncp or row.id_contratacao_pncp or "").strip() or None
    if not id_compra and not numero_pncp:
        raise ValueError(
            "Contratação sem id_compra nem número de controle PNCP — "
            "não é possível atualizar pela API"
        )

    log(f"Atualizando contratação #{cid} pela API Compras.gov…")
    item_api = coletar_contratacao(
        numero_controle_pncp=numero_pncp,
        id_compra=id_compra,
        on_log=log,
    )
    if not item_api:
        raise LookupError(
            "API Compras.gov não retornou esta contratação "
            f"(pncp={numero_pncp or '—'}, idCompra={id_compra or '—'})"
        )

    data = item_para_db(item_api)
    contratacao, criada = upsert_contratacao(db, data)
    # Garante o mesmo registro aberto no detalhe (id local estável).
    if contratacao.id != cid:
        raise RuntimeError(
            "A API retornou outra chave de compra do que a contratação local — "
            "atualização abortada para não misturar registros"
        )

    id_compra_sync = contratacao.id_compra or id_compra
    numero_pncp_sync = contratacao.numero_controle_pncp or numero_pncp

    itens_api = coletar_itens_contratacao(
        numero_controle_pncp=numero_pncp_sync,
        id_compra=id_compra_sync,
        on_log=log,
    )
    itens_novos = itens_atualizados = 0
    for it in itens_api:
        _, criado_item = upsert_item(
            db, item_itens_para_db(it, contratacao_id=contratacao.id)
        )
        if criado_item:
            itens_novos += 1
        else:
            itens_atualizados += 1

    mapa_itens = {
        r.id_compra_item: r.id
        for r in db.scalars(
            select(CompraContratacaoItem).where(
                CompraContratacaoItem.contratacao_id == contratacao.id
            )
        ).all()
        if r.id_compra_item
    }
    # Inclui itens pelo id_compra (caso vínculo contratacao_id ainda ausente).
    if id_compra_sync:
        for r in db.scalars(
            select(CompraContratacaoItem).where(
                CompraContratacaoItem.id_compra == id_compra_sync
            )
        ).all():
            if r.id_compra_item:
                mapa_itens.setdefault(r.id_compra_item, r.id)

    mapa_forn = {
        r.ni_fornecedor: r.id
        for r in db.scalars(select(ComprasFornecedor)).all()
        if r.ni_fornecedor
    }

    resultados: list = []
    res_novos = res_atualizados = stubs_novos = 0
    if id_compra_sync:
        hoje = date.today()
        resultados = coletar_resultados(
            data_inicial=hoje,
            data_final=hoje,
            id_compras=[id_compra_sync],
            on_log=log,
        )
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
        _, criado_res = upsert_resultado(
            db,
            resultado_para_db(
                res,
                contratacao_item_id=mapa_itens.get(res.id_compra_item),
                fornecedor_id=forn_id,
            ),
        )
        if criado_res:
            res_novos += 1
        else:
            res_atualizados += 1

    vinculados = vincular_fornecedores_resultados(db)
    db.commit()
    db.refresh(contratacao)

    contadores = {
        "contratacao_criada": criada,
        "itens_total": len(itens_api),
        "itens_novos": itens_novos,
        "itens_atualizados": itens_atualizados,
        "resultados_total": len(resultados),
        "resultados_novos": res_novos,
        "resultados_atualizados": res_atualizados,
        "fornecedores_stub_novos": stubs_novos,
        "resultados_vinculados": vinculados,
        "id_compra": id_compra_sync,
        "numero_controle_pncp": numero_pncp_sync,
    }
    log(
        f"  OK — itens {itens_novos}+{itens_atualizados}, "
        f"resultados {res_novos}+{res_atualizados}"
    )
    return {"contratacao": contratacao, "contadores": contadores}
