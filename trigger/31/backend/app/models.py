import enum
from datetime import date, datetime, timezone

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------- cadastros


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    cnpj: Mapped[str] = mapped_column(String(14), unique=True, index=True)
    razao_social: Mapped[str] = mapped_column(String(255))
    nome_fantasia: Mapped[str | None] = mapped_column(String(255))
    ie: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    telefone: Mapped[str | None] = mapped_column(String(30))
    cep: Mapped[str | None] = mapped_column(String(8))
    logradouro: Mapped[str | None] = mapped_column(String(255))
    numero: Mapped[str | None] = mapped_column(String(20))
    complemento: Mapped[str | None] = mapped_column(String(100))
    bairro: Mapped[str | None] = mapped_column(String(100))
    municipio: Mapped[str | None] = mapped_column(String(100))
    uf: Mapped[str | None] = mapped_column(String(2))
    observacao: Mapped[str | None] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    product_codes: Mapped[list["SupplierProductCode"]] = relationship(back_populates="supplier")


class ProductUnit(str, enum.Enum):
    M2 = "M2"       # metro quadrado
    ML = "ML"       # metro linear
    UN = "UN"
    KG = "KG"
    RL = "RL"       # rolo/bobina


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str | None] = mapped_column(String(50), unique=True)
    descricao: Mapped[str] = mapped_column(String(255), index=True)
    grupo: Mapped[str | None] = mapped_column(String(100), index=True)  # FOSCO, COUCHE, TERMICO, BOPP...
    unidade: Mapped[ProductUnit] = mapped_column(Enum(ProductUnit), default=ProductUnit.M2)
    largura_mm: Mapped[float | None] = mapped_column(Float)
    comprimento_m: Mapped[float | None] = mapped_column(Float)
    gramatura: Mapped[str | None] = mapped_column(String(20))
    ncm: Mapped[str | None] = mapped_column(String(8))
    localizacao: Mapped[str | None] = mapped_column(String(50))
    estoque_minimo: Mapped[float] = mapped_column(Float, default=0)
    custo_medio: Mapped[float | None] = mapped_column(Float)
    observacao: Mapped[str | None] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SupplierProductCode(Base):
    """De/para entre o código do produto no fornecedor (cProd do XML) e o produto interno."""

    __tablename__ = "supplier_product_codes"
    __table_args__ = (UniqueConstraint("supplier_id", "codigo_fornecedor"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    codigo_fornecedor: Mapped[str] = mapped_column(String(60))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))

    supplier: Mapped[Supplier] = relationship(back_populates="product_codes")
    product: Mapped[Product] = relationship()


# ---------------------------------------------------------------- compras


class RequisitionStatus(str, enum.Enum):
    ABERTA = "ABERTA"
    APROVADA = "APROVADA"
    REPROVADA = "REPROVADA"
    ATENDIDA = "ATENDIDA"


class Requisition(Base):
    __tablename__ = "requisitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    solicitante: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[RequisitionStatus] = mapped_column(
        Enum(RequisitionStatus), default=RequisitionStatus.ABERTA
    )
    observacao: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    items: Mapped[list["RequisitionItem"]] = relationship(
        back_populates="requisition", cascade="all, delete-orphan"
    )


class RequisitionItem(Base):
    __tablename__ = "requisition_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    requisition_id: Mapped[int] = mapped_column(ForeignKey("requisitions.id"))
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))
    descricao: Mapped[str] = mapped_column(String(255))
    quantidade: Mapped[float] = mapped_column(Float)
    unidade: Mapped[str] = mapped_column(String(5), default="M2")
    observacao: Mapped[str | None] = mapped_column(String(255))

    requisition: Mapped[Requisition] = relationship(back_populates="items")
    product: Mapped[Product | None] = relationship()


class PurchaseOrderStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    ENVIADO = "ENVIADO"
    RECEBIDO = "RECEBIDO"
    CANCELADO = "CANCELADO"


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    requisition_id: Mapped[int | None] = mapped_column(ForeignKey("requisitions.id"))
    status: Mapped[PurchaseOrderStatus] = mapped_column(
        Enum(PurchaseOrderStatus), default=PurchaseOrderStatus.RASCUNHO
    )
    previsao_entrega: Mapped[date | None] = mapped_column(Date)
    condicao_pagamento: Mapped[str | None] = mapped_column(String(100))
    observacao: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    supplier: Mapped[Supplier] = relationship()
    requisition: Mapped[Requisition | None] = relationship()
    items: Mapped[list["PurchaseOrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))
    descricao: Mapped[str] = mapped_column(String(255))
    quantidade: Mapped[float] = mapped_column(Float)
    unidade: Mapped[str] = mapped_column(String(5), default="M2")
    preco_unitario: Mapped[float] = mapped_column(Float, default=0)

    order: Mapped[PurchaseOrder] = relationship(back_populates="items")
    product: Mapped[Product | None] = relationship()


# ---------------------------------------------------------------- NF-e


class NfeStatus(str, enum.Enum):
    PENDENTE = "PENDENTE"
    ACEITA = "ACEITA"
    REJEITADA = "REJEITADA"


class NfeImport(Base):
    __tablename__ = "nfe_imports"

    id: Mapped[int] = mapped_column(primary_key=True)
    chave: Mapped[str] = mapped_column(String(44), unique=True, index=True)
    numero: Mapped[str] = mapped_column(String(20))
    serie: Mapped[str | None] = mapped_column(String(5))
    emitida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    emit_cnpj: Mapped[str] = mapped_column(String(14))
    emit_nome: Mapped[str] = mapped_column(String(255))
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"))
    purchase_order_id: Mapped[int | None] = mapped_column(ForeignKey("purchase_orders.id"))
    valor_produtos: Mapped[float] = mapped_column(Numeric(14, 2))
    valor_total: Mapped[float] = mapped_column(Numeric(14, 2))
    valor_icms: Mapped[float | None] = mapped_column(Numeric(14, 2))
    valor_ipi: Mapped[float | None] = mapped_column(Numeric(14, 2))
    status: Mapped[NfeStatus] = mapped_column(Enum(NfeStatus), default=NfeStatus.PENDENTE)
    xml_filename: Mapped[str | None] = mapped_column(String(255))
    raw_xml: Mapped[str] = mapped_column(Text)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    supplier: Mapped[Supplier | None] = relationship()
    purchase_order: Mapped[PurchaseOrder | None] = relationship()
    items: Mapped[list["NfeItem"]] = relationship(
        back_populates="nfe", cascade="all, delete-orphan", order_by="NfeItem.n_item"
    )
    duplicatas: Mapped[list["NfeDuplicata"]] = relationship(
        back_populates="nfe", cascade="all, delete-orphan", order_by="NfeDuplicata.vencimento"
    )


class NfeItem(Base):
    __tablename__ = "nfe_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    nfe_id: Mapped[int] = mapped_column(ForeignKey("nfe_imports.id"))
    n_item: Mapped[int] = mapped_column(Integer)
    codigo_fornecedor: Mapped[str] = mapped_column(String(60))
    descricao: Mapped[str] = mapped_column(String(255))
    ncm: Mapped[str | None] = mapped_column(String(8))
    cfop: Mapped[str | None] = mapped_column(String(4))
    unidade: Mapped[str] = mapped_column(String(6))
    quantidade: Mapped[float] = mapped_column(Float)
    valor_unitario: Mapped[float] = mapped_column(Float)
    valor_total: Mapped[float] = mapped_column(Float)
    valor_icms: Mapped[float | None] = mapped_column(Float)
    valor_ipi: Mapped[float | None] = mapped_column(Float)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))

    nfe: Mapped[NfeImport] = relationship(back_populates="items")
    product: Mapped[Product | None] = relationship()


class NfeDuplicata(Base):
    __tablename__ = "nfe_duplicatas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nfe_id: Mapped[int] = mapped_column(ForeignKey("nfe_imports.id"))
    numero: Mapped[str] = mapped_column(String(20))
    vencimento: Mapped[date] = mapped_column(Date)
    valor: Mapped[float] = mapped_column(Numeric(14, 2))

    nfe: Mapped[NfeImport] = relationship(back_populates="duplicatas")


# ---------------------------------------------------------------- estoque


class MovementType(str, enum.Enum):
    ENTRADA_NFE = "ENTRADA_NFE"
    ENTRADA_MANUAL = "ENTRADA_MANUAL"
    SAIDA_MANUAL = "SAIDA_MANUAL"
    AJUSTE = "AJUSTE"


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    tipo: Mapped[MovementType] = mapped_column(Enum(MovementType))
    # quantidade assinada na unidade do produto (positiva=entrada, negativa=saída)
    quantidade: Mapped[float] = mapped_column(Float)
    qtd_m2: Mapped[float | None] = mapped_column(Float)
    qtd_ml: Mapped[float | None] = mapped_column(Float)
    custo_unitario: Mapped[float | None] = mapped_column(Float)
    referencia: Mapped[str | None] = mapped_column(String(120))
    nfe_item_id: Mapped[int | None] = mapped_column(ForeignKey("nfe_items.id"))
    observacao: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    product: Mapped[Product] = relationship()


# ---------------------------------------------------------------- financeiro


class PayableStatus(str, enum.Enum):
    ABERTO = "ABERTO"
    PROGRAMADO = "PROGRAMADO"
    PAGO = "PAGO"
    CANCELADO = "CANCELADO"


class Payable(Base):
    __tablename__ = "payables"

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"))
    nfe_id: Mapped[int | None] = mapped_column(ForeignKey("nfe_imports.id"))
    descricao: Mapped[str] = mapped_column(String(255))
    parcela: Mapped[str | None] = mapped_column(String(20))  # ex.: "1/3"
    vencimento: Mapped[date] = mapped_column(Date, index=True)
    valor: Mapped[float] = mapped_column(Numeric(14, 2))
    status: Mapped[PayableStatus] = mapped_column(Enum(PayableStatus), default=PayableStatus.ABERTO)
    data_programada: Mapped[date | None] = mapped_column(Date)
    data_pagamento: Mapped[date | None] = mapped_column(Date)
    valor_pago: Mapped[float | None] = mapped_column(Numeric(14, 2))
    forma_pagamento: Mapped[str | None] = mapped_column(String(50))
    observacao: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    supplier: Mapped[Supplier | None] = relationship()
    nfe: Mapped[NfeImport | None] = relationship()
