"""Coletor PGC — módulo 04."""

from __future__ import annotations

import json
import time
from typing import Any, Callable

from app.compras.client import ComprasGovClient
from app.compras.normalizers import fmt_num_br, fmt_valor_br, normalizar_codigo_uasg, normalizar_ni
from app.config import (
    COMPRAS_PGC_DETALHE_ENDPOINT,
    COMPRAS_PNCP_PAGE_SIZE,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
)
from app.origem_sistema import resolver_orgaos_cnpj


def pgc_da_api(raw: dict[str, Any]) -> dict[str, Any] | None:
    orgao = normalizar_ni(raw.get("orgao"))
    if not orgao:
        return None
    ano = raw.get("anoPcaProjetoCompra")
    try:
        ano_int = int(ano) if ano is not None else None
    except (TypeError, ValueError):
        return None
    if ano_int is None:
        return None
    cod_item = raw.get("codigoItemCatalogo")
    return {
        "orgao": orgao,
        "ano_pca_projeto_compra": ano_int,
        "codigo_uasg": normalizar_codigo_uasg(raw.get("codigoUasg")),
        "tipo_item": str(raw.get("tipoItem") or "") or None,
        "codigo_item_catalogo": int(cod_item) if cod_item is not None else None,
        "numero_item_pncp": int(raw["numeroItemPncp"])
        if raw.get("numeroItemPncp") is not None
        else None,
        "ordem_dfd": int(raw["ordemDfd"]) if raw.get("ordemDfd") is not None else None,
        "descricao_item_catalogo": str(raw.get("descricaoItemCatalogo") or "") or None,
        "quantidade_item": fmt_num_br(raw.get("quantidadeItem")),
        "valor_unitario_item": fmt_valor_br(raw.get("valorUnitarioItem")),
        "valor_total_item": fmt_valor_br(raw.get("valorTotalItem")),
        "titulo_projeto_compra": str(raw.get("tituloProjetoCompra") or "") or None,
        "descricao_objeto_dfd": str(raw.get("descricaoObjetoDfd") or "") or None,
        "data_hora_publicacao_pncp": str(raw.get("dataHoraPublicacaoPncp") or "") or None,
        "status_contratacao_execucao": str(raw.get("statusContratacaoExecucao") or "") or None,
        "dados_pgc_json": json.dumps(raw, ensure_ascii=False),
    }


def coletar_pgc(
    *,
    ano: int,
    orgaos: list[str] | None = None,
    codigo_uasg: str | None = None,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
) -> list[dict[str, Any]]:
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)
    alvo = [normalizar_ni(c) for c in (orgaos or resolver_orgaos_cnpj()) if c]
    vistos: set[tuple] = set()
    resultado: list[dict[str, Any]] = []

    with ComprasGovClient(on_log=log) as client:
        fase("coletando_pgc")
        for orgao in alvo:
            if not orgao:
                continue
            log(f"  PGC {orgao} / {ano}")
            params: dict[str, Any] = {
                "orgao": orgao,
                "anoPcaProjetoCompra": ano,
                "pagina": 1,
                "tamanhoPagina": COMPRAS_PNCP_PAGE_SIZE,
            }
            if codigo_uasg:
                params["codigoUasg"] = codigo_uasg

            pagina = 1
            total_paginas = 1
            while pagina <= total_paginas:
                params["pagina"] = pagina
                data = client.get_json(
                    COMPRAS_PGC_DETALHE_ENDPOINT,
                    params=params,
                    contexto="API PGC",
                )
                total_paginas = int(data.get("totalPaginas") or 1)
                for raw in data.get("resultado") or []:
                    if not isinstance(raw, dict):
                        continue
                    item = pgc_da_api(raw)
                    if not item:
                        continue
                    chave = (
                        item["orgao"],
                        item["ano_pca_projeto_compra"],
                        item.get("codigo_uasg"),
                        item.get("codigo_item_catalogo"),
                        item.get("numero_item_pncp"),
                        item.get("ordem_dfd"),
                    )
                    if chave in vistos:
                        continue
                    vistos.add(chave)
                    resultado.append(item)
                if pagina >= total_paginas:
                    break
                pagina += 1
                time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
            time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
        fase("idle")

    log(f"Coleta PGC finalizada: {len(resultado)} item(ns).")
    return resultado
