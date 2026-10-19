from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class Filial(Base):
    __tablename__ = "filial"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    nome: Mapped[str] = mapped_column(String(200))
    cnpj: Mapped[str] = mapped_column(String(14), unique=True)
    municipio: Mapped[str] = mapped_column(String(120))
    uf: Mapped[str] = mapped_column(String(2))
    codigo_ibge: Mapped[int] = mapped_column(Integer)
    situacao: Mapped[str] = mapped_column(String(20), default="ativa")
    cnpj_conferencia_pendente: Mapped[bool] = mapped_column(Boolean, default=True)
    ultima_sync_uasg: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    escopo_alterado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    criada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    atualizada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    papel: Mapped[str] = mapped_column(String(32))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    filial_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("filial.id"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    desativado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Sessao(Base):
    __tablename__ = "sessao"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    criada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ultimo_acesso_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AuditoriaAcesso(Base):
    __tablename__ = "auditoria_acesso"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    instante: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("usuario.id"))
    filial_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("filial.id"))
    evento: Mapped[str] = mapped_column(String(60))
    detalhe: Mapped[str] = mapped_column(Text, default="")


class OrgaoPublico(Base):
    __tablename__ = "orgao_publico"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    cnpj: Mapped[str] = mapped_column(String(14), unique=True)
    nome: Mapped[str] = mapped_column(String(200), default="")
    codigo_orgao: Mapped[int | None] = mapped_column(Integer)
    uf: Mapped[str] = mapped_column(String(2), default="")
    codigo_ibge: Mapped[int | None] = mapped_column(Integer)


class Uasg(Base):
    __tablename__ = "uasg"

    codigo_uasg: Mapped[str] = mapped_column(String(12), primary_key=True)
    nome: Mapped[str] = mapped_column(String(200), default="")
    cnpj_orgao: Mapped[str] = mapped_column(String(14), default="")
    uf: Mapped[str] = mapped_column(String(2), default="")
    codigo_ibge: Mapped[int | None] = mapped_column(Integer)
    ativa_oficial: Mapped[bool] = mapped_column(Boolean, default=True)
    atualizada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class FilialUasg(Base):
    __tablename__ = "filial_uasg"
    __table_args__ = (UniqueConstraint("tenant_id", "codigo_uasg"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    codigo_uasg: Mapped[str] = mapped_column(ForeignKey("uasg.codigo_uasg"))
    aderida: Mapped[bool] = mapped_column(Boolean, default=False)


class Contratacao(Base):
    __tablename__ = "contratacao"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    numero_controle_pncp: Mapped[str] = mapped_column(String(80), unique=True)
    codigo_uasg: Mapped[str] = mapped_column(ForeignKey("uasg.codigo_uasg"))
    cnpj_orgao: Mapped[str] = mapped_column(String(14), default="")
    objeto: Mapped[str] = mapped_column(Text, default="")
    modalidade_id_pncp: Mapped[int | None] = mapped_column(Integer)
    codigo_modalidade: Mapped[int | None] = mapped_column(Integer)
    modalidade_nome: Mapped[str] = mapped_column(String(120), default="")
    situacao: Mapped[str] = mapped_column(String(80), default="")
    valor_estimado: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    valor_homologado: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    data_publicacao: Mapped[date | None] = mapped_column(Date)
    existe_resultado: Mapped[bool] = mapped_column(Boolean, default=False)
    aberta: Mapped[bool] = mapped_column(Boolean, default=True)
    ano: Mapped[int | None] = mapped_column(Integer)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ContratacaoItem(Base):
    __tablename__ = "contratacao_item"
    __table_args__ = (UniqueConstraint("numero_controle_pncp", "numero_item"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    numero_controle_pncp: Mapped[str] = mapped_column(
        ForeignKey("contratacao.numero_controle_pncp")
    )
    numero_item: Mapped[int] = mapped_column(Integer)
    descricao: Mapped[str] = mapped_column(Text, default="")
    tem_resultado: Mapped[bool] = mapped_column(Boolean, default=False)
    cod_item_catalogo: Mapped[str] = mapped_column(String(40), default="")
    tipo_catalogo: Mapped[str] = mapped_column(String(20), default="")
    ni_fornecedor: Mapped[str] = mapped_column(String(14), default="")
    nome_fornecedor: Mapped[str] = mapped_column(String(200), default="")
    valor_total: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResultadoItem(Base):
    __tablename__ = "resultado_item"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    numero_controle_pncp: Mapped[str] = mapped_column(String(80))
    numero_item: Mapped[int] = mapped_column(Integer)
    ni_fornecedor: Mapped[str] = mapped_column(String(14), default="")
    nome_fornecedor: Mapped[str] = mapped_column(String(200), default="")
    data_resultado: Mapped[date | None] = mapped_column(Date)
    valor: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ContratoPncp(Base):
    __tablename__ = "contrato_pncp"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    numero_controle_pncp: Mapped[str] = mapped_column(String(80), unique=True)
    numero_controle_pncp_compra: Mapped[str | None] = mapped_column(String(80))
    cnpj_orgao: Mapped[str] = mapped_column(String(14), default="")
    codigo_uasg: Mapped[str] = mapped_column(String(12), default="")
    objeto: Mapped[str] = mapped_column(Text, default="")
    valor: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    data_assinatura: Mapped[date | None] = mapped_column(Date)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AtaPncp(Base):
    __tablename__ = "ata_pncp"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    numero_controle_pncp: Mapped[str] = mapped_column(String(80), unique=True)
    numero_controle_pncp_compra: Mapped[str | None] = mapped_column(String(80))
    cnpj_orgao: Mapped[str] = mapped_column(String(14), default="")
    codigo_uasg: Mapped[str] = mapped_column(String(12), default="")
    objeto: Mapped[str] = mapped_column(Text, default="")
    valor: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    data_assinatura: Mapped[date | None] = mapped_column(Date)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Observador(Base):
    """Pessoa da filial que acompanha processo. Não é conta de login."""

    __tablename__ = "observador"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    nome: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(200), default="")
    telefone: Mapped[str] = mapped_column(String(40), default="")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Acompanhamento(Base):
    """Vínculo interno da filial com a chave oficial. A coleta não grava nesta tabela."""

    __tablename__ = "acompanhamento"
    __table_args__ = (UniqueConstraint("tenant_id", "alvo_tipo", "alvo_chave"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    alvo_tipo: Mapped[str] = mapped_column(String(40))
    alvo_chave: Mapped[str] = mapped_column(String(80))
    observador_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("observador.id"))


class AnotacaoInterna(Base):
    __tablename__ = "anotacao_interna"
    __table_args__ = (UniqueConstraint("tenant_id", "alvo_tipo", "alvo_chave"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    alvo_tipo: Mapped[str] = mapped_column(String(40))
    alvo_chave: Mapped[str] = mapped_column(String(80))
    texto: Mapped[str] = mapped_column(Text, default="")


class CatalogoItem(Base):
    __tablename__ = "catalogo_item"
    __table_args__ = (UniqueConstraint("codigo", "tipo"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    codigo: Mapped[str] = mapped_column(String(40))
    tipo: Mapped[str] = mapped_column(String(20))
    descricao: Mapped[str] = mapped_column(Text, default="")
    consultado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class CnpjCache(Base):
    __tablename__ = "cnpj_cache"

    cnpj: Mapped[str] = mapped_column(String(14), primary_key=True)
    payload: Mapped[str] = mapped_column(Text, default="")
    consultado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    valido_ate: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CepCache(Base):
    __tablename__ = "cep_cache"

    cep: Mapped[str] = mapped_column(String(8), primary_key=True)
    payload: Mapped[str] = mapped_column(Text, default="")
    consultado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ColetaJob(Base):
    __tablename__ = "coleta_job"
    __table_args__ = (UniqueConstraint("filial_id", "faixa", "tipo", "noite"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    filial_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    faixa: Mapped[str] = mapped_column(String(1))
    tipo: Mapped[str] = mapped_column(String(20))
    noite: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="pendente")
    motivo: Mapped[str] = mapped_column(Text, default="")
    chamadas: Mapped[int] = mapped_column(Integer, default=0)
    iniciado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    terminado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ColetaEtapa(Base):
    __tablename__ = "coleta_etapa"
    __table_args__ = (UniqueConstraint("job_id", "codigo"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("coleta_job.id"))
    codigo: Mapped[str] = mapped_column(String(4))
    status: Mapped[str] = mapped_column(String(20), default="pendente")
    mensagem: Mapped[str] = mapped_column(Text, default="")


class ColetaCursor(Base):
    __tablename__ = "coleta_cursor"
    __table_args__ = (
        UniqueConstraint("filial_id", "codigo_uasg", "tipo", "janela_ini", "janela_fim"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=_uuid)
    filial_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("filial.id"))
    codigo_uasg: Mapped[str] = mapped_column(String(12), default="")
    tipo: Mapped[str] = mapped_column(String(30))
    janela_ini: Mapped[date] = mapped_column(Date)
    janela_fim: Mapped[date] = mapped_column(Date)
    pagina: Mapped[int] = mapped_column(Integer, default=1)
    tamanho_pagina: Mapped[int] = mapped_column(Integer, default=100)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ConfiguracaoAgenda(Base):
    __tablename__ = "configuracao_agenda"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hora: Mapped[int] = mapped_column(Integer, default=2)
    minuto: Mapped[int] = mapped_column(Integer, default=10)
    janela_dias: Mapped[int] = mapped_column(Integer, default=7)
    teto_abertas: Mapped[int] = mapped_column(Integer, default=40)
    orcamento_chamadas: Mapped[int] = mapped_column(Integer, default=300)
    ano_inicial_carga: Mapped[int] = mapped_column(Integer, default=2026)
    backup_hora: Mapped[int] = mapped_column(Integer, default=5)
    backup_minuto: Mapped[int] = mapped_column(Integer, default=10)
    ultimo_filial_id: Mapped[uuid.UUID | None] = mapped_column()
