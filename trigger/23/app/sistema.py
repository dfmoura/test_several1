"""Configuração do sistema, setup inicial e limpeza segura dos dados coletados."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.backup_ops import criar_backup, podar_backups
from app.compras.normalizers import normalizar_codigo_uasg, normalizar_ni
from app.config import DATA_DIR, DB_PATH
from app.database import (
    CompraContratacao,
    PbiContrato,
    PbiProcessoLicitatorio,
    SistemaConfig,
    SistemaUnidadeCompradora,
    get_db,
)
from app.origem_sistema import (
    aderir_uasgs_ao_setup,
    atualizar_raiz,
    cadastrar_raiz,
    catalogo_para_api,
    consultar_cnpj_raiz,
    listar_catalogo_uasgs,
    obter_raiz,
    raiz_para_api,
    sincronizar_uasgs_municipio,
)
from app.unidades_compradoras import (
    listar_unidades,
    obter_unidades_compradoras,
    restaurar_padroes,
)

router = APIRouter(prefix="/api/sistema", tags=["sistema"])

# Ordem respeitando FKs — apenas dados coletados; preserva observadores e vínculos manuais.
_TABELAS_COLETA_LIMPEZA: tuple[str, ...] = (
    "proposta_analise_preco",
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
    "sistema_raiz",
    "sistema_unidades_compradoras",
    "sistema_uasgs_municipio",
    "usuarios",
    "sessoes",
    "agendamento_config",
    "agendamento_execucao",
    "ia_provedor",
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


class UnidadeCompradoraOut(BaseModel):
    id: int
    codigo: str
    nome: str
    ativo: bool = True
    ordem: int = 0
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None

    model_config = {"from_attributes": True}


class UnidadeCompradoraCreate(BaseModel):
    codigo: str = Field(min_length=1, max_length=10)
    nome: str = Field(min_length=2, max_length=200)
    ativo: bool = True
    ordem: int | None = Field(default=None, ge=0, le=9999)


class UnidadeCompradoraUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=200)
    ativo: bool | None = None
    ordem: int | None = Field(default=None, ge=0, le=9999)


class RestaurarPadroesOut(BaseModel):
    ok: bool
    adicionados: int
    total: int


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
    compras = db.scalar(select(func.count()).select_from(CompraContratacao)) or 0
    pbi_proc = db.scalar(select(func.count()).select_from(PbiProcessoLicitatorio)) or 0
    pbi_ctr = db.scalar(select(func.count()).select_from(PbiContrato)) or 0
    unidades = obter_unidades_compradoras(db)
    return {
        "config": _config_para_out(cfg).model_dump(),
        "totais": {
            "compras": compras,
            "powerbi_processos": pbi_proc,
            "powerbi_contratos": pbi_ctr,
            "unidades_compradoras": len(unidades),
        },
        "csv_backup_dir": str(DATA_DIR / "powerbi"),
    }


class BackupOut(BaseModel):
    ok: bool = True
    caminho: str
    removidos: list[str] = Field(default_factory=list)


@router.post("/backup", response_model=BackupOut)
def backup_dados(
    manter: int = Query(7, ge=1, le=60, description="Quantas pastas de backup conservar"),
) -> BackupOut:
    """Cópia segura do SQLite (+ CSVs Power BI / chave IA) em ``data/backups/``."""
    pasta = criar_backup(label="api")
    removidas = podar_backups(manter=manter)
    return BackupOut(
        ok=True,
        caminho=str(pasta),
        removidos=[str(p) for p in removidas],
    )


# --- Raiz do sistema (CNPJ único + localidade IBGE) ---


class RaizCnpjIn(BaseModel):
    cnpj: str = Field(min_length=14, max_length=18)


class AderirUasgsIn(BaseModel):
    codigos: list[str] = Field(min_length=1)


@router.get("/raiz")
def obter_sistema_raiz(db: Session = Depends(get_db)) -> dict:
    """Retorna a raiz cadastrada ou defaults do env (contingência)."""
    return raiz_para_api(obter_raiz(db))


@router.post("/raiz/consultar")
def consultar_raiz_cnpj(body: RaizCnpjIn) -> dict:
    """Consulta APIs públicas de CNPJ sem persistir (pré-visualização)."""
    ni = normalizar_ni(body.cnpj)
    if not ni or len(ni) != 14:
        raise HTTPException(400, "Informe um CNPJ válido (14 dígitos)")
    try:
        preview = consultar_cnpj_raiz(ni)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc
    preview.pop("_mapped", None)
    return {"ok": True, "preview": preview}


@router.post("/raiz", status_code=201)
def criar_sistema_raiz(body: RaizCnpjIn, db: Session = Depends(get_db)) -> dict:
    """Cadastra a raiz uma única vez, preenchendo via APIs públicas de CNPJ."""
    ni = normalizar_ni(body.cnpj)
    if not ni or len(ni) != 14:
        raise HTTPException(400, "Informe um CNPJ válido (14 dígitos)")
    try:
        row = cadastrar_raiz(db, ni)
    except ValueError as exc:
        msg = str(exc)
        if "já está cadastrada" in msg:
            raise HTTPException(409, msg) from exc
        raise HTTPException(400, msg) from exc
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc
    return raiz_para_api(row)


@router.post("/raiz/atualizar")
def atualizar_sistema_raiz(db: Session = Depends(get_db)) -> dict:
    """Reconsulta APIs públicas e atualiza dados da raiz (mesmo CNPJ)."""
    try:
        row = atualizar_raiz(db)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc
    return raiz_para_api(row)


@router.get("/uasgs-municipio")
def listar_uasgs_municipio(db: Session = Depends(get_db)) -> dict:
    """Catálogo de UASGs do município da raiz + flag de adesão no Setup."""
    rows = listar_catalogo_uasgs(db)
    return {
        "items": catalogo_para_api(db, rows),
        "total": len(rows),
    }


@router.post("/uasgs-municipio/sincronizar")
def sincronizar_uasgs_do_municipio(db: Session = Depends(get_db)) -> dict:
    """Sincroniza o catálogo municipal via API Compras.gov (filtro IBGE/UF da raiz)."""
    try:
        return sincronizar_uasgs_municipio(db)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.post("/uasgs-municipio/aderir")
def aderir_uasgs_municipio(body: AderirUasgsIn, db: Session = Depends(get_db)) -> dict:
    """Inclui UASGs do catálogo na flag do Setup (sistema_unidades_compradoras)."""
    if not body.codigos:
        raise HTTPException(400, "Informe ao menos um código UASG")
    return aderir_uasgs_ao_setup(db, body.codigos)


# --- UASGs / unidades compradoras (Compras.gov) ---


@router.get("/unidades-compradoras", response_model=list[UnidadeCompradoraOut])
def listar_unidades_compradoras(
    db: Session = Depends(get_db),
    ativos: bool | None = Query(None, description="None=todas; true/false filtra"),
) -> list[UnidadeCompradoraOut]:
    rows = listar_unidades(db, apenas_ativas=ativos)
    return [UnidadeCompradoraOut.model_validate(r) for r in rows]


@router.post("/unidades-compradoras", response_model=UnidadeCompradoraOut, status_code=201)
def criar_unidade_compradora(
    body: UnidadeCompradoraCreate,
    db: Session = Depends(get_db),
) -> UnidadeCompradoraOut:
    codigo = normalizar_codigo_uasg(body.codigo)
    if not codigo:
        raise HTTPException(400, "Código UASG inválido")
    nome = body.nome.strip()
    if len(nome) < 2:
        raise HTTPException(400, "Nome deve ter ao menos 2 caracteres")

    existente = db.scalar(
        select(SistemaUnidadeCompradora).where(SistemaUnidadeCompradora.codigo == codigo)
    )
    if existente:
        raise HTTPException(409, f"UASG {codigo} já cadastrada")

    if body.ordem is None:
        max_ordem = db.scalar(select(func.max(SistemaUnidadeCompradora.ordem))) or 0
        ordem = int(max_ordem) + 1
    else:
        ordem = body.ordem

    row = SistemaUnidadeCompradora(
        codigo=codigo,
        nome=nome,
        ativo=body.ativo,
        ordem=ordem,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return UnidadeCompradoraOut.model_validate(row)


@router.patch("/unidades-compradoras/{uid}", response_model=UnidadeCompradoraOut)
def atualizar_unidade_compradora(
    uid: int,
    body: UnidadeCompradoraUpdate,
    db: Session = Depends(get_db),
) -> UnidadeCompradoraOut:
    row = db.get(SistemaUnidadeCompradora, uid)
    if not row:
        raise HTTPException(404, "Unidade compradora não encontrada")
    if body.nome is not None:
        nome = body.nome.strip()
        if len(nome) < 2:
            raise HTTPException(400, "Nome deve ter ao menos 2 caracteres")
        row.nome = nome
    if body.ativo is not None:
        row.ativo = body.ativo
    if body.ordem is not None:
        row.ordem = body.ordem
    db.commit()
    db.refresh(row)
    return UnidadeCompradoraOut.model_validate(row)


@router.delete("/unidades-compradoras/{uid}")
def excluir_unidade_compradora(uid: int, db: Session = Depends(get_db)) -> dict:
    row = db.get(SistemaUnidadeCompradora, uid)
    if not row:
        raise HTTPException(404, "Unidade compradora não encontrada")
    codigo = row.codigo
    db.delete(row)
    db.commit()
    return {"ok": True, "codigo": codigo}


@router.post("/unidades-compradoras/restaurar-padroes", response_model=RestaurarPadroesOut)
def restaurar_unidades_padrao(db: Session = Depends(get_db)) -> RestaurarPadroesOut:
    """Inclui UASGs do seed que ainda não estão cadastradas (não sobrescreve existentes)."""
    adicionados = restaurar_padroes(db)
    total = db.scalar(select(func.count()).select_from(SistemaUnidadeCompradora)) or 0
    return RestaurarPadroesOut(ok=True, adicionados=adicionados, total=int(total))
