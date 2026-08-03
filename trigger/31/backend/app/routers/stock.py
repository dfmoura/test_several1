from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import MovementType, Product, StockMovement
from ..schemas import MovementCreate, MovementOut, StockBalance
from ..services.stock import compute_measures

router = APIRouter(prefix="/api/stock", tags=["estoque"])


@router.get("/balances", response_model=list[StockBalance])
def balances(grupo: str | None = None, db: Session = Depends(get_db)):
    """Saldo por produto com as medidas em unidade base, m² e metros lineares."""
    sums = (
        select(
            StockMovement.product_id,
            func.coalesce(func.sum(StockMovement.quantidade), 0).label("saldo"),
            func.coalesce(func.sum(StockMovement.qtd_m2), 0).label("saldo_m2"),
            func.coalesce(func.sum(StockMovement.qtd_ml), 0).label("saldo_ml"),
        )
        .group_by(StockMovement.product_id)
        .subquery()
    )
    q = (
        select(Product, sums.c.saldo, sums.c.saldo_m2, sums.c.saldo_ml)
        .outerjoin(sums, sums.c.product_id == Product.id)
        .where(Product.ativo.is_(True))
        .order_by(Product.grupo, Product.descricao)
    )
    if grupo:
        q = q.where(Product.grupo == grupo)

    result = []
    for product, saldo, saldo_m2, saldo_ml in db.execute(q):
        saldo = saldo or 0.0
        result.append(
            StockBalance(
                product_id=product.id,
                sku=product.sku,
                descricao=product.descricao,
                grupo=product.grupo,
                unidade=product.unidade.value,
                largura_mm=product.largura_mm,
                comprimento_m=product.comprimento_m,
                gramatura=product.gramatura,
                localizacao=product.localizacao,
                estoque_minimo=product.estoque_minimo,
                saldo=round(saldo, 3),
                saldo_m2=round(saldo_m2, 3) if saldo_m2 is not None else None,
                saldo_ml=round(saldo_ml, 3) if saldo_ml is not None else None,
                custo_medio=product.custo_medio,
                valor_estoque=round(saldo * product.custo_medio, 2)
                if product.custo_medio
                else None,
            )
        )
    return result


@router.get("/movements", response_model=list[MovementOut])
def list_movements(
    product_id: int | None = None, limit: int = 200, db: Session = Depends(get_db)
):
    q = (
        select(StockMovement)
        .options(selectinload(StockMovement.product))
        .order_by(StockMovement.created_at.desc())
        .limit(limit)
    )
    if product_id:
        q = q.where(StockMovement.product_id == product_id)
    return db.scalars(q).all()


@router.post("/movements", response_model=MovementOut, status_code=201)
def create_movement(payload: MovementCreate, db: Session = Depends(get_db)):
    """Entrada/saída manual ou ajuste. Quantidade sempre positiva; o tipo define o sinal."""
    try:
        tipo = MovementType(payload.tipo)
    except ValueError:
        raise HTTPException(400, f"Tipo inválido: {payload.tipo}")
    if tipo == MovementType.ENTRADA_NFE:
        raise HTTPException(400, "Entradas por NF-e são feitas pela tela de importação de XML.")

    product = db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(404, "Produto não encontrado.")

    base_qty, qtd_m2, qtd_ml = compute_measures(
        product, payload.quantidade, payload.unidade_informada
    )

    sign = -1 if tipo == MovementType.SAIDA_MANUAL else 1
    movement = StockMovement(
        product_id=product.id,
        tipo=tipo,
        quantidade=sign * base_qty,
        qtd_m2=sign * qtd_m2 if qtd_m2 is not None else None,
        qtd_ml=sign * qtd_ml if qtd_ml is not None else None,
        custo_unitario=payload.custo_unitario,
        referencia=payload.referencia,
        observacao=payload.observacao,
    )
    db.add(movement)
    db.commit()
    return db.scalar(
        select(StockMovement)
        .options(selectinload(StockMovement.product))
        .where(StockMovement.id == movement.id)
    )
