"""API de enriquecimento CNPJ / CEP."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.deps import require_login
from app.database import CacheCep, Fornecedor, Usuario, get_db
from app.enriquecimento import job as job_cnpj
from app.enriquecimento.service import (
    contar_pendentes_cnpj,
    enriquecer_cep,
    enriquecer_cnpj,
    fornecedor_para_api,
    listar_pendentes_cnpj,
    obter_pos_coleta_status,
    orcamento_pos_coleta,
)

router = APIRouter(prefix="/api/enriquecimento", tags=["enriquecimento"])


class CnpjBody(BaseModel):
    cnpj: str = Field(..., min_length=11, max_length=18)
    forcar: bool = False


class CepBody(BaseModel):
    cep: str = Field(..., min_length=8, max_length=10)
    forcar: bool = False
    aplicar_em_ni: str | None = None


@router.get("/resumo")
def resumo(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    total = int(db.scalar(select(func.count()).select_from(Fornecedor)) or 0)
    pendentes = contar_pendentes_cnpj(db)
    enriquecidos = int(
        db.scalar(
            select(func.count())
            .select_from(Fornecedor)
            .where(Fornecedor.fonte_cnpj.is_not(None))
        )
        or 0
    )
    ceps = int(db.scalar(select(func.count()).select_from(CacheCep)) or 0)
    return {
        "fornecedores": total,
        "cnpj_pendentes": pendentes,
        "cnpj_enriquecidos": enriquecidos,
        "ceps_cache": ceps,
        "job": job_cnpj.status_publico(),
        "orcamento_pos_coleta": orcamento_pos_coleta(db),
        "ultimo_pos_coleta": obter_pos_coleta_status(db),
    }


@router.get("/pendentes")
def pendentes(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    limit: int = Query(50, ge=1, le=200),
) -> list[dict[str, Any]]:
    _ = user
    return [fornecedor_para_api(r) for r in listar_pendentes_cnpj(db, limit=limit)]


@router.post("/cnpj")
def post_cnpj(
    body: CnpjBody,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    try:
        return enriquecer_cnpj(db, body.cnpj, forcar=body.forcar)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/cep")
def post_cep(
    body: CepBody,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    try:
        return enriquecer_cep(
            db,
            body.cep,
            forcar=body.forcar,
            aplicar_em_ni=body.aplicar_em_ni,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/job/pendentes")
def post_job(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    limit: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    _ = user
    _ = db
    try:
        result = job_cnpj.iniciar_e_executar(limit=limit)
        return {"ok": True, **result, "status": job_cnpj.status_publico()}
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/job/status")
def get_job_status(
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    return job_cnpj.status_publico()


@router.get("/fornecedores/{ni}")
def get_fornecedor(
    ni: str,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    from app.compras.normalizers import normalizar_ni

    codigo = normalizar_ni(ni)
    row = db.scalar(select(Fornecedor).where(Fornecedor.ni == codigo))
    if row is None:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado.")
    return fornecedor_para_api(row)
