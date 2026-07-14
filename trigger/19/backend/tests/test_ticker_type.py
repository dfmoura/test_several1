from app.domain.ticker_type import normalize_ticker, ticker_type_stock


def test_normalize_ticker() -> None:
    assert normalize_ticker(" petr4 ") == "PETR4"
    assert normalize_ticker("vale3.sa") == "VALE3"


def test_ticker_type_stock_mapping() -> None:
    assert ticker_type_stock("PETR3") == "ON"
    assert ticker_type_stock("PETR4") == "PN"
    assert ticker_type_stock("BRSR5") == "PNA"
    assert ticker_type_stock("BRSR6") == "PNB"
    assert ticker_type_stock("BOVA11") == "UNT"
    assert ticker_type_stock("KLBN11") == "UNT"
