from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import Payable, PayableStatus
from ..schemas import PayableCreate, PayableOut, PayablePay, PayableSchedule

router = APIRouter(prefix="/api/finance", tags=["financeiro"])


def _payable_query():
    return select(Payable).options(selectinload(Payable.supplier))


@router.get("/payables", response_model=list[PayableOut])
def list_payables(
    status: str | None = None,
    vencimento_ate: date | None = None,
    db: Session = Depends(get_db),
):
    q = _payable_query().order_by(Payable.vencimento)
    if status:
        q = q.where(Payable.status == PayableStatus(status))
    if vencimento_ate:
        q = q.where(Payable.vencimento <= vencimento_ate)
    return db.scalars(q).all()


@router.get("/payables/summary")
def payables_summary(db: Session = Depends(get_db)):
    today = date.today()
    horizon = today + timedelta(days=30)

    def total(*conditions) -> float:
        return float(
            db.scalar(select(func.coalesce(func.sum(Payable.valor), 0)).where(*conditions)) or 0
        )

    open_status = Payable.status.in_([PayableStatus.ABERTO, PayableStatus.PROGRAMADO])
    return {
        "vencidas": total(open_status, Payable.vencimento < today),
        "vence_hoje": total(open_status, Payable.vencimento == today),
        "proximos_30_dias": total(
            open_status, Payable.vencimento > today, Payable.vencimento <= horizon
        ),
        "total_aberto": total(open_status),
        "pago_no_mes": total(
            Payable.status == PayableStatus.PAGO,
            func.date_trunc("month", Payable.data_pagamento)
            == func.date_trunc("month", func.current_date()),
        ),
    }


@router.post("/payables", response_model=PayableOut, status_code=201)
def create_payable(payload: PayableCreate, db: Session = Depends(get_db)):
    payable = Payable(**payload.model_dump())
    db.add(payable)
    db.commit()
    return db.scalar(_payable_query().where(Payable.id == payable.id))


@router.post("/payables/{payable_id}/schedule", response_model=PayableOut)
def schedule_payable(payable_id: int, payload: PayableSchedule, db: Session = Depends(get_db)):
    payable = db.get(Payable, payable_id)
    if not payable:
        raise HTTPException(404, "Conta não encontrada.")
    if payable.status == PayableStatus.PAGO:
        raise HTTPException(409, "Conta já está paga.")
    payable.status = PayableStatus.PROGRAMADO
    payable.data_programada = payload.data_programada
    if payload.forma_pagamento:
        payable.forma_pagamento = payload.forma_pagamento
    db.commit()
    return db.scalar(_payable_query().where(Payable.id == payable_id))


@router.post("/payables/{payable_id}/pay", response_model=PayableOut)
def pay_payable(payable_id: int, payload: PayablePay, db: Session = Depends(get_db)):
    payable = db.get(Payable, payable_id)
    if not payable:
        raise HTTPException(404, "Conta não encontrada.")
    if payable.status == PayableStatus.PAGO:
        raise HTTPException(409, "Conta já está paga.")
    payable.status = PayableStatus.PAGO
    payable.data_pagamento = payload.data_pagamento
    payable.valor_pago = payload.valor_pago if payload.valor_pago is not None else payable.valor
    if payload.forma_pagamento:
        payable.forma_pagamento = payload.forma_pagamento
    db.commit()
    return db.scalar(_payable_query().where(Payable.id == payable_id))


@router.post("/payables/{payable_id}/cancel", response_model=PayableOut)
def cancel_payable(payable_id: int, db: Session = Depends(get_db)):
    payable = db.get(Payable, payable_id)
    if not payable:
        raise HTTPException(404, "Conta não encontrada.")
    if payable.status == PayableStatus.PAGO:
        raise HTTPException(409, "Conta já está paga; estorne manualmente se necessário.")
    payable.status = PayableStatus.CANCELADO
    db.commit()
    return db.scalar(_payable_query().where(Payable.id == payable_id))
