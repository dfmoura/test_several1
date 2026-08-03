"""Testes do motor de análise de crédito (domínio trigger/32)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.services.credito import (
    DEFAULT_PARAMS,
    AlcadaLiberacao,
    SituacaoCredito,
    alerta_orcamento,
    avaliar_parceiro,
    liberacao_ainda_valida,
    montar_snapshot_liberacao,
    sugerir_limite_inicial,
    validar_justificativa,
    verificar_pedido,
)


def _db_com_somas(*, titulos=0, carteira=0, vencidos=None):
    """Mock mínimo: avalia via funções internas mockáveis."""
    db = MagicMock()
    # somar_titulos / somar_carteira usam query().filter().scalar()
    # listar_titulos_vencidos usa query().filter().order_by().all()
    chain = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value = chain
    chain.order_by.return_value = chain

    def scalar_side():
        # primeira chamada = titulos, segunda = carteira (ordem em avaliar_parceiro)
        if not hasattr(scalar_side, "n"):
            scalar_side.n = 0
        scalar_side.n += 1
        if scalar_side.n == 1:
            return Decimal(str(titulos))
        return Decimal(str(carteira))

    chain.scalar.side_effect = scalar_side
    chain.all.return_value = vencidos or []
    return db


def _titulo(vencimento: date, valor="100", codigo="TIT-1", tid=1):
    return SimpleNamespace(
        id=tid,
        codigo=codigo,
        valor_aberto=Decimal(valor),
        vencimento=vencimento,
    )


def test_sugestao_limite_teto_entrada():
    assert sugerir_limite_inicial(8000) == Decimal("5000.00")
    assert sugerir_limite_inicial(2000) == Decimal("2000.00")
    assert sugerir_limite_inicial(5000, restricao_bureau=True) == Decimal("0.00")


def test_situacao_normal_dentro_do_limite():
    db = _db_com_somas(titulos=1000, carteira=500)
    a = avaliar_parceiro(db, empresa_id=1, parceiro_id=1, limite=10000)
    assert a.situacao == SituacaoCredito.NORMAL
    assert a.exposicao == Decimal("1500.00")
    assert a.saldo_disponivel == Decimal("8500.00")
    assert not a.bloqueia


def test_situacao_atencao_por_uso_80pct():
    db = _db_com_somas(titulos=8000, carteira=0)
    a = avaliar_parceiro(db, empresa_id=1, parceiro_id=1, limite=10000)
    assert a.situacao == SituacaoCredito.ATENCAO
    assert a.pct_uso_limite == Decimal("80.00")


def test_bloqueio_por_limite():
    db = _db_com_somas(titulos=12000, carteira=0)
    a = avaliar_parceiro(db, empresa_id=1, parceiro_id=1, limite=10000)
    assert a.situacao == SituacaoCredito.BLOQUEADO
    assert "LIMITE" in a.motivos_bloqueio


def test_bloqueio_por_atraso_acima_tolerancia():
    venc = date.today() - timedelta(days=10)
    db = _db_com_somas(titulos=100, carteira=0, vencidos=[_titulo(venc)])
    a = avaliar_parceiro(db, empresa_id=1, parceiro_id=1, limite=50000)
    assert a.situacao == SituacaoCredito.BLOQUEADO
    assert "ATRASO" in a.motivos_bloqueio
    assert a.atraso_max_dias == 10


def test_atencao_atraso_dentro_tolerancia():
    venc = date.today() - timedelta(days=2)
    db = _db_com_somas(titulos=100, carteira=0, vencidos=[_titulo(venc)])
    a = avaliar_parceiro(db, empresa_id=1, parceiro_id=1, limite=50000)
    assert a.situacao == SituacaoCredito.ATENCAO
    assert not a.bloqueia


def test_bloqueio_manual_prevalece():
    db = _db_com_somas(titulos=0, carteira=0)
    a = avaliar_parceiro(
        db, empresa_id=1, parceiro_id=1, limite=50000, bloqueio_manual=True
    )
    assert a.situacao == SituacaoCredito.BLOQUEIO_MANUAL


def test_verificar_pedido_libera_automatico():
    db = _db_com_somas(titulos=1000, carteira=0)
    v = verificar_pedido(
        db,
        empresa_id=1,
        parceiro_id=1,
        limite=50000,
        valor_pedido=2000,
        pedido_id=9,
    )
    assert v.libera_automatico
    assert not v.requer_justificativa
    assert v.alcada == AlcadaLiberacao.AUTOMATICA


def test_verificar_pedido_excecao_estouro_pequeno_financeiro():
    # exposição 9500 + pedido 1000 = 10500; limite 10000 → estouro 5%
    db = _db_com_somas(titulos=9500, carteira=0)
    v = verificar_pedido(
        db,
        empresa_id=1,
        parceiro_id=1,
        limite=10000,
        valor_pedido=1000,
        pedido_id=9,
        liberacoes_mes_cliente=0,
    )
    assert not v.libera_automatico
    assert v.requer_justificativa
    assert v.alcada == AlcadaLiberacao.FINANCEIRO


def test_verificar_pedido_estouro_grande_direcao():
    db = _db_com_somas(titulos=9000, carteira=0)
    v = verificar_pedido(
        db,
        empresa_id=1,
        parceiro_id=1,
        limite=10000,
        valor_pedido=3000,  # estouro 20%
        pedido_id=9,
    )
    assert v.alcada == AlcadaLiberacao.DIRECAO


def test_verificar_atraso_exige_direcao():
    venc = date.today() - timedelta(days=15)
    db = _db_com_somas(titulos=100, carteira=0, vencidos=[_titulo(venc)])
    v = verificar_pedido(
        db,
        empresa_id=1,
        parceiro_id=1,
        limite=50000,
        valor_pedido=100,
        pedido_id=1,
    )
    assert v.requer_justificativa
    assert v.alcada == AlcadaLiberacao.DIRECAO


def test_justificativa_minima():
    with pytest.raises(ValueError):
        validar_justificativa("curto")
    assert "Cliente" in validar_justificativa("Cliente pagará o vencido hoje às 16h")


def test_snapshot_e_validade_liberacao():
    db = _db_com_somas(titulos=0, carteira=0)
    v = verificar_pedido(
        db, empresa_id=1, parceiro_id=1, limite=1000, valor_pedido=500, pedido_id=1
    )
    snap = montar_snapshot_liberacao(
        verificacao=v,
        modo="credito",
        justificativa=None,
        user_email="financeiro@rlp.com.br",
        excecao=False,
    )
    assert snap["modo"] == "credito"
    assert liberacao_ainda_valida(snap)
    snap_exp = {**snap, "valido_ate": (date.today() - timedelta(days=1)).isoformat()}
    assert not liberacao_ainda_valida(snap_exp)


def test_alerta_orcamento_nao_bloqueia():
    db = _db_com_somas(titulos=12000, carteira=0)
    a = avaliar_parceiro(db, empresa_id=1, parceiro_id=1, limite=10000)
    alerta = alerta_orcamento(a, 500)
    assert alerta["bloqueante"] is False
    assert alerta["tipo"] == "ALERTA"
    assert alerta["caberia_no_limite"] is False


def test_decimal_half_up_exposicao():
    db = _db_com_somas(titulos="10.555", carteira="0.004")
    a = avaliar_parceiro(db, empresa_id=1, parceiro_id=1, limite=100)
    # 10.56 + 0.00 (0.004→0.00) — dec em cada soma
    assert a.titulos_abertos == Decimal("10.56")
    assert a.carteira_pedidos == Decimal("0.00")
