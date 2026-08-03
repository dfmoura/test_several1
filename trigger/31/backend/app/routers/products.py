from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import distinct, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product, ProductUnit
from ..schemas import ProductCreate, ProductOut

router = APIRouter(prefix="/api/products", tags=["produtos"])


@router.get("", response_model=list[ProductOut])
def list_products(
    search: str | None = None, grupo: str | None = None, db: Session = Depends(get_db)
):
    q = select(Product).order_by(Product.grupo, Product.descricao)
    if search:
        like = f"%{search}%"
        q = q.where(or_(Product.descricao.ilike(like), Product.sku.ilike(like)))
    if grupo:
        q = q.where(Product.grupo == grupo)
    return db.scalars(q).all()


@router.get("/groups", response_model=list[str])
def list_groups(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(distinct(Product.grupo)).where(Product.grupo.is_not(None)).order_by(Product.grupo)
    ).all()
    return rows


@router.post("", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    if payload.sku and db.scalar(select(Product).where(Product.sku == payload.sku)):
        raise HTTPException(409, "Já existe produto com este SKU.")
    data = payload.model_dump()
    data["unidade"] = ProductUnit(data["unidade"])
    product = Product(**data)
    db.add(product)
    db.commit()
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductCreate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Produto não encontrado.")
    data = payload.model_dump()
    data["unidade"] = ProductUnit(data["unidade"])
    for key, value in data.items():
        setattr(product, key, value)
    db.commit()
    return product


@router.delete("/{product_id}", status_code=204)
def deactivate_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Produto não encontrado.")
    product.ativo = False
    db.commit()
