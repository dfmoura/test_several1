"""Modelos SQLAlchemy — ERP RLP Fase 1."""

from __future__ import annotations

import enum
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- enums


class Role(str, enum.Enum):
    """PER — perfil RBAC (ORGANIZACAO_USUARIOS_PERFIS_ACESSO). Um USR → um PER."""

    ADMIN = "ADMIN"
    FISCAL = "FISCAL"
    COMERCIAL = "COMERCIAL"
    FINANCEIRO = "FINANCEIRO"
    PRODUCAO = "PRODUCAO"
    COMPRAS = "COMPRAS"
    EXPEDICAO = "EXPEDICAO"
    CONSULTA = "CONSULTA"


class ParceiroTipo(str, enum.Enum):
    CLIENTE = "CLIENTE"
    FORNECEDOR = "FORNECEDOR"
    VENDEDOR = "VENDEDOR"
    TRANSPORTADORA = "TRANSPORTADORA"
    COLABORADOR = "COLABORADOR"


class ProdutoTipo(str, enum.Enum):
    INSUMO = "INSUMO"
    ACABADO = "ACABADO"
    SERVICO = "SERVICO"
    REVENDA = "REVENDA"
    EMBALAGEM = "EMBALAGEM"


class Unidade(str, enum.Enum):
    M2 = "M2"
    ML = "ML"
    UN = "UN"
    KG = "KG"
    RL = "RL"


class OrcamentoStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    CALCULADO = "CALCULADO"
    ENVIADO = "ENVIADO"
    APROVADO = "APROVADO"
    REPROVADO = "REPROVADO"
    VENCIDO = "VENCIDO"
    CANCELADO = "CANCELADO"


class PedidoStatus(str, enum.Enum):
    NOVO = "NOVO"
    AGUARDA_CREDITO = "AGUARDA_CREDITO"
    AGUARDA_ADIANTAMENTO = "AGUARDA_ADIANTAMENTO"
    LIBERADO = "LIBERADO"
    EM_PRODUCAO = "EM_PRODUCAO"
    EM_SEPARACAO = "EM_SEPARACAO"
    FATURADO = "FATURADO"
    FATURADO_PARCIAL = "FATURADO_PARCIAL"
    ENTREGUE = "ENTREGUE"
    ENCERRADO = "ENCERRADO"
    CANCELADO = "CANCELADO"


class ItemNatureza(str, enum.Enum):
    PRODUCAO = "PRODUCAO"
    SERVICO = "SERVICO"
    REVENDA = "REVENDA"


class OpStatus(str, enum.Enum):
    ABERTA = "ABERTA"
    EM_ANDAMENTO = "EM_ANDAMENTO"
    CONCLUIDA = "CONCLUIDA"
    CANCELADA = "CANCELADA"


class MovTipo(str, enum.Enum):
    ENTRADA_NFE = "ENTRADA_NFE"
    ENTRADA_MANUAL = "ENTRADA_MANUAL"
    SAIDA_MANUAL = "SAIDA_MANUAL"
    BAIXA_MP = "BAIXA_MP"
    ENTRADA_PA = "ENTRADA_PA"
    ENTRADA_SOBRA = "ENTRADA_SOBRA"
    SAIDA_VENDA = "SAIDA_VENDA"
    ENTRADA_DEVOLUCAO = "ENTRADA_DEVOLUCAO"
    AJUSTE = "AJUSTE"
    ESTORNO = "ESTORNO"
    RESERVA = "RESERVA"
    LIBERA_RESERVA = "LIBERA_RESERVA"


class DevolucaoStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    PENDENTE = "PENDENTE"
    CONCLUIDA = "CONCLUIDA"
    CANCELADA = "CANCELADA"


class BemStatus(str, enum.Enum):
    ATIVO = "ATIVO"
    EM_MANUTENCAO = "EM_MANUTENCAO"
    CEDIDO = "CEDIDO"
    BAIXADO = "BAIXADO"
    VENDIDO = "VENDIDO"


class BemCategoria(str, enum.Enum):
    MAQUINA = "MAQUINA"
    INFORMATICA = "INFORMATICA"
    VEICULO = "VEICULO"
    MOVEL = "MOVEL"
    SOFTWARE = "SOFTWARE"
    OUTRO = "OUTRO"


class NfeStatus(str, enum.Enum):
    PENDENTE = "PENDENTE"
    ACEITA = "ACEITA"
    REJEITADA = "REJEITADA"


class NecessidadeOrigem(str, enum.Enum):
    MINIMO = "MINIMO"
    MANUAL = "MANUAL"
    OP = "OP"


class NecessidadeStatus(str, enum.Enum):
    ABERTA = "ABERTA"
    EM_COMPRA = "EM_COMPRA"
    ATENDIDA = "ATENDIDA"
    CANCELADA = "CANCELADA"


class OrdemCompraStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    ENVIADA = "ENVIADA"
    PARCIAL = "PARCIAL"
    RECEBIDA = "RECEBIDA"
    CANCELADA = "CANCELADA"


class DocFiscalTipo(str, enum.Enum):
    NFE = "NFE"
    NFSE = "NFSE"


class DocFiscalStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    SIMULADO = "SIMULADO"
    AUTORIZADO = "AUTORIZADO"
    CANCELADO = "CANCELADO"
    ERRO = "ERRO"


class TituloTipo(str, enum.Enum):
    RECEBER = "RECEBER"
    PAGAR = "PAGAR"


class TituloStatus(str, enum.Enum):
    ABERTO = "ABERTO"
    PARCIAL = "PARCIAL"
    BAIXADO = "BAIXADO"
    CANCELADO = "CANCELADO"


class CobrancaStatus(str, enum.Enum):
    PENDENTE = "PENDENTE"
    REGISTRADA = "REGISTRADA"
    PAGA = "PAGA"
    CANCELADA = "CANCELADA"
    EXPIRADA = "EXPIRADA"


class EntregaStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    EXPEDIDA = "EXPEDIDA"
    CONFIRMADA = "CONFIRMADA"
    CANCELADA = "CANCELADA"


class CaStatus(str, enum.Enum):
    PENDENTE = "PENDENTE"
    PASS = "PASS"
    FAIL = "FAIL"
    NA = "NA"


# --------------------------------------------------------------------------- empresa / users


class Empresa(Base):
    __tablename__ = "empresas"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True)
    cnpj: Mapped[str] = mapped_column(String(14), unique=True)
    razao_social: Mapped[str] = mapped_column(String(255))
    nome_fantasia: Mapped[str | None] = mapped_column(String(255))
    uf: Mapped[str] = mapped_column(String(2), default="MG")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    vende: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.CONSULTA)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)  # False = bloqueado (nunca apagar)
    bloqueado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    bloqueado_motivo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    empresa: Mapped[Empresa] = relationship()


# --------------------------------------------------------------------------- cadastros


class Parceiro(Base):
    __tablename__ = "parceiros"
    __table_args__ = (UniqueConstraint("empresa_id", "codigo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(20))
    tipos: Mapped[list[Any]] = mapped_column(JSON, default=list)
    cnpj_cpf: Mapped[str | None] = mapped_column(String(14), index=True)
    razao_social: Mapped[str] = mapped_column(String(255))
    nome_fantasia: Mapped[str | None] = mapped_column(String(255))
    ie: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(255))
    telefone: Mapped[str | None] = mapped_column(String(40))
    cep: Mapped[str | None] = mapped_column(String(8))
    logradouro: Mapped[str | None] = mapped_column(String(255))
    numero: Mapped[str | None] = mapped_column(String(20))
    complemento: Mapped[str | None] = mapped_column(String(100))
    bairro: Mapped[str | None] = mapped_column(String(100))
    municipio: Mapped[str | None] = mapped_column(String(100))
    uf: Mapped[str | None] = mapped_column(String(2))
    ibge: Mapped[str | None] = mapped_column(String(7))
    limite_credito: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    # Crédito (§3 INCLUSAO_LIBERACAO_LIMITE_CREDITO_CLIENTE) — campos aditivos
    credito_bloqueio_manual: Mapped[bool] = mapped_column(Boolean, default=False)
    credito_analisado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    credito_validade_ate: Mapped[date | None] = mapped_column(Date)
    credito_condicao_max_ddl: Mapped[int | None] = mapped_column(Integer)
    comissao_pct: Mapped[Decimal | None] = mapped_column(Numeric(7, 4))
    observacao: Mapped[str | None] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Produto(Base):
    __tablename__ = "produtos"
    __table_args__ = (UniqueConstraint("empresa_id", "codigo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(20))
    sku: Mapped[str | None] = mapped_column(String(60))
    descricao: Mapped[str] = mapped_column(String(255), index=True)
    tipo: Mapped[ProdutoTipo] = mapped_column(Enum(ProdutoTipo), default=ProdutoTipo.INSUMO)
    unidade: Mapped[Unidade] = mapped_column(Enum(Unidade), default=Unidade.M2)
    grupo: Mapped[str | None] = mapped_column(String(80))
    ncm: Mapped[str | None] = mapped_column(String(8))
    cest: Mapped[str | None] = mapped_column(String(7))
    origem: Mapped[str | None] = mapped_column(String(1), default="0")
    tipo_item_sped: Mapped[str | None] = mapped_column(String(2))
    csosn: Mapped[str | None] = mapped_column(String(3), default="102")
    cfop_entrada: Mapped[str | None] = mapped_column(String(4))
    cfop_saida_dentro: Mapped[str | None] = mapped_column(String(4))
    cfop_saida_fora: Mapped[str | None] = mapped_column(String(4))
    largura_mm: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    comprimento_m: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    controla_estoque: Mapped[bool] = mapped_column(Boolean, default=True)
    estoque_minimo: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0"))
    ponto_pedido: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0"))
    lote_compra: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0"))
    custo_medio: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    saldo_qtd: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0"))
    saldo_reservado: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0"))
    saldo_valor: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    observacao: Mapped[str | None] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    @property
    def saldo_disponivel(self) -> Decimal:
        q = self.saldo_qtd or Decimal("0")
        r = self.saldo_reservado or Decimal("0")
        d = q - r
        return d if d > 0 else Decimal("0")

    @property
    def limiar_reposicao(self) -> Decimal:
        """Ponto de pedido se configurado; senão estoque mínimo."""
        pp = self.ponto_pedido or Decimal("0")
        if pp > 0:
            return pp
        return self.estoque_minimo or Decimal("0")


class FornecedorProdutoCodigo(Base):
    __tablename__ = "fornecedor_produto_codigos"
    __table_args__ = (UniqueConstraint("parceiro_id", "codigo_fornecedor"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    parceiro_id: Mapped[int] = mapped_column(ForeignKey("parceiros.id"))
    codigo_fornecedor: Mapped[str] = mapped_column(String(60))
    produto_id: Mapped[int] = mapped_column(ForeignKey("produtos.id"))


# --------------------------------------------------------------------------- comercial


class MatrizCobrada(Base):
    __tablename__ = "matrizes_cobradas"
    __table_args__ = (UniqueConstraint("empresa_id", "chave_matriz"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    chave_matriz: Mapped[str] = mapped_column(String(64))
    cliente: Mapped[str] = mapped_column(String(255))
    orcamento_id: Mapped[int | None] = mapped_column(ForeignKey("orcamentos.id"))
    valor: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Orcamento(Base):
    __tablename__ = "orcamentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    parceiro_id: Mapped[int | None] = mapped_column(ForeignKey("parceiros.id"))
    cliente_nome: Mapped[str] = mapped_column(String(255))
    status: Mapped[OrcamentoStatus] = mapped_column(Enum(OrcamentoStatus), default=OrcamentoStatus.RASCUNHO)
    versao: Mapped[int] = mapped_column(Integer, default=1)
    input_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    result_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    chave_matriz: Mapped[str | None] = mapped_column(String(64))
    cobra_matriz: Mapped[bool] = mapped_column(Boolean, default=False)
    valor_matriz: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    prazo_entrega_dias: Mapped[int] = mapped_column(Integer, default=12)
    validade_dias: Mapped[int] = mapped_column(Integer, default=7)
    tolerancia_qtd_pct: Mapped[Decimal] = mapped_column(Numeric(7, 4), default=Decimal("20"))
    faixa_escolhida: Mapped[int | None] = mapped_column(Integer)
    observacao: Mapped[str | None] = mapped_column(Text)
    aprovado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    parceiro: Mapped[Optional[Parceiro]] = relationship()


class Pedido(Base):
    __tablename__ = "pedidos"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    orcamento_id: Mapped[int] = mapped_column(ForeignKey("orcamentos.id"), unique=True)
    parceiro_id: Mapped[int | None] = mapped_column(ForeignKey("parceiros.id"))
    cliente_nome: Mapped[str] = mapped_column(String(255))
    status: Mapped[PedidoStatus] = mapped_column(Enum(PedidoStatus), default=PedidoStatus.NOVO)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    quantidade: Mapped[int] = mapped_column(Integer)
    valor_etiquetas: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    valor_matriz: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    valor_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    credito_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    adiantamento_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    # Snapshot da liberação de crédito (§7.3) — fotografia + validade 7 dias
    credito_liberacao: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    observacao: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    orcamento: Mapped[Orcamento] = relationship()
    itens: Mapped[list[PedidoItem]] = relationship(back_populates="pedido", cascade="all, delete-orphan")


class PedidoItem(Base):
    __tablename__ = "pedido_itens"

    id: Mapped[int] = mapped_column(primary_key=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id"))
    natureza: Mapped[ItemNatureza] = mapped_column(Enum(ItemNatureza), default=ItemNatureza.PRODUCAO)
    descricao: Mapped[str] = mapped_column(String(255))
    quantidade: Mapped[int] = mapped_column(Integer)
    valor_unitario: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    valor_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))

    pedido: Mapped[Pedido] = relationship(back_populates="itens")


# --------------------------------------------------------------------------- produção


class OrdemProducao(Base):
    __tablename__ = "ordens_producao"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id"))
    pedido_item_id: Mapped[int | None] = mapped_column(ForeignKey("pedido_itens.id"))
    tipo: Mapped[str] = mapped_column(String(10), default="OP")  # OP | OS
    status: Mapped[OpStatus] = mapped_column(Enum(OpStatus), default=OpStatus.ABERTA)
    descricao: Mapped[str] = mapped_column(String(255))
    quantidade: Mapped[int] = mapped_column(Integer)
    apontamentos: Mapped[list[Any]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    concluidas_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    pedido: Mapped[Pedido] = relationship()


# --------------------------------------------------------------------------- estoque / compras / nfe


class EstoqueMovimento(Base):
    __tablename__ = "estoque_movimentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    produto_id: Mapped[int] = mapped_column(ForeignKey("produtos.id"), index=True)
    tipo: Mapped[MovTipo] = mapped_column(Enum(MovTipo))
    quantidade: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    qtd_m2: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    qtd_ml: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    custo_unitario: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    valor_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    documento_ref: Mapped[str | None] = mapped_column(String(60))
    observacao: Mapped[str | None] = mapped_column(Text)
    op_id: Mapped[int | None] = mapped_column(ForeignKey("ordens_producao.id"), index=True)
    pedido_id: Mapped[int | None] = mapped_column(ForeignKey("pedidos.id"), index=True)
    devolucao_id: Mapped[int | None] = mapped_column(ForeignKey("devolucoes.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    produto: Mapped[Produto] = relationship()


class NecessidadeCompra(Base):
    """Demanda interna de compra (NEC-) — nasce do mínimo/OP/manual, antes da OC."""

    __tablename__ = "necessidades_compra"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    status: Mapped[NecessidadeStatus] = mapped_column(
        Enum(NecessidadeStatus), default=NecessidadeStatus.ABERTA
    )
    origem: Mapped[NecessidadeOrigem] = mapped_column(
        Enum(NecessidadeOrigem), default=NecessidadeOrigem.MANUAL
    )
    urgencia: Mapped[bool] = mapped_column(Boolean, default=False)
    solicitante: Mapped[str | None] = mapped_column(String(120))
    op_id: Mapped[int | None] = mapped_column(ForeignKey("ordens_producao.id"))
    observacao: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    itens: Mapped[list["NecessidadeCompraItem"]] = relationship(
        back_populates="necessidade", cascade="all, delete-orphan"
    )
    op: Mapped[Optional[OrdemProducao]] = relationship()


class NecessidadeCompraItem(Base):
    __tablename__ = "necessidade_compra_itens"

    id: Mapped[int] = mapped_column(primary_key=True)
    necessidade_id: Mapped[int] = mapped_column(ForeignKey("necessidades_compra.id"))
    produto_id: Mapped[int] = mapped_column(ForeignKey("produtos.id"))
    descricao: Mapped[str] = mapped_column(String(255))
    quantidade: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    unidade: Mapped[str] = mapped_column(String(10), default="M2")
    qtd_atendida: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0"))
    observacao: Mapped[str | None] = mapped_column(String(255))

    necessidade: Mapped[NecessidadeCompra] = relationship(back_populates="itens")
    produto: Mapped[Produto] = relationship()


class OrdemCompra(Base):
    """Ordem de compra formal (OC-) — única via profissional até a NF-e."""

    __tablename__ = "ordens_compra"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    parceiro_id: Mapped[int] = mapped_column(ForeignKey("parceiros.id"))
    necessidade_id: Mapped[int | None] = mapped_column(ForeignKey("necessidades_compra.id"))
    status: Mapped[OrdemCompraStatus] = mapped_column(
        Enum(OrdemCompraStatus), default=OrdemCompraStatus.RASCUNHO
    )
    urgencia: Mapped[bool] = mapped_column(Boolean, default=False)
    previsao_entrega: Mapped[date | None] = mapped_column(Date)
    condicao_pagamento: Mapped[str | None] = mapped_column(String(100))
    observacao: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    parceiro: Mapped[Parceiro] = relationship()
    necessidade: Mapped[Optional[NecessidadeCompra]] = relationship()
    itens: Mapped[list["OrdemCompraItem"]] = relationship(
        back_populates="ordem", cascade="all, delete-orphan"
    )


class OrdemCompraItem(Base):
    __tablename__ = "ordem_compra_itens"

    id: Mapped[int] = mapped_column(primary_key=True)
    ordem_id: Mapped[int] = mapped_column(ForeignKey("ordens_compra.id"))
    produto_id: Mapped[int | None] = mapped_column(ForeignKey("produtos.id"))
    descricao: Mapped[str] = mapped_column(String(255))
    quantidade: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    unidade: Mapped[str] = mapped_column(String(10), default="M2")
    preco_unitario: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=Decimal("0"))
    qtd_recebida: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0"))

    ordem: Mapped[OrdemCompra] = relationship(back_populates="itens")
    produto: Mapped[Optional[Produto]] = relationship()


class NfeImport(Base):
    __tablename__ = "nfe_imports"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    chave: Mapped[str] = mapped_column(String(44), unique=True, index=True)
    numero: Mapped[str] = mapped_column(String(20))
    serie: Mapped[str | None] = mapped_column(String(5))
    emitida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    emit_cnpj: Mapped[str] = mapped_column(String(14))
    emit_nome: Mapped[str] = mapped_column(String(255))
    parceiro_id: Mapped[int | None] = mapped_column(ForeignKey("parceiros.id"))
    ordem_compra_id: Mapped[int | None] = mapped_column(ForeignKey("ordens_compra.id"))
    valor_produtos: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    valor_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    status: Mapped[NfeStatus] = mapped_column(Enum(NfeStatus), default=NfeStatus.PENDENTE)
    xml_content: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    itens: Mapped[list[NfeItem]] = relationship(back_populates="nfe", cascade="all, delete-orphan")
    duplicatas: Mapped[list[NfeDuplicata]] = relationship(back_populates="nfe", cascade="all, delete-orphan")
    ordem_compra: Mapped[Optional[OrdemCompra]] = relationship()


class NfeItem(Base):
    __tablename__ = "nfe_itens"

    id: Mapped[int] = mapped_column(primary_key=True)
    nfe_id: Mapped[int] = mapped_column(ForeignKey("nfe_imports.id"))
    numero_item: Mapped[int] = mapped_column(Integer)
    codigo_produto: Mapped[str | None] = mapped_column(String(60))
    descricao: Mapped[str] = mapped_column(String(255))
    ncm: Mapped[str | None] = mapped_column(String(8))
    unidade: Mapped[str | None] = mapped_column(String(10))
    quantidade: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    valor_unitario: Mapped[Decimal] = mapped_column(Numeric(14, 6))
    valor_total: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    produto_id: Mapped[int | None] = mapped_column(ForeignKey("produtos.id"))

    nfe: Mapped[NfeImport] = relationship(back_populates="itens")


class NfeDuplicata(Base):
    __tablename__ = "nfe_duplicatas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nfe_id: Mapped[int] = mapped_column(ForeignKey("nfe_imports.id"))
    numero: Mapped[str] = mapped_column(String(20))
    vencimento: Mapped[date | None] = mapped_column(Date)
    valor: Mapped[Decimal] = mapped_column(Numeric(14, 2))

    nfe: Mapped[NfeImport] = relationship(back_populates="duplicatas")


# --------------------------------------------------------------------------- fiscal saída / financeiro / entrega


class DocumentoFiscalSaida(Base):
    __tablename__ = "documentos_fiscais_saida"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id"))
    tipo: Mapped[DocFiscalTipo] = mapped_column(Enum(DocFiscalTipo), default=DocFiscalTipo.NFSE)
    status: Mapped[DocFiscalStatus] = mapped_column(Enum(DocFiscalStatus), default=DocFiscalStatus.RASCUNHO)
    numero: Mapped[str | None] = mapped_column(String(20))
    chave: Mapped[str | None] = mapped_column(String(60))
    valor_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    pedido: Mapped[Pedido] = relationship()


class Titulo(Base):
    __tablename__ = "titulos"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    tipo: Mapped[TituloTipo] = mapped_column(Enum(TituloTipo))
    status: Mapped[TituloStatus] = mapped_column(Enum(TituloStatus), default=TituloStatus.ABERTO)
    parceiro_id: Mapped[int | None] = mapped_column(ForeignKey("parceiros.id"))
    pedido_id: Mapped[int | None] = mapped_column(ForeignKey("pedidos.id"))
    nfe_import_id: Mapped[int | None] = mapped_column(ForeignKey("nfe_imports.id"))
    documento_fiscal_id: Mapped[int | None] = mapped_column(ForeignKey("documentos_fiscais_saida.id"))
    descricao: Mapped[str] = mapped_column(String(255))
    valor: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    valor_aberto: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    vencimento: Mapped[date | None] = mapped_column(Date)
    natureza_codigo: Mapped[str] = mapped_column(String(20), default="1.01")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    cobrancas: Mapped[list[Cobranca]] = relationship(back_populates="titulo", cascade="all, delete-orphan")
    baixas: Mapped[list[Baixa]] = relationship(back_populates="titulo", cascade="all, delete-orphan")


class Cobranca(Base):
    __tablename__ = "cobrancas"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    titulo_id: Mapped[int] = mapped_column(ForeignKey("titulos.id"))
    status: Mapped[CobrancaStatus] = mapped_column(Enum(CobrancaStatus), default=CobrancaStatus.PENDENTE)
    provider: Mapped[str] = mapped_column(String(30), default="SIMULADO")
    nosso_numero: Mapped[str | None] = mapped_column(String(40))
    linha_digitavel: Mapped[str | None] = mapped_column(String(80))
    valor: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    vencimento: Mapped[date | None] = mapped_column(Date)
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    titulo: Mapped[Titulo] = relationship(back_populates="cobrancas")


class Baixa(Base):
    __tablename__ = "baixas"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    titulo_id: Mapped[int] = mapped_column(ForeignKey("titulos.id"))
    cobranca_id: Mapped[int | None] = mapped_column(ForeignKey("cobrancas.id"))
    valor: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    pago_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    origem: Mapped[str] = mapped_column(String(40), default="MANUAL")
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    titulo: Mapped[Titulo] = relationship(back_populates="baixas")


class Entrega(Base):
    __tablename__ = "entregas"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id"))
    status: Mapped[EntregaStatus] = mapped_column(Enum(EntregaStatus), default=EntregaStatus.RASCUNHO)
    volumes: Mapped[int] = mapped_column(Integer, default=1)
    rolos: Mapped[int | None] = mapped_column(Integer)
    caixas: Mapped[int | None] = mapped_column(Integer)
    transportadora: Mapped[str | None] = mapped_column(String(120))
    observacao: Mapped[str | None] = mapped_column(Text)
    expedida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirmada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    pedido: Mapped[Pedido] = relationship()


class HomologacaoResultado(Base):
    __tablename__ = "homologacao_resultados"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    criterio_id: Mapped[str] = mapped_column(String(20), index=True)
    status: Mapped[CaStatus] = mapped_column(Enum(CaStatus), default=CaStatus.PENDENTE)
    evidencias: Mapped[str | None] = mapped_column(Text)
    atualizado_por: Mapped[str | None] = mapped_column(String(120))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (UniqueConstraint("empresa_id", "criterio_id"),)


# --------------------------------------------------------------------------- naturezas / patrimônio / devolução


class NaturezaGerencial(Base):
    """Catálogo NAT- — grupos 1–5 (LAI/9.xx proibido)."""

    __tablename__ = "naturezas_gerenciais"
    __table_args__ = (UniqueConstraint("codigo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), index=True)
    descricao: Mapped[str] = mapped_column(String(255))
    grupo: Mapped[int] = mapped_column(Integer)  # 1..5
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    aceita_lancamento: Mapped[bool] = mapped_column(Boolean, default=True)


class BemPatrimonio(Base):
    """Controle gerencial de bens (BEM-NNNNN) — não substitui imobilizado do contador."""

    __tablename__ = "bens_patrimonio"
    __table_args__ = (UniqueConstraint("empresa_id", "codigo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(30))
    descricao: Mapped[str] = mapped_column(String(255))
    categoria: Mapped[BemCategoria] = mapped_column(Enum(BemCategoria), default=BemCategoria.MAQUINA)
    marca: Mapped[str | None] = mapped_column(String(80))
    modelo: Mapped[str | None] = mapped_column(String(80))
    numero_serie: Mapped[str | None] = mapped_column(String(80))
    data_aquisicao: Mapped[date | None] = mapped_column(Date)
    valor_aquisicao: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    local: Mapped[str | None] = mapped_column(String(120))
    responsavel: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[BemStatus] = mapped_column(Enum(BemStatus), default=BemStatus.ATIVO)
    garantia_ate: Mapped[date | None] = mapped_column(Date)
    natureza_aquisicao: Mapped[str] = mapped_column(String(20), default="4.01")
    fornecedor_id: Mapped[int | None] = mapped_column(ForeignKey("parceiros.id"))
    observacao: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Devolucao(Base):
    """DEV-AAAA-NNNNN — espelho fiscal + estoque + financeiro da devolução de venda."""

    __tablename__ = "devolucoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id"))
    documento_fiscal_id: Mapped[int | None] = mapped_column(ForeignKey("documentos_fiscais_saida.id"))
    parceiro_id: Mapped[int | None] = mapped_column(ForeignKey("parceiros.id"))
    status: Mapped[DevolucaoStatus] = mapped_column(Enum(DevolucaoStatus), default=DevolucaoStatus.RASCUNHO)
    motivo: Mapped[str] = mapped_column(String(255))
    valor: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    natureza_codigo: Mapped[str] = mapped_column(String(20), default="1.02.01")
    nf_devolucao_chave: Mapped[str | None] = mapped_column(String(60))
    nf_devolucao_numero: Mapped[str | None] = mapped_column(String(20))
    titulo_estorno_id: Mapped[int | None] = mapped_column(ForeignKey("titulos.id"))
    itens: Mapped[list[Any]] = mapped_column(JSON, default=list)
    observacao: Mapped[str | None] = mapped_column(Text)
    concluida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    pedido: Mapped[Pedido] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int | None] = mapped_column(ForeignKey("empresas.id"))
    user_email: Mapped[str | None] = mapped_column(String(255))
    acao: Mapped[str] = mapped_column(String(80))
    entidade: Mapped[str] = mapped_column(String(80))
    entidade_id: Mapped[str | None] = mapped_column(String(40))
    detalhe: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
