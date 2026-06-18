from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.collector import ArquivoRecord, LicitacaoRecord
from app.config import settings
from app.utils import parse_data_br, parse_valor_monetario

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


# Modelos espelhados do backend para worker autônomo no Docker
from sqlalchemy import (  # noqa: E402
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship  # noqa: E402


class Base(DeclarativeBase):
    pass


class Licitacao(Base):
    __tablename__ = "licitacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_codigo: Mapped[str | None] = mapped_column(String(4))
    empresa_nome: Mapped[str | None] = mapped_column(String(300))
    ano: Mapped[int | None] = mapped_column(Integer)
    processo: Mapped[str | None] = mapped_column(String(80))
    processo_numero: Mapped[str | None] = mapped_column(String(80))
    modalidade: Mapped[str | None] = mapped_column(String(120))
    descricao_edital: Mapped[str | None] = mapped_column(Text)
    objeto: Mapped[str | None] = mapped_column(Text)
    data_abertura: Mapped[datetime | None] = mapped_column(DateTime)
    data_habilitacao: Mapped[datetime | None] = mapped_column(DateTime)
    data_julgamento: Mapped[datetime | None] = mapped_column(DateTime)
    data_homologacao: Mapped[datetime | None] = mapped_column(DateTime)
    situacao: Mapped[str | None] = mapped_column(String(120))
    chave: Mapped[str | None] = mapped_column(String(50))
    descricao_habilitacao: Mapped[str | None] = mapped_column(Text)
    solicitante: Mapped[str | None] = mapped_column(String(300))
    valor_licitacao: Mapped[str | None] = mapped_column(String(120))
    valor_licitacao_numerico: Mapped[float | None] = mapped_column(Numeric(18, 2))
    local_abertura: Mapped[str | None] = mapped_column(String(300))
    data_visita_tecnica: Mapped[datetime | None] = mapped_column(DateTime)
    responsavel_visita_tecnica: Mapped[str | None] = mapped_column(String(300))
    local_saida_visita_tecnica: Mapped[str | None] = mapped_column(String(300))
    observacoes: Mapped[str | None] = mapped_column(Text)
    link_pncp: Mapped[str | None] = mapped_column(Text)
    link_compras_gov: Mapped[str | None] = mapped_column(Text)
    detalhe_url: Mapped[str | None] = mapped_column(Text)
    detalhe_coletado: Mapped[bool] = mapped_column(Boolean, default=False)
    fonte: Mapped[str | None] = mapped_column(String(30), default="scraper")
    capturado_em: Mapped[datetime | None] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime, server_default=func.now())

    arquivos: Mapped[list["LicitacaoArquivo"]] = relationship(
        cascade="all, delete-orphan"
    )


class LicitacaoArquivo(Base):
    __tablename__ = "licitacao_arquivos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    licitacao_id: Mapped[int] = mapped_column(ForeignKey("licitacoes.id", ondelete="CASCADE"))
    nome_arquivo: Mapped[str | None] = mapped_column(String(500))
    url_download: Mapped[str | None] = mapped_column(Text)
    ordem: Mapped[int | None] = mapped_column(Integer)


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    iniciado_em: Mapped[datetime | None] = mapped_column(DateTime)
    finalizado_em: Mapped[datetime | None] = mapped_column(DateTime)
    anos: Mapped[str | None] = mapped_column(String(200))
    empresas: Mapped[str | None] = mapped_column(String(200))
    coletar_detalhes: Mapped[bool] = mapped_column(Boolean, default=True)
    total_coletados: Mapped[int] = mapped_column(Integer, default=0)
    novos: Mapped[int] = mapped_column(Integer, default=0)
    atualizados: Mapped[int] = mapped_column(Integer, default=0)
    detalhes_coletados: Mapped[int] = mapped_column(Integer, default=0)
    mensagem: Mapped[str | None] = mapped_column(Text)
    log: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


def record_to_payload(record: LicitacaoRecord) -> dict[str, Any]:
    return {
        "empresa_codigo": record.empresa_codigo,
        "empresa_nome": record.empresa_nome,
        "ano": record.ano,
        "processo": record.processo,
        "processo_numero": record.processo_numero or record.processo,
        "modalidade": record.modalidade,
        "descricao_edital": record.descricao_edital,
        "objeto": record.objeto,
        "data_abertura": parse_data_br(record.data_abertura),
        "data_habilitacao": parse_data_br(record.data_habilitacao),
        "data_julgamento": parse_data_br(record.data_julgamento),
        "data_homologacao": parse_data_br(record.data_homologacao),
        "situacao": record.situacao,
        "chave": record.chave,
        "descricao_habilitacao": record.descricao_habilitacao,
        "solicitante": record.solicitante,
        "valor_licitacao": record.valor_licitacao,
        "valor_licitacao_numerico": parse_valor_monetario(record.valor_licitacao),
        "local_abertura": record.local_abertura,
        "data_visita_tecnica": parse_data_br(record.data_visita_tecnica),
        "responsavel_visita_tecnica": record.responsavel_visita_tecnica,
        "local_saida_visita_tecnica": record.local_saida_visita_tecnica,
        "observacoes": record.observacoes,
        "link_pncp": record.link_pncp,
        "link_compras_gov": record.link_compras_gov,
        "detalhe_url": record.detalhe_url,
        "detalhe_coletado": record.detalhe_coletado,
        "fonte": "scraper",
        "capturado_em": datetime.utcnow(),
    }


def _sync_arquivos(session: Session, lic: Licitacao, arquivos: list[ArquivoRecord]) -> None:
    lic.arquivos.clear()
    for arq in arquivos:
        lic.arquivos.append(
            LicitacaoArquivo(
                nome_arquivo=arq.nome_arquivo,
                url_download=arq.url_download,
                ordem=arq.ordem,
            )
        )


def upsert_record(session: Session, record: LicitacaoRecord) -> str:
    payload = record_to_payload(record)
    existing = session.scalar(
        select(Licitacao)
        .options(selectinload(Licitacao.arquivos))
        .where(
            Licitacao.empresa_codigo == payload["empresa_codigo"],
            Licitacao.processo == payload["processo"],
            Licitacao.ano == payload["ano"],
        )
    )
    if existing:
        for key, value in payload.items():
            if key == "capturado_em":
                continue
            setattr(existing, key, value)
        existing.atualizado_em = datetime.utcnow()
        if record.detalhe_coletado and record.arquivos:
            _sync_arquivos(session, existing, record.arquivos)
        session.commit()
        return "updated"

    lic = Licitacao(**payload)
    for arq in record.arquivos:
        lic.arquivos.append(
            LicitacaoArquivo(
                nome_arquivo=arq.nome_arquivo,
                url_download=arq.url_download,
                ordem=arq.ordem,
            )
        )
    session.add(lic)
    session.commit()
    return "new"


def claim_pending_job(session: Session) -> SyncJob | None:
    job = session.scalar(
        select(SyncJob)
        .where(SyncJob.status == "pending")
        .order_by(SyncJob.criado_em.asc())
        .with_for_update(skip_locked=True)
    )
    if not job:
        return None
    job.status = "running"
    job.iniciado_em = datetime.utcnow()
    session.commit()
    session.refresh(job)
    return job
