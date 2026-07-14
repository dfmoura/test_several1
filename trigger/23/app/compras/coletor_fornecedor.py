"""Coletor fornecedor — módulo 10 (on-demand)."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.compras.cnpj_publico import classificar_uberlandia
from app.compras.client import ComprasGovClient
from app.compras.normalizers import normalizar_ni
from app.compras.repository import precisa_enrich_compras_gov
from app.config import COMPRAS_FORNECEDOR_ENDPOINT, COMPRAS_PNCP_REQUEST_DELAY_SEC
from app.database import CompraContratacaoItem, ComprasContratacaoResultado, ComprasFornecedor

# Limite por execução da coleta — evita job silencioso de milhares de CNPJs.
COMPRAS_ENRICH_FORNECEDOR_MAX = int(os.environ.get("COMPRAS_ENRICH_FORNECEDOR_MAX", "150"))


def fornecedor_da_api(raw: dict[str, Any]) -> dict[str, Any] | None:
    ni = normalizar_ni(raw.get("cnpj") or raw.get("cpf"))
    if not ni:
        return None
    uf = str(raw.get("ufSigla") or "") or None
    municipio = str(raw.get("nomeMunicipio") or "") or None
    agora = datetime.utcnow()
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
        "uf_sigla": uf,
        "nome_municipio": municipio,
        "de_uberlandia": classificar_uberlandia(
            nome_municipio=municipio,
            uf_sigla=uf,
        ),
        "ativo": raw.get("ativo") if isinstance(raw.get("ativo"), bool) else None,
        "habilitado_licitar": raw.get("habilitadoLicitar")
        if isinstance(raw.get("habilitadoLicitar"), bool)
        else None,
        # Snapshot / proveniência do módulo 10
        "compras_gov_dados_json": json.dumps(raw, ensure_ascii=False, default=str),
        "compras_gov_enriquecido_em": agora,
        "fonte_razao_social": "10",
        "_fonte": "10",
    }


def coletar_fornecedor(
    ni: str,
    *,
    client: ComprasGovClient | None = None,
    on_log: Callable[[str], None] | None = None,
) -> dict[str, Any] | None:
    log = on_log or (lambda _: None)
    ni_norm = normalizar_ni(ni)
    if not ni_norm:
        return None

    own_client = client is None
    http = client or ComprasGovClient(on_log=log)
    try:
        param = "cnpj" if len(ni_norm) > 11 else "cpf"
        data = http.get_json(
            COMPRAS_FORNECEDOR_ENDPOINT,
            params={
                "pagina": 1,
                "tamanhoPagina": 10,
                param: ni_norm,
                # ativo é obrigatório na OpenAPI
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
    finally:
        if own_client:
            http.close()


def nis_vencedores_distintos(db: Session) -> set[str]:
    """NIs de vencedores: resultados 07.3 (canônico) ∪ itens (cobertura)."""
    nis: set[str] = set()
    for ni_raw in db.scalars(
        select(ComprasContratacaoResultado.ni_fornecedor).where(
            ComprasContratacaoResultado.ni_fornecedor.isnot(None),
            ComprasContratacaoResultado.ni_fornecedor != "",
        )
    ):
        ni = normalizar_ni(ni_raw)
        if ni:
            nis.add(ni)
    for cod in db.scalars(
        select(CompraContratacaoItem.cod_fornecedor).where(
            CompraContratacaoItem.cod_fornecedor.isnot(None),
            CompraContratacaoItem.cod_fornecedor != "",
        )
    ):
        ni = normalizar_ni(cod)
        if ni:
            nis.add(ni)
    return nis


def listar_pendentes_compras_gov(db: Session) -> list[str]:
    """
    NIs que ainda não têm snapshot do módulo 10.

    Stubs criados em 07-resultados e registros só com CNPJ público
    continuam pendentes — corrige o bloqueio antigo ``ja_tem``.
    """
    nis = nis_vencedores_distintos(db)
    if not nis:
        return []
    mapa = {
        r.ni_fornecedor: r
        for r in db.scalars(
            select(ComprasFornecedor).where(ComprasFornecedor.ni_fornecedor.in_(list(nis)))
        ).all()
    }
    return sorted(n for n in nis if precisa_enrich_compras_gov(mapa.get(n)))


def enrich_fornecedores(
    nis: list[str],
    *,
    on_log: Callable[[str], None] | None = None,
    on_fase: Callable[[str], None] | None = None,
    max_itens: int | None = None,
) -> list[dict[str, Any]]:
    log = on_log or (lambda _: None)
    fase = on_fase or (lambda _: None)
    limite = COMPRAS_ENRICH_FORNECEDOR_MAX if max_itens is None else max_itens
    vistos: set[str] = set()
    pendentes: list[str] = []
    for ni in nis:
        ni_norm = normalizar_ni(ni)
        if not ni_norm or ni_norm in vistos:
            continue
        vistos.add(ni_norm)
        pendentes.append(ni_norm)

    total = len(pendentes)
    if limite >= 0 and total > limite:
        log(
            f"  Enriquecimento limitado a {limite} de {total} fornecedor(es) "
            f"(demais ficam para próxima coleta completa)."
        )
        pendentes = pendentes[:limite]

    resultado: list[dict[str, Any]] = []
    fase("enrich_fornecedores")
    log(f"  Enriquecendo {len(pendentes)} fornecedor(es) via módulo 10…")

    with ComprasGovClient(on_log=log) as client:
        for i, ni_norm in enumerate(pendentes, start=1):
            if i == 1 or i % 25 == 0 or i == len(pendentes):
                log(f"    fornecedores {i}/{len(pendentes)}")
            try:
                item = coletar_fornecedor(ni_norm, client=client, on_log=log)
                if item:
                    resultado.append(item)
            except Exception as exc:  # noqa: BLE001
                log(f"  ⚠ Fornecedor {ni_norm}: {exc}")

    fase("idle")
    log(f"Enriquecimento fornecedores (módulo 10): {len(resultado)} registro(s).")
    return resultado
