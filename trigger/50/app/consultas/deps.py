"""Dependências FastAPI compartilhadas das consultas (período, etc.)."""

from __future__ import annotations

from fastapi import HTTPException, Query

from app.consultas.periodo import PeriodoAplicado, PeriodoError, resolver_periodo


def periodo_query(
    periodo: str | None = Query(
        None,
        description=(
            "Preset: ano_atual | ano_anterior | quadrimestre | "
            "quadrimestre_atual | intervalo | tudo. Omitido = tudo."
        ),
    ),
    data_inicio: str | None = Query(
        None, description="Início ISO AAAA-MM-DD (modo intervalo)."
    ),
    data_fim: str | None = Query(
        None, description="Fim ISO AAAA-MM-DD (modo intervalo)."
    ),
    ano: int | None = Query(
        None, ge=2000, le=2100, description="Ano do quadrimestre (modo quadrimestre)."
    ),
    quadrimestre: int | None = Query(
        None, ge=1, le=3, description="Q1–Q3 (modo quadrimestre)."
    ),
) -> PeriodoAplicado:
    try:
        return resolver_periodo(
            periodo,
            data_inicio,
            data_fim,
            ano=ano,
            quadrimestre=quadrimestre,
        )
    except PeriodoError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
