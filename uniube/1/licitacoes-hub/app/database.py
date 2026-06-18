from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, create_engine, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

from app.config import DATA_DIR, DB_PATH

DATA_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


CAMPOS_PRESERVADOS_SYNC = frozenset({"valor_estimado", "observador_id"})
COMPRAS_CAMPOS_PRESERVADOS_SYNC = frozenset({"observador_id"})
POWERBI_CAMPOS_PRESERVADOS_SYNC = frozenset({"observador_id"})


class Observador(Base):
    __tablename__ = "observadores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200))
    telefone: Mapped[str | None] = mapped_column(String(40))
    ativo: Mapped[bool] = mapped_column(default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    licitacoes: Mapped[list["Licitacao"]] = relationship(back_populates="observador")


class Licitacao(Base):
    __tablename__ = "licitacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    empresa_codigo: Mapped[str] = mapped_column(String(4), nullable=False)
    empresa_nome: Mapped[str] = mapped_column(String(200), nullable=False)
    ano: Mapped[int] = mapped_column(Integer, nullable=False)
    processo: Mapped[str] = mapped_column(String(80), nullable=False)
    modalidade: Mapped[str | None] = mapped_column(String(80))
    descricao_edital: Mapped[str | None] = mapped_column(Text)
    data_abertura: Mapped[str | None] = mapped_column(String(40))
    habilitacao: Mapped[str | None] = mapped_column(Text)
    julgamento: Mapped[str | None] = mapped_column(String(40))
    homologacao: Mapped[str | None] = mapped_column(String(40))
    situacao: Mapped[str | None] = mapped_column(String(80))
    detalhe_url: Mapped[str | None] = mapped_column(Text)
    valor_estimado: Mapped[str | None] = mapped_column(String(80))
    observador_id: Mapped[int | None] = mapped_column(ForeignKey("observadores.id"), index=True)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    observador: Mapped[Observador | None] = relationship(back_populates="licitacoes")

    __table_args__ = (
        Index("uq_lic_empresa_processo_ano", "empresa_codigo", "processo", "ano", unique=True),
    )


class CompraContratacao(Base):
    """Contratações PNCP (Lei 14.133) — API Dados Abertos Compras.gov.br."""

    __tablename__ = "compras_contratacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Chaves e identificação
    id_compra: Mapped[str | None] = mapped_column(String(40), index=True)
    chave_compra: Mapped[str] = mapped_column(String(40), nullable=False)
    numero_controle_pncp: Mapped[str | None] = mapped_column(String(80))
    ano_compra_pncp: Mapped[int | None] = mapped_column(Integer)
    sequencial_compra_pncp: Mapped[int | None] = mapped_column(Integer)

    # Unidade / órgão (campos de consulta)
    unidade_compradora: Mapped[str] = mapped_column(String(10), nullable=False)
    unidade_nome: Mapped[str] = mapped_column(String(200), nullable=False)
    ano: Mapped[int] = mapped_column(Integer, nullable=False)
    numero: Mapped[str | None] = mapped_column(String(40))
    modalidade_codigo: Mapped[str | None] = mapped_column(String(10))
    modalidade_descricao: Mapped[str | None] = mapped_column(String(120))
    objeto: Mapped[str | None] = mapped_column(Text)
    situacao_lista: Mapped[str | None] = mapped_column(String(200))
    processo: Mapped[str | None] = mapped_column(String(80))

    # Órgão entidade
    orgao_entidade_cnpj: Mapped[str | None] = mapped_column(String(20))
    orgao_subrogado_cnpj: Mapped[str | None] = mapped_column(String(20))
    codigo_orgao: Mapped[int | None] = mapped_column(Integer)
    orgao_entidade_razao_social: Mapped[str | None] = mapped_column(String(200))
    orgao_subrogado_razao_social: Mapped[str | None] = mapped_column(String(200))
    orgao_entidade_esfera_id: Mapped[str | None] = mapped_column(String(5))
    orgao_subrogado_esfera_id: Mapped[str | None] = mapped_column(String(5))
    orgao_entidade_poder_id: Mapped[str | None] = mapped_column(String(5))
    orgao_subrogado_poder_id: Mapped[str | None] = mapped_column(String(5))

    # Unidades detalhadas
    unidade_subrogada_codigo_unidade: Mapped[str | None] = mapped_column(String(10))
    unidade_orgao_nome_unidade: Mapped[str | None] = mapped_column(String(200))
    unidade_subrogada_nome_unidade: Mapped[str | None] = mapped_column(String(200))
    unidade_orgao_uf_sigla: Mapped[str | None] = mapped_column(String(2))
    unidade_subrogada_uf_sigla: Mapped[str | None] = mapped_column(String(2))
    unidade_orgao_municipio_nome: Mapped[str | None] = mapped_column(String(120))
    unidade_subrogada_municipio_nome: Mapped[str | None] = mapped_column(String(120))
    unidade_orgao_codigo_ibge: Mapped[int | None] = mapped_column(Integer)
    unidade_subrogada_codigo_ibge: Mapped[int | None] = mapped_column(Integer)

    # Modalidade / disputa / amparo
    modalidade_id_pncp: Mapped[int | None] = mapped_column(Integer)
    srp: Mapped[bool | None] = mapped_column(Boolean)
    modo_disputa_id_pncp: Mapped[int | None] = mapped_column(Integer)
    codigo_modo_disputa: Mapped[int | None] = mapped_column(Integer)
    modo_disputa_nome_pncp: Mapped[str | None] = mapped_column(String(120))
    amparo_legal_codigo_pncp: Mapped[int | None] = mapped_column(Integer)
    amparo_legal_nome: Mapped[str | None] = mapped_column(String(200))
    amparo_legal_descricao: Mapped[str | None] = mapped_column(Text)

    # Situação / instrumento
    existe_resultado: Mapped[bool | None] = mapped_column(Boolean)
    orcamento_sigiloso_codigo: Mapped[int | None] = mapped_column(Integer)
    orcamento_sigiloso_descricao: Mapped[str | None] = mapped_column(String(200))
    situacao_compra_id_pncp: Mapped[int | None] = mapped_column(Integer)
    situacao_compra_nome_pncp: Mapped[str | None] = mapped_column(String(200))
    tipo_instrumento_convocatorio_codigo_pncp: Mapped[int | None] = mapped_column(Integer)
    tipo_instrumento_convocatorio_nome: Mapped[str | None] = mapped_column(String(200))
    contratacao_excluida: Mapped[bool | None] = mapped_column(Boolean)

    # Valores e datas PNCP
    informacao_complementar: Mapped[str | None] = mapped_column(Text)
    valor_total_estimado: Mapped[str | None] = mapped_column(String(80))
    valor_total_homologado: Mapped[str | None] = mapped_column(String(80))
    data_inclusao_pncp: Mapped[str | None] = mapped_column(String(40))
    data_atualizacao_pncp: Mapped[str | None] = mapped_column(String(40))
    data_publicacao_pncp: Mapped[str | None] = mapped_column(String(40))
    data_abertura_proposta_pncp: Mapped[str | None] = mapped_column(String(40))
    data_encerramento_proposta_pncp: Mapped[str | None] = mapped_column(String(40))
    link_pncp: Mapped[str | None] = mapped_column(Text)
    dados_pncp_json: Mapped[str | None] = mapped_column(Text)

    # Aliases legados (UI municipal)
    url_acompanhamento: Mapped[str | None] = mapped_column(Text)
    data_divulgacao_pncp: Mapped[str | None] = mapped_column(String(40))
    situacao_pncp: Mapped[str | None] = mapped_column(String(200))
    inicio_recebimento_propostas: Mapped[str | None] = mapped_column(String(40))
    fim_recebimento_propostas: Mapped[str | None] = mapped_column(String(40))
    id_contratacao_pncp: Mapped[str | None] = mapped_column(String(80))

    observador_id: Mapped[int | None] = mapped_column(ForeignKey("observadores.id"), index=True)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    observador: Mapped[Observador | None] = relationship()

    __table_args__ = (
        Index("uq_compra_id_compra", "id_compra", unique=True),
    )


class PowerBiLicitacao(Base):
    """Licitações consolidadas — campos do Power BI / CSV PMU."""

    __tablename__ = "powerbi_licitacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ano_processo: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    chave: Mapped[str | None] = mapped_column(String(80))
    processo: Mapped[str] = mapped_column(String(80), nullable=False)
    modalidade: Mapped[str] = mapped_column(String(120), nullable=False)
    objeto: Mapped[str | None] = mapped_column(Text)
    solicitante: Mapped[str | None] = mapped_column(String(200))
    empresa: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    situacao: Mapped[str | None] = mapped_column(String(120), index=True)
    ds_habilitacao: Mapped[str | None] = mapped_column(Text)
    dt_abertura: Mapped[str | None] = mapped_column(String(40))
    dt_habilitacao: Mapped[str | None] = mapped_column(String(40))
    dt_julgamento: Mapped[str | None] = mapped_column(String(40))
    dt_homologacao: Mapped[str | None] = mapped_column(String(40))
    valor_licitacao: Mapped[str | None] = mapped_column(String(80))
    fonte_ano_coleta: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    dados_csv_json: Mapped[str | None] = mapped_column(Text)
    observador_id: Mapped[int | None] = mapped_column(ForeignKey("observadores.id"), index=True)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    observador: Mapped[Observador | None] = relationship()

    __table_args__ = (
        Index(
            "uq_pbi_lic_ano_emp_proc_mod",
            "ano_processo",
            "empresa",
            "processo",
            "modalidade",
            unique=True,
        ),
    )


class PowerBiContrato(Base):
    """Contratos municipais — campos do Power BI / CSV PMU."""

    __tablename__ = "powerbi_contratos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ano_contrato: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    ano_processo: Mapped[int | None] = mapped_column(Integer, index=True)
    ds_objeto_contrato: Mapped[str | None] = mapped_column(Text)
    dt_assinatura: Mapped[str | None] = mapped_column(String(40))
    empresa: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    nm_pessoa: Mapped[str | None] = mapped_column(String(200))
    nr_aditivo: Mapped[str | None] = mapped_column(String(20))
    nr_contrato: Mapped[str] = mapped_column(String(40), nullable=False)
    nr_parcela: Mapped[str | None] = mapped_column(String(20))
    processo: Mapped[str | None] = mapped_column(String(80), index=True)
    vr_inicial: Mapped[str | None] = mapped_column(String(80))
    fonte_ano_coleta: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    dados_csv_json: Mapped[str | None] = mapped_column(Text)
    observador_id: Mapped[int | None] = mapped_column(ForeignKey("observadores.id"), index=True)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    observador: Mapped[Observador | None] = relationship()

    __table_args__ = (
        Index(
            "uq_pbi_con_chave",
            "ano_contrato",
            "empresa",
            "nr_contrato",
            "nr_aditivo",
            "nr_parcela",
            "processo",
            unique=True,
        ),
    )


class PowerBiGestorFiscal(Base):
    """Gestores e fiscais de contratos — campos do Power BI / CSV PMU."""

    __tablename__ = "powerbi_gestores_fiscais"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ano_contrato: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    ds_orgao: Mapped[str | None] = mapped_column(String(200), index=True)
    ds_papeis: Mapped[str | None] = mapped_column(String(120), index=True)
    dt_assinatura: Mapped[str | None] = mapped_column(String(40))
    dt_fim: Mapped[str | None] = mapped_column(String(40))
    dt_inicio: Mapped[str | None] = mapped_column(String(40))
    fornecedor: Mapped[str | None] = mapped_column(String(200), index=True)
    nm_pessoa_papel: Mapped[str] = mapped_column(String(200), nullable=False)
    nr_contrato: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    objeto_contrato: Mapped[str | None] = mapped_column(Text)
    dados_csv_json: Mapped[str | None] = mapped_column(Text)
    observador_id: Mapped[int | None] = mapped_column(ForeignKey("observadores.id"), index=True)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    observador: Mapped[Observador | None] = relationship()

    __table_args__ = (
        Index(
            "uq_pbi_gest_chave",
            "ano_contrato",
            "nr_contrato",
            "ds_orgao",
            "ds_papeis",
            "nm_pessoa_papel",
            "dt_inicio",
            "fornecedor",
            unique=True,
        ),
    )


_POWERBI_LICITACOES_COLUNAS = frozenset(
    {
        "id",
        "ano_processo",
        "chave",
        "processo",
        "modalidade",
        "objeto",
        "solicitante",
        "empresa",
        "situacao",
        "ds_habilitacao",
        "dt_abertura",
        "dt_habilitacao",
        "dt_julgamento",
        "dt_homologacao",
        "valor_licitacao",
        "fonte_ano_coleta",
        "dados_csv_json",
        "observador_id",
        "coletado_em",
    }
)


_COMPRAS_COLUNAS_NOVAS: list[tuple[str, str]] = [
    ("id_compra", "VARCHAR(40)"),
    ("numero_controle_pncp", "VARCHAR(80)"),
    ("ano_compra_pncp", "INTEGER"),
    ("sequencial_compra_pncp", "INTEGER"),
    ("processo", "VARCHAR(80)"),
    ("orgao_entidade_cnpj", "VARCHAR(20)"),
    ("orgao_subrogado_cnpj", "VARCHAR(20)"),
    ("codigo_orgao", "INTEGER"),
    ("orgao_entidade_razao_social", "VARCHAR(200)"),
    ("orgao_subrogado_razao_social", "VARCHAR(200)"),
    ("orgao_entidade_esfera_id", "VARCHAR(5)"),
    ("orgao_subrogado_esfera_id", "VARCHAR(5)"),
    ("orgao_entidade_poder_id", "VARCHAR(5)"),
    ("orgao_subrogado_poder_id", "VARCHAR(5)"),
    ("unidade_subrogada_codigo_unidade", "VARCHAR(10)"),
    ("unidade_orgao_nome_unidade", "VARCHAR(200)"),
    ("unidade_subrogada_nome_unidade", "VARCHAR(200)"),
    ("unidade_orgao_uf_sigla", "VARCHAR(2)"),
    ("unidade_subrogada_uf_sigla", "VARCHAR(2)"),
    ("unidade_orgao_municipio_nome", "VARCHAR(120)"),
    ("unidade_subrogada_municipio_nome", "VARCHAR(120)"),
    ("unidade_orgao_codigo_ibge", "INTEGER"),
    ("unidade_subrogada_codigo_ibge", "INTEGER"),
    ("modalidade_id_pncp", "INTEGER"),
    ("srp", "BOOLEAN"),
    ("modo_disputa_id_pncp", "INTEGER"),
    ("codigo_modo_disputa", "INTEGER"),
    ("modo_disputa_nome_pncp", "VARCHAR(120)"),
    ("amparo_legal_codigo_pncp", "INTEGER"),
    ("amparo_legal_nome", "VARCHAR(200)"),
    ("amparo_legal_descricao", "TEXT"),
    ("existe_resultado", "BOOLEAN"),
    ("orcamento_sigiloso_codigo", "INTEGER"),
    ("orcamento_sigiloso_descricao", "VARCHAR(200)"),
    ("situacao_compra_id_pncp", "INTEGER"),
    ("situacao_compra_nome_pncp", "VARCHAR(200)"),
    ("tipo_instrumento_convocatorio_codigo_pncp", "INTEGER"),
    ("tipo_instrumento_convocatorio_nome", "VARCHAR(200)"),
    ("contratacao_excluida", "BOOLEAN"),
    ("data_inclusao_pncp", "VARCHAR(40)"),
    ("data_atualizacao_pncp", "VARCHAR(40)"),
    ("data_publicacao_pncp", "VARCHAR(40)"),
    ("data_abertura_proposta_pncp", "VARCHAR(40)"),
    ("data_encerramento_proposta_pncp", "VARCHAR(40)"),
    ("dados_pncp_json", "TEXT"),
    ("observador_id", "INTEGER"),
]


def _migrate_powerbi_tables(conn) -> None:
    """Garante schema Power BI — recria tabela legada sem colunas esperadas."""
    for tabela, colunas in (
        ("powerbi_licitacoes", _POWERBI_LICITACOES_COLUNAS),
    ):
        existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({tabela})")).fetchall()}
        if existing and not colunas.issubset(existing):
            conn.execute(text(f"DROP TABLE IF EXISTS {tabela}"))


def _migrate_columns() -> None:
    """Adiciona colunas novas em bancos já existentes (SQLite)."""
    with engine.connect() as conn:
        _migrate_powerbi_tables(conn)
        existing = {
            row[1] for row in conn.execute(text("PRAGMA table_info(licitacoes)")).fetchall()
        }
        if existing and "valor_estimado" not in existing:
            conn.execute(text("ALTER TABLE licitacoes ADD COLUMN valor_estimado VARCHAR(80)"))
        if existing and "observador_id" not in existing:
            conn.execute(text("ALTER TABLE licitacoes ADD COLUMN observador_id INTEGER"))

        compras_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(compras_contratacoes)")).fetchall()
        }
        if compras_cols:
            for nome, tipo in _COMPRAS_COLUNAS_NOVAS:
                if nome not in compras_cols:
                    conn.execute(text(f"ALTER TABLE compras_contratacoes ADD COLUMN {nome} {tipo}"))
            if "id_compra" not in compras_cols:
                conn.execute(
                    text(
                        "UPDATE compras_contratacoes SET id_compra = chave_compra "
                        "WHERE id_compra IS NULL"
                    )
                )
        conn.commit()


def init_db() -> None:
    Base.metadata.create_all(engine)
    _migrate_columns()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
