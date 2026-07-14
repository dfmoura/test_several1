"""Configuração do sistema, setup inicial e limpeza segura dos dados coletados."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.config import DATA_DIR, DB_PATH
from app.database import (
    CompraContratacao,
    Licitacao,
    PbiContrato,
    PbiProcessoLicitatorio,
    SistemaConfig,
    get_db,
)

router = APIRouter(prefix="/api/sistema", tags=["sistema"])

# Ordem respeitando FKs — apenas dados coletados; preserva observadores e vínculos manuais.
_TABELAS_COLETA_LIMPEZA: tuple[str, ...] = (
    "compras_contratacao_resultados",
    "compras_contratacao_itens",
    "compras_contratacoes",
    "compras_precos_praticados",
    "compras_pgc_itens",
    "compras_sync_meta",
    "compras_uasgs",
    "compras_orgaos",
    "compras_fornecedores",
    "compras_itens_catalogo",
    "pbi_contrato_responsaveis",
    "pbi_contratos",
    "pbi_processos_licitatorios",
    "pbi_pessoas",
    "pbi_papeis",
    "pbi_fornecedores",
    "pbi_orgaos",
    "powerbi_gestores_fiscais",
    "powerbi_contratos",
    "powerbi_licitacoes",
    "licitacoes",
)

_TABELAS_PRESERVADAS: tuple[str, ...] = (
    "observadores",
    "orgaos_consolidados",
    "orgaos_vinculos",
    "modalidades_consolidadas",
    "modalidades_vinculos",
    "sistema_config",
)


class SistemaConfigOut(BaseModel):
    ano_inicial_coleta: int | None = None
    setup_concluido: bool = False
    ano_atual: int
    anos_coleta: list[int] = Field(default_factory=list)
    atualizado_em: datetime | None = None


class SistemaConfigUpdate(BaseModel):
    ano_inicial_coleta: int = Field(ge=2000, le=2100)
    setup_concluido: bool = True


class LimparDadosRequest(BaseModel):
    confirmacao: str = Field(min_length=1)


class ContagemTabela(BaseModel):
    tabela: str
    registros: int


class SistemaStatusOut(BaseModel):
    config: SistemaConfigOut
    banco_mb: float
    contagem: list[ContagemTabela]
    tabelas_preservadas: list[str]


class LimparDadosOut(BaseModel):
    ok: bool
    removidos: list[ContagemTabela]
    preservados: list[str]
    banco_mb_antes: float
    banco_mb_depois: float


def anos_coleta(ano_inicial: int | None, ano_atual: int | None = None) -> list[int]:
    """Anos da coleta: de ano_inicial até o ano corrente (inclusive)."""
    if ano_inicial is None:
        return []
    fim = ano_atual if ano_atual is not None else date.today().year
    if ano_inicial > fim:
        return [ano_inicial]
    return list(range(ano_inicial, fim + 1))


def _ano_atual() -> int:
    return date.today().year


def _obter_ou_criar_config(db: Session) -> SistemaConfig:
    cfg = db.get(SistemaConfig, 1)
    if cfg is None:
        cfg = SistemaConfig(id=1, setup_concluido=False)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def _config_para_out(cfg: SistemaConfig) -> SistemaConfigOut:
    atual = _ano_atual()
    return SistemaConfigOut(
        ano_inicial_coleta=cfg.ano_inicial_coleta,
        setup_concluido=bool(cfg.setup_concluido),
        ano_atual=atual,
        anos_coleta=anos_coleta(cfg.ano_inicial_coleta, atual),
        atualizado_em=cfg.atualizado_em,
    )


def _tamanho_banco_mb() -> float:
    if not DB_PATH.exists():
        return 0.0
    return round(DB_PATH.stat().st_size / (1024 * 1024), 2)


def _contar_tabela(db: Session, tabela: str) -> int:
    try:
        row = db.execute(text(f"SELECT COUNT(*) FROM {tabela}")).scalar()
        return int(row or 0)
    except Exception:
        return 0


def _tabela_existe(db: Session, tabela: str) -> bool:
    row = db.execute(
        text("SELECT 1 FROM sqlite_master WHERE type='table' AND name=:nome"),
        {"nome": tabela},
    ).scalar()
    return row is not None


def limpar_dados_coletados(db: Session) -> list[ContagemTabela]:
    """Remove dados coletados preservando configuração, observadores e vínculos manuais."""
    removidos: list[ContagemTabela] = []
    for tabela in _TABELAS_COLETA_LIMPEZA:
        if not _tabela_existe(db, tabela):
            continue
        antes = _contar_tabela(db, tabela)
        if antes:
            db.execute(text(f"DELETE FROM {tabela}"))
            removidos.append(ContagemTabela(tabela=tabela, registros=antes))
    db.commit()
    db.execute(text("VACUUM"))
    db.commit()
    return removidos


@router.get("/config", response_model=SistemaConfigOut)
def obter_config(db: Session = Depends(get_db)) -> SistemaConfigOut:
    return _config_para_out(_obter_ou_criar_config(db))


@router.put("/config", response_model=SistemaConfigOut)
def salvar_config(body: SistemaConfigUpdate, db: Session = Depends(get_db)) -> SistemaConfigOut:
    cfg = _obter_ou_criar_config(db)
    cfg.ano_inicial_coleta = body.ano_inicial_coleta
    cfg.setup_concluido = body.setup_concluido
    db.commit()
    db.refresh(cfg)
    return _config_para_out(cfg)


@router.get("/status", response_model=SistemaStatusOut)
def status_sistema(db: Session = Depends(get_db)) -> SistemaStatusOut:
    cfg = _obter_ou_criar_config(db)
    tabelas = sorted(
        set(_TABELAS_COLETA_LIMPEZA) | set(_TABELAS_PRESERVADAS),
        key=str.lower,
    )
    contagem = [
        ContagemTabela(tabela=t, registros=_contar_tabela(db, t))
        for t in tabelas
        if _tabela_existe(db, t)
    ]
    return SistemaStatusOut(
        config=_config_para_out(cfg),
        banco_mb=_tamanho_banco_mb(),
        contagem=contagem,
        tabelas_preservadas=list(_TABELAS_PRESERVADAS),
    )


@router.post("/limpar-dados", response_model=LimparDadosOut)
def limpar_dados(body: LimparDadosRequest, db: Session = Depends(get_db)) -> LimparDadosOut:
    if body.confirmacao.strip().upper() != "LIMPAR":
        raise HTTPException(
            status_code=400,
            detail='Digite exatamente "LIMPAR" para confirmar a operação.',
        )
    mb_antes = _tamanho_banco_mb()
    removidos = limpar_dados_coletados(db)
    return LimparDadosOut(
        ok=True,
        removidos=removidos,
        preservados=list(_TABELAS_PRESERVADAS),
        banco_mb_antes=mb_antes,
        banco_mb_depois=_tamanho_banco_mb(),
    )


@router.get("/resumo-coleta")
def resumo_coleta(db: Session = Depends(get_db)) -> dict:
    """Resumo rápido por fonte — útil para o painel de setup."""
    cfg = _obter_ou_criar_config(db)
    portal = db.scalar(select(func.count()).select_from(Licitacao)) or 0
    compras = db.scalar(select(func.count()).select_from(CompraContratacao)) or 0
    pbi_proc = db.scalar(select(func.count()).select_from(PbiProcessoLicitatorio)) or 0
    pbi_ctr = db.scalar(select(func.count()).select_from(PbiContrato)) or 0
    return {
        "config": _config_para_out(cfg).model_dump(),
        "totais": {
            "portal": portal,
            "compras": compras,
            "powerbi_processos": pbi_proc,
            "powerbi_contratos": pbi_ctr,
        },
        "csv_backup_dir": str(DATA_DIR / "powerbi"),
    }
