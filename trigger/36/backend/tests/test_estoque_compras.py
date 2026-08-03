"""Testes do núcleo estoque (Decimal, custo médio, reservas) e compras."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.models import (
    NecessidadeOrigem,
    NecessidadeStatus,
    MovTipo,
    OrdemCompraStatus,
    ProdutoTipo,
    Unidade,
)
from app.services.codes import apply_stock_move, dec
from app.services.purchasing import (
    quantidade_sugerida_compra,
)
from app.services.stock import compute_measures


class FakeProduto:
    def __init__(self, **kw):
        self.id = kw.get("id", 1)
        self.unidade = kw.get("unidade", Unidade.M2)
        self.largura_mm = kw.get("largura_mm", Decimal("330"))
        self.comprimento_m = kw.get("comprimento_m", Decimal("1000"))
        self.saldo_qtd = kw.get("saldo_qtd", Decimal("0"))
        self.saldo_reservado = kw.get("saldo_reservado", Decimal("0"))
        self.saldo_valor = kw.get("saldo_valor", Decimal("0"))
        self.custo_medio = kw.get("custo_medio", Decimal("0"))
        self.estoque_minimo = kw.get("estoque_minimo", Decimal("50"))
        self.ponto_pedido = kw.get("ponto_pedido", Decimal("80"))
        self.lote_compra = kw.get("lote_compra", Decimal("100"))
        self.tipo = ProdutoTipo.INSUMO

    @property
    def saldo_disponivel(self) -> Decimal:
        d = (self.saldo_qtd or Decimal("0")) - (self.saldo_reservado or Decimal("0"))
        return d if d > 0 else Decimal("0")

    @property
    def limiar_reposicao(self) -> Decimal:
        pp = self.ponto_pedido or Decimal("0")
        if pp > 0:
            return pp
        return self.estoque_minimo or Decimal("0")


def test_compute_measures_m2_to_ml_decimal():
    p = FakeProduto(largura_mm=Decimal("330"))
    base, m2, ml = compute_measures(p, Decimal("33"), "M2")
    assert base == Decimal("33.0000")
    assert m2 == Decimal("33.0000")
    # 33 / 0.330 = 100
    assert ml == Decimal("100.0000")


def test_compute_measures_rl_to_base():
    p = FakeProduto(unidade=Unidade.RL, comprimento_m=Decimal("1000"), largura_mm=Decimal("330"))
    base, m2, ml = compute_measures(p, Decimal("2"), "RL")
    assert base == Decimal("2.0000")
    assert ml == Decimal("2000.0000")
    assert m2 == Decimal("660.0000")


def test_custo_medio_ponderado_entrada():
    db = MagicMock()
    p = FakeProduto(saldo_qtd=Decimal("100"), saldo_valor=Decimal("1000"), custo_medio=Decimal("10"))
    apply_stock_move(
        db,
        empresa_id=1,
        produto=p,
        tipo=MovTipo.ENTRADA_NFE,
        quantidade=Decimal("100"),
        custo_unitario=Decimal("20"),
    )
    assert p.saldo_qtd == Decimal("200.0000")
    assert p.saldo_valor == Decimal("3000.00")
    assert p.custo_medio == Decimal("15.000000")
    assert db.add.called


def test_saida_bloqueia_sem_saldo():
    db = MagicMock()
    p = FakeProduto(saldo_qtd=Decimal("5"))
    with pytest.raises(ValueError, match="insuficiente"):
        apply_stock_move(
            db,
            empresa_id=1,
            produto=p,
            tipo=MovTipo.SAIDA_MANUAL,
            quantidade=Decimal("10"),
            consumir_reserva=False,
        )


def test_reserva_reduz_disponivel_e_bloqueia_saida_manual():
    db = MagicMock()
    p = FakeProduto(saldo_qtd=Decimal("100"), saldo_reservado=Decimal("0"))
    apply_stock_move(
        db,
        empresa_id=1,
        produto=p,
        tipo=MovTipo.RESERVA,
        quantidade=Decimal("80"),
        documento_ref="OP-1",
    )
    assert p.saldo_reservado == Decimal("80.0000")
    assert p.saldo_disponivel == Decimal("20.0000")
    with pytest.raises(ValueError, match="disponível"):
        apply_stock_move(
            db,
            empresa_id=1,
            produto=p,
            tipo=MovTipo.SAIDA_MANUAL,
            quantidade=Decimal("30"),
            consumir_reserva=False,
        )


def test_baixa_mp_consome_reserva():
    db = MagicMock()
    p = FakeProduto(saldo_qtd=Decimal("100"), saldo_reservado=Decimal("40"), saldo_valor=Decimal("1000"))
    apply_stock_move(
        db,
        empresa_id=1,
        produto=p,
        tipo=MovTipo.BAIXA_MP,
        quantidade=Decimal("40"),
        documento_ref="OP-1",
        consumir_reserva=True,
    )
    assert p.saldo_qtd == Decimal("60.0000")
    assert p.saldo_reservado == Decimal("0.0000")


def test_sugestao_lote_compra():
    p = FakeProduto(
        saldo_qtd=Decimal("10"),
        saldo_reservado=Decimal("0"),
        ponto_pedido=Decimal("80"),
        lote_compra=Decimal("100"),
    )
    assert quantidade_sugerida_compra(p) == Decimal("100")
    p2 = FakeProduto(
        saldo_qtd=Decimal("90"),
        ponto_pedido=Decimal("80"),
        lote_compra=Decimal("100"),
    )
    assert quantidade_sugerida_compra(p2) == Decimal("0")


def test_dec_half_up():
    assert dec("1.005", "0.01") == Decimal("1.01")
    assert dec("1.004", "0.01") == Decimal("1.00")
