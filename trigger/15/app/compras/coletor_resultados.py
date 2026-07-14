"""Coletor de resultados homologados — módulo 07.3."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Callable

from app.compras.client import ComprasGovClient, periodos
from app.compras.normalizers import (
    fmt_num_br,
    fmt_valor_br,
    normalizar_id_compra,
    normalizar_ni,
    raw_to_snake,
)
from app.config import (
    COMPRAS_PNCP_MAX_DIAS_PERIODO_RESULTADOS,
    COMPRAS_PNCP_PAGE_SIZE,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
    COMPRAS_RESULTADOS_ENDPOINT,
    COMPRAS_RESULTADOS_ID_ENDPOINT,
    DELAY_SEC,
    UNIDADES_COMPRADORAS,
)

RESULTADO_CAMPOS = (
    "idCompraItem",
    "idCompra",
    "idContratacaoPNCP",
    "unidadeOrgaoCodigoUnidade",
    "numeroItemPncp",
    "sequencialResultado",
    "niFornecedor",
    "nomeRazaoSocialFornecedor",
    "ordemClassificacaoSrp",
    "quantidadeHomologada",
    "valorUnitarioHomologado",
    "valorTotalHomologado",
    "percentualDesconto",
    "situacaoCompraItemResultadoNome",
    "porteFornecedorNome",
    "dataInclusaoPncp",
    "dataAtualizacaoPncp",
    "dataResultadoPncp",
)


@dataclass
class ResultadoContratacao:
    id_compra_item: str
    id_compra: str
    sequencial_resultado: int | None = None
    ni_fornecedor: str | None = None
    nome_razao_social_fornecedor: str | None = None
    ordem_classificacao_srp: int | None = None
    quantidade_homologada: str | None = None
    valor_unitario_homologado: str | None = None
    valor_total_homologado: str | None = None
    situacao_compra_item_resultado_nome: str | None = None
    porte_fornecedor_nome: str | None = None
    data_resultado_pncp: str | None = None
    percentual_desconto: str | None = None
    dados_resultado: dict[str, Any] = field(default_factory=dict)


def _int(val: Any) -> int | None:
    if val is None:
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def resultado_da_api(raw: dict[str, Any]) -> ResultadoContratacao | None:
    id_item = normalizar_id_compra(raw.get("idCompraItem"))
    id_compra = normalizar_id_compra(raw.get("idCompra"))
    if not id_item or not id_compra:
        return None
    dados = raw_to_snake(raw, RESULTADO_CAMPOS)
    return ResultadoContratacao(
        id_compra_item=id_item,
        id_compra=id_compra,
        sequencial_resultado=_int(raw.get("sequencialResultado")),
        ni_fornecedor=normalizar_ni(raw.get("niFornecedor")),
        nome_razao_social_fornecedor=str(raw.get("nomeRazaoSocialFornecedor") or "") or None,
        ordem_classificacao_srp=_int(raw.get("ordemClassificacaoSrp")),
        quantidade_homologada=fmt_num_br(raw.get("quantidadeHomologada")),
        valor_unitario_homologado=fmt_valor_br(raw.get("valorUnitarioHomologado")),
        valor_total_homologado=fmt_valor_br(raw.get("valorTotalHomologado")),
        situacao_compra_item_resultado_nome=str(
            raw.get("situacaoCompraItemResultadoNome") or ""
        ) or None,
        porte_fornecedor_nome=str(raw.get("porteFornecedorNome") or "") or None,
        data_resultado_pncp=str(raw.get("dataResultadoPncp") or raw.get("dataInclusaoPncp") or "")
        or None,
        percentual_desconto=fmt_num_br(raw.get("percentualDesconto")),
        dados_resultado=dados,
    )


def resultado_para_db(
    item: ResultadoContratacao,
    *,
    contratacao_item_id: int | None = None,
    fornecedor_id: int | None = None,
) -> dict[str, Any]:
    return {
        "id_compra": item.id_compra,
        "id_compra_item": item.id_compra_item,
        "contratacao_item_id": contratacao_item_id,
        "fornecedor_id": fornecedor_id,
        "sequencial_resultado": item.sequencial_resultado,
        "ni_fornecedor": item.ni_fornecedor,
        "nome_razao_social_fornecedor": item.nome_razao_social_fornecedor,
        "ordem_classificacao_srp": item.ordem_classificacao_srp,
        "quantidade_homologada": item.quantidade_homologada,
        "valor_unitario_homologado": item.valor_unitario_homologado,
        "valor_total_homologado": item.valor_total_homologado,
        "situacao_compra_item_resultado_nome": item.situacao_compra_item_resultado_nome,
        "porte_fornecedor_nome": item.porte_fornecedor_nome,
        "data_resultado_pncp": item.data_resultado_pncp,
        "percentual_desconto": item.percentual_desconto,
        "dados_resultado_json": json.dumps(item.dados_resultado, ensure_ascii=False),
    }


def coletar_resultados(
    *,
    data_inicial: date,
    data_final: date,
    unidades: list[str] | None = None,
    id_compras: list[str] | None = None,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
) -> list[ResultadoContratacao]:
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)
    unidades_alvo = unidades or list(UNIDADES_COMPRADORAS.keys())
    vistos: set[tuple[str, int | None]] = set()
    resultado: list[ResultadoContratacao] = []

    with ComprasGovClient(on_log=log) as client:
        fase("coletando_resultados")
        log(
            f"Resultados PNCP — {len(unidades_alvo)} unidade(s), "
            f"{data_inicial.isoformat()} a {data_final.isoformat()}"
        )

        if id_compras:
            for id_compra in id_compras:
                log(f"  Resultados por idCompra {id_compra}")
                params = {"codigo": id_compra, "tipo": "idCompra"}
                data = client.get_json(
                    COMPRAS_RESULTADOS_ID_ENDPOINT,
                    params=params,
                    contexto="API PNCP resultados (id)",
                )
                registros = data.get("resultado") or []
                for raw in registros if isinstance(registros, list) else []:
                    item = resultado_da_api(raw)
                    if not item:
                        continue
                    chave = (item.id_compra_item, item.sequencial_resultado)
                    if chave in vistos:
                        continue
                    vistos.add(chave)
                    resultado.append(item)
                time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
        else:
            janelas = periodos(
                data_inicial, data_final, COMPRAS_PNCP_MAX_DIAS_PERIODO_RESULTADOS
            )
            for unidade in unidades_alvo:
                nome_u = UNIDADES_COMPRADORAS.get(unidade, unidade)
                for per_ini, per_fim in janelas:
                    log(f"  Resultados | {nome_u} | {per_ini}–{per_fim}")

                    def _on_pag(pag: int, total: int, regs: list) -> None:
                        log(f"    página {pag}/{total} ({len(regs)} registros)")

                    for raw in client.paginar(
                        COMPRAS_RESULTADOS_ENDPOINT,
                        params_base={
                            "codigoUasg": unidade,
                            "dataResultadoPncpInicio": per_ini.isoformat(),
                            "dataResultadoPncpFim": per_fim.isoformat(),
                        },
                        contexto="API PNCP resultados",
                        tamanho_pagina=COMPRAS_PNCP_PAGE_SIZE,
                        on_pagina=_on_pag,
                    ):
                        item = resultado_da_api(raw)
                        if not item:
                            continue
                        chave = (item.id_compra_item, item.sequencial_resultado)
                        if chave in vistos:
                            continue
                        vistos.add(chave)
                        resultado.append(item)
                    time.sleep(DELAY_SEC / 2)

        fase("idle")

    log(f"Coleta de resultados finalizada: {len(resultado)} registro(s).")
    return resultado
