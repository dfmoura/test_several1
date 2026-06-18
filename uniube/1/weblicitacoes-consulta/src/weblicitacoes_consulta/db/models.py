from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from weblicitacoes_consulta.config import DATABASE_URL, DATA_DIR


class Base(DeclarativeBase):
    pass


class Licitacao(Base):
    __tablename__ = "licitacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_codigo: Mapped[str] = mapped_column(String(4), nullable=False)
    empresa_nome: Mapped[str] = mapped_column(String(200), nullable=False)
    ano: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    processo: Mapped[str] = mapped_column(String(50), nullable=False)
    modalidade: Mapped[str | None] = mapped_column(String(80))
    descricao_edital: Mapped[str] = mapped_column(Text, nullable=False, default="")
    objeto: Mapped[str | None] = mapped_column(Text)
    data_abertura: Mapped[datetime | None] = mapped_column(DateTime)
    habilitacao: Mapped[datetime | None] = mapped_column(DateTime)
    julgamento: Mapped[datetime | None] = mapped_column(DateTime)
    homologacao: Mapped[datetime | None] = mapped_column(DateTime)
    situacao: Mapped[str | None] = mapped_column(String(80), index=True)
    solicitante: Mapped[str | None] = mapped_column(String(200))
    valor_licitacao: Mapped[str | None] = mapped_column(String(80))
    detalhe_url: Mapped[str | None] = mapped_column(Text)
    fonte: Mapped[str] = mapped_column(String(20), nullable=False, default="scraper")
    capturado_em: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("uq_licitacao_empresa_processo_ano", "empresa_codigo", "processo", "ano", unique=True),
        Index("ix_licitacao_empresa_ano", "empresa_codigo", "ano"),
    )


class SyncRun(Base):
    __tablename__ = "sync_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    iniciado_em: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    finalizado_em: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="running")
    novos: Mapped[int] = mapped_column(Integer, default=0)
    atualizados: Mapped[int] = mapped_column(Integer, default=0)
    total_coletados: Mapped[int] = mapped_column(Integer, default=0)
    filtros: Mapped[str | None] = mapped_column(Text)
    mensagem: Mapped[str | None] = mapped_column(Text)


_engine = None
SessionLocal = sessionmaker(expire_on_commit=False)


def get_engine():
    global _engine
    if _engine is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(DATABASE_URL, echo=False)
    return _engine


def init_db() -> None:
    engine = get_engine()
    Base.metadata.create_all(engine)
    SessionLocal.configure(bind=engine)
