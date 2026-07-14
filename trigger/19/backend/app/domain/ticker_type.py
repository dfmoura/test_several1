from __future__ import annotations

# Sufixo B3 → typeStock da API GetListedCashDividends
_SUFFIX_TO_TYPE_STOCK = {
    "3": "ON",
    "4": "PN",
    "5": "PNA",
    "6": "PNB",
    "7": "PNC",
    "8": "PND",
}


def normalize_ticker(ticker: str) -> str:
    return ticker.strip().upper().replace(".SA", "")


def ticker_type_stock(ticker: str) -> str | None:
    """Mapeia ticker B3 para typeStock dos proventos (ON/PN/PNA/PNB...)."""
    code = normalize_ticker(ticker)
    if code.endswith("F") and len(code) > 1:
        code = code[:-1]
    if code.endswith("11"):
        return "UNT"
    if not code or not code[-1].isdigit():
        return None
    return _SUFFIX_TO_TYPE_STOCK.get(code[-1])
