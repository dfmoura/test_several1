"""API REST do backlog operacional."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import require_admin, require_login
from app.backlog import service
from app.database import Usuario, get_db

router = APIRouter(prefix="/api/backlog", tags=["backlog"])


class BacklogCreate(BaseModel):
    tarefa: str = Field(..., min_length=1, max_length=500)
    inicio_em: str = Field(..., description="AAAA-MM-DD HH:MM")
    fim_em: str | None = Field(None, description="AAAA-MM-DD HH:MM — se informado, já conclui")
    observacao_conclusao: str | None = Field(None, max_length=500)


class BacklogUpdate(BaseModel):
    tarefa: str | None = Field(None, min_length=1, max_length=500)
    inicio_em: str | None = None


class BacklogConcluir(BaseModel):
    fim_em: str | None = Field(None, description="AAAA-MM-DD HH:MM; default = agora")
    observacao_conclusao: str | None = Field(None, max_length=500)


@router.get("")
def get_lista(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
    q: str | None = Query(None),
    situacao: Literal["abertos", "concluidos", "todos"] | None = Query("todos"),
) -> dict[str, Any]:
    _ = user
    sit = None if situacao in (None, "todos") else situacao
    data = service.listar(db, q=q, situacao=sit)
    return {
        "data": data,
        "total": len(data),
        "abertos": sum(1 for r in data if r["situacao"] == "ABERTO"),
        "concluidos": sum(1 for r in data if r["situacao"] == "CONCLUIDO"),
    }


@router.post("")
def post_criar(
    body: BacklogCreate,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    try:
        return {
            "data": service.criar(
                db,
                tarefa=body.tarefa,
                inicio_em=body.inicio_em,
                fim_em=body.fim_em,
                observacao_conclusao=body.observacao_conclusao,
            )
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{item_id}")
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    try:
        return {"data": service.to_out(service.obter(db, item_id))}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{item_id}")
def put_atualizar(
    item_id: int,
    body: BacklogUpdate,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    try:
        return {
            "data": service.atualizar(
                db,
                item_id,
                tarefa=body.tarefa,
                inicio_em=body.inicio_em,
            )
        }
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{item_id}/concluir")
def post_concluir(
    item_id: int,
    body: BacklogConcluir,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    try:
        return {
            "data": service.concluir(
                db,
                item_id,
                fim_em=body.fim_em,
                observacao_conclusao=body.observacao_conclusao,
            )
        }
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{item_id}/reabrir")
def post_reabrir(
    item_id: int,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    try:
        return {"data": service.reabrir(db, item_id)}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, bool]:
    _ = user
    try:
        service.excluir(db, item_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}
