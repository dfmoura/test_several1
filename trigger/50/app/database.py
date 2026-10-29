"""SQLite + SQLAlchemy — auth + domínio multiunidade (Fase 1)."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    create_engine,
    event,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

from app.config import DATA_DIR, DB_PATH

DATA_DIR.mkdir(parents=True, exist_ok=True)

PAPEIS_USUARIO = frozenset({"admin", "consulta"})
TIPOS_UNIDADE = frozenset({"matriz", "filial"})
PAPEIS_UNIDADE = frozenset(
    {
        "admin_matriz",
        "gestor_matriz",
        "gestor_filial",
        "analista_filial",
        "auditor",
    }
)


def _make_engine(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    eng = create_engine(
        f"sqlite:///{path}",
        connect_args={
            "check_same_thread": False,
            # Evita 500 imediato em login/API enquanto a coleta segura o writer.
            "timeout": 60,
        },
    )

    @event.listens_for(eng, "connect")
    def _sqlite_pragma(dbapi_conn, _connection_record) -> None:  # noqa: ANN001
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=60000")
        cursor.close()

    return eng


engine = _make_engine(DB_PATH)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def configure_engine(path: Path | str) -> None:
    """Reaponta o engine/SessionLocal (uso em testes). Não use em runtime de produção."""
    global engine, SessionLocal
    target = Path(path)
    engine = _make_engine(target)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Usuario(Base):
    """Conta de acesso (login local). Escopo operacional via UsuarioUnidade."""

    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(80), nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    # admin = administrador geral da plataforma; consulta = usuário vinculado a unidades
    papel: Mapped[str] = mapped_column(String(20), nullable=False, default="consulta")
    nome: Mapped[str | None] = mapped_column(String(200))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    sessoes: Mapped[list["Sessao"]] = relationship(
        back_populates="usuario",
        cascade="all, delete-orphan",
    )
    vinculos: Mapped[list["UsuarioUnidade"]] = relationship(
        back_populates="usuario",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("uq_usuarios_username", "username", unique=True),)


class Sessao(Base):
    """Sessão server-side — cookie guarda apenas o token."""

    __tablename__ = "sessoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(String(64), nullable=False)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    unidade_ativa_id: Mapped[int | None] = mapped_column(
        ForeignKey("unidades.id", ondelete="SET NULL"),
        index=True,
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    expira_em: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ultimo_acesso: Mapped[datetime | None] = mapped_column(DateTime)

    usuario: Mapped[Usuario] = relationship(back_populates="sessoes")
    unidade_ativa: Mapped["Unidade | None"] = relationship()

    __table_args__ = (Index("uq_sessoes_token", "token", unique=True),)


class Organizacao(Base):
    """Organização (ex.: Observatório Social Brasil)."""

    __tablename__ = "organizacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(40))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    unidades: Mapped[list["Unidade"]] = relationship(
        back_populates="organizacao",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("uq_organizacoes_codigo", "codigo", unique=True),)


class Unidade(Base):
    """Unidade organizacional — matriz ou filial."""

    __tablename__ = "unidades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organizacao_id: Mapped[int] = mapped_column(
        ForeignKey("organizacoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # matriz | filial
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(40))
    matriz_id: Mapped[int | None] = mapped_column(
        ForeignKey("unidades.id", ondelete="SET NULL"),
        index=True,
    )
    cnpj: Mapped[str | None] = mapped_column(String(14))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    # Fase 3: matriz autoriza a filial a sobrescrever parâmetros permitidos
    excecoes_config_autorizadas: Mapped[bool] = mapped_column(Boolean, default=False)
    observacoes: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    organizacao: Mapped[Organizacao] = relationship(back_populates="unidades")
    matriz: Mapped["Unidade | None"] = relationship(remote_side=[id])
    vinculos: Mapped[list["UsuarioUnidade"]] = relationship(
        back_populates="unidade",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("uq_unidades_org_codigo", "organizacao_id", "codigo", unique=True),
    )


class UsuarioUnidade(Base):
    """Vínculo usuário ↔ unidade com papel no escopo."""

    __tablename__ = "usuario_unidade"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    unidade_id: Mapped[int] = mapped_column(
        ForeignKey("unidades.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    papel: Mapped[str] = mapped_column(String(40), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    usuario: Mapped[Usuario] = relationship(back_populates="vinculos")
    unidade: Mapped[Unidade] = relationship(back_populates="vinculos")

    __table_args__ = (
        Index("uq_usuario_unidade", "usuario_id", "unidade_id", unique=True),
    )


# --- Território / catálogo Compras.gov (Fase 2) ---


class Municipio(Base):
    """Município IBGE — chave oficial codigo_municipio_ibge."""

    __tablename__ = "municipios"

    codigo_ibge: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    uf: Mapped[str] = mapped_column(String(2), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (Index("ix_municipios_uf_nome", "uf", "nome"),)


class FilialMunicipio(Base):
    """Municípios monitorados por filial (histórico preservado ao desativar)."""

    __tablename__ = "filial_municipio"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    unidade_id: Mapped[int] = mapped_column(
        ForeignKey("unidades.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    codigo_municipio_ibge: Mapped[int] = mapped_column(
        ForeignKey("municipios.codigo_ibge"),
        nullable=False,
        index=True,
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    ativado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    desativado_em: Mapped[datetime | None] = mapped_column(DateTime)

    unidade: Mapped[Unidade] = relationship()
    municipio: Mapped[Municipio] = relationship()

    __table_args__ = (
        Index(
            "uq_filial_municipio",
            "unidade_id",
            "codigo_municipio_ibge",
            unique=True,
        ),
    )


class Orgao(Base):
    """Catálogo central de órgãos — módulo 05 (não por filial)."""

    __tablename__ = "orgaos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_orgao: Mapped[int] = mapped_column(Integer, nullable=False)
    cnpj_cpf_orgao: Mapped[str | None] = mapped_column(String(20))
    nome_orgao: Mapped[str | None] = mapped_column(String(200))
    esfera: Mapped[str | None] = mapped_column(String(20))
    poder: Mapped[str | None] = mapped_column(String(20))
    status_orgao: Mapped[bool | None] = mapped_column(Boolean)
    codigo_orgao_superior: Mapped[int | None] = mapped_column(Integer)
    nome_orgao_superior: Mapped[str | None] = mapped_column(String(200))
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    uasgs: Mapped[list["Uasg"]] = relationship(back_populates="orgao")

    __table_args__ = (Index("uq_orgaos_codigo", "codigo_orgao", unique=True),)


class Uasg(Base):
    """Catálogo central de UASGs — módulo 05 (não por filial)."""

    __tablename__ = "uasgs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_uasg: Mapped[str] = mapped_column(String(10), nullable=False)
    orgao_id: Mapped[int | None] = mapped_column(ForeignKey("orgaos.id"), index=True)
    nome_uasg: Mapped[str | None] = mapped_column(String(300))
    sigla_uf: Mapped[str | None] = mapped_column(String(2))
    codigo_municipio_ibge: Mapped[int | None] = mapped_column(Integer, index=True)
    nome_municipio_ibge: Mapped[str | None] = mapped_column(String(120))
    cnpj_cpf_orgao: Mapped[str | None] = mapped_column(String(20))
    status_uasg: Mapped[bool | None] = mapped_column(Boolean)
    uso_sisg: Mapped[bool | None] = mapped_column(Boolean)
    sincronizado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    orgao: Mapped[Orgao | None] = relationship(back_populates="uasgs")

    __table_args__ = (Index("uq_uasgs_codigo", "codigo_uasg", unique=True),)


class FilialUasg(Base):
    """UASGs monitoradas por filial — desativar não apaga histórico."""

    __tablename__ = "filial_uasg"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    unidade_id: Mapped[int] = mapped_column(
        ForeignKey("unidades.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uasg_id: Mapped[int] = mapped_column(
        ForeignKey("uasgs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    ativado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    desativado_em: Mapped[datetime | None] = mapped_column(DateTime)

    unidade: Mapped[Unidade] = relationship()
    uasg: Mapped[Uasg] = relationship()

    __table_args__ = (
        Index("uq_filial_uasg", "unidade_id", "uasg_id", unique=True),
    )


# --- Configuração herdada de coleta (Fase 3) ---

TIPOS_PARAMETRO = frozenset({"string", "int", "bool", "json"})
ESCOPOS_CONFIG = frozenset({"global", "matriz", "filial"})


class ParametroColeta(Base):
    """Catálogo de parâmetros de coleta (definição, não valor)."""

    __tablename__ = "parametros_coleta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chave: Mapped[str] = mapped_column(String(80), nullable=False)
    nome: Mapped[str] = mapped_column(String(160), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text)
    tipo_valor: Mapped[str] = mapped_column(String(20), nullable=False, default="string")
    modulo: Mapped[str | None] = mapped_column(String(40))
    valor_padrao: Mapped[str | None] = mapped_column(Text)
    permite_excecao_filial: Mapped[bool] = mapped_column(Boolean, default=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (Index("uq_parametros_coleta_chave", "chave", unique=True),)


class ConfiguracaoColeta(Base):
    """Configuração por escopo (global | matriz | filial) — uma ativa por escopo."""

    __tablename__ = "configuracoes_coleta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    escopo: Mapped[str] = mapped_column(String(20), nullable=False)
    unidade_id: Mapped[int | None] = mapped_column(
        ForeignKey("unidades.id", ondelete="CASCADE"),
        index=True,
    )
    nome: Mapped[str] = mapped_column(String(160), nullable=False, default="Padrão")
    situacao: Mapped[str] = mapped_column(String(20), nullable=False, default="ativa")
    versao: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    vigencia_inicio: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    vigencia_fim: Mapped[datetime | None] = mapped_column(DateTime)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    unidade: Mapped[Unidade | None] = relationship()
    parametros: Mapped[list["ConfiguracaoColetaParametro"]] = relationship(
        back_populates="configuracao",
        cascade="all, delete-orphan",
    )

    # Unicidade de config ativa por escopo é garantida em service (SQLite
    # permite múltiplos NULL em UNIQUE — inadequado para escopo global).
    __table_args__ = (
        Index("ix_config_coleta_escopo_unidade", "escopo", "unidade_id"),
    )


class ConfiguracaoColetaParametro(Base):
    """Valor de parâmetro em uma configuração."""

    __tablename__ = "configuracao_coleta_parametros"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    configuracao_id: Mapped[int] = mapped_column(
        ForeignKey("configuracoes_coleta.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parametro_id: Mapped[int] = mapped_column(
        ForeignKey("parametros_coleta.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    valor: Mapped[str | None] = mapped_column(Text)
    # definido | herdado (marcação documental; resolução efetiva é em runtime)
    origem_valor: Mapped[str] = mapped_column(String(20), nullable=False, default="definido")
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    configuracao: Mapped[ConfiguracaoColeta] = relationship(back_populates="parametros")
    parametro: Mapped[ParametroColeta] = relationship()

    __table_args__ = (
        Index(
            "uq_config_parametro",
            "configuracao_id",
            "parametro_id",
            unique=True,
        ),
    )


class HistoricoConfiguracao(Base):
    """Auditoria de alterações de configuração."""

    __tablename__ = "historico_configuracao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    configuracao_id: Mapped[int] = mapped_column(
        ForeignKey("configuracoes_coleta.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), index=True)
    data_alteracao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    valores_anteriores: Mapped[str | None] = mapped_column(Text)
    valores_novos: Mapped[str | None] = mapped_column(Text)
    motivo: Mapped[str | None] = mapped_column(String(300))

    configuracao: Mapped[ConfiguracaoColeta] = relationship()
    usuario: Mapped[Usuario | None] = relationship()


# --- Compras.gov módulo 07 — contratações / itens / resultados (Fase 4) ---


class Fornecedor(Base):
    """Fornecedor (NI) — chave de join + enriquecimento CNPJ público."""

    __tablename__ = "fornecedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ni: Mapped[str] = mapped_column(String(14), nullable=False)
    razao_social: Mapped[str | None] = mapped_column(String(200))
    nome_fantasia: Mapped[str | None] = mapped_column(String(200))
    porte: Mapped[str | None] = mapped_column(String(80))
    situacao_cadastral: Mapped[str | None] = mapped_column(String(80))
    natureza_juridica: Mapped[str | None] = mapped_column(String(200))
    codigo_cnae: Mapped[int | None] = mapped_column(Integer)
    nome_cnae: Mapped[str | None] = mapped_column(String(300))
    uf: Mapped[str | None] = mapped_column(String(2))
    municipio: Mapped[str | None] = mapped_column(String(120))
    codigo_municipio_ibge: Mapped[int | None] = mapped_column(Integer)
    cep: Mapped[str | None] = mapped_column(String(8))
    logradouro: Mapped[str | None] = mapped_column(String(200))
    numero: Mapped[str | None] = mapped_column(String(40))
    bairro: Mapped[str | None] = mapped_column(String(120))
    # Enriquecimento CNPJ
    fonte_cnpj: Mapped[str | None] = mapped_column(String(40))
    cnpj_dados_json: Mapped[str | None] = mapped_column(Text)
    cnpj_enriquecido_em: Mapped[datetime | None] = mapped_column(DateTime)
    cnpj_pendente: Mapped[bool] = mapped_column(Boolean, default=True)
    cnpj_ultimo_erro: Mapped[str | None] = mapped_column(Text)
    # Enriquecimento CEP (quando resolvido à parte)
    fonte_cep: Mapped[str | None] = mapped_column(String(40))
    cep_dados_json: Mapped[str | None] = mapped_column(Text)
    cep_enriquecido_em: Mapped[datetime | None] = mapped_column(DateTime)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("uq_fornecedores_ni", "ni", unique=True),
        Index("ix_fornecedores_cnpj_pendente", "cnpj_pendente"),
    )


class CacheCep(Base):
    """Cache de CEP público — independente do fornecedor."""

    __tablename__ = "cache_cep"

    cep: Mapped[str] = mapped_column(String(8), primary_key=True)
    logradouro: Mapped[str | None] = mapped_column(String(200))
    bairro: Mapped[str | None] = mapped_column(String(120))
    municipio: Mapped[str | None] = mapped_column(String(120))
    uf: Mapped[str | None] = mapped_column(String(2))
    codigo_municipio_ibge: Mapped[int | None] = mapped_column(Integer)
    fonte_cep: Mapped[str | None] = mapped_column(String(40))
    cep_dados_json: Mapped[str | None] = mapped_column(Text)
    enriquecido_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ultimo_erro: Mapped[str | None] = mapped_column(Text)
    pendente: Mapped[bool] = mapped_column(Boolean, default=False)


class Contratacao(Base):
    """Contratação PNCP (Lei 14.133) — núcleo consultável por UASG."""

    __tablename__ = "contratacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_compra: Mapped[str] = mapped_column(String(40), nullable=False)
    uasg_id: Mapped[int | None] = mapped_column(ForeignKey("uasgs.id"), index=True)
    unidade_compradora: Mapped[str] = mapped_column(String(10), nullable=False)
    unidade_nome: Mapped[str | None] = mapped_column(String(200))
    ano: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    numero: Mapped[str | None] = mapped_column(String(40))
    numero_controle_pncp: Mapped[str | None] = mapped_column(String(80))
    modalidade_codigo: Mapped[str | None] = mapped_column(String(10))
    modalidade_descricao: Mapped[str | None] = mapped_column(String(120))
    objeto: Mapped[str | None] = mapped_column(Text)
    situacao: Mapped[str | None] = mapped_column(String(200))
    processo: Mapped[str | None] = mapped_column(String(80))
    valor_total_estimado: Mapped[str | None] = mapped_column(String(80))
    valor_total_homologado: Mapped[str | None] = mapped_column(String(80))
    data_publicacao_pncp: Mapped[str | None] = mapped_column(String(40))
    data_abertura_proposta_pncp: Mapped[str | None] = mapped_column(String(40))
    data_encerramento_proposta_pncp: Mapped[str | None] = mapped_column(String(40))
    link_pncp: Mapped[str | None] = mapped_column(Text)
    orgao_entidade_cnpj: Mapped[str | None] = mapped_column(String(20))
    existe_resultado: Mapped[bool | None] = mapped_column(Boolean)
    dados_json: Mapped[str | None] = mapped_column(Text)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    uasg: Mapped[Uasg | None] = relationship()
    itens: Mapped[list["ItemContratacao"]] = relationship(
        back_populates="contratacao",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("uq_contratacoes_id_compra", "id_compra", unique=True),
        Index("ix_contratacoes_unidade", "unidade_compradora"),
        Index("ix_contratacoes_numero_controle", "numero_controle_pncp"),
    )


class UsuarioContratacao(Base):
    """Responsável operacional usuário ↔ contratação (preferência — não é ACL).

    Um responsável ativo por (contratação, filial). Índice parcial único
    criado em ``_migrate_acompanhamento_unico_filial``. Não amplia permissões.
    """

    __tablename__ = "usuario_contratacao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    contratacao_id: Mapped[int] = mapped_column(
        ForeignKey("contratacoes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Filial no momento da associação (auditoria + cobertura rede).
    unidade_id: Mapped[int] = mapped_column(
        ForeignKey("unidades.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index(
            "uq_usuario_contratacao",
            "usuario_id",
            "contratacao_id",
            unique=True,
        ),
        Index("ix_usuario_contratacao_unidade_ativo", "unidade_id", "ativo"),
    )


class ItemContratacao(Base):
    """Item de contratação PNCP — join id_compra / id_compra_item."""

    __tablename__ = "itens_contratacao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_compra_item: Mapped[str] = mapped_column(String(50), nullable=False)
    id_compra: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    contratacao_id: Mapped[int | None] = mapped_column(
        ForeignKey("contratacoes.id", ondelete="CASCADE"),
        index=True,
    )
    numero_item_pncp: Mapped[int | None] = mapped_column(Integer)
    numero_item_compra: Mapped[int | None] = mapped_column(Integer)
    descricao_resumida: Mapped[str | None] = mapped_column(Text)
    descricao_detalhada: Mapped[str | None] = mapped_column(Text)
    material_ou_servico: Mapped[str | None] = mapped_column(String(5))
    material_ou_servico_nome: Mapped[str | None] = mapped_column(String(40))
    cod_item_catalogo: Mapped[int | None] = mapped_column(Integer)
    unidade_medida: Mapped[str | None] = mapped_column(String(40))
    quantidade: Mapped[str | None] = mapped_column(String(40))
    valor_unitario_estimado: Mapped[str | None] = mapped_column(String(80))
    valor_total: Mapped[str | None] = mapped_column(String(80))
    situacao_compra_item_nome: Mapped[str | None] = mapped_column(String(80))
    tem_resultado: Mapped[bool | None] = mapped_column(Boolean)
    dados_json: Mapped[str | None] = mapped_column(Text)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    contratacao: Mapped[Contratacao | None] = relationship(back_populates="itens")
    resultados: Mapped[list["ResultadoItem"]] = relationship(
        back_populates="item",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("uq_itens_id_compra_item", "id_compra_item", unique=True),)


class ResultadoItem(Base):
    """Resultado homologado por item — módulo 07.3."""

    __tablename__ = "resultados_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_compra: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    id_compra_item: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    item_id: Mapped[int | None] = mapped_column(
        ForeignKey("itens_contratacao.id", ondelete="CASCADE"),
        index=True,
    )
    fornecedor_id: Mapped[int | None] = mapped_column(
        ForeignKey("fornecedores.id"),
        index=True,
    )
    sequencial_resultado: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ni_fornecedor: Mapped[str | None] = mapped_column(String(14))
    nome_razao_social_fornecedor: Mapped[str | None] = mapped_column(String(200))
    quantidade_homologada: Mapped[str | None] = mapped_column(String(40))
    valor_unitario_homologado: Mapped[str | None] = mapped_column(String(80))
    valor_total_homologado: Mapped[str | None] = mapped_column(String(80))
    situacao: Mapped[str | None] = mapped_column(String(80))
    porte_fornecedor_nome: Mapped[str | None] = mapped_column(String(80))
    data_resultado_pncp: Mapped[str | None] = mapped_column(String(40))
    percentual_desconto: Mapped[str | None] = mapped_column(String(40))
    dados_json: Mapped[str | None] = mapped_column(Text)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    item: Mapped[ItemContratacao | None] = relationship(back_populates="resultados")
    fornecedor: Mapped[Fornecedor | None] = relationship()

    __table_args__ = (
        Index(
            "uq_resultado_item_seq",
            "id_compra_item",
            "sequencial_resultado",
            unique=True,
        ),
    )


# --- Motor de coleta central (Fase 5) ---

SITUACOES_EXECUCAO = frozenset(
    {
        "pendente",
        "em_execucao",
        "concluida",
        "concluida_com_ressalvas",
        "falha",
        "cancelada",
    }
)
SITUACOES_TAREFA = frozenset(
    {"pendente", "em_execucao", "concluida", "falha", "cancelada"}
)


class ExecucaoColeta(Base):
    """Lote de coleta — uma execução lógica (manual ou agendada)."""

    __tablename__ = "execucoes_coleta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    origem: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    modulo: Mapped[str] = mapped_column(String(40), nullable=False, default="07")
    situacao: Mapped[str] = mapped_column(String(40), nullable=False, default="pendente")
    data_inicial: Mapped[str | None] = mapped_column(String(10))
    data_final: Mapped[str | None] = mapped_column(String(10))
    iniciado_em: Mapped[datetime | None] = mapped_column(DateTime)
    terminado_em: Mapped[datetime | None] = mapped_column(DateTime)
    total_tarefas: Mapped[int] = mapped_column(Integer, default=0)
    tarefas_ok: Mapped[int] = mapped_column(Integer, default=0)
    tarefas_falha: Mapped[int] = mapped_column(Integer, default=0)
    # quantas sequências HTTP efetivas (pós-dedupe)
    sequencias_http: Mapped[int] = mapped_column(Integer, default=0)
    resumo: Mapped[str | None] = mapped_column(Text)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    tarefas: Mapped[list["TarefaColeta"]] = relationship(
        back_populates="execucao",
        cascade="all, delete-orphan",
    )
    usuario: Mapped[Usuario | None] = relationship()

    __table_args__ = (Index("ix_execucoes_coleta_situacao", "situacao"),)


class TarefaColeta(Base):
    """Unidade de trabalho deduplicada: 1 UASG × módulo × período = 1 sequência HTTP."""

    __tablename__ = "tarefas_coleta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    execucao_id: Mapped[int] = mapped_column(
        ForeignKey("execucoes_coleta.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    codigo_uasg: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    uasg_id: Mapped[int | None] = mapped_column(ForeignKey("uasgs.id"), index=True)
    modulo: Mapped[str] = mapped_column(String(40), nullable=False, default="07")
    data_inicial: Mapped[str] = mapped_column(String(10), nullable=False)
    data_final: Mapped[str] = mapped_column(String(10), nullable=False)
    situacao: Mapped[str] = mapped_column(String(40), nullable=False, default="pendente")
    tentativas: Mapped[int] = mapped_column(Integer, default=0)
    # JSON: lista de unidade_id que pediam esta UASG
    filiais_json: Mapped[str | None] = mapped_column(Text)
    contadores_json: Mapped[str | None] = mapped_column(Text)
    erro: Mapped[str | None] = mapped_column(Text)
    iniciado_em: Mapped[datetime | None] = mapped_column(DateTime)
    terminado_em: Mapped[datetime | None] = mapped_column(DateTime)

    execucao: Mapped[ExecucaoColeta] = relationship(back_populates="tarefas")
    uasg: Mapped[Uasg | None] = relationship()

    __table_args__ = (
        Index("ix_tarefas_coleta_exec_sit", "execucao_id", "situacao"),
    )


class AgendamentoColeta(Base):
    """Configuração do disparo diário — linha única (id=1)."""

    __tablename__ = "agendamento_coleta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=False)
    hora_local: Mapped[str] = mapped_column(String(5), nullable=False, default="02:00")
    periodo_dias: Mapped[int] = mapped_column(Integer, nullable=False, default=365)
    ultimo_disparo_chave: Mapped[str | None] = mapped_column(String(20))
    ultimo_execucao_id: Mapped[int | None] = mapped_column(
        ForeignKey("execucoes_coleta.id"),
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class EnriquecimentoPosColeta(Base):
    """Última fase 2 (CNPJ pós-coleta) — linha única (id=1), telemetria ops."""

    __tablename__ = "enriquecimento_pos_coleta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    iniciado_em: Mapped[datetime | None] = mapped_column(DateTime)
    terminado_em: Mapped[datetime | None] = mapped_column(DateTime)
    execucao_coleta_id: Mapped[int | None] = mapped_column(
        ForeignKey("execucoes_coleta.id"),
    )
    total: Mapped[int] = mapped_column(Integer, default=0)
    ok_count: Mapped[int] = mapped_column(Integer, default=0)
    erros: Mapped[int] = mapped_column(Integer, default=0)
    limit_aplicado: Mapped[int] = mapped_column(Integer, default=0)
    max_sec_aplicado: Mapped[float | None] = mapped_column(Float)
    # pulado | fila_vazia | lote | tempo | erro
    motivo_parada: Mapped[str | None] = mapped_column(String(40))
    pendentes_restantes: Mapped[int | None] = mapped_column(Integer)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class ModoAcessoOperacao(Base):
    """Acesso restrito operacional — linha única (id=1).

    App permanece no ar (health + scheduler + jobs); usuários não-admin
    ficam bloqueados no login e nas APIs até o admin liberar.
    """

    __tablename__ = "modo_acesso_operacao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    restrito: Mapped[bool] = mapped_column(Boolean, default=False)
    mensagem: Mapped[str] = mapped_column(
        String(280),
        nullable=False,
        default=(
            "Sistema em janela operacional (coleta/enriquecimento). "
            "Acesso liberado apenas para administradores."
        ),
    )
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime)
    atualizado_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))


class AlertaRegra(Base):
    """Regra de alerta operacional configurável (Fase 9) — analytics nativo."""

    __tablename__ = "alerta_regras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chave: Mapped[str] = mapped_column(String(80), nullable=False)
    nome: Mapped[str] = mapped_column(String(160), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text)
    # metrica: coleta_falhas | cnpj_pendentes | contratacoes_zeradas
    metrica: Mapped[str] = mapped_column(String(40), nullable=False)
    operador: Mapped[str] = mapped_column(String(10), nullable=False, default=">=")
    limiar: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    severidade: Mapped[str] = mapped_column(String(20), nullable=False, default="aviso")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("uq_alerta_regras_chave", "chave", unique=True),)


class BacklogItem(Base):
    """Registro operacional de melhorias (padrão BLG — ADR backlog trigger/43).

    Situação derivada: ABERTO (fim_em null) · CONCLUIDO (fim_em preenchido).
    """

    __tablename__ = "backlog_itens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(16), nullable=False)
    tarefa: Mapped[str] = mapped_column(String(500), nullable=False)
    inicio_em: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    fim_em: Mapped[datetime | None] = mapped_column(DateTime)
    observacao_conclusao: Mapped[str | None] = mapped_column(String(500))
    excluido_em: Mapped[datetime | None] = mapped_column(DateTime)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("uq_backlog_itens_codigo", "codigo", unique=True),
        Index("ix_backlog_itens_fim", "fim_em"),
    )

    def is_concluido(self) -> bool:
        return self.fim_em is not None


def _migrate_columns() -> None:
    """Colunas novas em bancos já existentes (SQLite)."""
    with engine.connect() as conn:
        user_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(usuarios)")).fetchall()
        }
        if user_cols and "nome" not in user_cols:
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN nome VARCHAR(200)"))

        sess_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(sessoes)")).fetchall()
        }
        if sess_cols and "unidade_ativa_id" not in sess_cols:
            conn.execute(text("ALTER TABLE sessoes ADD COLUMN unidade_ativa_id INTEGER"))

        uni_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(unidades)")).fetchall()
        }
        if uni_cols and "excecoes_config_autorizadas" not in uni_cols:
            conn.execute(
                text(
                    "ALTER TABLE unidades ADD COLUMN "
                    "excecoes_config_autorizadas BOOLEAN DEFAULT 0"
                )
            )

        forn_cols = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(fornecedores)")).fetchall()
        }
        if forn_cols:
            for col, ddl in (
                ("nome_fantasia", "VARCHAR(200)"),
                ("situacao_cadastral", "VARCHAR(80)"),
                ("natureza_juridica", "VARCHAR(200)"),
                ("codigo_cnae", "INTEGER"),
                ("nome_cnae", "VARCHAR(300)"),
                ("uf", "VARCHAR(2)"),
                ("municipio", "VARCHAR(120)"),
                ("codigo_municipio_ibge", "INTEGER"),
                ("cep", "VARCHAR(8)"),
                ("logradouro", "VARCHAR(200)"),
                ("numero", "VARCHAR(40)"),
                ("bairro", "VARCHAR(120)"),
                ("fonte_cnpj", "VARCHAR(40)"),
                ("cnpj_dados_json", "TEXT"),
                ("cnpj_enriquecido_em", "DATETIME"),
                ("cnpj_pendente", "BOOLEAN DEFAULT 1"),
                ("cnpj_ultimo_erro", "TEXT"),
                ("fonte_cep", "VARCHAR(40)"),
                ("cep_dados_json", "TEXT"),
                ("cep_enriquecido_em", "DATETIME"),
            ):
                if col not in forn_cols:
                    conn.execute(text(f"ALTER TABLE fornecedores ADD COLUMN {col} {ddl}"))

        conn.commit()


def _migrate_acompanhamento_unico_filial() -> None:
    """Garante 1 responsável ativo por (contratação, filial) + índice parcial."""
    with engine.connect() as conn:
        tables = {
            r[0]
            for r in conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            ).fetchall()
        }
        if "usuario_contratacao" not in tables:
            return

        dups = conn.execute(
            text(
                """
                SELECT contratacao_id, unidade_id, COUNT(*) AS n
                FROM usuario_contratacao
                WHERE ativo = 1
                GROUP BY contratacao_id, unidade_id
                HAVING n > 1
                """
            )
        ).fetchall()
        for contratacao_id, unidade_id, _n in dups:
            ids = [
                int(r[0])
                for r in conn.execute(
                    text(
                        """
                        SELECT id FROM usuario_contratacao
                        WHERE ativo = 1
                          AND contratacao_id = :c
                          AND unidade_id = :u
                        ORDER BY COALESCE(atualizado_em, criado_em) DESC, id DESC
                        """
                    ),
                    {"c": contratacao_id, "u": unidade_id},
                ).fetchall()
            ]
            for rid in ids[1:]:
                conn.execute(
                    text(
                        "UPDATE usuario_contratacao SET ativo = 0 WHERE id = :id"
                    ),
                    {"id": rid},
                )

        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS
                uq_usuario_contratacao_ativo_filial
                ON usuario_contratacao (contratacao_id, unidade_id)
                WHERE ativo = 1
                """
            )
        )
        conn.commit()


def init_db() -> None:
    Base.metadata.create_all(engine)
    _migrate_columns()
    _migrate_acompanhamento_unico_filial()
    db = SessionLocal()
    try:
        from app.alertas.seed import garantir_seed_alertas
        from app.auth.service import garantir_bootstrap_env
        from app.backlog.seed import garantir_seed_backlog
        from app.coleta.agendamento import garantir_agendamento
        from app.config_coleta.seed import garantir_seed_parametros
        from app.ops.acesso import garantir_modo_acesso

        from app.enriquecimento.service import (
            garantir_pos_coleta_status,
            sanear_pendentes_nao_cnpj,
        )

        garantir_bootstrap_env(db)
        garantir_seed_parametros(db)
        garantir_agendamento(db)
        garantir_pos_coleta_status(db)
        garantir_modo_acesso(db)
        garantir_seed_alertas(db)
        garantir_seed_backlog(db)
        sanear_pendentes_nao_cnpj(db, commit=False)
        db.execute(text("PRAGMA journal_mode=WAL"))
        db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
