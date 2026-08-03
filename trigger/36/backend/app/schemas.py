from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- auth


class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class UserCreateIn(BaseModel):
    email: str
    nome: str
    password: str = Field(min_length=8)
    role: Literal[
        "ADMIN",
        "FISCAL",
        "COMERCIAL",
        "FINANCEIRO",
        "PRODUCAO",
        "COMPRAS",
        "EXPEDICAO",
        "CONSULTA",
    ] = "CONSULTA"


class UserUpdateIn(BaseModel):
    nome: str | None = None
    role: Literal[
        "ADMIN",
        "FISCAL",
        "COMERCIAL",
        "FINANCEIRO",
        "PRODUCAO",
        "COMPRAS",
        "EXPEDICAO",
        "CONSULTA",
    ] | None = None
    password: str | None = Field(default=None, min_length=8)


class UserBlockIn(BaseModel):
    ativo: bool
    motivo: str | None = None


# ---- parceiros


class ParceiroIn(BaseModel):
    tipos: list[str] = Field(default_factory=lambda: ["CLIENTE"])
    cnpj_cpf: str | None = None
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
    ibge: str | None = None
    limite_credito: Decimal = Decimal("0")
    credito_bloqueio_manual: bool = False
    credito_validade_ate: date | None = None
    credito_condicao_max_ddl: int | None = None
    comissao_pct: Decimal | None = None
    observacao: str | None = None
    ativo: bool = True


class ParceiroOut(OrmModel):
    id: int
    codigo: str
    tipos: list[str]
    cnpj_cpf: str | None
    razao_social: str
    nome_fantasia: str | None
    ie: str | None
    email: str | None
    telefone: str | None
    cep: str | None
    logradouro: str | None
    numero: str | None
    complemento: str | None
    bairro: str | None
    municipio: str | None
    uf: str | None
    ibge: str | None
    limite_credito: Decimal
    credito_bloqueio_manual: bool = False
    credito_analisado_em: datetime | None = None
    credito_validade_ate: date | None = None
    credito_condicao_max_ddl: int | None = None
    comissao_pct: Decimal | None
    observacao: str | None
    ativo: bool
    credito: dict[str, Any] | None = None


class SugerirLimiteIn(BaseModel):
    compra_mensal_estimada: Decimal = Decimal("0")
    restricao_bureau: bool = False



# ---- produtos


class ProdutoIn(BaseModel):
    sku: str | None = None
    descricao: str
    tipo: str = "INSUMO"
    unidade: str = "M2"
    grupo: str | None = None
    ncm: str | None = None
    cest: str | None = None
    origem: str | None = "0"
    tipo_item_sped: str | None = None
    csosn: str | None = "102"
    cfop_entrada: str | None = None
    cfop_saida_dentro: str | None = None
    cfop_saida_fora: str | None = None
    largura_mm: Decimal | None = None
    comprimento_m: Decimal | None = None
    controla_estoque: bool = True
    estoque_minimo: Decimal = Decimal("0")
    ponto_pedido: Decimal = Decimal("0")
    lote_compra: Decimal = Decimal("0")
    observacao: str | None = None
    ativo: bool = True


class ProdutoOut(OrmModel):
    id: int
    codigo: str
    sku: str | None
    descricao: str
    tipo: str
    unidade: str
    grupo: str | None
    ncm: str | None
    cest: str | None
    origem: str | None
    tipo_item_sped: str | None
    csosn: str | None
    cfop_entrada: str | None
    cfop_saida_dentro: str | None
    cfop_saida_fora: str | None
    largura_mm: Decimal | None
    comprimento_m: Decimal | None
    controla_estoque: bool
    estoque_minimo: Decimal
    ponto_pedido: Decimal
    lote_compra: Decimal
    custo_medio: Decimal
    saldo_qtd: Decimal
    saldo_reservado: Decimal
    saldo_valor: Decimal
    observacao: str | None
    ativo: bool


# ---- orçamento


class FaixaIn(BaseModel):
    quantidade: int
    comissao_pct: float = 0.0


class OrcamentoCalcularIn(BaseModel):
    cliente: str
    parceiro_id: int | None = None
    medida: str
    largura_cm: float
    puxada_cm: float
    cores: str | int | float
    papel: str
    acabamento: str
    modelos: int = 1
    colunas: int = 1
    etiq_por_rolo: int = 1000
    tubete: str = '1"'
    z: float | None = None
    maquina: str
    maquina_roda_servico: str | None = None
    imposto_pct: float = 16.0
    matriz: str = "SIM"
    coluna_rebobinacao: int = 1
    tipo_troca_produto: str = "SEM PARADA"
    rpm: float = 1000.0
    faixas: list[FaixaIn]
    overrides: dict[str, Any] | None = None
    prazo_entrega_dias: int = 12
    validade_dias: int = 7
    tolerancia_qtd_pct: float = 20.0
    observacao: str | None = None


class OrcamentoOut(OrmModel):
    id: int
    codigo: str
    parceiro_id: int | None
    cliente_nome: str
    status: str
    versao: int
    input_snapshot: dict[str, Any]
    result_snapshot: dict[str, Any] | None
    chave_matriz: str | None
    cobra_matriz: bool
    valor_matriz: Decimal
    prazo_entrega_dias: int
    validade_dias: int
    tolerancia_qtd_pct: Decimal
    faixa_escolhida: int | None
    observacao: str | None
    created_at: datetime


class DecidirIn(BaseModel):
    aprovado: bool
    faixa_index: int = 0
    motivo: str | None = None


# ---- pedido / produção


class LiberarPedidoIn(BaseModel):
    modo: Literal["credito", "adiantamento"] = "credito"
    justificativa: str | None = None


class PedidoOut(OrmModel):
    id: int
    codigo: str
    orcamento_id: int
    parceiro_id: int | None
    cliente_nome: str
    status: str
    quantidade: int
    valor_etiquetas: Decimal
    valor_matriz: Decimal
    valor_total: Decimal
    credito_ok: bool
    adiantamento_ok: bool
    observacao: str | None
    created_at: datetime
    credito: dict[str, Any] | None = None
    credito_liberacao: dict[str, Any] | None = None
    verificacao_credito: dict[str, Any] | None = None


class EmitirFiscalIn(BaseModel):
    tipo: Literal["NFE", "NFSE"] = "NFSE"
    justificativa_credito: str | None = None


class OpOut(OrmModel):
    id: int
    codigo: str
    pedido_id: int
    tipo: str
    status: str
    descricao: str
    quantidade: int
    apontamentos: list[Any]
    created_at: datetime


# ---- estoque


class MovimentoIn(BaseModel):
    produto_id: int
    tipo: Literal["ENTRADA_MANUAL", "SAIDA_MANUAL", "AJUSTE", "RESERVA", "LIBERA_RESERVA"]
    quantidade: Decimal
    unidade_entrada: str = "M2"
    custo_unitario: Decimal = Decimal("0")
    documento_ref: str | None = None
    observacao: str | None = None


class ReservaIn(BaseModel):
    produto_id: int
    quantidade: Decimal
    unidade_entrada: str = "M2"
    documento_ref: str | None = None
    observacao: str | None = None


class AcceptNfeItemIn(BaseModel):
    nfe_item_id: int
    produto_id: int | None = None
    criar_produto: bool = False
    descricao: str | None = None
    tipo: str = "INSUMO"
    unidade: str = "M2"
    grupo: str | None = None
    largura_mm: Decimal | None = None


class AcceptNfeIn(BaseModel):
    itens: list[AcceptNfeItemIn]
    ordem_compra_id: int | None = None


class NecessidadeItemIn(BaseModel):
    produto_id: int
    quantidade: Decimal
    unidade: str | None = None
    descricao: str | None = None
    observacao: str | None = None


class NecessidadeIn(BaseModel):
    itens: list[NecessidadeItemIn]
    origem: Literal["MANUAL", "OP", "MINIMO"] = "MANUAL"
    urgencia: bool = False
    solicitante: str | None = None
    op_id: int | None = None
    observacao: str | None = None


class OrdemCompraItemIn(BaseModel):
    produto_id: int | None = None
    descricao: str | None = None
    quantidade: Decimal
    unidade: str | None = None
    preco_unitario: Decimal = Decimal("0")


class OrdemCompraIn(BaseModel):
    parceiro_id: int
    itens: list[OrdemCompraItemIn]
    necessidade_id: int | None = None
    urgencia: bool = False
    previsao_entrega: date | None = None
    condicao_pagamento: str | None = None
    observacao: str | None = None


class OrdemCompraStatusIn(BaseModel):
    status: Literal["RASCUNHO", "ENVIADA", "PARCIAL", "RECEBIDA", "CANCELADA"]


# ---- financeiro / fiscal / entrega


class BaixaIn(BaseModel):
    valor: Decimal | None = None
    origem: str = "SIMULADO"
    idempotency_key: str | None = None


class EntregaIn(BaseModel):
    volumes: int = 1
    rolos: int | None = None
    caixas: int | None = None
    transportadora: str | None = None
    observacao: str | None = None


class HomologacaoUpdateIn(BaseModel):
    status: Literal["PENDENTE", "PASS", "FAIL", "NA"]
    evidencias: str | None = None
