"""Conversões de unidade para bobinas de papel.

Uma bobina tem largura (mm) e comprimento (m). A relação entre as medidas:
  m² = metros lineares × (largura_mm / 1000)
  metros lineares = m² / (largura_mm / 1000)
  1 rolo (RL) = comprimento_m metros lineares
"""

from ..models import Product


def compute_measures(
    product: Product, quantidade: float, unidade_informada: str | None = None
) -> tuple[float, float | None, float | None]:
    """Converte a quantidade informada para a unidade base do produto.

    Retorna (qtd_na_unidade_do_produto, qtd_m2, qtd_ml).
    """
    unit_in = (unidade_informada or product.unidade.value).upper()
    largura_m = (product.largura_mm / 1000.0) if product.largura_mm else None
    comprimento = product.comprimento_m

    qtd_m2: float | None = None
    qtd_ml: float | None = None

    if unit_in == "M2":
        qtd_m2 = quantidade
        if largura_m:
            qtd_ml = quantidade / largura_m
    elif unit_in in ("ML", "M", "MT"):
        qtd_ml = quantidade
        if largura_m:
            qtd_m2 = quantidade * largura_m
    elif unit_in in ("RL", "ROLO", "BOB", "UN") and comprimento:
        qtd_ml = quantidade * comprimento
        if largura_m:
            qtd_m2 = qtd_ml * largura_m

    base_unit = product.unidade.value
    if base_unit == "M2" and qtd_m2 is not None:
        base_qty = qtd_m2
    elif base_unit == "ML" and qtd_ml is not None:
        base_qty = qtd_ml
    elif base_unit == "RL" and comprimento and qtd_ml is not None:
        base_qty = qtd_ml / comprimento
    else:
        base_qty = quantidade

    return base_qty, qtd_m2, qtd_ml
