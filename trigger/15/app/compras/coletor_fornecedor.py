"""Coletor fornecedor — módulo 10 (on-demand)."""

from __future__ import annotations

import time
from typing import Any, Callable

from app.compras.client import ComprasGovClient
from app.compras.normalizers import normalizar_ni
from app.config import COMPRAS_FORNECEDOR_ENDPOINT, COMPRAS_PNCP_REQUEST_DELAY_SEC


def fornecedor_da_api(raw: dict[str, Any]) -> dict[str, Any] | None:
    ni = normalizar_ni(raw.get("cnpj") or raw.get("cpf"))
    if not ni:
        return None
    return {
        "ni_fornecedor": ni,
        "cnpj": normalizar_ni(raw.get("cnpj")) if raw.get("cnpj") else None,
        "cpf": normalizar_ni(raw.get("cpf")) if raw.get("cpf") else None,
        "nome_razao_social_fornecedor": str(raw.get("nomeRazaoSocialFornecedor") or "") or None,
        "porte_empresa_id": int(raw["porteEmpresaId"])
        if raw.get("porteEmpresaId") is not None
        else None,
        "porte_empresa_nome": str(raw.get("porteEmpresaNome") or "") or None,
        "natureza_juridica_id": int(raw["naturezaJuridicaId"])
        if raw.get("naturezaJuridicaId") is not None
        else None,
        "natureza_juridica_nome": str(raw.get("naturezaJuridicaNome") or "") or None,
        "codigo_cnae": int(raw["codigoCnae"]) if raw.get("codigoCnae") is not None else None,
        "nome_cnae": str(raw.get("nomeCnae") or "") or None,
        "uf_sigla": str(raw.get("ufSigla") or "") or None,
        "nome_municipio": str(raw.get("nomeMunicipio") or "") or None,
        "ativo": raw.get("ativo") if isinstance(raw.get("ativo"), bool) else None,
        "habilitado_licitar": raw.get("habilitadoLicitar")
        if isinstance(raw.get("habilitadoLicitar"), bool)
        else None,
    }


def coletar_fornecedor(
    ni: str,
    *,
    on_log: Callable[[str], None] | None = None,
) -> dict[str, Any] | None:
    log = on_log or (lambda _: None)
    ni_norm = normalizar_ni(ni)
    if not ni_norm:
        return None

    with ComprasGovClient(on_log=log) as client:
        param = "cnpj" if len(ni_norm) > 11 else "cpf"
        data = client.get_json(
            COMPRAS_FORNECEDOR_ENDPOINT,
            params={
                "pagina": 1,
                "tamanhoPagina": 10,
                param: ni_norm,
                "ativo": "true",
            },
            contexto=f"API fornecedor {ni_norm}",
        )
        registros = data.get("resultado") or []
        if not registros:
            return None
        item = fornecedor_da_api(registros[0])
        time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
        return item


def enrich_fornecedores(
    nis: list[str],
    *,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
) -> list[dict[str, Any]]:
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)
    vistos: set[str] = set()
    resultado: list[dict[str, Any]] = []

    fase("enrich_fornecedores")
    for ni in nis:
        ni_norm = normalizar_ni(ni)
        if not ni_norm or ni_norm in vistos:
            continue
        vistos.add(ni_norm)
        try:
            item = coletar_fornecedor(ni_norm, on_log=log)
            if item:
                resultado.append(item)
        except Exception as exc:
            log(f"  ⚠ Fornecedor {ni_norm}: {exc}")
    fase("idle")
    log(f"Enriquecimento fornecedores: {len(resultado)} registro(s).")
    return resultado
