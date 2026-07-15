"""Cache on-demand CATMAT/CATSER — módulos 01/02."""

from __future__ import annotations

import json
import os
import time
from typing import Any, Callable

from app.compras.client import ComprasGovClient
from app.compras.normalizers import tipo_item_catalogo
from app.config import (
    COMPRAS_CATALOGO_MATERIAL_ENDPOINT,
    COMPRAS_CATALOGO_SERVICO_ENDPOINT,
    COMPRAS_PNCP_REQUEST_DELAY_SEC,
)

# Limite por execução — evita milhares de chamadas e rate-limit (429) na APIM.
COMPRAS_ENRICH_CATALOGO_MAX = int(os.environ.get("COMPRAS_ENRICH_CATALOGO_MAX", "150"))


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
    client: ComprasGovClient | None = None,
    on_log: Callable[[str], None] | None = None,
) -> dict[str, Any] | None:
    log = on_log or (lambda _: None)
    tipo = tipo_item_catalogo(material_ou_servico or "M")
    own_client = client is None
    http = client or ComprasGovClient(on_log=log)
    try:
        if tipo == "Material":
            data = http.get_json(
                COMPRAS_CATALOGO_MATERIAL_ENDPOINT,
                params={"pagina": 1, "tamanhoPagina": 10, "codigoItem": codigo},
                contexto=f"CATMAT {codigo}",
            )
        else:
            data = http.get_json(
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
    finally:
        if own_client:
            http.close()


def enrich_catalogo(
    codigos: list[tuple[int, str | None]],
    *,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
    max_itens: int | None = None,
) -> list[dict[str, Any]]:
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)
    limite = COMPRAS_ENRICH_CATALOGO_MAX if max_itens is None else max_itens
    vistos: set[tuple[str, int]] = set()
    pendentes: list[tuple[int, str | None]] = []

    for codigo, mat_serv in codigos:
        if codigo is None:
            continue
        tipo = tipo_item_catalogo(mat_serv or "M")
        chave = (tipo, int(codigo))
        if chave in vistos:
            continue
        vistos.add(chave)
        pendentes.append((int(codigo), mat_serv))

    total = len(pendentes)
    if limite >= 0 and total > limite:
        log(
            f"  Enriquecimento limitado a {limite} de {total} item(ns) de catálogo "
            f"(demais ficam para próxima coleta completa)."
        )
        pendentes = pendentes[:limite]

    resultado: list[dict[str, Any]] = []
    falhas = 0
    falhas_429 = 0
    fase("enrich_catalogo")
    log(f"  Enriquecendo {len(pendentes)} item(ns) de catálogo (CATMAT/CATSER)…")

    with ComprasGovClient(on_log=None) as client:
        for i, (codigo, mat_serv) in enumerate(pendentes, start=1):
            tipo = tipo_item_catalogo(mat_serv or "M")
            if i == 1 or i % 10 == 0 or i == len(pendentes):
                log(f"    catálogo {i}/{len(pendentes)}")
                fase("enrich_catalogo")  # heartbeat — evita “stale” em lotes com 429
            try:
                item = coletar_item_catalogo(
                    codigo,
                    material_ou_servico=mat_serv,
                    client=client,
                    on_log=None,
                )
                if item:
                    resultado.append(item)
            except Exception as exc:  # noqa: BLE001
                falhas += 1
                msg = str(exc)
                if "HTTP 429" in msg:
                    falhas_429 += 1
                    # Respiro extra entre itens quando a APIM continua saturada.
                    time.sleep(2.0)
                if falhas <= 5:
                    log(f"  ⚠ Catálogo {tipo}/{codigo}: {exc}")
                elif falhas == 6:
                    log("  ⚠ Demais falhas de catálogo serão omitidas neste lote…")

    fase("idle")
    extra = ""
    if falhas:
        extra = f" ({falhas} falha(s)"
        if falhas_429:
            extra += f", {falhas_429} por rate-limit 429"
        extra += "; pendentes seguem na próxima coleta)"
    log(f"Enriquecimento catálogo: {len(resultado)} item(ns).{extra}")
    return resultado
