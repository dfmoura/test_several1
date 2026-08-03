"""D16 — identidade da matriz para cobrança no 1º pedido."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def chave_matriz(
    cliente: str,
    medida_faca: str,
    z: float | int | None,
    cores: Any,
    largura_cm: float,
    colunas: int,
) -> str:
    """
    Chave estável: cliente + medida + Z + cores + largura + colunas.
    Qualquer mudança implica nova matriz cobrável.
    """
    payload = {
        "cliente": (cliente or "").strip().upper(),
        "medida": (medida_faca or "").strip().upper().replace(" ", ""),
        "z": None if z is None else float(z),
        "cores": str(cores).strip().upper() if cores is not None else "",
        "largura_cm": round(float(largura_cm), 6),
        "colunas": int(colunas),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]
