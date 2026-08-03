"""Serviços de domínio transversais: códigos, estoque médio, audit."""

from __future__ import annotations

from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import AuditLog, Empresa, EstoqueMovimento, MovTipo, Produto, User


def dec(v: Any, places: str = "0.01") -> Decimal:
    return Decimal(str(v)).quantize(Decimal(places), rounding=ROUND_HALF_UP)


def next_codigo(db: Session, empresa_id: int, model, field_name: str = "codigo", width: int = 4) -> str:
    col = getattr(model, field_name)
    rows = (
        db.query(col)
        .filter(model.empresa_id == empresa_id)
        .order_by(col.desc())
        .limit(50)
        .all()
    )
    best = 0
    for (code,) in rows:
        digits = "".join(ch for ch in str(code) if ch.isdigit())
        if digits:
            best = max(best, int(digits[-width:] if len(digits) >= width else digits))
    return str(best + 1).zfill(width)


def next_business_code(db: Session, prefix: str, model, year: int | None = None) -> str:
    y = year or datetime.utcnow().year
    like = f"{prefix}-{y}-%"
    last = (
        db.query(model.codigo)
        .filter(model.codigo.like(like))
        .order_by(model.codigo.desc())
        .first()
    )
    seq = 1
    if last:
        try:
            seq = int(str(last[0]).split("-")[-1]) + 1
        except ValueError:
            seq = 1
    return f"{prefix}-{y}-{seq:05d}"


def write_audit(
    db: Session,
    *,
    empresa_id: int | None,
    user: User | None,
    acao: str,
    entidade: str,
    entidade_id: str | None = None,
    detalhe: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            empresa_id=empresa_id,
            user_email=user.email if user else None,
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
            detalhe=detalhe,
        )
    )


def apply_stock_move(
    db: Session,
    *,
    empresa_id: int,
    produto: Produto,
    tipo: MovTipo,
    quantidade: Decimal,
    custo_unitario: Decimal = Decimal("0"),
    qtd_m2: Decimal | None = None,
    qtd_ml: Decimal | None = None,
    documento_ref: str | None = None,
    observacao: str | None = None,
    permitir_negativo: bool = False,
    consumir_reserva: bool = True,
    op_id: int | None = None,
    pedido_id: int | None = None,
    devolucao_id: int | None = None,
) -> EstoqueMovimento:
    """Atualiza saldo médio (saldo_qtd, saldo_valor) e gera movimento.

    Saídas validam saldo disponível (saldo − reservado), salvo permitir_negativo.
    RESERVA/LIBERA_RESERVA alteram só saldo_reservado (sem mexer em custo médio).
    """
    q = dec(quantidade, "0.0001")
    cu = dec(custo_unitario, "0.000001")
    link = {"op_id": op_id, "pedido_id": pedido_id, "devolucao_id": devolucao_id}

    if tipo == MovTipo.RESERVA:
        disp = produto.saldo_disponivel
        if q <= 0:
            raise ValueError("Reserva exige quantidade positiva")
        if not permitir_negativo and q > disp:
            raise ValueError(f"Saldo disponível insuficiente ({disp}) para reservar {q}")
        produto.saldo_reservado = dec((produto.saldo_reservado or Decimal("0")) + q, "0.0001")
        mov = EstoqueMovimento(
            empresa_id=empresa_id,
            produto_id=produto.id,
            tipo=tipo,
            quantidade=q,
            qtd_m2=qtd_m2,
            qtd_ml=qtd_ml,
            custo_unitario=Decimal("0"),
            valor_total=Decimal("0"),
            documento_ref=documento_ref,
            observacao=observacao,
            **link,
        )
        db.add(mov)
        return mov

    if tipo == MovTipo.LIBERA_RESERVA:
        if q <= 0:
            raise ValueError("Liberação exige quantidade positiva")
        reservado = produto.saldo_reservado or Decimal("0")
        liberar = min(q, reservado)
        produto.saldo_reservado = dec(reservado - liberar, "0.0001")
        mov = EstoqueMovimento(
            empresa_id=empresa_id,
            produto_id=produto.id,
            tipo=tipo,
            quantidade=-liberar,
            qtd_m2=qtd_m2,
            qtd_ml=qtd_ml,
            custo_unitario=Decimal("0"),
            valor_total=Decimal("0"),
            documento_ref=documento_ref,
            observacao=observacao,
            **link,
        )
        db.add(mov)
        return mov

    entradas = {
        MovTipo.ENTRADA_NFE,
        MovTipo.ENTRADA_MANUAL,
        MovTipo.ENTRADA_PA,
        MovTipo.ENTRADA_SOBRA,
        MovTipo.ENTRADA_DEVOLUCAO,
        MovTipo.ESTORNO,
        MovTipo.AJUSTE,
    }
    signed = q if tipo in entradas else -abs(q)
    if tipo == MovTipo.AJUSTE and q < 0:
        signed = q

    if signed < 0 and not permitir_negativo:
        saida = abs(signed)
        fisico = produto.saldo_qtd or Decimal("0")
        reservado = produto.saldo_reservado or Decimal("0")
        if saida > fisico:
            raise ValueError(f"Saldo insuficiente ({fisico}) para baixar {saida}")
        if consumir_reserva:
            # libera empenho até o volume da baixa (não deixa reserva > físico)
            produto.saldo_reservado = dec(max(Decimal("0"), reservado - saida), "0.0001")
        else:
            disponivel = fisico - reservado
            if saida > disponivel:
                raise ValueError(
                    f"Saldo disponível insuficiente ({disponivel}) para baixar {saida} "
                    f"(reservado {reservado})"
                )

    if signed > 0:
        valor = dec(abs(signed) * cu, "0.01")
        produto.saldo_qtd = dec(produto.saldo_qtd + abs(signed), "0.0001")
        produto.saldo_valor = dec(produto.saldo_valor + valor, "0.01")
    else:
        # saída: baixa pelo custo médio atual
        avg = Decimal("0")
        if produto.saldo_qtd and produto.saldo_qtd > 0:
            avg = dec(produto.saldo_valor / produto.saldo_qtd, "0.000001")
        valor = dec(abs(signed) * avg, "0.01")
        produto.saldo_qtd = dec(produto.saldo_qtd - abs(signed), "0.0001")
        produto.saldo_valor = dec(max(Decimal("0"), produto.saldo_valor - valor), "0.01")
        cu = avg
        # garante reserva não excede saldo físico
        if (produto.saldo_reservado or Decimal("0")) > (produto.saldo_qtd or Decimal("0")):
            produto.saldo_reservado = produto.saldo_qtd or Decimal("0")

    if produto.saldo_qtd <= 0:
        produto.saldo_qtd = Decimal("0")
        produto.saldo_valor = Decimal("0")
        produto.saldo_reservado = Decimal("0")
        produto.custo_medio = Decimal("0")
    else:
        produto.custo_medio = dec(produto.saldo_valor / produto.saldo_qtd, "0.000001")

    mov = EstoqueMovimento(
        empresa_id=empresa_id,
        produto_id=produto.id,
        tipo=tipo,
        quantidade=signed,
        qtd_m2=qtd_m2,
        qtd_ml=qtd_ml,
        custo_unitario=cu,
        valor_total=valor,
        documento_ref=documento_ref,
        observacao=observacao,
        **link,
    )
    db.add(mov)
    return mov


def get_empresa(db: Session, empresa_id: int) -> Empresa:
    emp = db.get(Empresa, empresa_id)
    if not emp:
        raise ValueError("Empresa não encontrada")
    return emp
