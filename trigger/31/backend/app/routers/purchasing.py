from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import (
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    Requisition,
    RequisitionItem,
    RequisitionStatus,
)
from ..schemas import (
    PurchaseOrderCreate,
    PurchaseOrderOut,
    RequisitionCreate,
    RequisitionOut,
)

router = APIRouter(prefix="/api/purchasing", tags=["compras"])


# ------------------------------------------------------------- requisições


@router.get("/requisitions", response_model=list[RequisitionOut])
def list_requisitions(db: Session = Depends(get_db)):
    q = (
        select(Requisition)
        .options(selectinload(Requisition.items))
        .order_by(Requisition.created_at.desc())
    )
    return db.scalars(q).all()


@router.post("/requisitions", response_model=RequisitionOut, status_code=201)
def create_requisition(payload: RequisitionCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(400, "Inclua ao menos um item na requisição.")
    req = Requisition(solicitante=payload.solicitante, observacao=payload.observacao)
    for item in payload.items:
        req.items.append(RequisitionItem(**item.model_dump()))
    db.add(req)
    db.commit()
    return db.scalar(
        select(Requisition).options(selectinload(Requisition.items)).where(Requisition.id == req.id)
    )


@router.post("/requisitions/{req_id}/status", response_model=RequisitionOut)
def set_requisition_status(req_id: int, status: str, db: Session = Depends(get_db)):
    req = db.scalar(
        select(Requisition).options(selectinload(Requisition.items)).where(Requisition.id == req_id)
    )
    if not req:
        raise HTTPException(404, "Requisição não encontrada.")
    try:
        req.status = RequisitionStatus(status)
    except ValueError:
        raise HTTPException(400, f"Status inválido: {status}")
    db.commit()
    return req


# ------------------------------------------------------------- pedidos


def _order_query():
    return select(PurchaseOrder).options(
        selectinload(PurchaseOrder.items),
        selectinload(PurchaseOrder.supplier),
    )


@router.get("/orders", response_model=list[PurchaseOrderOut])
def list_orders(status: str | None = None, db: Session = Depends(get_db)):
    q = _order_query().order_by(PurchaseOrder.created_at.desc())
    if status:
        q = q.where(PurchaseOrder.status == PurchaseOrderStatus(status))
    return db.scalars(q).all()


@router.post("/orders", response_model=PurchaseOrderOut, status_code=201)
def create_order(payload: PurchaseOrderCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(400, "Inclua ao menos um item no pedido.")
    order = PurchaseOrder(
        supplier_id=payload.supplier_id,
        requisition_id=payload.requisition_id,
        previsao_entrega=payload.previsao_entrega,
        condicao_pagamento=payload.condicao_pagamento,
        observacao=payload.observacao,
    )
    for item in payload.items:
        order.items.append(PurchaseOrderItem(**item.model_dump()))
    db.add(order)

    if payload.requisition_id:
        req = db.get(Requisition, payload.requisition_id)
        if req:
            req.status = RequisitionStatus.ATENDIDA

    db.commit()
    return db.scalar(_order_query().where(PurchaseOrder.id == order.id))


@router.post("/orders/{order_id}/status", response_model=PurchaseOrderOut)
def set_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.scalar(_order_query().where(PurchaseOrder.id == order_id))
    if not order:
        raise HTTPException(404, "Pedido não encontrado.")
    try:
        order.status = PurchaseOrderStatus(status)
    except ValueError:
        raise HTTPException(400, f"Status inválido: {status}")
    db.commit()
    return order
