"""Cadeia CEP público: BrasilAPI → ViaCEP → AwesomeAPI → OpenCEP."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Callable

import httpx

from app.config import (
    CEP_PUBLICO_AWESOMEAPI_URL,
    CEP_PUBLICO_BRASILAPI_URL,
    CEP_PUBLICO_HTTP_TIMEOUT_SEC,
    CEP_PUBLICO_OPENCEP_URL,
    CEP_PUBLICO_VIACEP_URL,
    USER_AGENT,
)

Fetcher = Callable[[str], dict[str, Any]]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalizar_cep(val: Any) -> str | None:
    if val is None:
        return None
    digits = re.sub(r"\D", "", str(val))
    if len(digits) != 8:
        return None
    return digits


def _int_or_none(val: Any) -> int | None:
    if val is None or val == "":
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _texto(val: Any) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s or None


def mapear_payload_cep(raw: dict[str, Any], *, fonte: str, cep: str) -> dict[str, Any]:
    # BrasilAPI v2
    if fonte == "brasilapi":
        city = raw.get("city")
        state = raw.get("state")
        ibge = None
        loc = raw.get("location") if isinstance(raw.get("location"), dict) else {}
        coords = loc.get("coordinates") if isinstance(loc.get("coordinates"), dict) else {}
        _ = coords
        return {
            "cep": cep,
            "logradouro": _texto(raw.get("street")),
            "bairro": _texto(raw.get("neighborhood")),
            "municipio": _texto(city),
            "uf": (_texto(state) or "").upper()[:2] or None,
            "codigo_municipio_ibge": _int_or_none(raw.get("city_ibge") or raw.get("ibge")),
            "fonte_cep": fonte,
            "cep_dados_json": json.dumps(
                {"fonte": fonte, "payload": raw}, ensure_ascii=False, default=str
            ),
            "enriquecido_em": _utcnow(),
            "pendente": False,
            "ultimo_erro": None,
        }

    # ViaCEP / OpenCEP-ish
    if fonte in ("viacep", "opencep"):
        if raw.get("erro") is True or raw.get("erro") == "true":
            raise LookupError("CEP não encontrado")
        return {
            "cep": cep,
            "logradouro": _texto(raw.get("logradouro") or raw.get("address")),
            "bairro": _texto(raw.get("bairro") or raw.get("district")),
            "municipio": _texto(raw.get("localidade") or raw.get("city")),
            "uf": (_texto(raw.get("uf") or raw.get("state")) or "").upper()[:2] or None,
            "codigo_municipio_ibge": _int_or_none(raw.get("ibge")),
            "fonte_cep": fonte,
            "cep_dados_json": json.dumps(
                {"fonte": fonte, "payload": raw}, ensure_ascii=False, default=str
            ),
            "enriquecido_em": _utcnow(),
            "pendente": False,
            "ultimo_erro": None,
        }

    # AwesomeAPI
    return {
        "cep": cep,
        "logradouro": _texto(raw.get("address") or raw.get("logradouro")),
        "bairro": _texto(raw.get("district") or raw.get("bairro")),
        "municipio": _texto(raw.get("city") or raw.get("localidade")),
        "uf": (_texto(raw.get("state") or raw.get("uf")) or "").upper()[:2] or None,
        "codigo_municipio_ibge": _int_or_none(raw.get("city_ibge") or raw.get("ibge")),
        "fonte_cep": fonte,
        "cep_dados_json": json.dumps(
            {"fonte": fonte, "payload": raw}, ensure_ascii=False, default=str
        ),
        "enriquecido_em": _utcnow(),
        "pendente": False,
        "ultimo_erro": None,
    }


def _http_get_json(url: str) -> dict[str, Any]:
    with httpx.Client(
        timeout=CEP_PUBLICO_HTTP_TIMEOUT_SEC,
        follow_redirects=True,
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    ) as client:
        resp = client.get(url)
        if resp.status_code == 404:
            raise LookupError("CEP não encontrado")
        if resp.status_code >= 400:
            raise RuntimeError(f"HTTP {resp.status_code}")
        data = resp.json()
        if not isinstance(data, dict):
            raise ValueError("Resposta inválida")
        return data


def fontes_cep(cep: str) -> list[tuple[str, str]]:
    return [
        ("brasilapi", f"{CEP_PUBLICO_BRASILAPI_URL.rstrip('/')}/{cep}"),
        ("viacep", f"{CEP_PUBLICO_VIACEP_URL.rstrip('/')}/{cep}/json/"),
        ("awesomeapi", f"{CEP_PUBLICO_AWESOMEAPI_URL.rstrip('/')}/{cep}"),
        ("opencep", f"{CEP_PUBLICO_OPENCEP_URL.rstrip('/')}/{cep}"),
    ]


def _cadeia_http(cep: str) -> list[tuple[str, Fetcher]]:
    out: list[tuple[str, Fetcher]] = []
    for nome, url in fontes_cep(cep):
        out.append((nome, lambda _c, u=url: _http_get_json(u)))
    return out


def consultar_cep_publico(
    cep: str,
    *,
    fetchers: list[tuple[str, Fetcher]] | None = None,
) -> dict[str, Any]:
    codigo = normalizar_cep(cep)
    if not codigo:
        raise ValueError("Informe um CEP válido (8 dígitos)")

    cadeia = fetchers if fetchers is not None else _cadeia_http(codigo)
    erros: list[str] = []
    for fonte, fetch in cadeia:
        try:
            raw = fetch(codigo)
            return mapear_payload_cep(raw, fonte=fonte, cep=codigo)
        except LookupError:
            raise
        except Exception as exc:  # noqa: BLE001
            erros.append(f"{fonte}: {exc}")

    raise RuntimeError(
        "Falha ao consultar CEP (todas as fontes indisponíveis) — " + "; ".join(erros)
    )
