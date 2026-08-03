from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- fornecedor


class SupplierBase(BaseModel):
    cnpj: str = Field(min_length=14, max_length=18)
    razao_social: str
    nome_fantasia: str | None = None
    ie: str | None = None
    email: str | None = None
    telefone: str | None = None
    cep: str | None = None
    logradouro: str | None = None
    numero: str | None = None
    complemento: str | None = None
    bairro: str | None = None
    municipio: str | None = None
    uf: str | None = None
    observacao: str | None = None
    ativo: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierOut(ORMModel, SupplierBase):
    id: int
    created_at: datetime


# ---------------------------------------------------------------- produto


class ProductBase(BaseModel):
    sku: str | None = None
    descricao: str
    grupo: str | None = None
    unidade: str = "M2"
    largura_mm: float | None = None
    comprimento_m: float | None = None
    gramatura: str | None = None
    ncm: str | None = None
    localizacao: str | None = None
    estoque_minimo: float = 0
    custo_medio: float | None = None
    observacao: str | None = None
    ativo: bool = True


class ProductCreate(ProductBase):
    pass


class ProductOut(ORMModel, ProductBase):
    id: int
    created_at: datetime


# ---------------------------------------------------------------- requisição


class RequisitionItemIn(BaseModel):
    product_id: int | None = None
    descricao: str
    quantidade: float
    unidade: str = "M2"
    observacao: str | None = None


class RequisitionCreate(BaseModel):
    solicitante: str | None = None
    observacao: str | None = None
    items: list[RequisitionItemIn]


class RequisitionItemOut(ORMModel, RequisitionItemIn):
    id: int


class RequisitionOut(ORMModel):
    id: int
    solicitante: str | None
    status: str
    observacao: str | None
    created_at: datetime
    items: list[RequisitionItemOut]


# ---------------------------------------------------------------- pedido


class PurchaseOrderItemIn(BaseModel):
    product_id: int | None = None
    descricao: str
    quantidade: float
    unidade: str = "M2"
    preco_unitario: float = 0


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    requisition_id: int | None = None
    previsao_entrega: date | None = None
    condicao_pagamento: str | None = None
    observacao: str | None = None
    items: list[PurchaseOrderItemIn]


class PurchaseOrderItemOut(ORMModel, PurchaseOrderItemIn):
    id: int


class PurchaseOrderOut(ORMModel):
    id: int
    supplier_id: int
    supplier: SupplierOut | None = None
    requisition_id: int | None
    status: str
    previsao_entrega: date | None
    condicao_pagamento: str | None
    observacao: str | None
    created_at: datetime
    items: list[PurchaseOrderItemOut]


# ---------------------------------------------------------------- NF-e


class NfeItemOut(ORMModel):
    id: int
    n_item: int
    codigo_fornecedor: str
    descricao: str
    ncm: str | None
    cfop: str | None
    unidade: str
    quantidade: float
    valor_unitario: float
    valor_total: float
    valor_icms: float | None
    valor_ipi: float | None
    product_id: int | None
    product: ProductOut | None = None


class NfeDuplicataOut(ORMModel):
    id: int
    numero: str
    vencimento: date
    valor: float


class NfeOut(ORMModel):
    id: int
    chave: str
    numero: str
    serie: str | None
    emitida_em: datetime | None
    emit_cnpj: str
    emit_nome: str
    supplier_id: int | None
    purchase_order_id: int | None
    valor_produtos: float
    valor_total: float
    valor_icms: float | None
    valor_ipi: float | None
    status: str
    xml_filename: str | None
    accepted_at: datetime | None
    created_at: datetime
    items: list[NfeItemOut]
    duplicatas: list[NfeDuplicataOut]


class NfeItemMapping(BaseModel):
    item_id: int
    product_id: int | None = None
    create_product: ProductCreate | None = None


class NfeAcceptRequest(BaseModel):
    mappings: list[NfeItemMapping]
    purchase_order_id: int | None = None
    gerar_financeiro: bool = True


# ---------------------------------------------------------------- estoque


class MovementCreate(BaseModel):
    product_id: int
    tipo: str  # ENTRADA_MANUAL | SAIDA_MANUAL | AJUSTE
    quantidade: float = Field(gt=0)
    unidade_informada: str | None = None  # M2 ou ML, para conversão
    custo_unitario: float | None = None
    referencia: str | None = None
    observacao: str | None = None


class MovementOut(ORMModel):
    id: int
    product_id: int
    product: ProductOut | None = None
    tipo: str
    quantidade: float
    qtd_m2: float | None
    qtd_ml: float | None
    custo_unitario: float | None
    referencia: str | None
    observacao: str | None
    created_at: datetime


class StockBalance(BaseModel):
    product_id: int
    sku: str | None
    descricao: str
    grupo: str | None
    unidade: str
    largura_mm: float | None
    comprimento_m: float | None
    gramatura: str | None
    localizacao: str | None
    estoque_minimo: float
    saldo: float
    saldo_m2: float | None
    saldo_ml: float | None
    custo_medio: float | None
    valor_estoque: float | None


# ---------------------------------------------------------------- financeiro


class PayableCreate(BaseModel):
    supplier_id: int | None = None
    descricao: str
    parcela: str | None = None
    vencimento: date
    valor: float
    observacao: str | None = None


class PayableSchedule(BaseModel):
    data_programada: date
    forma_pagamento: str | None = None


class PayablePay(BaseModel):
    data_pagamento: date
    valor_pago: float | None = None
    forma_pagamento: str | None = None


class PayableOut(ORMModel):
    id: int
    supplier_id: int | None
    supplier: SupplierOut | None = None
    nfe_id: int | None
    descricao: str
    parcela: str | None
    vencimento: date
    valor: float
    status: str
    data_programada: date | None
    data_pagamento: date | None
    valor_pago: float | None
    forma_pagamento: str | None
    observacao: str | None
    created_at: datetime
