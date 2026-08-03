from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import external, finance, nfe, products, purchasing, stock, suppliers

app = FastAPI(
    title="RLP ERP - Compras, Estoque e Financeiro",
    version="1.0.0",
    description=(
        "Sistema de requisições de compra, pedidos, entrada de estoque por XML de NF-e, "
        "movimentações manuais e contas a pagar."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(suppliers.router)
app.include_router(products.router)
app.include_router(purchasing.router)
app.include_router(nfe.router)
app.include_router(stock.router)
app.include_router(finance.router)
app.include_router(external.router)
