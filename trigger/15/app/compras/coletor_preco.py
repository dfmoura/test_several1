"""Coletor pesquisa de preço — módulo 03 (sob demanda)."""

from __future__ import annotations

import json
import time
from datetime import date
from typing import Any, Callable

from app.compras.client import ComprasGovClient
from app.compras.normalizers import (
    fmt_num_br,
    fmt_valor_br,
    normalizar_codigo_uasg,
    normalizar_id_compra,
    normalizar_ni,
    tipo_item_catalogo,
)
from app.config import (
    COMPRAS_IBGE_MUNICIPIO,
    COMPRAS_PNCP_PAGE_SIZE,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
    COMPRAS_PRECO_MATERIAL_ENDPOINT,
    COMPRAS_PRECO_SERVICO_ENDPOINT,
)


def preco_da_api(raw: dict[str, Any], *, tipo: str) -> dict[str, Any] | None:
    id_item = normalizar_id_compra(raw.get("idItemCompra"))
    if not id_item:
        return None
    return {
        "tipo_item": tipo,
        "id_item_compra": id_item,
        "id_compra": normalizar_id_compra(raw.get("idCompra")),
        "codigo_item_catalogo": int(raw["codigoItemCatalogo"])
        if raw.get("codigoItemCatalogo") is not None
        else None,
        "codigo_uasg": normalizar_codigo_uasg(raw.get("codigoUasg")),
        "preco_unitario": fmt_valor_br(raw.get("precoUnitario")),
        "quantidade": fmt_num_br(raw.get("quantidade")),
        "data_compra": str(raw.get("dataCompra") or "") or None,
        "data_resultado": str(raw.get("dataResultado") or "") or None,
        "modalidade": str(raw.get("modalidade") or "") or None,
        "municipio": str(raw.get("municipio") or "") or None,
        "estado": str(raw.get("estado") or "") or None,
        "nome_fornecedor": str(raw.get("nomeFornecedor") or "") or None,
        "ni_fornecedor": normalizar_ni(raw.get("niFornecedor")),
        "dados_preco_json": json.dumps(raw, ensure_ascii=False),
    }


def coletar_precos_item(
    *,
    codigo_item_catalogo: int,
    codigo_uasg: str,
    material_ou_servico: str | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    on_log: Callable[[str], None] | None = None,
) -> list[dict[str, Any]]:
    log = on_log or (lambda _: None)
    tipo = tipo_item_catalogo(material_ou_servico or "M")
    endpoint = COMPRAS_PRECO_MATERIAL_ENDPOINT if tipo == "Material" else COMPRAS_PRECO_SERVICO_ENDPOINT
    vistos: set[tuple] = set()
    resultado: list[dict[str, Any]] = []

    params_base: dict[str, Any] = {
        "codigoItemCatalogo": codigo_item_catalogo,
        "codigoUasg": codigo_uasg,
        "codigoMunicipio": COMPRAS_IBGE_MUNICIPIO,
    }
    if data_inicio:
        params_base["dataCompraInicio"] = data_inicio.isoformat()
    if data_fim:
        params_base["dataCompraFim"] = data_fim.isoformat()

    with ComprasGovClient(on_log=log) as client:
        log(f"  Preços {tipo} item {codigo_item_catalogo} UASG {codigo_uasg}")
        for raw in client.paginar(
            endpoint,
            params_base=params_base,
            contexto=f"Pesquisa preço {tipo}",
            tamanho_pagina=COMPRAS_PNCP_PAGE_SIZE,
        ):
            item = preco_da_api(raw, tipo=tipo)
            if not item:
                continue
            chave = (
                item["tipo_item"],
                item["id_item_compra"],
                item.get("id_compra"),
                item.get("ni_fornecedor"),
                item.get("data_compra"),
            )
            if chave in vistos:
                continue
            vistos.add(chave)
            resultado.append(item)
        time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)

    return resultado
