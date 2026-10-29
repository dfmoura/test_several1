"""API do motor de coleta — planejar, executar, reprocessar, agendar."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth.deps import require_login
from app.coleta.agendamento import (
    atualizar_agendamento,
    obter_agendamento,
    periodo_agendado,
    tick_agendamento,
)
from app.coleta.motor import (
    ColetaError,
    execucao_para_dict,
    iniciar_execucao,
    executar_lote,
    planejar_e_executar,
    reprocessar_falhas,
)
from app.coleta.planejador import planejar_coleta
from app.database import ExecucaoColeta, Usuario, get_db
from app.org.service import is_admin_plataforma

router = APIRouter(prefix="/api/coleta", tags=["coleta"])


class ExecutarBody(BaseModel):
    data_inicial: date | None = None
    data_final: date | None = None
    # None → usa periodo_dias do Agendamento (fonte de verdade da coleta central).
    periodo_dias: int | None = Field(None, ge=1, le=3660)
    organizacao_id: int | None = None
    # Opcional: coleta pontual de uma UASG já monitorada (mesmo motor/dedupe).
    codigo_uasg: str | None = Field(None, min_length=1, max_length=10)
    # dry: só cria plano+tarefas sem HTTP (útil para preview operacional)
    dry_run: bool = False


class AgendamentoBody(BaseModel):
    ativo: bool | None = None
    hora_local: str | None = None
    periodo_dias: int | None = Field(None, ge=1, le=3660)


def _http(exc: ColetaError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.message)


def _periodo_efetivo(db: Session, periodo_dias: int | None) -> int:
    if periodo_dias is not None:
        return int(periodo_dias)
    return periodo_agendado(db)


@router.get("/plano")
def get_plano(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    periodo_dias: int | None = Query(None, ge=1, le=3660),
    data_inicial: date | None = None,
    data_final: date | None = None,
    organizacao_id: int | None = None,
    codigo_uasg: str | None = Query(None, min_length=1, max_length=10),
) -> dict[str, Any]:
    _ = user
    try:
        plano = planejar_coleta(
            db,
            data_inicial=data_inicial,
            data_final=data_final,
            periodo_dias=_periodo_efetivo(db, periodo_dias),
            organizacao_id=organizacao_id,
            codigo_uasg=codigo_uasg,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return plano.to_dict()


@router.post("/executar")
def post_executar(
    body: ExecutarBody,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    uid = user.id if user and user.id else None
    periodo = _periodo_efetivo(db, body.periodo_dias)
    try:
        if body.dry_run:
            exe = iniciar_execucao(
                db,
                origem="manual",
                usuario_id=uid,
                periodo_dias=periodo,
                data_inicial=body.data_inicial,
                data_final=body.data_final,
                organizacao_id=body.organizacao_id,
                codigo_uasg=body.codigo_uasg,
            )
            return execucao_para_dict(exe)
        exe = planejar_e_executar(
            db,
            origem="manual",
            usuario_id=uid,
            periodo_dias=periodo,
            data_inicial=body.data_inicial,
            data_final=body.data_final,
            organizacao_id=body.organizacao_id,
            codigo_uasg=body.codigo_uasg,
        )
        return execucao_para_dict(exe)
    except ColetaError as exc:
        raise _http(exc) from exc


@router.get("/execucoes")
def listar_execucoes(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    limit: int = Query(20, ge=1, le=100),
) -> list[dict[str, Any]]:
    _ = user
    rows = list(
        db.scalars(
            select(ExecucaoColeta)
            .order_by(ExecucaoColeta.id.desc())
            .limit(limit)
        ).all()
    )
    return [execucao_para_dict(r, com_tarefas=False) for r in rows]


@router.get("/execucoes/{execucao_id}")
def detalhe_execucao(
    execucao_id: int,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    exe = db.scalar(
        select(ExecucaoColeta)
        .where(ExecucaoColeta.id == execucao_id)
        .options(joinedload(ExecucaoColeta.tarefas))
    )
    if exe is None:
        raise HTTPException(status_code=404, detail="Execução não encontrada.")
    return execucao_para_dict(exe)


@router.post("/execucoes/{execucao_id}/reprocessar")
def post_reprocessar(
    execucao_id: int,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    try:
        exe = reprocessar_falhas(db, execucao_id)
        # recarrega com tarefas
        exe = db.scalar(
            select(ExecucaoColeta)
            .where(ExecucaoColeta.id == exe.id)
            .options(joinedload(ExecucaoColeta.tarefas))
        )
        assert exe is not None
        return execucao_para_dict(exe)
    except ColetaError as exc:
        raise _http(exc) from exc


@router.post("/execucoes/{execucao_id}/continuar")
def post_continuar(
    execucao_id: int,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Retoma pendentes + falhas (útil após dry_run ou interrupção)."""
    _ = user
    try:
        exe = executar_lote(db, execucao_id)
        exe = db.scalar(
            select(ExecucaoColeta)
            .where(ExecucaoColeta.id == exe.id)
            .options(joinedload(ExecucaoColeta.tarefas))
        )
        assert exe is not None
        return execucao_para_dict(exe)
    except ColetaError as exc:
        raise _http(exc) from exc


@router.get("/agendamento")
def get_agendamento(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    return obter_agendamento(db)


@router.put("/agendamento")
def put_agendamento(
    body: AgendamentoBody,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    if not is_admin_plataforma(user) and user.id != 0:
        raise HTTPException(status_code=403, detail="Somente admin altera agendamento.")
    try:
        return atualizar_agendamento(
            db,
            ativo=body.ativo,
            hora_local=body.hora_local,
            periodo_dias=body.periodo_dias,
        )
    except ColetaError as exc:
        raise _http(exc) from exc


@router.post("/agendamento/tick")
def post_tick(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    forcar: bool = Query(False),
) -> dict[str, Any]:
    """Invocável por cron na VM. ``forcar=true`` ignora janela horária (admin)."""
    if forcar and not is_admin_plataforma(user) and user.id != 0:
        raise HTTPException(status_code=403, detail="Somente admin força o tick.")
    return tick_agendamento(db, forcar=forcar)
