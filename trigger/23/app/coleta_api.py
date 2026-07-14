"""Endpoints da coleta unificada (hub Compras.gov + Power BI)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app import coleta_hub
from app.config import MODALIDADES_PNCP
from app.unidades_compradoras import obter_unidades_compradoras

router = APIRouter(tags=["coleta"])


class ColetaUnificadaRequest(BaseModel):
    fontes: list[str] = Field(min_length=1, description='Ex.: ["compras", "powerbi"]')
    ano: int | None = Field(default=None, ge=2000, le=2100)
    data_inicial: date | None = None
    data_final: date | None = None
    unidades: list[str] | None = None
    modalidades: list[int] | None = None
    fases: list[str] | None = Field(
        default=None, description="Fases Compras.gov — ex.: 07,07-resultados,05,10"
    )
    ano_pgc: int | None = Field(default=None, ge=2000, le=2100)
    datasets: list[str] | None = Field(
        default=None, description="Datasets Power BI — licitacoes, contratos, gestores"
    )
    anos: list[int] | None = Field(default=None, description="Anos Power BI (multi)")


@router.post("/api/coleta")
def iniciar_coleta_unificada(req: ColetaUnificadaRequest, bg: BackgroundTasks):
    try:
        fontes = coleta_hub.normalizar_fontes(req.fontes)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    for u in req.unidades or []:
        if u not in obter_unidades_compradoras():
            raise HTTPException(400, f"Unidade inválida: {u}")
    for m in req.modalidades or []:
        if m not in MODALIDADES_PNCP:
            raise HTTPException(400, f"Modalidade inválida: {m}")
    if coleta_hub.status["running"]:
        if coleta_hub.is_stale():
            coleta_hub.liberar_trava(
                motivo="Trava órfã liberada automaticamente (sem progresso recente)"
            )
        else:
            raise HTTPException(
                409,
                "Já existe uma coleta unificada em andamento. "
                "Acompanhe o status ou use Liberar trava se estiver parada.",
            )

    coleta_hub.preparar_status(fontes)
    bg.add_task(
        coleta_hub.executar_coleta_unificada,
        fontes=fontes,
        ano=req.ano,
        data_inicial=req.data_inicial,
        data_final=req.data_final,
        unidades=req.unidades,
        modalidades=req.modalidades,
        fases=req.fases,
        ano_pgc=req.ano_pgc,
        datasets=req.datasets,
        anos=req.anos,
    )
    return {"status": "iniciada", "fontes": fontes, "ano": req.ano}


@router.get("/api/coleta/status")
def status_coleta_unificada():
    return coleta_hub.snapshot_status()


@router.post("/api/coleta/liberar")
def liberar_coleta_unificada():
    """Libera trava de coleta travada/órfã (não cancela HTTP em voo, só o lock)."""
    return coleta_hub.liberar_trava(
        motivo="Trava liberada pelo operador — nova coleta pode ser iniciada"
    )
