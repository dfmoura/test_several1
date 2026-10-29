"""Sync módulo 05 — UASG/órgão por município IBGE (catálogo central)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.compras.client import ComprasGovClient
from app.compras.normalizers import normalizar_codigo_uasg, normalizar_ni
from app.config import COMPRAS_PNCP_PAGE_SIZE, COMPRAS_UASG_ENDPOINT
from app.database import Orgao, Uasg


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


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
    codigo_orgao = None
    if raw.get("codigoOrgao") is not None:
        try:
            codigo_orgao = int(raw["codigoOrgao"])
        except (TypeError, ValueError):
            codigo_orgao = None
    return {
        "codigo_uasg": codigo,
        "nome_uasg": str(raw.get("nomeUasg") or "") or None,
        "sigla_uf": str(raw.get("siglaUf") or "") or None,
        "codigo_municipio_ibge": ibge_int,
        "nome_municipio_ibge": str(raw.get("nomeMunicipioIbge") or "") or None,
        "cnpj_cpf_orgao": normalizar_ni(raw.get("cnpjCpfOrgao")),
        "status_uasg": raw.get("statusUasg") if isinstance(raw.get("statusUasg"), bool) else None,
        "uso_sisg": raw.get("usoSisg") if isinstance(raw.get("usoSisg"), bool) else None,
        "_codigo_orgao": codigo_orgao,
        "_nome_orgao": str(raw.get("nomeOrgao") or "") or None,
    }


def _garantir_orgao(db: Session, item: dict[str, Any]) -> int | None:
    codigo = item.get("_codigo_orgao")
    if codigo is None:
        return None
    row = db.scalar(select(Orgao).where(Orgao.codigo_orgao == codigo))
    if row is None:
        row = Orgao(
            codigo_orgao=codigo,
            cnpj_cpf_orgao=item.get("cnpj_cpf_orgao"),
            nome_orgao=item.get("_nome_orgao"),
        )
        db.add(row)
        db.flush()
    else:
        if item.get("cnpj_cpf_orgao") and not row.cnpj_cpf_orgao:
            row.cnpj_cpf_orgao = item["cnpj_cpf_orgao"]
        if item.get("_nome_orgao") and not row.nome_orgao:
            row.nome_orgao = item["_nome_orgao"]
    return row.id


def sincronizar_uasgs_municipio(
    db: Session,
    *,
    codigo_municipio_ibge: int,
    uf: str,
    client: ComprasGovClient | None = None,
    on_log: Callable[[str], None] | None = None,
    registros: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Atualiza catálogo central de UASGs do município (não vincula à filial).

    ``registros`` permite injetar payload (testes) sem HTTP.
    """
    log = on_log or (lambda _: None)
    uf_ok = (uf or "").upper()[:2]
    ibge = int(codigo_municipio_ibge)
    if len(uf_ok) != 2:
        raise ValueError("UF inválida para sincronização.")

    encontrados: dict[str, dict[str, Any]] = {}

    if registros is not None:
        fonte = registros
    else:
        owns = client is None
        cli = client or ComprasGovClient(on_log=log)
        try:
            log(f"Sincronizando UASGs — UF {uf_ok} / IBGE {ibge}")
            fonte = list(
                cli.paginar(
                    COMPRAS_UASG_ENDPOINT,
                    params_base={
                        "siglaUf": uf_ok,
                        "codigoMunicipioIbge": ibge,
                        "statusUasg": "true",
                    },
                    contexto="API UASG (catálogo município)",
                    tamanho_pagina=COMPRAS_PNCP_PAGE_SIZE,
                )
            )
        finally:
            if owns:
                cli.close()

    for raw in fonte:
        item = uasg_da_api(raw) if "codigoUasg" in raw else None
        if item is None and isinstance(raw, dict) and raw.get("codigo_uasg"):
            # payload já normalizado (testes)
            item = raw
        if not item:
            continue
        if item.get("codigo_municipio_ibge") not in (None, ibge):
            continue
        encontrados[item["codigo_uasg"]] = item

    agora = _utcnow()
    upserts = 0
    for codigo, item in encontrados.items():
        orgao_id = _garantir_orgao(db, item)
        row = db.scalar(select(Uasg).where(Uasg.codigo_uasg == codigo))
        if row is None:
            row = Uasg(codigo_uasg=codigo)
            db.add(row)
        row.orgao_id = orgao_id
        row.nome_uasg = item.get("nome_uasg")
        row.sigla_uf = item.get("sigla_uf") or uf_ok
        row.codigo_municipio_ibge = item.get("codigo_municipio_ibge") or ibge
        row.nome_municipio_ibge = item.get("nome_municipio_ibge")
        row.cnpj_cpf_orgao = item.get("cnpj_cpf_orgao")
        row.status_uasg = item.get("status_uasg")
        row.uso_sisg = item.get("uso_sisg")
        row.sincronizado_em = agora
        upserts += 1

    db.commit()
    log(f"Catálogo atualizado: {upserts} UASG(s).")
    return {
        "ok": True,
        "codigo_municipio_ibge": ibge,
        "uf": uf_ok,
        "total_catalogo": upserts,
        "sincronizado_em": agora.isoformat(),
    }
