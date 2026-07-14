from __future__ import annotations

from datetime import datetime
from pathlib import Path

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, create_engine, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

from app.config import DATA_DIR, DB_PATH

DATA_DIR.mkdir(parents=True, exist_ok=True)


def _make_engine(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    return create_engine(
        f"sqlite:///{path}",
        connect_args={"check_same_thread": False},
    )


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
    local_abertura: Mapped[str | None] = mapped_column(Text)
    data_visita_tecnica: Mapped[str | None] = mapped_column(String(40))
    responsavel_visita_tecnica: Mapped[str | None] = mapped_column(String(200))
    local_saida_visita_tecnica: Mapped[str | None] = mapped_column(Text)
    detalhe_url: Mapped[str | None] = mapped_column(Text)
    valor_estimado: Mapped[str | None] = mapped_column(String(80))
    observador_id: Mapped[int | None] = mapped_column(ForeignKey("observadores.id"), index=True)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    observador: Mapped[Observador | None] = relationship(back_populates="licitacoes")

    __table_args__ = (
        Index("uq_lic_empresa_processo_ano", "empresa_codigo", "processo", "ano", unique=True),
    )


class ComprasOrgao(Base):
    """Dimensão órgão — módulo 05."""

    __tablename__ = "compras_orgaos"

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
    data_hora_movimento: Mapped[str | None] = mapped_column(String(40))

    uasgs: Mapped[list["ComprasUasg"]] = relationship(back_populates="orgao")

    __table_args__ = (Index("uq_compras_orgao_codigo", "codigo_orgao", unique=True),)


class ComprasUasg(Base):
    """Dimensão UASG — módulo 05."""

    __tablename__ = "compras_uasgs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_uasg: Mapped[str] = mapped_column(String(10), nullable=False)
    orgao_id: Mapped[int | None] = mapped_column(ForeignKey("compras_orgaos.id"), index=True)
    nome_uasg: Mapped[str | None] = mapped_column(String(200))
    sigla_uf: Mapped[str | None] = mapped_column(String(2))
    codigo_municipio_ibge: Mapped[int | None] = mapped_column(Integer)
    nome_municipio_ibge: Mapped[str | None] = mapped_column(String(120))
    cnpj_cpf_orgao: Mapped[str | None] = mapped_column(String(20))
    status_uasg: Mapped[bool | None] = mapped_column(Boolean)
    uso_sisg: Mapped[bool | None] = mapped_column(Boolean)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    data_hora_movimento: Mapped[str | None] = mapped_column(String(40))

    orgao: Mapped[ComprasOrgao | None] = relationship(back_populates="uasgs")
    contratacoes: Mapped[list["CompraContratacao"]] = relationship(back_populates="uasg")

    __table_args__ = (Index("uq_compras_uasg_codigo", "codigo_uasg", unique=True),)


class ComprasFornecedor(Base):
    """Dimensão fornecedor — módulo 10 + cache CNPJ público (QSA)."""

    __tablename__ = "compras_fornecedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ni_fornecedor: Mapped[str] = mapped_column(String(14), nullable=False)
    cnpj: Mapped[str | None] = mapped_column(String(14))
    cpf: Mapped[str | None] = mapped_column(String(11))
    nome_razao_social_fornecedor: Mapped[str | None] = mapped_column(String(200))
    nome_fantasia: Mapped[str | None] = mapped_column(String(200))
    porte_empresa_id: Mapped[int | None] = mapped_column(Integer)
    porte_empresa_nome: Mapped[str | None] = mapped_column(String(80))
    natureza_juridica_id: Mapped[int | None] = mapped_column(Integer)
    natureza_juridica_nome: Mapped[str | None] = mapped_column(String(120))
    codigo_cnae: Mapped[int | None] = mapped_column(Integer)
    nome_cnae: Mapped[str | None] = mapped_column(String(200))
    uf_sigla: Mapped[str | None] = mapped_column(String(2))
    nome_municipio: Mapped[str | None] = mapped_column(String(120))
    codigo_municipio_ibge: Mapped[int | None] = mapped_column(Integer)
    de_uberlandia: Mapped[bool | None] = mapped_column(Boolean)
    situacao_cadastral: Mapped[str | None] = mapped_column(String(80))
    cep: Mapped[str | None] = mapped_column(String(12))
    logradouro: Mapped[str | None] = mapped_column(String(200))
    numero_endereco: Mapped[str | None] = mapped_column(String(40))
    bairro: Mapped[str | None] = mapped_column(String(120))
    ativo: Mapped[bool | None] = mapped_column(Boolean)
    habilitado_licitar: Mapped[bool | None] = mapped_column(Boolean)
    # Proveniência — módulo 10 (Compras.gov) vs CNPJ público (não se sobrescrevem)
    compras_gov_dados_json: Mapped[str | None] = mapped_column(Text)
    compras_gov_enriquecido_em: Mapped[datetime | None] = mapped_column(DateTime)
    qsa_json: Mapped[str | None] = mapped_column(Text)
    cnpj_dados_json: Mapped[str | None] = mapped_column(Text)
    cnpj_enriquecido_em: Mapped[datetime | None] = mapped_column(DateTime)
    # "07.3" | "10" | "cnpj_publico" — última fonte que definiu a razão social
    fonte_razao_social: Mapped[str | None] = mapped_column(String(20))
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (Index("uq_compras_fornecedor_ni", "ni_fornecedor", unique=True),)


class ComprasItemCatalogo(Base):
    """Cache on-demand CATMAT/CATSER — módulos 01/02."""

    __tablename__ = "compras_itens_catalogo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo_item: Mapped[str] = mapped_column(String(10), nullable=False)
    codigo_item_catalogo: Mapped[int] = mapped_column(Integer, nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text)
    codigo_grupo: Mapped[int | None] = mapped_column(Integer)
    codigo_classe: Mapped[int | None] = mapped_column(Integer)
    codigo_pdm: Mapped[int | None] = mapped_column(Integer)
    secao_servico: Mapped[int | None] = mapped_column(Integer)
    divisao_servico: Mapped[int | None] = mapped_column(Integer)
    subclasse_servico: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str | None] = mapped_column(String(40))
    dados_json: Mapped[str | None] = mapped_column(Text)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index(
            "uq_compras_catalogo_tipo_cod",
            "tipo_item",
            "codigo_item_catalogo",
            unique=True,
        ),
    )


class ComprasPgcItem(Base):
    """Planejamento PGC — módulo 04."""

    __tablename__ = "compras_pgc_itens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    orgao: Mapped[str] = mapped_column(String(20), nullable=False)
    ano_pca_projeto_compra: Mapped[int] = mapped_column(Integer, nullable=False)
    codigo_uasg: Mapped[str | None] = mapped_column(String(10))
    uasg_id: Mapped[int | None] = mapped_column(ForeignKey("compras_uasgs.id"), index=True)
    tipo_item: Mapped[str | None] = mapped_column(String(10))
    codigo_item_catalogo: Mapped[int | None] = mapped_column(Integer)
    item_catalogo_id: Mapped[int | None] = mapped_column(
        ForeignKey("compras_itens_catalogo.id"), index=True
    )
    numero_item_pncp: Mapped[int | None] = mapped_column(Integer)
    ordem_dfd: Mapped[int | None] = mapped_column(Integer)
    descricao_item_catalogo: Mapped[str | None] = mapped_column(Text)
    quantidade_item: Mapped[str | None] = mapped_column(String(40))
    valor_unitario_item: Mapped[str | None] = mapped_column(String(80))
    valor_total_item: Mapped[str | None] = mapped_column(String(80))
    titulo_projeto_compra: Mapped[str | None] = mapped_column(Text)
    descricao_objeto_dfd: Mapped[str | None] = mapped_column(Text)
    data_hora_publicacao_pncp: Mapped[str | None] = mapped_column(String(40))
    status_contratacao_execucao: Mapped[str | None] = mapped_column(String(80))
    dados_pgc_json: Mapped[str | None] = mapped_column(Text)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index(
            "uq_compras_pgc_chave",
            "orgao",
            "ano_pca_projeto_compra",
            "codigo_uasg",
            "codigo_item_catalogo",
            "numero_item_pncp",
            "ordem_dfd",
            unique=True,
        ),
    )


class ComprasSyncMeta(Base):
    """Última sincronização por módulo."""

    __tablename__ = "compras_sync_meta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    modulo: Mapped[str] = mapped_column(String(40), nullable=False)
    ultima_sync_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    contadores_json: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (Index("uq_compras_sync_modulo", "modulo", unique=True),)


class CompraContratacao(Base):
    """Contratações PNCP (Lei 14.133) — API Dados Abertos Compras.gov.br."""

    __tablename__ = "compras_contratacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Chaves e identificação
    id_compra: Mapped[str | None] = mapped_column(String(40), index=True)
    uasg_id: Mapped[int | None] = mapped_column(ForeignKey("compras_uasgs.id"), index=True)
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
    uasg: Mapped[ComprasUasg | None] = relationship(back_populates="contratacoes")
    itens: Mapped[list["CompraContratacaoItem"]] = relationship(
        back_populates="contratacao",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("uq_compra_id_compra", "id_compra", unique=True),
        Index("ix_compra_numero_controle_pncp", "numero_controle_pncp"),
    )


class CompraContratacaoItem(Base):
    """Itens de contratação PNCP — API Dados Abertos Compras.gov.br."""

    __tablename__ = "compras_contratacao_itens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    id_compra_item: Mapped[str] = mapped_column(String(50), nullable=False)
    id_compra: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    contratacao_id: Mapped[int | None] = mapped_column(
        ForeignKey("compras_contratacoes.id"), index=True
    )
    numero_controle_pncp_compra: Mapped[str | None] = mapped_column(String(80))

    numero_item_pncp: Mapped[int | None] = mapped_column(Integer)
    numero_item_compra: Mapped[int | None] = mapped_column(Integer)
    numero_grupo: Mapped[int | None] = mapped_column(Integer)

    descricao_resumida: Mapped[str | None] = mapped_column(Text)
    descricao_detalhada: Mapped[str | None] = mapped_column(Text)
    material_ou_servico: Mapped[str | None] = mapped_column(String(5))
    material_ou_servico_nome: Mapped[str | None] = mapped_column(String(40))

    codigo_classe: Mapped[int | None] = mapped_column(Integer)
    codigo_grupo: Mapped[int | None] = mapped_column(Integer)
    cod_item_catalogo: Mapped[int | None] = mapped_column(Integer)
    item_catalogo_id: Mapped[int | None] = mapped_column(
        ForeignKey("compras_itens_catalogo.id"), index=True
    )

    unidade_medida: Mapped[str | None] = mapped_column(String(40))
    orcamento_sigiloso: Mapped[bool | None] = mapped_column(Boolean)

    item_categoria_nome: Mapped[str | None] = mapped_column(String(120))
    criterio_julgamento_nome: Mapped[str | None] = mapped_column(String(80))
    situacao_compra_item_nome: Mapped[str | None] = mapped_column(String(80))
    tipo_beneficio_nome: Mapped[str | None] = mapped_column(String(80))

    quantidade: Mapped[str | None] = mapped_column(String(40))
    valor_unitario_estimado: Mapped[str | None] = mapped_column(String(80))
    valor_total: Mapped[str | None] = mapped_column(String(80))

    tem_resultado: Mapped[bool | None] = mapped_column(Boolean)
    cod_fornecedor: Mapped[str | None] = mapped_column(String(20))
    nome_fornecedor: Mapped[str | None] = mapped_column(String(200))
    quantidade_resultado: Mapped[str | None] = mapped_column(String(40))
    valor_unitario_resultado: Mapped[str | None] = mapped_column(String(80))
    valor_total_resultado: Mapped[str | None] = mapped_column(String(80))
    data_resultado: Mapped[str | None] = mapped_column(String(40))

    dados_pncp_json: Mapped[str | None] = mapped_column(Text)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    contratacao: Mapped[CompraContratacao | None] = relationship(back_populates="itens")
    item_catalogo: Mapped[ComprasItemCatalogo | None] = relationship()
    resultados: Mapped[list["ComprasContratacaoResultado"]] = relationship(
        back_populates="contratacao_item",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("uq_compra_item_id", "id_compra_item", unique=True),
    )


class ComprasContratacaoResultado(Base):
    """Resultados homologados por item — módulo 07.3."""

    __tablename__ = "compras_contratacao_resultados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_compra: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    id_compra_item: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    contratacao_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("compras_contratacao_itens.id"), index=True
    )
    fornecedor_id: Mapped[int | None] = mapped_column(
        ForeignKey("compras_fornecedores.id"), index=True
    )
    sequencial_resultado: Mapped[int | None] = mapped_column(Integer)
    ni_fornecedor: Mapped[str | None] = mapped_column(String(14))
    nome_razao_social_fornecedor: Mapped[str | None] = mapped_column(String(200))
    ordem_classificacao_srp: Mapped[int | None] = mapped_column(Integer)
    quantidade_homologada: Mapped[str | None] = mapped_column(String(40))
    valor_unitario_homologado: Mapped[str | None] = mapped_column(String(80))
    valor_total_homologado: Mapped[str | None] = mapped_column(String(80))
    situacao_compra_item_resultado_nome: Mapped[str | None] = mapped_column(String(80))
    porte_fornecedor_nome: Mapped[str | None] = mapped_column(String(80))
    data_resultado_pncp: Mapped[str | None] = mapped_column(String(40))
    percentual_desconto: Mapped[str | None] = mapped_column(String(40))
    dados_resultado_json: Mapped[str | None] = mapped_column(Text)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    contratacao_item: Mapped[CompraContratacaoItem | None] = relationship(
        back_populates="resultados"
    )
    fornecedor: Mapped[ComprasFornecedor | None] = relationship()

    __table_args__ = (
        Index(
            "uq_compra_resultado_item_seq",
            "id_compra_item",
            "sequencial_resultado",
            unique=True,
        ),
    )


class ComprasPrecoPraticado(Base):
    """Pesquisa de preço — módulo 03."""

    __tablename__ = "compras_precos_praticados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo_item: Mapped[str] = mapped_column(String(10), nullable=False)
    id_item_compra: Mapped[str] = mapped_column(String(50), nullable=False)
    id_compra: Mapped[str | None] = mapped_column(String(40))
    codigo_item_catalogo: Mapped[int | None] = mapped_column(Integer)
    codigo_uasg: Mapped[str | None] = mapped_column(String(10))
    item_catalogo_id: Mapped[int | None] = mapped_column(
        ForeignKey("compras_itens_catalogo.id"), index=True
    )
    uasg_id: Mapped[int | None] = mapped_column(ForeignKey("compras_uasgs.id"), index=True)
    fornecedor_id: Mapped[int | None] = mapped_column(
        ForeignKey("compras_fornecedores.id"), index=True
    )
    preco_unitario: Mapped[str | None] = mapped_column(String(80))
    quantidade: Mapped[str | None] = mapped_column(String(40))
    data_compra: Mapped[str | None] = mapped_column(String(40))
    data_resultado: Mapped[str | None] = mapped_column(String(40))
    modalidade: Mapped[str | None] = mapped_column(String(40))
    municipio: Mapped[str | None] = mapped_column(String(120))
    estado: Mapped[str | None] = mapped_column(String(2))
    nome_fornecedor: Mapped[str | None] = mapped_column(String(200))
    ni_fornecedor: Mapped[str | None] = mapped_column(String(14))
    dados_preco_json: Mapped[str | None] = mapped_column(Text)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index(
            "uq_compras_preco_tipo_item",
            "tipo_item",
            "id_item_compra",
            "id_compra",
            "ni_fornecedor",
            "data_compra",
            unique=True,
        ),
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


# --- Power BI normalizado (ER: ÓRGÃOS / FORNECEDORES / PROCESSOS / CONTRATOS / RESPONSÁVEIS) ---


class PbiOrgao(Base):
    __tablename__ = "pbi_orgaos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)

    processos: Mapped[list["PbiProcessoLicitatorio"]] = relationship(back_populates="orgao")
    contratos: Mapped[list["PbiContrato"]] = relationship(back_populates="orgao")
    responsaveis: Mapped[list["PbiContratoResponsavel"]] = relationship(back_populates="orgao")


class PbiFornecedor(Base):
    __tablename__ = "pbi_fornecedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    razao_social: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)

    contratos: Mapped[list["PbiContrato"]] = relationship(back_populates="fornecedor")
    responsaveis: Mapped[list["PbiContratoResponsavel"]] = relationship(back_populates="fornecedor")


class PbiPessoa(Base):
    __tablename__ = "pbi_pessoas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)

    responsaveis: Mapped[list["PbiContratoResponsavel"]] = relationship(back_populates="pessoa")


class PbiPapel(Base):
    __tablename__ = "pbi_papeis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    descricao: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)

    responsaveis: Mapped[list["PbiContratoResponsavel"]] = relationship(back_populates="papel")


class PbiProcessoLicitatorio(Base):
    """Processos licitatórios — CSV licitações (14 campos)."""

    __tablename__ = "pbi_processos_licitatorios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    orgao_id: Mapped[int] = mapped_column(ForeignKey("pbi_orgaos.id"), nullable=False, index=True)

    ano_processo: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    chave: Mapped[str | None] = mapped_column(String(80))
    ds_habilitacao: Mapped[str | None] = mapped_column(Text)
    dt_abertura: Mapped[str | None] = mapped_column(String(40))
    dt_habilitacao: Mapped[str | None] = mapped_column(String(40))
    dt_homologacao: Mapped[str | None] = mapped_column(String(40))
    dt_julgamento: Mapped[str | None] = mapped_column(String(40))
    modalidade: Mapped[str] = mapped_column(String(120), nullable=False)
    objeto: Mapped[str | None] = mapped_column(Text)
    processo: Mapped[str] = mapped_column(String(80), nullable=False)
    situacao: Mapped[str | None] = mapped_column(String(120), index=True)
    solicitante: Mapped[str | None] = mapped_column(String(200))
    valor_licitacao: Mapped[str | None] = mapped_column(String(80))

    fonte_ano_coleta: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    dados_csv_json: Mapped[str | None] = mapped_column(Text)
    observador_id: Mapped[int | None] = mapped_column(ForeignKey("observadores.id"), index=True)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    orgao: Mapped[PbiOrgao] = relationship(back_populates="processos")
    observador: Mapped[Observador | None] = relationship()
    contratos: Mapped[list["PbiContrato"]] = relationship(back_populates="processo_licitatorio")

    __table_args__ = (
        Index(
            "uq_pbi_proc_ano_org_proc_mod",
            "ano_processo",
            "orgao_id",
            "processo",
            "modalidade",
            unique=True,
        ),
    )


class PbiContrato(Base):
    """Contratos — CSV contratos (11 campos) + vínculos ER."""

    __tablename__ = "pbi_contratos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    orgao_id: Mapped[int] = mapped_column(ForeignKey("pbi_orgaos.id"), nullable=False, index=True)
    fornecedor_id: Mapped[int | None] = mapped_column(ForeignKey("pbi_fornecedores.id"), index=True)
    processo_id: Mapped[int | None] = mapped_column(ForeignKey("pbi_processos_licitatorios.id"), index=True)

    ano_contrato: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    ano_processo: Mapped[int | None] = mapped_column(Integer, index=True)
    ds_objeto_contrato: Mapped[str | None] = mapped_column(Text)
    dt_assinatura: Mapped[str | None] = mapped_column(String(40))
    nr_aditivo: Mapped[str | None] = mapped_column(String(20))
    nr_contrato: Mapped[str] = mapped_column(String(40), nullable=False)
    nr_parcela: Mapped[str | None] = mapped_column(String(20))
    processo: Mapped[str | None] = mapped_column(String(80), index=True)
    vr_inicial: Mapped[str | None] = mapped_column(String(80))

    fonte_ano_coleta: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    dados_csv_json: Mapped[str | None] = mapped_column(Text)
    observador_id: Mapped[int | None] = mapped_column(ForeignKey("observadores.id"), index=True)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    orgao: Mapped[PbiOrgao] = relationship(back_populates="contratos")
    fornecedor: Mapped[PbiFornecedor | None] = relationship(back_populates="contratos")
    processo_licitatorio: Mapped[PbiProcessoLicitatorio | None] = relationship(back_populates="contratos")
    observador: Mapped[Observador | None] = relationship()
    responsaveis: Mapped[list["PbiContratoResponsavel"]] = relationship(back_populates="contrato")

    __table_args__ = (
        Index(
            "uq_pbi_ctr_chave",
            "ano_contrato",
            "orgao_id",
            "nr_contrato",
            "nr_aditivo",
            "nr_parcela",
            "processo",
            unique=True,
        ),
    )


class PbiContratoResponsavel(Base):
    """Gestores e fiscais — CSV gestores (10 campos) + vínculos ER."""

    __tablename__ = "pbi_contrato_responsaveis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contrato_id: Mapped[int | None] = mapped_column(ForeignKey("pbi_contratos.id"), index=True)
    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pbi_pessoas.id"), nullable=False, index=True)
    papel_id: Mapped[int | None] = mapped_column(ForeignKey("pbi_papeis.id"), index=True)
    orgao_id: Mapped[int | None] = mapped_column(ForeignKey("pbi_orgaos.id"), index=True)
    fornecedor_id: Mapped[int | None] = mapped_column(ForeignKey("pbi_fornecedores.id"), index=True)

    ano_contrato: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    dt_assinatura: Mapped[str | None] = mapped_column(String(40))
    dt_fim: Mapped[str | None] = mapped_column(String(40))
    dt_inicio: Mapped[str | None] = mapped_column(String(40))
    nr_contrato: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    objeto_contrato: Mapped[str | None] = mapped_column(Text)

    dados_csv_json: Mapped[str | None] = mapped_column(Text)
    observador_id: Mapped[int | None] = mapped_column(ForeignKey("observadores.id"), index=True)
    coletado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    contrato: Mapped[PbiContrato | None] = relationship(back_populates="responsaveis")
    pessoa: Mapped[PbiPessoa] = relationship(back_populates="responsaveis")
    papel: Mapped[PbiPapel | None] = relationship(back_populates="responsaveis")
    orgao: Mapped[PbiOrgao | None] = relationship(back_populates="responsaveis")
    fornecedor: Mapped[PbiFornecedor | None] = relationship(back_populates="responsaveis")
    observador: Mapped[Observador | None] = relationship()

    __table_args__ = (
        Index(
            "uq_pbi_resp_chave",
            "ano_contrato",
            "nr_contrato",
            "orgao_id",
            "papel_id",
            "pessoa_id",
            "dt_inicio",
            "fornecedor_id",
            unique=True,
        ),
    )


# --- Configuração do sistema (setup inicial, ano de coleta) ---


class SistemaConfig(Base):
    """Configuração global — linha única (id=1)."""

    __tablename__ = "sistema_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    ano_inicial_coleta: Mapped[int | None] = mapped_column(Integer)
    setup_concluido: Mapped[bool] = mapped_column(Boolean, default=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class SistemaUnidadeCompradora(Base):
    """UASGs alvo da coleta Compras.gov — configuráveis no Setup (preservadas na limpeza)."""

    __tablename__ = "sistema_unidades_compradoras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(10), nullable=False)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("uq_sistema_unidade_codigo", "codigo", unique=True),)


# --- Agendamento (coleta noturna + cadeia CNPJs — preservado na limpeza) ---


class AgendamentoConfig(Base):
    """Configuração do agendamento diário — linha única (id=1)."""

    __tablename__ = "agendamento_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    ativo: Mapped[bool] = mapped_column(Boolean, default=False)
    hora: Mapped[int] = mapped_column(Integer, default=2)
    minuto: Mapped[int] = mapped_column(Integer, default=0)
    fuso: Mapped[str] = mapped_column(String(64), default="America/Sao_Paulo")
    incluir_coleta: Mapped[bool] = mapped_column(Boolean, default=True)
    incluir_cnpjs: Mapped[bool] = mapped_column(Boolean, default=True)
    # YYYY-MM-DD no fuso configurado — evita disparo duplicado no mesmo dia.
    ultima_chave_dia: Mapped[str | None] = mapped_column(String(10))
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class AgendamentoExecucao(Base):
    """Histórico / última execução da cadeia agendada ou manual."""

    __tablename__ = "agendamento_execucao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    origem: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    ok: Mapped[bool | None] = mapped_column(Boolean)
    fase: Mapped[str] = mapped_column(String(40), default="idle")
    resumo: Mapped[str | None] = mapped_column(String(500))
    log_json: Mapped[str | None] = mapped_column(Text)
    detalhes_json: Mapped[str | None] = mapped_column(Text)
    iniciado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    finalizado_em: Mapped[datetime | None] = mapped_column(DateTime)


# --- Provedores de IA (tokens — Setup; preservados na limpeza) ---

# openai / gemini / anthropic = protocolos nativos;
# demais (deepseek, groq, …) usam API OpenAI-compatible com base URL própria.
PROVEDORES_IA = frozenset(
    {
        "openai",
        "gemini",
        "anthropic",
        "deepseek",
        "groq",
        "mistral",
        "xai",
        "openrouter",
        "together",
        "perplexity",
        "openai_compatible",
    }
)


class IaProvedor(Base):
    """Credencial de provedor de IA — key criptografada; nunca exposta na API."""

    __tablename__ = "ia_provedor"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    provedor: Mapped[str] = mapped_column(String(40), nullable=False, default="openai")
    base_url: Mapped[str | None] = mapped_column(String(500))
    modelo: Mapped[str | None] = mapped_column(String(120))
    api_key_criptografada: Mapped[str] = mapped_column(Text, nullable=False)
    api_key_mascara: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    prioridade: Mapped[int] = mapped_column(Integer, default=100)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    ultimo_teste_em: Mapped[datetime | None] = mapped_column(DateTime)
    ultimo_teste_ok: Mapped[bool | None] = mapped_column(Boolean)
    ultimo_teste_msg: Mapped[str | None] = mapped_column(String(300))
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("ix_ia_provedor_ativo_prio", "ativo", "prioridade"),)


class PropostaAnalisePreco(Base):
    """Análise de preço de mercado via IA — isolada das tabelas oficiais PNCP."""

    __tablename__ = "proposta_analise_preco"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    id_compra_item: Mapped[str | None] = mapped_column(String(80))
    prompt_versao: Mapped[str] = mapped_column(String(40), nullable=False, default="v1")
    prompt_enviado: Mapped[str] = mapped_column(Text, nullable=False)
    provedor_id: Mapped[int | None] = mapped_column(Integer)
    provedor_nome: Mapped[str | None] = mapped_column(String(120))
    provedor_tipo: Mapped[str | None] = mapped_column(String(40))
    modelo: Mapped[str | None] = mapped_column(String(120))
    resposta_texto: Mapped[str | None] = mapped_column(Text)
    resposta_json: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")
    erro: Mapped[str | None] = mapped_column(Text)
    usuario_id: Mapped[int | None] = mapped_column(Integer)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    finalizado_em: Mapped[datetime | None] = mapped_column(DateTime)

    __table_args__ = (
        Index("ix_proposta_analise_preco_item_criado", "item_id", "criado_em"),
    )


# --- Autenticação (contas e sessões — isoladas; preservadas na limpeza) ---

PAPEIS_USUARIO = frozenset({"admin", "consulta"})


class Usuario(Base):
    """Conta de acesso ao Observatório (login local)."""

    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(80), nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    papel: Mapped[str] = mapped_column(String(20), nullable=False, default="consulta")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    sessoes: Mapped[list["Sessao"]] = relationship(
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
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    expira_em: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ultimo_acesso: Mapped[datetime | None] = mapped_column(DateTime)

    usuario: Mapped[Usuario] = relationship(back_populates="sessoes")

    __table_args__ = (Index("uq_sessoes_token", "token", unique=True),)


# --- Órgãos consolidados — vínculo manual entre bases (reversível; não altera dados coletados) ---

FONTES_ORGAO_VINCULO = frozenset({"compras_api", "powerbi"})


class OrgaoConsolidado(Base):
    """Entidade canônica de órgão/unidade — une Compras.gov e Power BI."""

    __tablename__ = "orgaos_consolidados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    sigla: Mapped[str | None] = mapped_column(String(40))
    observacoes: Mapped[str | None] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    vinculos: Mapped[list["OrgaoVinculo"]] = relationship(
        back_populates="orgao_consolidado",
        cascade="all, delete-orphan",
    )


class OrgaoVinculo(Base):
    """Mapeamento manual: valor de uma base → órgão consolidado."""

    __tablename__ = "orgaos_vinculos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    orgao_consolidado_id: Mapped[int] = mapped_column(
        ForeignKey("orgaos_consolidados.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fonte: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    chave: Mapped[str] = mapped_column(String(200), nullable=False)
    rotulo: Mapped[str | None] = mapped_column(String(200))
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    orgao_consolidado: Mapped[OrgaoConsolidado] = relationship(back_populates="vinculos")

    __table_args__ = (
        Index("uq_orgao_vinculo_fonte_chave", "fonte", "chave", unique=True),
    )


# --- Modalidades consolidadas — vínculo manual entre bases (reversível; não altera dados coletados) ---

FONTES_MODALIDADE_VINCULO = frozenset({"compras_api", "powerbi"})


class ModalidadeConsolidada(Base):
    """Entidade canônica de modalidade — une Compras.gov e Power BI."""

    __tablename__ = "modalidades_consolidadas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    codigo_pncp: Mapped[int | None] = mapped_column(Integer)
    observacoes: Mapped[str | None] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    vinculos: Mapped[list["ModalidadeVinculo"]] = relationship(
        back_populates="modalidade_consolidada",
        cascade="all, delete-orphan",
    )


class ModalidadeVinculo(Base):
    """Mapeamento manual: valor de uma base → modalidade consolidada."""

    __tablename__ = "modalidades_vinculos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    modalidade_consolidada_id: Mapped[int] = mapped_column(
        ForeignKey("modalidades_consolidadas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fonte: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    chave: Mapped[str] = mapped_column(String(200), nullable=False)
    rotulo: Mapped[str | None] = mapped_column(String(200))
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    modalidade_consolidada: Mapped[ModalidadeConsolidada] = relationship(back_populates="vinculos")

    __table_args__ = (
        Index("uq_modalidade_vinculo_fonte_chave", "fonte", "chave", unique=True),
    )


# --- Legado (flat) — mantido para migração; coleta grava no modelo normalizado ---


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


_COMPRAS_FORNECEDOR_COLUNAS_NOVAS: list[tuple[str, str]] = [
    ("nome_fantasia", "VARCHAR(200)"),
    ("codigo_municipio_ibge", "INTEGER"),
    ("de_uberlandia", "BOOLEAN"),
    ("situacao_cadastral", "VARCHAR(80)"),
    ("cep", "VARCHAR(12)"),
    ("logradouro", "VARCHAR(200)"),
    ("numero_endereco", "VARCHAR(40)"),
    ("bairro", "VARCHAR(120)"),
    ("compras_gov_dados_json", "TEXT"),
    ("compras_gov_enriquecido_em", "DATETIME"),
    ("qsa_json", "TEXT"),
    ("cnpj_dados_json", "TEXT"),
    ("cnpj_enriquecido_em", "DATETIME"),
    ("fonte_razao_social", "VARCHAR(20)"),
]


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


def _migrate_ia_provedor(conn) -> None:
    """Garante schema atual de ``ia_provedor`` (recria se legado incompatível)."""
    cols = {
        row[1]
        for row in conn.execute(text("PRAGMA table_info(ia_provedor)")).fetchall()
    }
    if not cols:
        return
    esperadas = {
        "api_key_criptografada",
        "api_key_mascara",
        "ultimo_teste_em",
        "ultimo_teste_ok",
        "ultimo_teste_msg",
    }
    if esperadas.issubset(cols):
        return
    conn.execute(text("DROP TABLE IF EXISTS ia_provedor"))


def _migrate_proposta_analise_preco(conn) -> None:
    """Garante schema de ``proposta_analise_preco`` (recria se incompleto)."""
    cols = {
        row[1]
        for row in conn.execute(text("PRAGMA table_info(proposta_analise_preco)")).fetchall()
    }
    if not cols:
        return
    esperadas = {
        "item_id",
        "id_compra_item",
        "prompt_enviado",
        "resposta_texto",
        "resposta_json",
        "status",
        "criado_em",
    }
    if esperadas.issubset(cols):
        return
    conn.execute(text("DROP TABLE IF EXISTS proposta_analise_preco"))


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
        _migrate_ia_provedor(conn)
        _migrate_proposta_analise_preco(conn)
        existing = {
            row[1] for row in conn.execute(text("PRAGMA table_info(licitacoes)")).fetchall()
        }
        if existing and "valor_estimado" not in existing:
            conn.execute(text("ALTER TABLE licitacoes ADD COLUMN valor_estimado VARCHAR(80)"))
        if existing and "observador_id" not in existing:
            conn.execute(text("ALTER TABLE licitacoes ADD COLUMN observador_id INTEGER"))
        for col, tipo in (
            ("local_abertura", "TEXT"),
            ("data_visita_tecnica", "VARCHAR(40)"),
            ("responsavel_visita_tecnica", "VARCHAR(200)"),
            ("local_saida_visita_tecnica", "TEXT"),
        ):
            if existing and col not in existing:
                conn.execute(text(f"ALTER TABLE licitacoes ADD COLUMN {col} {tipo}"))

        compras_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(compras_contratacoes)")).fetchall()
        }
        if compras_cols:
            for nome, tipo in _COMPRAS_COLUNAS_NOVAS:
                if nome not in compras_cols:
                    conn.execute(text(f"ALTER TABLE compras_contratacoes ADD COLUMN {nome} {tipo}"))
            if "uasg_id" not in compras_cols:
                conn.execute(text("ALTER TABLE compras_contratacoes ADD COLUMN uasg_id INTEGER"))
            if "id_compra" not in compras_cols:
                conn.execute(
                    text(
                        "UPDATE compras_contratacoes SET id_compra = chave_compra "
                        "WHERE id_compra IS NULL"
                    )
                )

        itens_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(compras_contratacao_itens)")).fetchall()
        }
        if itens_cols and "item_catalogo_id" not in itens_cols:
            conn.execute(
                text("ALTER TABLE compras_contratacao_itens ADD COLUMN item_catalogo_id INTEGER")
            )

        forn_cols = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(compras_fornecedores)")).fetchall()
        }
        if forn_cols:
            for nome, tipo in _COMPRAS_FORNECEDOR_COLUNAS_NOVAS:
                if nome not in forn_cols:
                    conn.execute(
                        text(f"ALTER TABLE compras_fornecedores ADD COLUMN {nome} {tipo}")
                    )
        conn.commit()


def init_db() -> None:
    Base.metadata.create_all(engine)
    _migrate_columns()
    # Recria tabelas removidas por migrações de schema incompatível (ex.: ia_provedor).
    Base.metadata.create_all(engine)
    # Seed das UASGs padrão do Compras.gov (Setup) — no-op se já houver registros.
    from app.unidades_compradoras import garantir_seed

    db = SessionLocal()
    try:
        garantir_seed(db)
        from app.auth.service import garantir_bootstrap_env

        garantir_bootstrap_env(db)
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
