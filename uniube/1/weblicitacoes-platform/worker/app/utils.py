from __future__ import annotations

import re
from datetime import datetime
from urllib.parse import quote

from app.config import settings


def limpar_texto(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def parse_data_br(value: str | None) -> datetime | None:
    text = limpar_texto(value)
    if not text or text in ("-", "—", "N/A"):
        return None
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d"):
        try:
            return datetime.strptime(text.split(".")[0], fmt.split(".")[0])
        except ValueError:
            continue
    return None


def extrair_modalidade(processo: str | None) -> str | None:
    if not processo:
        return None
    m = re.match(r"^([A-Z]{1,4})\s", processo.strip())
    return m.group(1) if m else None


def parse_valor_monetario(value: str | None) -> float | None:
    text = limpar_texto(value)
    if not text:
        return None
    cleaned = (
        text.replace("R$", "")
        .replace(".", "")
        .replace(",", ".")
        .strip()
    )
    try:
        return float(cleaned)
    except ValueError:
        return None


def build_detalhe_url(codigo_empresa: str, processo: str) -> str:
    licitacao = quote(processo.strip(), safe="")
    return (
        f"{settings.base_url}/weblicitacoes/f/n/licitacoesdetalhescon"
        f"?modoJanelaPlc=popup&evento=y&codigoEmpresa={codigo_empresa}"
        f"&licitacao={licitacao}"
    )
