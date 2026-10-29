"""Consulta oficial IBGE Localidades (API pública, sem chave).

Fonte: https://servicodados.ibge.gov.br/api/v1/localidades/municipios/{id}
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import USER_AGENT

logger = logging.getLogger(__name__)

IBGE_MUNICIPIO_URL = (
    "https://servicodados.ibge.gov.br/api/v1/localidades/municipios/{codigo}"
)
IBGE_TIMEOUT_SEC = 12.0


class IbgeLookupError(Exception):
    def __init__(self, message: str, *, not_found: bool = False):
        super().__init__(message)
        self.message = message
        self.not_found = not_found


def _extrair_uf(payload: dict[str, Any]) -> str | None:
    """UF pode vir em microrregião ou região imediata (schema IBGE)."""
    micro = payload.get("microrregiao") or {}
    meso = micro.get("mesorregiao") or {}
    uf = (meso.get("UF") or {}).get("sigla")
    if uf:
        return str(uf).strip().upper()[:2]

    imediata = payload.get("regiao-imediata") or {}
    intermedia = imediata.get("regiao-intermediaria") or {}
    uf = (intermedia.get("UF") or {}).get("sigla")
    if uf:
        return str(uf).strip().upper()[:2]
    return None


def buscar_municipio_ibge(codigo_ibge: int) -> dict[str, str | int]:
    """Retorna {codigo_ibge, nome, uf} ou levanta IbgeLookupError."""
    if codigo_ibge <= 0:
        raise IbgeLookupError("Código IBGE inválido.")

    url = IBGE_MUNICIPIO_URL.format(codigo=int(codigo_ibge))
    try:
        with httpx.Client(
            timeout=IBGE_TIMEOUT_SEC,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            follow_redirects=True,
        ) as client:
            resp = client.get(url)
    except httpx.HTTPError as exc:
        logger.warning("IBGE indisponível codigo=%s: %s", codigo_ibge, exc)
        raise IbgeLookupError(
            "Não foi possível consultar o IBGE agora. Tente de novo em instantes."
        ) from exc

    if resp.status_code == 404:
        raise IbgeLookupError(
            f"Município IBGE {codigo_ibge} não encontrado.",
            not_found=True,
        )
    if resp.status_code >= 400:
        raise IbgeLookupError(
            f"IBGE retornou erro HTTP {resp.status_code}.",
        )

    try:
        data = resp.json()
    except ValueError as exc:
        raise IbgeLookupError("Resposta inválida do IBGE.") from exc

    if not isinstance(data, dict) or not data.get("nome"):
        raise IbgeLookupError(
            f"Município IBGE {codigo_ibge} não encontrado.",
            not_found=True,
        )

    nome = str(data["nome"]).strip()
    uf = _extrair_uf(data)
    if not uf or len(uf) != 2:
        raise IbgeLookupError("IBGE não retornou UF para este município.")

    return {
        "codigo_ibge": int(data.get("id") or codigo_ibge),
        "nome": nome,
        "uf": uf,
        "fonte": "ibge_localidades",
    }
