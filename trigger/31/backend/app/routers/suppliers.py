from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Supplier
from ..schemas import SupplierCreate, SupplierOut

router = APIRouter(prefix="/api/suppliers", tags=["fornecedores"])


def _clean_cnpj(cnpj: str) -> str:
    return "".join(filter(str.isdigit, cnpj))


@router.get("", response_model=list[SupplierOut])
def list_suppliers(search: str | None = None, db: Session = Depends(get_db)):
    q = select(Supplier).order_by(Supplier.razao_social)
    if search:
        like = f"%{search}%"
        q = q.where(
            or_(
                Supplier.razao_social.ilike(like),
                Supplier.nome_fantasia.ilike(like),
                Supplier.cnpj.like(f"%{_clean_cnpj(search)}%") if _clean_cnpj(search) else False,
            )
        )
    return db.scalars(q).all()


@router.post("", response_model=SupplierOut, status_code=201)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)):
    cnpj = _clean_cnpj(payload.cnpj)
    if len(cnpj) != 14:
        raise HTTPException(400, "CNPJ inválido.")
    if db.scalar(select(Supplier).where(Supplier.cnpj == cnpj)):
        raise HTTPException(409, "Já existe fornecedor com este CNPJ.")
    supplier = Supplier(**{**payload.model_dump(), "cnpj": cnpj})
    db.add(supplier)
    db.commit()
    return supplier


@router.put("/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: int, payload: SupplierCreate, db: Session = Depends(get_db)):
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(404, "Fornecedor não encontrado.")
    data = payload.model_dump()
    data["cnpj"] = _clean_cnpj(data["cnpj"])
    for key, value in data.items():
        setattr(supplier, key, value)
    db.commit()
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def deactivate_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.get(Supplier, supplier_id)
    if not supplier:
        raise HTTPException(404, "Fornecedor não encontrado.")
    supplier.ativo = False
    db.commit()
