"""Consulta CNPJ em APIs públicas com fallback automático para preencher pagador."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

import httpx

BRASILAPI_CNPJ_URL = "https://brasilapi.com.br/api/cnpj/v1/{cnpj}"
MINHARECEITA_CNPJ_URL = "https://minhareceita.org/{cnpj}"
OPENCNPJ_URL = "https://api.opencnpj.org/{cnpj}"
CNPJA_OPEN_URL = "https://open.cnpja.com/office/{cnpj}"
CNPJWS_PUBLICA_URL = "https://publica.cnpj.ws/cnpj/{cnpj}"

RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})


class CnpjLookupError(Exception):
    pass


def normalize_digits(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


def validate_cnpj_digits(cnpj: str) -> str:
    digits = normalize_digits(cnpj)
    if len(digits) != 14:
        raise CnpjLookupError("CNPJ deve ter 14 dígitos.")
    return digits


def _is_situacao_ativa(situacao: Any) -> bool:
    if situacao in (None, 2, "2"):
        return True
    text = str(situacao).strip().upper()
    return text in ("ATIVA", "ACTIVE")


def _build_endereco(payload: dict[str, Any]) -> str:
    parts: list[str] = []
    logradouro = str(payload.get("logradouro") or "").strip()
    if logradouro:
        parts.append(logradouro)
    numero = str(payload.get("numero") or "").strip()
    if numero and numero.upper() != "SN":
        parts.append(numero)
    complemento = str(payload.get("complemento") or "").strip()
    if complemento:
        parts.append(complemento)
    bairro = str(payload.get("bairro") or "").strip()
    if bairro:
        parts.append(bairro)
    endereco = ", ".join(parts).strip()
    return endereco[:80] if endereco else ""


def _pagador_from_fields(
    *,
    cnpj: str,
    razao_social: str,
    nome_fantasia: str,
    logradouro: str,
    numero: str,
    complemento: str,
    bairro: str,
    municipio: str,
    uf: str,
    cep: str,
    situacao: Any,
) -> dict[str, str]:
    razao = razao_social.strip()
    fantasia = nome_fantasia.strip()
    nome = razao or fantasia
    if not nome:
        raise CnpjLookupError("CNPJ encontrado, mas sem razão social.")

    endereco = _build_endereco(
        {
            "logradouro": logradouro,
            "numero": numero,
            "complemento": complemento,
            "bairro": bairro,
        }
    )
    cidade = municipio.strip()
    uf_norm = uf.strip().upper()[:2]
    cep_norm = normalize_digits(cep).zfill(8)[:8]

    if not endereco or not cidade or not uf_norm or len(cep_norm) != 8:
        raise CnpjLookupError(
            "CNPJ encontrado, mas endereço incompleto na Receita. Preencha manualmente."
        )

    if not _is_situacao_ativa(situacao):
        raise CnpjLookupError(f"CNPJ com situação cadastral: {situacao}.")

    return {
        "cnpj": normalize_digits(cnpj),
        "razao_social": razao,
        "nome_fantasia": fantasia,
        "pagador_nome": nome[:100],
        "pagador_endereco": endereco,
        "pagador_cidade": cidade[:60],
        "pagador_uf": uf_norm,
        "pagador_cep": cep_norm,
    }


def pagador_from_brasilapi(payload: dict[str, Any]) -> dict[str, str]:
    return _pagador_from_fields(
        cnpj=str(payload.get("cnpj") or ""),
        razao_social=str(payload.get("razao_social") or ""),
        nome_fantasia=str(payload.get("nome_fantasia") or ""),
        logradouro=str(payload.get("logradouro") or ""),
        numero=str(payload.get("numero") or ""),
        complemento=str(payload.get("complemento") or ""),
        bairro=str(payload.get("bairro") or ""),
        municipio=str(payload.get("municipio") or ""),
        uf=str(payload.get("uf") or ""),
        cep=str(payload.get("cep") or ""),
        situacao=payload.get("descricao_situacao_cadastral")
        or payload.get("situacao_cadastral"),
    )


def pagador_from_opencnpj(payload: dict[str, Any]) -> dict[str, str]:
    return _pagador_from_fields(
        cnpj=str(payload.get("cnpj") or ""),
        razao_social=str(payload.get("razao_social") or ""),
        nome_fantasia=str(payload.get("nome_fantasia") or ""),
        logradouro=str(payload.get("logradouro") or ""),
        numero=str(payload.get("numero") or ""),
        complemento=str(payload.get("complemento") or ""),
        bairro=str(payload.get("bairro") or ""),
        municipio=str(payload.get("municipio") or ""),
        uf=str(payload.get("uf") or ""),
        cep=str(payload.get("cep") or ""),
        situacao=payload.get("situacao_cadastral"),
    )


def pagador_from_cnpja(payload: dict[str, Any]) -> dict[str, str]:
    company = payload.get("company") or {}
    address = payload.get("address") or {}
    status = payload.get("status") or {}
    return _pagador_from_fields(
        cnpj=str(payload.get("taxId") or ""),
        razao_social=str(company.get("name") or ""),
        nome_fantasia=str(payload.get("alias") or ""),
        logradouro=str(address.get("street") or ""),
        numero=str(address.get("number") or ""),
        complemento=str(address.get("details") or ""),
        bairro=str(address.get("district") or ""),
        municipio=str(address.get("city") or ""),
        uf=str(address.get("state") or ""),
        cep=str(address.get("zip") or ""),
        situacao=status.get("text"),
    )


def pagador_from_cnpjws(payload: dict[str, Any]) -> dict[str, str]:
    estabelecimento = payload.get("estabelecimento") or {}
    cidade = estabelecimento.get("cidade") or {}
    estado = estabelecimento.get("estado") or {}
    return _pagador_from_fields(
        cnpj=str(estabelecimento.get("cnpj") or ""),
        razao_social=str(payload.get("razao_social") or ""),
        nome_fantasia=str(estabelecimento.get("nome_fantasia") or ""),
        logradouro=str(estabelecimento.get("logradouro") or ""),
        numero=str(estabelecimento.get("numero") or ""),
        complemento=str(estabelecimento.get("complemento") or ""),
        bairro=str(estabelecimento.get("bairro") or ""),
        municipio=str(cidade.get("nome") or ""),
        uf=str(estado.get("sigla") or ""),
        cep=str(estabelecimento.get("cep") or ""),
        situacao=estabelecimento.get("situacao_cadastral"),
    )


@dataclass(frozen=True)
class CnpjProvider:
    name: str
    url_template: str
    parser: Callable[[dict[str, Any]], dict[str, str]]


CNPJ_PROVIDERS: tuple[CnpjProvider, ...] = (
    CnpjProvider("BrasilAPI", BRASILAPI_CNPJ_URL, pagador_from_brasilapi),
    CnpjProvider("MinhaReceita", MINHARECEITA_CNPJ_URL, pagador_from_brasilapi),
    CnpjProvider("OpenCNPJ", OPENCNPJ_URL, pagador_from_opencnpj),
    CnpjProvider("CNPJa", CNPJA_OPEN_URL, pagador_from_cnpja),
    CnpjProvider("CNPJ.ws", CNPJWS_PUBLICA_URL, pagador_from_cnpjws),
)


async def _fetch_provider_payload(
    client: httpx.AsyncClient,
    provider: CnpjProvider,
    digits: str,
) -> tuple[int | None, dict[str, Any] | None, str | None]:
    url = provider.url_template.format(cnpj=digits)
    try:
        response = await client.get(url)
    except httpx.HTTPError as exc:
        return None, None, str(exc)

    if response.status_code == 404:
        return 404, None, None
    if response.status_code in RETRYABLE_STATUS:
        return response.status_code, None, None
    if response.status_code >= 400:
        return response.status_code, None, None

    try:
        payload = response.json()
    except ValueError:
        return response.status_code, None, "resposta inválida"

    if not isinstance(payload, dict) or not payload:
        return response.status_code, None, "resposta vazia"

    return response.status_code, payload, None


async def fetch_cnpj_pagador(cnpj: str) -> dict[str, str]:
    digits = validate_cnpj_digits(cnpj)
    failures: list[str] = []

    async with httpx.AsyncClient(timeout=20.0) as client:
        for provider in CNPJ_PROVIDERS:
            status, payload, error = await _fetch_provider_payload(client, provider, digits)
            if error:
                failures.append(f"{provider.name}: {error}")
                continue
            if status in RETRYABLE_STATUS:
                failures.append(f"{provider.name}: HTTP {status}")
                continue
            if status == 404:
                failures.append(f"{provider.name}: não encontrado")
                continue
            if status is None or payload is None:
                failures.append(f"{provider.name}: falha na consulta")
                continue
            if status >= 400:
                failures.append(f"{provider.name}: HTTP {status}")
                continue

            try:
                return provider.parser(payload)
            except CnpjLookupError as exc:
                failures.append(f"{provider.name}: {exc}")
                continue

    detail = "; ".join(failures) if failures else "nenhuma API respondeu"
    raise CnpjLookupError(
        "Não foi possível consultar o CNPJ (limite ou indisponibilidade das APIs públicas). "
        f"Tentativas: {detail}"
    )
