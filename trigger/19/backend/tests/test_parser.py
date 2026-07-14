from decimal import Decimal

from app.domain.movement_classifier import classify_movement
from app.domain.position_calculator import PositionCalculator
from app.domain.transfer_resolver import apply_transfer_resolution
from app.domain.value_objects import MovementKind, Ticker
from app.infrastructure.b3_parser import B3MovementParser


def test_ticker_from_product():
    assert Ticker.from_product("PETR4 - PETROBRAS").code == "PETR4"
    assert Ticker.from_product("Tesouro IPCA+ 2024") is None


def test_classify_dividend():
    kind, income = classify_movement("Dividendo", "Credito")
    assert kind == MovementKind.INCOME
    assert income is not None


def test_classify_transfer_liquidacao():
    buy_kind, _ = classify_movement("Transferência - Liquidação", "Credito")
    sell_kind, _ = classify_movement("Transferência - Liquidação", "Debito")
    assert buy_kind == MovementKind.BUY
    assert sell_kind == MovementKind.SELL


def test_classify_custody_transfer_is_ignored():
    credit_kind, _ = classify_movement("Transferência", "Credito")
    debit_kind, _ = classify_movement("Transferência", "Debito")
    assert credit_kind == MovementKind.IGNORE
    assert debit_kind == MovementKind.IGNORE


def test_classify_grupamento_and_atualizacao_set_position():
    grupamento, _ = classify_movement("Grupamento", "Credito")
    atualizacao, _ = classify_movement("Atualização", "Credito")
    grupamento_debito, _ = classify_movement("Grupamento", "Debito")
    assert grupamento == MovementKind.POSITION_SET
    assert atualizacao == MovementKind.POSITION_SET
    assert grupamento_debito == MovementKind.IGNORE


def test_parse_official_file(official_movements):
    tickers = {movement.ticker for movement in official_movements}
    assert len(official_movements) > 100
    assert len(tickers) >= 10


def test_sapr11_position_quantity(official_positions):
    """Transferências de custódia não devem inflar a posição líquida."""
    sapr = official_positions["SAPR11"]
    assert sapr.quantity == Decimal("211")


def test_klbn_fraction_tickers_from_official_base(official_positions):
    """Bonificação com realocação de fração não deve inflar KLBN11."""
    klbn11 = official_positions["KLBN11"]
    klbn3 = official_positions["KLBN3"]
    klbn4 = official_positions["KLBN4"]

    assert klbn11.quantity == Decimal("9")
    assert klbn11.total_invested == Decimal("197.46")
    assert klbn3.quantity == Decimal("0.90")
    assert klbn3.total_invested == Decimal("4.24")
    assert klbn4.quantity == Decimal("0.63")
    assert klbn4.total_invested == Decimal("4.13")


def test_irbr3_position_after_grupamento_and_atualizacao(official_positions):
    """Grupamento e Atualização substituem o saldo — não somam sobre compras."""
    irbr = official_positions["IRBR3"]
    assert irbr.quantity == Decimal("11")
    assert irbr.total_invested == Decimal("489.66")
    assert irbr.total_income == Decimal("9.66")


def test_csmg3_position_after_atualizacao(official_positions):
    csmg = official_positions["CSMG3"]
    assert csmg.quantity == Decimal("25")


def test_klbn_income_totals_from_official_base(official_positions):
    klbn11 = official_positions["KLBN11"]
    klbn4 = official_positions["KLBN4"]

    assert klbn11.total_income == Decimal("23.88")
    assert klbn4.total_income == Decimal("1.19")
    assert official_positions["KLBN3"].total_income == Decimal("0")


def test_sapr11_timeline_includes_quantity_details(official_movements):
    timeline = PositionCalculator().build_timeline(official_movements, "SAPR11")

    assert timeline
    buy_month = next(point for point in timeline if point.invested > 0)
    assert buy_month.invested_quantity > 0
    assert buy_month.invested_unit_price is not None

    sell_month = next(point for point in timeline if point.liquidated > 0)
    assert sell_month.liquidated_quantity > 0
    assert sell_month.liquidated_unit_price is not None

    income_month = next(point for point in timeline if point.income > 0)
    assert income_month.income_quantity > 0
    assert income_month.income_unit_price is not None
    assert income_month.position_quantity > 0
    assert income_month.avg_purchase_unit_price is not None
    assert income_month.income_avg_purchase_unit_price is not None
    assert income_month.income_avg_purchase_unit_price > 0
    assert income_month.income_unit_price is not None
    expected_yield = income_month.income_unit_price / income_month.income_avg_purchase_unit_price
    assert expected_yield > 0


def test_transfer_resolution_is_idempotent(official_movements):
    once = apply_transfer_resolution(official_movements)
    twice = apply_transfer_resolution(once)
    assert len(once) == len(twice)

    once_positions = PositionCalculator().calculate_positions(once)
    twice_positions = PositionCalculator().calculate_positions(twice)
    assert once_positions.keys() == twice_positions.keys()
    for ticker in once_positions:
        assert once_positions[ticker].quantity == twice_positions[ticker].quantity
