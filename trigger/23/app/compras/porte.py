"""Normalização de porte de empresa (ME / EPP / Demais / MEI).

Fontes distintas (Compras.gov, BrasilAPI, Receita) gravam o mesmo porte com
grafias diferentes — caixa, espaços, acentos ou siglas. Este módulo unifica
sem migrar a base: a chave canônica ignora ruído tipográfico e aplica
sinônimos oficiais conhecidos; valores futuros desconhecidos ainda agrupam
por chave compacta (ex.: ``Foo Bar`` ≡ ``FOO-BAR``).
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable
from typing import Any

# Valor especial de filtro: sem porte informado
PORTE_NAO_INFORMADO = "_vazio_"

# Chave compacta → rótulo de exibição (UI / resumos)
_ROTULOS: dict[str, str] = {
    "MICROEMPRESA": "Microempresa",
    "EMPRESADEPEQUENOPORTE": "Empresa de Pequeno Porte",
    "DEMAIS": "Demais",
    "MEI": "MEI",
}

# Sinônimos / códigos RF → chave canônica (ou None = tratar como não informado)
_SINONIMOS: dict[str, str | None] = {
    "ME": "MICROEMPRESA",
    "MICROEMPRESA": "MICROEMPRESA",
    "01": "MICROEMPRESA",
    "EPP": "EMPRESADEPEQUENOPORTE",
    "EMPRESADEPEQUENOPORTE": "EMPRESADEPEQUENOPORTE",
    "03": "EMPRESADEPEQUENOPORTE",
    "DEMAIS": "DEMAIS",
    "05": "DEMAIS",
    "MEI": "MEI",
    "MICROEMPREENDEDORINDIVIDUAL": "MEI",
    "MEIMICROEMPREENDEDORINDIVIDUAL": "MEI",
    "00": None,
    "NAOINFORMADO": None,
    "NAOINFORMADA": None,
    "SEMINFORMACAO": None,
}

# IDs frequentes no módulo 10 / layout RF (01→1, 03→3, 05→5)
_CHAVE_PARA_IDS: dict[str, frozenset[int]] = {
    "MICROEMPRESA": frozenset({1}),
    "EMPRESADEPEQUENOPORTE": frozenset({3}),
    "DEMAIS": frozenset({5}),
}

_SMALL = frozenset({"de", "da", "do", "das", "dos", "e", "a", "o"})


def _compactar(texto: str) -> str:
    s = unicodedata.normalize("NFKD", texto)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.upper()
    return re.sub(r"[^A-Z0-9]+", "", s)


def _title_pt(texto: str) -> str:
    partes = re.split(r"(\s+|-|/)", texto.strip())
    out: list[str] = []
    palavra_idx = 0
    for p in partes:
        if not p or p.isspace() or p in "-/":
            out.append(p)
            continue
        low = p.lower()
        if palavra_idx > 0 and low in _SMALL:
            out.append(low)
        else:
            out.append(p[:1].upper() + p[1:].lower() if len(p) > 1 else p.upper())
        palavra_idx += 1
    return "".join(out)


def chave_porte(texto: str | None, *, porte_id: int | None = None) -> str | None:
    """Chave estável para comparar / filtrar portes equivalentes."""
    if texto is not None and str(texto).strip():
        compact = _compactar(str(texto))
        if compact:
            if compact in _SINONIMOS:
                return _SINONIMOS[compact]
            return compact
    if porte_id is not None:
        for chave, ids in _CHAVE_PARA_IDS.items():
            if porte_id in ids:
                return chave
    return None


def rotulo_porte(texto: str | None, *, chave: str | None = None, porte_id: int | None = None) -> str | None:
    """Rótulo único para UI (preferência: canônico conhecido → title-case do bruto)."""
    k = chave if chave is not None else chave_porte(texto, porte_id=porte_id)
    if not k:
        return None
    if k in _ROTULOS:
        return _ROTULOS[k]
    if texto and str(texto).strip():
        return _title_pt(str(texto).strip())
    return k


def ids_porte(chave: str | None) -> frozenset[int]:
    if not chave:
        return frozenset()
    return _CHAVE_PARA_IDS.get(chave, frozenset())


def porte_equivale(
    bruto: str | None,
    filtro: str | None,
    *,
    porte_id: int | None = None,
) -> bool:
    """True se o porte do registro corresponde ao filtro (id canônico ou grafia bruta)."""
    f = (filtro or "").strip()
    if not f or f.lower() in ("todos", "all"):
        return True
    if f == PORTE_NAO_INFORMADO:
        return chave_porte(bruto, porte_id=porte_id) is None
    alvo = chave_porte(f)
    if not alvo:
        return chave_porte(bruto, porte_id=porte_id) is None
    return chave_porte(bruto, porte_id=porte_id) == alvo


def catalogar_portes(brutos: Iterable[str | None]) -> list[dict[str, str]]:
    """Agrupa grafias distintas em opções de filtro ``{id, nome}``."""
    vistos: dict[str, str | None] = {}
    for raw in brutos:
        if raw is None or not str(raw).strip():
            continue
        texto = str(raw).strip()
        k = chave_porte(texto)
        if not k:
            continue
        # Preferir o primeiro bruto; rótulo final vem de rotulo_porte
        vistos.setdefault(k, texto)
    itens = [
        {"id": k, "nome": rotulo_porte(bruto, chave=k) or k}
        for k, bruto in vistos.items()
    ]
    itens.sort(key=lambda x: x["nome"].casefold())
    return itens


def brutos_equivalentes(
    filtro: str,
    brutos_conhecidos: Iterable[str | None],
) -> list[str]:
    """Lista grafias brutas na base que batem com o filtro (para ``IN`` SQL)."""
    alvo = chave_porte(filtro)
    if not alvo:
        return []
    out: list[str] = []
    vistos: set[str] = set()
    for raw in brutos_conhecidos:
        if raw is None or not str(raw).strip():
            continue
        texto = str(raw).strip()
        if chave_porte(texto) != alvo:
            continue
        if texto in vistos:
            continue
        vistos.add(texto)
        out.append(texto)
    return out


def porte_de_fornecedor(forn: Any | None) -> tuple[str | None, str | None]:
    """Retorna ``(chave, rótulo)`` a partir de um ``ComprasFornecedor`` (ou None)."""
    if forn is None:
        return None, None
    nome = getattr(forn, "porte_empresa_nome", None)
    pid = getattr(forn, "porte_empresa_id", None)
    k = chave_porte(nome, porte_id=pid)
    return k, rotulo_porte(nome, chave=k, porte_id=pid)
