from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Licitacao(Base):
    """Registro consolidado: listagem (licitacoescon) + detalhes (licitacoesdetalhescon)."""

    __tablename__ = "licitacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Filtros / identificação
    empresa_codigo: Mapped[str | None] = mapped_column(String(4))
    empresa_nome: Mapped[str | None] = mapped_column(String(300))
    ano: Mapped[int | None] = mapped_column(Integer, index=True)

    # Campos da listagem
    processo: Mapped[str | None] = mapped_column(String(80), index=True)
    processo_numero: Mapped[str | None] = mapped_column(String(80))
    modalidade: Mapped[str | None] = mapped_column(String(120))
    descricao_edital: Mapped[str | None] = mapped_column(Text)
    objeto: Mapped[str | None] = mapped_column(Text)
    data_abertura: Mapped[datetime | None] = mapped_column(DateTime)
    data_habilitacao: Mapped[datetime | None] = mapped_column(DateTime)
    data_julgamento: Mapped[datetime | None] = mapped_column(DateTime)
    data_homologacao: Mapped[datetime | None] = mapped_column(DateTime)
    situacao: Mapped[str | None] = mapped_column(String(120), index=True)

    # Campos do CSV / detalhe complementar
    chave: Mapped[str | None] = mapped_column(String(50))
    descricao_habilitacao: Mapped[str | None] = mapped_column(Text)
    solicitante: Mapped[str | None] = mapped_column(String(300))
    valor_licitacao: Mapped[str | None] = mapped_column(String(120))
    valor_licitacao_numerico: Mapped[float | None] = mapped_column(Numeric(18, 2))

    # Campos exclusivos da página de detalhes
    local_abertura: Mapped[str | None] = mapped_column(String(300))
    data_visita_tecnica: Mapped[datetime | None] = mapped_column(DateTime)
    responsavel_visita_tecnica: Mapped[str | None] = mapped_column(String(300))
    local_saida_visita_tecnica: Mapped[str | None] = mapped_column(String(300))
    observacoes: Mapped[str | None] = mapped_column(Text)
    link_pncp: Mapped[str | None] = mapped_column(Text)
    link_compras_gov: Mapped[str | None] = mapped_column(Text)

    # URLs e metadados
    detalhe_url: Mapped[str | None] = mapped_column(Text)
    detalhe_coletado: Mapped[bool] = mapped_column(default=False)
    fonte: Mapped[str | None] = mapped_column(String(30), default="scraper")
    capturado_em: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    atualizado_em: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    arquivos: Mapped[list[LicitacaoArquivo]] = relationship(
        back_populates="licitacao",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "uq_licitacao_empresa_processo_ano",
            "empresa_codigo",
            "processo",
            "ano",
            unique=True,
        ),
        Index("ix_licitacao_empresa_ano", "empresa_codigo", "ano"),
    )


class LicitacaoArquivo(Base):
    __tablename__ = "licitacao_arquivos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    licitacao_id: Mapped[int] = mapped_column(
        ForeignKey("licitacoes.id", ondelete="CASCADE"), index=True
    )
    nome_arquivo: Mapped[str | None] = mapped_column(String(500))
    url_download: Mapped[str | None] = mapped_column(Text)
    ordem: Mapped[int | None] = mapped_column(Integer)

    licitacao: Mapped[Licitacao] = relationship(back_populates="arquivos")


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    iniciado_em: Mapped[datetime | None] = mapped_column(DateTime)
    finalizado_em: Mapped[datetime | None] = mapped_column(DateTime)
    anos: Mapped[str | None] = mapped_column(String(200))
    empresas: Mapped[str | None] = mapped_column(String(200))
    coletar_detalhes: Mapped[bool] = mapped_column(default=True)
    total_coletados: Mapped[int] = mapped_column(Integer, default=0)
    novos: Mapped[int] = mapped_column(Integer, default=0)
    atualizados: Mapped[int] = mapped_column(Integer, default=0)
    detalhes_coletados: Mapped[int] = mapped_column(Integer, default=0)
    mensagem: Mapped[str | None] = mapped_column(Text)
    log: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
