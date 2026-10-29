"""Cadeia CNPJ público: BrasilAPI → Minha Receita → CNPJá → Pública CNPJ.ws."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Callable

import httpx

from app.compras.normalizers import normalizar_ni
from app.config import (
    CNPJ_PUBLICO_BRASILAPI_URL,
    CNPJ_PUBLICO_CNPJA_URL,
    CNPJ_PUBLICO_HTTP_TIMEOUT_SEC,
    CNPJ_PUBLICO_MINHARECEITA_URL,
    CNPJ_PUBLICO_PUBLICA_URL,
    USER_AGENT,
)

Fetcher = Callable[[str], dict[str, Any]]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _int_or_none(val: Any) -> int | None:
    if val is None or val == "":
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        digits = re.sub(r"\D", "", str(val))
        if digits:
            try:
                return int(digits)
            except ValueError:
                return None
        return None


def _texto(val: Any) -> str | None:
    if val is None:
        return None
    if isinstance(val, dict):
        for k in ("text", "descricao", "nome", "name", "description"):
            if val.get(k):
                return str(val[k]).strip() or None
        return None
    s = str(val).strip()
    return s or None


def _adaptar_cnpja(raw: dict[str, Any]) -> dict[str, Any]:
    company = raw.get("company") if isinstance(raw.get("company"), dict) else {}
    address = raw.get("address") if isinstance(raw.get("address"), dict) else {}
    main = raw.get("mainActivity") if isinstance(raw.get("mainActivity"), dict) else {}
    status = raw.get("status") if isinstance(raw.get("status"), dict) else {}
    size = company.get("size") if isinstance(company.get("size"), dict) else {}
    nature = company.get("nature") if isinstance(company.get("nature"), dict) else {}
    return {
        "cnpj": raw.get("taxId") or raw.get("cnpj"),
        "razao_social": company.get("name") or raw.get("alias"),
        "nome_fantasia": raw.get("alias"),
        "cnae_fiscal": main.get("id"),
        "cnae_fiscal_descricao": main.get("text"),
        "descricao_situacao_cadastral": status.get("text"),
        "municipio": address.get("city"),
        "uf": address.get("state"),
        "codigo_municipio_ibge": address.get("municipality"),
        "cep": address.get("zip"),
        "logradouro": address.get("street"),
        "numero": address.get("number"),
        "bairro": address.get("district"),
        "porte": size.get("text"),
        "natureza_juridica": nature.get("text"),
        "qsa": raw.get("members") or [],
    }


def _adaptar_publica(raw: dict[str, Any]) -> dict[str, Any]:
    est = raw.get("estabelecimento") if isinstance(raw.get("estabelecimento"), dict) else {}
    cidade = est.get("cidade") if isinstance(est.get("cidade"), dict) else {}
    estado = est.get("estado") if isinstance(est.get("estado"), dict) else {}
    atividade = (
        est.get("atividade_principal")
        if isinstance(est.get("atividade_principal"), dict)
        else {}
    )
    natureza = (
        raw.get("natureza_juridica")
        if isinstance(raw.get("natureza_juridica"), dict)
        else {}
    )
    porte = raw.get("porte") if isinstance(raw.get("porte"), dict) else {}
    return {
        "cnpj": est.get("cnpj") or raw.get("cnpj"),
        "razao_social": raw.get("razao_social"),
        "nome_fantasia": est.get("nome_fantasia"),
        "cnae_fiscal": atividade.get("id"),
        "cnae_fiscal_descricao": atividade.get("descricao"),
        "descricao_situacao_cadastral": est.get("situacao_cadastral"),
        "municipio": cidade.get("nome"),
        "uf": estado.get("sigla"),
        "codigo_municipio_ibge": cidade.get("ibge_id"),
        "cep": est.get("cep"),
        "logradouro": est.get("logradouro"),
        "numero": est.get("numero"),
        "bairro": est.get("bairro"),
        "natureza_juridica": natureza.get("descricao"),
        "porte": porte.get("descricao"),
        "qsa": raw.get("socios") or [],
    }


def mapear_payload_cnpj(raw: dict[str, Any], *, fonte: str, ni_fallback: str | None = None) -> dict[str, Any]:
    adapted = raw
    if fonte == "cnpja":
        adapted = _adaptar_cnpja(raw)
    elif fonte == "publicacnpj":
        adapted = _adaptar_publica(raw)

    ni = normalizar_ni(adapted.get("cnpj") or adapted.get("ni") or ni_fallback)
    if not ni or len(ni) != 14:
        raise ValueError("Payload CNPJ sem identificador válido")

    cep_digits = re.sub(r"\D", "", str(adapted.get("cep") or ""))
    return {
        "ni": ni,
        "razao_social": _texto(adapted.get("razao_social")),
        "nome_fantasia": _texto(adapted.get("nome_fantasia")),
        "porte": _texto(adapted.get("porte")),
        "situacao_cadastral": _texto(
            adapted.get("descricao_situacao_cadastral")
            or adapted.get("situacao_cadastral")
        ),
        "natureza_juridica": _texto(adapted.get("natureza_juridica")),
        "codigo_cnae": _int_or_none(adapted.get("cnae_fiscal")),
        "nome_cnae": _texto(adapted.get("cnae_fiscal_descricao")),
        "uf": (_texto(adapted.get("uf")) or "").upper()[:2] or None,
        "municipio": _texto(adapted.get("municipio")),
        "codigo_municipio_ibge": _int_or_none(adapted.get("codigo_municipio_ibge")),
        "cep": cep_digits.zfill(8) if len(cep_digits) >= 7 else (cep_digits or None),
        "logradouro": _texto(adapted.get("logradouro")),
        "numero": _texto(adapted.get("numero")),
        "bairro": _texto(adapted.get("bairro")),
        "fonte_cnpj": fonte,
        "cnpj_dados_json": json.dumps(
            {"fonte": fonte, "payload": raw}, ensure_ascii=False, default=str
        ),
        "cnpj_enriquecido_em": _utcnow(),
        "cnpj_pendente": False,
        "cnpj_ultimo_erro": None,
    }


def _http_get_json(url: str) -> dict[str, Any]:
    with httpx.Client(
        timeout=CNPJ_PUBLICO_HTTP_TIMEOUT_SEC,
        follow_redirects=True,
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    ) as client:
        resp = client.get(url)
        if resp.status_code == 404:
            raise LookupError("CNPJ não encontrado")
        if resp.status_code >= 400:
            raise RuntimeError(f"HTTP {resp.status_code}")
        data = resp.json()
        if not isinstance(data, dict):
            raise ValueError("Resposta inválida")
        return data


def fontes_cnpj(ni: str) -> list[tuple[str, str]]:
    return [
        ("brasilapi", f"{CNPJ_PUBLICO_BRASILAPI_URL.rstrip('/')}/{ni}"),
        ("minhareceita", f"{CNPJ_PUBLICO_MINHARECEITA_URL.rstrip('/')}/{ni}"),
        ("cnpja", f"{CNPJ_PUBLICO_CNPJA_URL.rstrip('/')}/{ni}"),
        ("publicacnpj", f"{CNPJ_PUBLICO_PUBLICA_URL.rstrip('/')}/{ni}"),
    ]


def _cadeia_http(ni: str) -> list[tuple[str, Fetcher]]:
    out: list[tuple[str, Fetcher]] = []
    for nome, url in fontes_cnpj(ni):
        out.append((nome, lambda _ni, u=url: _http_get_json(u)))
    return out


def consultar_cnpj_publico(
    cnpj: str,
    *,
    fetchers: list[tuple[str, Fetcher]] | None = None,
) -> dict[str, Any]:
    """Percorre a cadeia. LookupError se não encontrado; RuntimeError se todas falham."""
    ni = normalizar_ni(cnpj)
    if not ni or len(ni) != 14:
        raise ValueError("Informe um CNPJ válido (14 dígitos)")

    cadeia = fetchers if fetchers is not None else _cadeia_http(ni)
    erros: list[str] = []
    for fonte, fetch in cadeia:
        try:
            raw = fetch(ni)
            return mapear_payload_cnpj(raw, fonte=fonte, ni_fallback=ni)
        except LookupError:
            raise
        except Exception as exc:  # noqa: BLE001 — tenta próxima fonte
            erros.append(f"{fonte}: {exc}")

    raise RuntimeError(
        "Falha ao consultar CNPJ (todas as fontes indisponíveis) — " + "; ".join(erros)
    )
