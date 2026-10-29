"""Sync módulo 07 — contratações → itens → resultados por UASG (mockável)."""

from __future__ import annotations

from datetime import date
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.compras.client import ComprasGovClient
from app.compras.normalizers import (
    contratacao_da_api,
    item_da_api,
    normalizar_codigo_uasg,
    resultado_da_api,
)
from app.compras.repository import (
    garantir_uasg_id,
    upsert_contratacao,
    upsert_fornecedor,
    upsert_item,
    upsert_resultado,
)
from app.config import (
    COMPRAS_PNCP_ENDPOINT,
    COMPRAS_PNCP_ITENS_ID_ENDPOINT,
    COMPRAS_PNCP_PAGE_SIZE,
    COMPRAS_RESULTADOS_ENDPOINT,
    MODALIDADES_COMPRAS,
)
from app.database import Contratacao, ItemContratacao


def sincronizar_contratacoes_uasg(
    db: Session,
    *,
    codigo_uasg: str,
    data_inicial: date,
    data_final: date,
    client: ComprasGovClient | None = None,
    on_log: Callable[[str], None] | None = None,
    contratacoes: list[dict[str, Any]] | None = None,
    itens: list[dict[str, Any]] | None = None,
    resultados: list[dict[str, Any]] | None = None,
    modalidades: list[int] | None = None,
    incluir_itens: bool = True,
    incluir_resultados: bool = True,
) -> dict[str, Any]:
    """Persiste contratações/itens/resultados da UASG no período.

    Listas ``contratacoes`` / ``itens`` / ``resultados`` injetam payload (testes)
    sem HTTP. Sem injeção, consulta a API Dados Abertos.
    """
    log = on_log or (lambda _: None)
    codigo = normalizar_codigo_uasg(codigo_uasg)
    if not codigo:
        raise ValueError("codigo_uasg inválido.")
    if data_final < data_inicial:
        raise ValueError("data_final anterior a data_inicial.")

    uasg_id = garantir_uasg_id(db, codigo)
    cont = {"contratacoes": 0, "contratacoes_novas": 0, "itens": 0, "itens_novos": 0}
    cont.update({"resultados": 0, "resultados_novos": 0, "fornecedores": 0})

    # --- Contratações ---
    if contratacoes is not None:
        fonte_c = contratacoes
    else:
        fonte_c = _fetch_contratacoes(
            client=client,
            codigo=codigo,
            data_inicial=data_inicial,
            data_final=data_final,
            modalidades=modalidades or list(MODALIDADES_COMPRAS.keys()),
            on_log=log,
        )

    ids_compra: list[str] = []
    for raw in fonte_c:
        item = contratacao_da_api(raw)
        if not item:
            continue
        if item["unidade_compradora"] != codigo:
            continue
        row, nova = upsert_contratacao(db, item, uasg_id=uasg_id)
        cont["contratacoes"] += 1
        if nova:
            cont["contratacoes_novas"] += 1
        ids_compra.append(row.id_compra)

    db.flush()
    log(f"Contratações UASG {codigo}: {cont['contratacoes']} ({cont['contratacoes_novas']} novas)")

    # --- Itens ---
    if incluir_itens:
        if itens is not None:
            fonte_i = itens
        else:
            fonte_i = _fetch_itens_por_compras(
                client=client,
                ids_compra=ids_compra,
                on_log=log,
            )
        mapa_c = {
            c.id_compra: c.id
            for c in db.scalars(
                select(Contratacao).where(Contratacao.id_compra.in_(ids_compra or [""]))
            ).all()
        }
        for raw in fonte_i:
            item = item_da_api(raw)
            if not item:
                continue
            cid = mapa_c.get(item["id_compra"])
            row, nova = upsert_item(db, item, contratacao_id=cid)
            cont["itens"] += 1
            if nova:
                cont["itens_novos"] += 1
        db.flush()
        log(f"Itens: {cont['itens']} ({cont['itens_novos']} novos)")

    # --- Resultados ---
    if incluir_resultados:
        if resultados is not None:
            fonte_r = resultados
        else:
            fonte_r = _fetch_resultados(
                client=client,
                codigo=codigo,
                data_inicial=data_inicial,
                data_final=data_final,
                on_log=log,
            )
        mapa_i = {
            i.id_compra_item: i.id
            for i in db.scalars(select(ItemContratacao)).all()
        }
        for raw in fonte_r:
            item = resultado_da_api(raw)
            if not item:
                continue
            forn_id = None
            if item.get("ni_fornecedor"):
                forn = upsert_fornecedor(
                    db,
                    ni=item["ni_fornecedor"],
                    razao_social=item.get("nome_razao_social_fornecedor"),
                    porte=item.get("porte_fornecedor_nome"),
                )
                forn_id = forn.id
                cont["fornecedores"] += 1
            row, nova = upsert_resultado(
                db,
                item,
                item_id=mapa_i.get(item["id_compra_item"]),
                fornecedor_id=forn_id,
            )
            cont["resultados"] += 1
            if nova:
                cont["resultados_novos"] += 1
        log(f"Resultados: {cont['resultados']} ({cont['resultados_novos']} novos)")

    db.commit()
    return {
        "ok": True,
        "codigo_uasg": codigo,
        "uasg_id": uasg_id,
        "data_inicial": data_inicial.isoformat(),
        "data_final": data_final.isoformat(),
        **cont,
    }


def _owns_client(client: ComprasGovClient | None) -> tuple[ComprasGovClient, bool]:
    if client is not None:
        return client, False
    return ComprasGovClient(), True


def _fetch_contratacoes(
    *,
    client: ComprasGovClient | None,
    codigo: str,
    data_inicial: date,
    data_final: date,
    modalidades: list[int],
    on_log: Callable[[str], None],
) -> list[dict[str, Any]]:
    cli, owns = _owns_client(client)
    out: list[dict[str, Any]] = []
    try:
        for mod in modalidades:
            on_log(f"API contratações UASG {codigo} modalidade {mod}")
            for raw in cli.paginar(
                COMPRAS_PNCP_ENDPOINT,
                params_base={
                    "unidadeOrgaoCodigoUnidade": codigo,
                    "dataPublicacaoPncpInicial": data_inicial.isoformat(),
                    "dataPublicacaoPncpFinal": data_final.isoformat(),
                    "codigoModalidade": mod,
                },
                contexto="API PNCP contratações",
                tamanho_pagina=COMPRAS_PNCP_PAGE_SIZE,
            ):
                out.append(raw)
    finally:
        if owns:
            cli.close()
    return out


def _fetch_itens_por_compras(
    *,
    client: ComprasGovClient | None,
    ids_compra: list[str],
    on_log: Callable[[str], None],
) -> list[dict[str, Any]]:
    if not ids_compra:
        return []
    cli, owns = _owns_client(client)
    out: list[dict[str, Any]] = []
    try:
        for id_compra in ids_compra:
            on_log(f"API itens idCompra {id_compra}")
            data = cli.get_json(
                COMPRAS_PNCP_ITENS_ID_ENDPOINT,
                params={"codigo": id_compra, "tipo": "idCompra"},
                contexto="API PNCP itens (id)",
            )
            regs = data.get("resultado") or []
            if isinstance(regs, dict):
                regs = [regs]
            for raw in regs if isinstance(regs, list) else []:
                if isinstance(raw, dict):
                    out.append(raw)
    finally:
        if owns:
            cli.close()
    return out


def _fetch_resultados(
    *,
    client: ComprasGovClient | None,
    codigo: str,
    data_inicial: date,
    data_final: date,
    on_log: Callable[[str], None],
) -> list[dict[str, Any]]:
    cli, owns = _owns_client(client)
    out: list[dict[str, Any]] = []
    try:
        on_log(f"API resultados UASG {codigo}")
        for raw in cli.paginar(
            COMPRAS_RESULTADOS_ENDPOINT,
            params_base={
                "unidadeOrgaoCodigoUnidade": codigo,
                "dataResultadoPncpInicial": data_inicial.isoformat(),
                "dataResultadoPncpFinal": data_final.isoformat(),
            },
            contexto="API PNCP resultados",
            tamanho_pagina=COMPRAS_PNCP_PAGE_SIZE,
        ):
            out.append(raw)
    finally:
        if owns:
            cli.close()
    return out
