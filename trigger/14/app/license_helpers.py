import re
from datetime import date, timedelta
from typing import Any

import httpx

from app.cnpj_lookup import CnpjLookupError, fetch_cnpj_pagador, normalize_digits
from app.supabase_client import SupabaseClient

LICENSE_TABLE = "licenses"
LICENSE_KEY_RE = re.compile(r"^TRIG-(\d{4})-(\d+)$", re.IGNORECASE)
DEFAULT_VALIDO_ATE_DAYS = 30


def normalize_license_key(raw: str) -> str:
    return raw.strip().upper().replace(" ", "")


def next_license_key_from_existing(existing_keys: list[str], year: int | None = None) -> str:
    year = year or date.today().year
    prefix = f"TRIG-{year}-"
    max_seq = 0
    for key in existing_keys:
        normalized = normalize_license_key(key)
        match = LICENSE_KEY_RE.match(normalized)
        if match and int(match.group(1)) == year:
            max_seq = max(max_seq, int(match.group(2)))
    return f"{prefix}{max_seq + 1:04d}"


async def fetch_license_keys_for_year(client: SupabaseClient, year: int) -> list[str]:
    prefix = f"TRIG-{year}-"
    params = {
        "select": "license_key",
        "license_key": f"like.{prefix}%",
        "order": "license_key.desc",
        "limit": "200",
    }
    async with httpx.AsyncClient(timeout=30) as http:
        response = await http.get(
            client._rest_url(LICENSE_TABLE),
            headers=client.headers,
            params=params,
        )
        response.raise_for_status()
        rows = response.json()
    return [str(row.get("license_key", "")) for row in rows if row.get("license_key")]


async def generate_next_license_key(client: SupabaseClient) -> str:
    year = date.today().year
    existing = await fetch_license_keys_for_year(client, year)
    return next_license_key_from_existing(existing, year)


def apply_license_create_defaults(data: dict[str, Any]) -> dict[str, Any]:
    out = dict(data)
    if "implantacao_paga" not in out:
        out["implantacao_paga"] = False
    if "ativa" not in out:
        out["ativa"] = True
    if "valido_ate" not in out:
        out["valido_ate"] = (date.today() + timedelta(days=DEFAULT_VALIDO_ATE_DAYS)).isoformat()
    if "plano" not in out:
        out["plano"] = "mensal"
    if out.get("license_key"):
        out["license_key"] = normalize_license_key(str(out["license_key"]))
    return out


def _pagador_complete(data: dict[str, Any]) -> bool:
    return bool(
        data.get("pagador_endereco")
        and data.get("pagador_cidade")
        and data.get("pagador_uf")
        and data.get("pagador_cep")
    )


async def enrich_license_pagador(
    data: dict[str, Any],
    *,
    required: bool = False,
    force: bool = False,
) -> dict[str, Any]:
    out = dict(data)
    cnpj = normalize_digits(str(out.get("cnpj") or ""))
    if len(cnpj) != 14:
        if required:
            raise CnpjLookupError("Informe um CNPJ válido (14 dígitos).")
        return out
    if _pagador_complete(out) and not force:
        return out
    try:
        pagador = await fetch_cnpj_pagador(cnpj)
    except CnpjLookupError:
        if required:
            raise
        return out
    for key in (
        "pagador_nome",
        "pagador_endereco",
        "pagador_cidade",
        "pagador_uf",
        "pagador_cep",
    ):
        if pagador.get(key):
            if force or not out.get(key):
                out[key] = pagador[key]
    if not out.get("condominio_nome") and pagador.get("pagador_nome"):
        out["condominio_nome"] = pagador["pagador_nome"]
    out["cnpj"] = cnpj
    return out


async def finalize_license_create(client: SupabaseClient, data: dict[str, Any]) -> dict[str, Any]:
    out = apply_license_create_defaults(data)
    out = await enrich_license_pagador(out, required=True)
    if not out.get("license_key"):
        out["license_key"] = await generate_next_license_key(client)
    return out
