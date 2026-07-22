"""Coletor UASG — módulo 05."""

from __future__ import annotations

import time
from typing import Any, Callable

from app.compras.client import ComprasGovClient
from app.compras.normalizers import normalizar_codigo_uasg, normalizar_ni
from app.config import (
    COMPRAS_PNCP_PAGE_SIZE,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
    COMPRAS_UASG_ENDPOINT,
)
from app.origem_sistema import resolver_ibge_municipio, resolver_orgaos_cnpj, resolver_uf_filtro
from app.unidades_compradoras import obter_unidades_compradoras


def orgao_da_api(raw: dict[str, Any]) -> dict[str, Any] | None:
    codigo = raw.get("codigoOrgao")
    if codigo is None:
        return None
    try:
        codigo_int = int(codigo)
    except (TypeError, ValueError):
        return None
    return {
        "codigo_orgao": codigo_int,
        "cnpj_cpf_orgao": normalizar_ni(raw.get("cnpjCpfOrgao")),
        "nome_orgao": str(raw.get("nomeOrgao") or "") or None,
        "esfera": str(raw.get("esfera") or "") or None,
        "poder": str(raw.get("poder") or "") or None,
        "status_orgao": raw.get("statusOrgao") if isinstance(raw.get("statusOrgao"), bool) else None,
        "codigo_orgao_superior": int(raw["codigoOrgaoSuperior"])
        if raw.get("codigoOrgaoSuperior") is not None
        else None,
        "nome_orgao_superior": str(raw.get("nomeOrgaoSuperior") or "") or None,
        "data_hora_movimento": str(raw.get("dataHoraMovimento") or "") or None,
    }


def uasg_da_api(raw: dict[str, Any]) -> dict[str, Any] | None:
    codigo = normalizar_codigo_uasg(raw.get("codigoUasg"))
    if not codigo:
        return None
    ibge = raw.get("codigoMunicipioIbge") or raw.get("codigoMunicipio")
    try:
        ibge_int = int(ibge) if ibge is not None else None
    except (TypeError, ValueError):
        ibge_int = None
    return {
        "codigo_uasg": codigo,
        "nome_uasg": str(raw.get("nomeUasg") or "") or None,
        "sigla_uf": str(raw.get("siglaUf") or "") or None,
        "codigo_municipio_ibge": ibge_int,
        "nome_municipio_ibge": str(raw.get("nomeMunicipioIbge") or "") or None,
        "cnpj_cpf_orgao": normalizar_ni(raw.get("cnpjCpfOrgao")),
        "status_uasg": raw.get("statusUasg") if isinstance(raw.get("statusUasg"), bool) else None,
        "uso_sisg": raw.get("usoSisg") if isinstance(raw.get("usoSisg"), bool) else None,
        "data_hora_movimento": str(raw.get("dataHoraMovimento") or "") or None,
        "_codigo_orgao": int(raw["codigoOrgao"]) if raw.get("codigoOrgao") is not None else None,
    }


def coletar_uasgs(
    *,
    unidades: list[str] | None = None,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
) -> list[dict[str, Any]]:
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)
    alvo = set(unidades or obter_unidades_compradoras().keys())
    vistos: set[str] = set()
    resultado: list[dict[str, Any]] = []
    ibge = resolver_ibge_municipio()
    uf = resolver_uf_filtro()

    with ComprasGovClient(on_log=log) as client:
        fase("coletando_uasg")
        log(f"UASGs — filtro {uf} / IBGE {ibge}")

        for codigo in alvo:
            log(f"  UASG {codigo}")
            data = client.get_json(
                COMPRAS_UASG_ENDPOINT,
                params={
                    "pagina": 1,
                    "tamanhoPagina": COMPRAS_PNCP_PAGE_SIZE,
                    "codigoUasg": codigo,
                    # statusUasg é obrigatório na OpenAPI — sem ele a API
                    # responde 404 genérico via gateway Azure.
                    "statusUasg": "true",
                },
                contexto="API UASG",
            )
            for raw in data.get("resultado") or []:
                if not isinstance(raw, dict):
                    continue
                item = uasg_da_api(raw)
                if not item or item["codigo_uasg"] in vistos:
                    continue
                if item.get("codigo_municipio_ibge") not in (None, ibge):
                    continue
                vistos.add(item["codigo_uasg"])
                resultado.append(item)
            time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)

        if not resultado:
            log("  Consulta ampla por UF/município…")
            for raw in client.paginar(
                COMPRAS_UASG_ENDPOINT,
                params_base={
                    "siglaUf": uf,
                    "codigoMunicipioIbge": ibge,
                    "statusUasg": "true",
                },
                contexto="API UASG",
                tamanho_pagina=COMPRAS_PNCP_PAGE_SIZE,
            ):
                item = uasg_da_api(raw)
                if not item or item["codigo_uasg"] not in alvo:
                    continue
                if item["codigo_uasg"] in vistos:
                    continue
                vistos.add(item["codigo_uasg"])
                resultado.append(item)

        fase("idle")

    log(f"Coleta UASG finalizada: {len(resultado)} unidade(s).")
    return resultado


def coletar_orgaos(
    *,
    cnpjs: list[str] | None = None,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
) -> list[dict[str, Any]]:
    from app.config import COMPRAS_ORGAO_ENDPOINT

    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)
    # A API exige CNPJ/CPF só com dígitos; pontuação retorna lista vazia.
    bruto = cnpjs if cnpjs is not None else resolver_orgaos_cnpj()
    alvo: list[str] = []
    for c in bruto:
        ni = normalizar_ni(c)
        if ni and ni not in alvo:
            alvo.append(ni)
    vistos: set[int] = set()
    resultado: list[dict[str, Any]] = []

    with ComprasGovClient(on_log=log) as client:
        fase("coletando_orgao")
        for cnpj in alvo:
            log(f"  Órgão CNPJ {cnpj}")
            data = client.get_json(
                COMPRAS_ORGAO_ENDPOINT,
                params={
                    "pagina": 1,
                    "tamanhoPagina": 50,
                    "cnpjCpfOrgao": cnpj,
                    # statusOrgao é obrigatório na OpenAPI — sem ele a API
                    # responde 404 genérico via gateway Azure.
                    "statusOrgao": "true",
                },
                contexto="API órgão",
            )
            for raw in data.get("resultado") or []:
                if not isinstance(raw, dict):
                    continue
                item = orgao_da_api(raw)
                if not item or item["codigo_orgao"] in vistos:
                    continue
                vistos.add(item["codigo_orgao"])
                resultado.append(item)
            if not (data.get("resultado") or []):
                log(f"    Nenhum órgão ativo para CNPJ {cnpj}")
            time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
        fase("idle")

    log(f"Coleta órgãos finalizada: {len(resultado)} registro(s).")
    return resultado
