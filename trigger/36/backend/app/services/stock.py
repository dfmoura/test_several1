"""Conversões de unidade e regras de saldo (Decimal HALF-UP, sem float)."""

from __future__ import annotations

from decimal import Decimal

from app.models import Produto
from app.services.codes import dec


def compute_measures(
    product: Produto,
    quantidade: float | Decimal | str,
    unidade_informada: str | None = None,
) -> tuple[Decimal, Decimal | None, Decimal | None]:
    """Converte quantidade para a unidade base do produto.

    Retorna (qtd_na_unidade_do_produto, qtd_m2, qtd_ml).
    """
    q = dec(quantidade, "0.0001")
    unit_in = (unidade_informada or product.unidade.value).upper()
    largura_m = (
        dec(product.largura_mm, "0.0001") / Decimal("1000") if product.largura_mm else None
    )
    comprimento = dec(product.comprimento_m, "0.0001") if product.comprimento_m else None

    qtd_m2: Decimal | None = None
    qtd_ml: Decimal | None = None

    if unit_in == "M2":
        qtd_m2 = q
        if largura_m and largura_m > 0:
            qtd_ml = dec(q / largura_m, "0.0001")
    elif unit_in in ("ML", "M", "MT"):
        qtd_ml = q
        if largura_m is not None:
            qtd_m2 = dec(q * largura_m, "0.0001")
    elif unit_in in ("RL", "ROLO", "BOB", "UN") and comprimento and comprimento > 0:
        qtd_ml = dec(q * comprimento, "0.0001")
        if largura_m is not None:
            qtd_m2 = dec(qtd_ml * largura_m, "0.0001")

    base_unit = product.unidade.value
    if base_unit == "M2" and qtd_m2 is not None:
        base_qty = qtd_m2
    elif base_unit == "ML" and qtd_ml is not None:
        base_qty = qtd_ml
    elif base_unit == "RL" and comprimento and comprimento > 0 and qtd_ml is not None:
        base_qty = dec(qtd_ml / comprimento, "0.0001")
    else:
        base_qty = q

    return base_qty, qtd_m2, qtd_ml


def saldo_disponivel(produto: Produto) -> Decimal:
    return produto.saldo_disponivel
