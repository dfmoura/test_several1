from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.licitacao import (
    EmpresaOut,
    LicitacaoListResponse,
    LicitacaoOut,
    StatsOut,
    SyncJobCreate,
    SyncJobOut,
)
from app.services.licitacao_service import (
    criar_sync_job,
    estatisticas,
    get_licitacao,
    list_licitacoes,
    listar_sync_jobs,
    obter_sync_job,
)

router = APIRouter()

EMPRESAS = {
    "0": "Prefeitura Municipal de Uberlandia",
    "1": "Departamento Municipal de Agua e Esgoto - DMAE",
    "2": "Instituto Previdência dos Servidores Públicos do Município de Uberlândia - IPREMU",
    "3": "Processamento de dados de Uberlandia - PRODAUB",
    "4": "Fundação Uberlandense de Esporte e Lazer - FUTEL",
    "5": "Fundação de Excelência Rural de Uberlândia - FERUB",
    "6": "Empresa Municipal de Apoio e Manutenção - EMAM",
    "7": "Fundação Saúde do Município de Uberlândia - FUNDASUS",
    "8": "CÂMARA MUNICIPAL DE UBERLANDIA",
    "9": "Agência de Regulação dos Serviços de Saneamento Básico de Uberlândia - ARESAN",
}


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/empresas", response_model=list[EmpresaOut])
def empresas() -> list[EmpresaOut]:
    return [EmpresaOut(codigo=k, nome=v) for k, v in EMPRESAS.items()]


@router.get("/licitacoes", response_model=LicitacaoListResponse)
def licitacoes(
    db: Session = Depends(get_db),
    ano: int | None = Query(None),
    empresa_codigo: str | None = Query(None),
    situacao: str | None = Query(None),
    modalidade: str | None = Query(None),
    texto: str | None = Query(None),
    com_detalhe: bool | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> LicitacaoListResponse:
    items, total = list_licitacoes(
        db,
        ano=ano,
        empresa_codigo=empresa_codigo,
        situacao=situacao,
        modalidade=modalidade,
        texto=texto,
        com_detalhe=com_detalhe,
        limit=limit,
        offset=offset,
    )
    return LicitacaoListResponse(
        items=[LicitacaoOut.model_validate(i) for i in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/licitacoes/{licitacao_id}", response_model=LicitacaoOut)
def licitacao_por_id(licitacao_id: int, db: Session = Depends(get_db)) -> LicitacaoOut:
    row = get_licitacao(db, licitacao_id)
    if not row:
        raise HTTPException(status_code=404, detail="Licitação não encontrada")
    return LicitacaoOut.model_validate(row)


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)) -> StatsOut:
    return StatsOut(**estatisticas(db))


@router.post("/sync", response_model=SyncJobOut, status_code=201)
def iniciar_sync(payload: SyncJobCreate, db: Session = Depends(get_db)) -> SyncJobOut:
    job = criar_sync_job(
        db,
        anos=payload.anos,
        empresas=payload.empresas,
        coletar_detalhes=payload.coletar_detalhes,
    )
    return SyncJobOut.model_validate(job)


@router.get("/sync", response_model=list[SyncJobOut])
def sync_jobs(db: Session = Depends(get_db), limit: int = Query(20, ge=1, le=100)) -> list[SyncJobOut]:
    return [SyncJobOut.model_validate(j) for j in listar_sync_jobs(db, limit=limit)]


@router.get("/sync/{job_id}", response_model=SyncJobOut)
def sync_job(job_id: int, db: Session = Depends(get_db)) -> SyncJobOut:
    job = obter_sync_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return SyncJobOut.model_validate(job)
