import re
from datetime import date
from typing import Any

import httpx

from app.cnpj_lookup import CnpjLookupError, fetch_cnpj_pagador, normalize_digits
from app.documents import DocumentError, validate_cpf_cnpj
from app.supabase_client import SupabaseClient

LICENSE_TABLE = "licenses"
LICENSE_KEY_RE = re.compile(r"^TRIG-(\d{4})-(\d+)$", re.IGNORECASE)
# Liberação prepaid: só Sync/webhook (ou correção excepcional no Supabase).
LICENSE_PAYMENT_LOCKED_FIELDS = frozenset({"implantacao_paga", "valido_ate"})


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
    """Pré-cadastro prepaid: app bloqueado até pagamento confirmado (Sync/webhook)."""
    out = dict(data)
    # Sempre forçar — pagamento antecipado; nunca liberar na criação.
    out["implantacao_paga"] = False
    if "ativa" not in out:
        out["ativa"] = True
    # Sem período pago: placeholder = hoje (renovado +32 dias só após PAGA).
    out["valido_ate"] = date.today().isoformat()
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


def _pagador_nome(data: dict[str, Any]) -> str:
    return str(data.get("pagador_nome") or data.get("condominio_nome") or "").strip()


def _require_pagador_manual(data: dict[str, Any], *, tipo_label: str) -> None:
    if not _pagador_nome(data):
        raise CnpjLookupError(
            f"Para {tipo_label}, informe o nome do pagador."
        )
    if not _pagador_complete(data):
        raise CnpjLookupError(
            f"Para {tipo_label}, preencha endereço, cidade, UF e CEP do pagador."
        )
    cep = normalize_digits(str(data.get("pagador_cep") or ""))
    if len(cep) != 8:
        raise CnpjLookupError("CEP do pagador deve ter 8 dígitos.")
    uf = str(data.get("pagador_uf") or "").strip()
    if len(uf) != 2:
        raise CnpjLookupError("UF do pagador deve ter 2 letras.")


async def enrich_license_pagador(
    data: dict[str, Any],
    *,
    required: bool = False,
    force: bool = False,
) -> dict[str, Any]:
    """
    Enriquece dados do pagador.
    - PJ (CNPJ 14): consulta Receita e preenche endereço.
    - PF (CPF 11): sem consulta pública confiável — exige dados manuais.
    """
    out = dict(data)
    raw = str(out.get("cnpj") or "")
    if not normalize_digits(raw):
        if required:
            raise CnpjLookupError("Informe CPF (11 dígitos) ou CNPJ (14 dígitos).")
        return out

    try:
        digits, tipo = validate_cpf_cnpj(raw)
    except DocumentError as exc:
        if required:
            raise CnpjLookupError(str(exc)) from exc
        return out

    out["cnpj"] = digits

    if tipo == "FISICA":
        if not out.get("pagador_nome") and out.get("condominio_nome"):
            out["pagador_nome"] = str(out["condominio_nome"]).strip()
        if required:
            _require_pagador_manual(out, tipo_label="pessoa física (CPF)")
        return out

    # JURIDICA — consulta CNPJ quando endereço incompleto ou force.
    if _pagador_complete(out) and _pagador_nome(out) and not force:
        return out
    try:
        pagador = await fetch_cnpj_pagador(digits)
    except CnpjLookupError:
        if required:
            if _pagador_complete(out) and _pagador_nome(out):
                return out
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
    if required:
        _require_pagador_manual(out, tipo_label="pessoa jurídica (CNPJ)")
    return out


async def finalize_license_create(client: SupabaseClient, data: dict[str, Any]) -> dict[str, Any]:
    out = apply_license_create_defaults(data)
    out = await enrich_license_pagador(out, required=True)
    if not out.get("license_key"):
        out["license_key"] = await generate_next_license_key(client)
    return out
