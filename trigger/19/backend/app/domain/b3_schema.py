"""Esquema e constantes do XLSX de movimentação da Área do Investidor B3."""

from __future__ import annotations


class B3Column:
    """Índices das colunas no layout oficial B3 (primeiro bloco de valores)."""

    DIRECTION = 0
    TRADE_DATE = 1
    MOVEMENT = 2
    PRODUCT = 3
    INSTITUTION = 4
    QUANTITY = 5
    UNIT_PRICE = 6
    TOTAL_VALUE = 7


MIN_COLUMNS = B3Column.TOTAL_VALUE + 1

REQUIRED_HEADERS: tuple[str, ...] = (
    "entrada/saída",
    "data",
    "movimentação",
    "produto",
    "instituição",
)

# Movimentações que alteram posição (compra)
BUY_MOVEMENTS: frozenset[str] = frozenset({"Compra", "Leilão de Fração"})

# Movimentações que reduzem posição (venda)
SELL_MOVEMENTS: frozenset[str] = frozenset({"Venda"})

# Transferência entre contas/ativos — pareamento crédito+débito no mesmo ativo = custódia;
# débito não pareado após bonificação = saída de fração (ver transfer_resolver)
CUSTODY_TRANSFER_MOVEMENTS: frozenset[str] = frozenset({"Transferência"})

# Liquidação de negócios (crédito = compra, débito = venda)
SETTLEMENT_MOVEMENT = "Transferência - Liquidação"

# Proventos em dinheiro
INCOME_MOVEMENTS: dict[str, str] = {
    "Dividendo": "DIVIDEND",
    "Juros Sobre Capital Próprio": "JCP",
    "Rendimento": "RENDIMENTO",
    "Juros Sobre Capital Próprio - Transferido": "JCP",
}

# Eventos corporativos
BONUS_MOVEMENTS: frozenset[str] = frozenset({"Bonificação em Ativos"})

# Grupamento e Atualização registram o saldo resultante na custódia (substituem a posição)
POSITION_SET_MOVEMENTS: frozenset[str] = frozenset({"Grupamento", "Atualização"})

# Ajustes incrementais de fração (débito remove, leilão recompra)
FRACTION_MOVEMENTS: frozenset[str] = frozenset({"Fração em Ativos"})

DIRECTION_CREDIT = "credito"
DIRECTION_DEBIT = "debito"

TREASURY_PRODUCT_PREFIX = "tesouro"

INCOME_VALUE_QUANTIZE = "0.01"
AVG_COST_QUANTIZE = "0.0001"
