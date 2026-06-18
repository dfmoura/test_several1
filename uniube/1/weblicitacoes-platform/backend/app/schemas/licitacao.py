from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ArquivoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome_arquivo: str | None = None
    url_download: str | None = None
    ordem: int | None = None


class LicitacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    empresa_codigo: str | None = None
    empresa_nome: str | None = None
    ano: int | None = None
    processo: str | None = None
    processo_numero: str | None = None
    modalidade: str | None = None
    descricao_edital: str | None = None
    objeto: str | None = None
    data_abertura: datetime | None = None
    data_habilitacao: datetime | None = None
    data_julgamento: datetime | None = None
    data_homologacao: datetime | None = None
    situacao: str | None = None
    chave: str | None = None
    descricao_habilitacao: str | None = None
    solicitante: str | None = None
    valor_licitacao: str | None = None
    valor_licitacao_numerico: float | None = None
    local_abertura: str | None = None
    data_visita_tecnica: datetime | None = None
    responsavel_visita_tecnica: str | None = None
    local_saida_visita_tecnica: str | None = None
    observacoes: str | None = None
    link_pncp: str | None = None
    link_compras_gov: str | None = None
    detalhe_url: str | None = None
    detalhe_coletado: bool = False
    fonte: str | None = None
    capturado_em: datetime | None = None
    atualizado_em: datetime | None = None
    arquivos: list[ArquivoOut] = Field(default_factory=list)


class LicitacaoListResponse(BaseModel):
    items: list[LicitacaoOut]
    total: int
    limit: int
    offset: int


class SyncJobCreate(BaseModel):
    anos: list[int] = Field(default_factory=lambda: [2026])
    empresas: list[str] | None = None
    coletar_detalhes: bool = True


class SyncJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    iniciado_em: datetime | None = None
    finalizado_em: datetime | None = None
    anos: str | None = None
    empresas: str | None = None
    coletar_detalhes: bool
    total_coletados: int
    novos: int
    atualizados: int
    detalhes_coletados: int
    mensagem: str | None = None
    log: str | None = None
    criado_em: datetime


class StatsOut(BaseModel):
    total: int
    por_ano: dict[int, int]
    por_empresa: dict[str, int]
    por_situacao: dict[str, int]
    com_detalhe: int
    sem_detalhe: int


class EmpresaOut(BaseModel):
    codigo: str
    nome: str
