"""Cache on-demand CATMAT/CATSER — módulos 01/02."""

from __future__ import annotations

import json
import time
from typing import Any, Callable

from app.compras.client import ComprasGovClient
from app.compras.normalizers import tipo_item_catalogo
from app.config import (
    COMPRAS_CATALOGO_MATERIAL_ENDPOINT,
    COMPRAS_CATALOGO_SERVICO_ENDPOINT,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
)


def catalogo_da_api(raw: dict[str, Any], *, tipo: str) -> dict[str, Any] | None:
    if tipo == "Material":
        codigo = raw.get("codigoItem")
        if codigo is None:
            return None
        return {
            "tipo_item": "Material",
            "codigo_item_catalogo": int(codigo),
            "descricao": str(raw.get("descricaoItem") or "") or None,
            "codigo_grupo": int(raw["codigoGrupo"]) if raw.get("codigoGrupo") is not None else None,
            "codigo_classe": int(raw["codigoClasse"])
            if raw.get("codigoClasse") is not None
            else None,
            "codigo_pdm": int(raw["codigoPdm"]) if raw.get("codigoPdm") is not None else None,
            "status": str(raw.get("statusItem") or "") or None,
            "dados_json": json.dumps(raw, ensure_ascii=False),
        }
    codigo = raw.get("codigoServico")
    if codigo is None:
        return None
    return {
        "tipo_item": "Servico",
        "codigo_item_catalogo": int(codigo),
        "descricao": str(raw.get("nomeServico") or raw.get("descricaoServico") or "") or None,
        "secao_servico": int(raw["codigoSecao"])
        if raw.get("codigoSecao") is not None
        else None,
        "divisao_servico": int(raw["codigoDivisao"])
        if raw.get("codigoDivisao") is not None
        else None,
        "subclasse_servico": int(raw["codigoSubclasse"])
        if raw.get("codigoSubclasse") is not None
        else None,
        "status": str(raw.get("statusServico") or "") or None,
        "dados_json": json.dumps(raw, ensure_ascii=False),
    }


def coletar_item_catalogo(
    codigo: int,
    *,
    material_ou_servico: str | None = None,
    on_log: Callable[[str], None] | None = None,
) -> dict[str, Any] | None:
    log = on_log or (lambda _: None)
    tipo = tipo_item_catalogo(material_ou_servico or "M")

    with ComprasGovClient(on_log=log) as client:
        if tipo == "Material":
            data = client.get_json(
                COMPRAS_CATALOGO_MATERIAL_ENDPOINT,
                params={"pagina": 1, "tamanhoPagina": 10, "codigoItem": codigo},
                contexto=f"CATMAT {codigo}",
            )
        else:
            data = client.get_json(
                COMPRAS_CATALOGO_SERVICO_ENDPOINT,
                params={"pagina": 1, "tamanhoPagina": 10, "codigoServico": codigo},
                contexto=f"CATSER {codigo}",
            )
        registros = data.get("resultado") or []
        if not registros:
            return None
        item = catalogo_da_api(registros[0], tipo=tipo)
        time.sleep(COMPRAS_PNCP_REQUEST_DELAY_SEC)
        return item


def enrich_catalogo(
    codigos: list[tuple[int, str | None]],
    *,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
) -> list[dict[str, Any]]:
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)
    vistos: set[tuple[str, int]] = set()
    resultado: list[dict[str, Any]] = []

    fase("enrich_catalogo")
    for codigo, mat_serv in codigos:
        if codigo is None:
            continue
        tipo = tipo_item_catalogo(mat_serv or "M")
        chave = (tipo, codigo)
        if chave in vistos:
            continue
        vistos.add(chave)
        try:
            item = coletar_item_catalogo(codigo, material_ou_servico=mat_serv, on_log=log)
            if item:
                resultado.append(item)
        except Exception as exc:
            log(f"  ⚠ Catálogo {tipo}/{codigo}: {exc}")
    fase("idle")
    log(f"Enriquecimento catálogo: {len(resultado)} item(ns).")
    return resultado
