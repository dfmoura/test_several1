"""API de operação / prontidão de produção — admin."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import require_admin, require_login
from app.backup_ops import criar_backup, podar_backups
from app.config import APP_VERSION, POWER_BI_ENABLED
from app.database import Usuario, get_db
from app.ops.acesso import atualizar_acesso, obter_acesso, obter_acesso_publico
from app.ops.readiness import avaliar_prontidao

router = APIRouter(prefix="/api/ops", tags=["ops"])


class BackupBody(BaseModel):
    label: str = Field("manual", min_length=1, max_length=40)
    manter: int = Field(14, ge=1, le=90)


class AcessoBody(BaseModel):
    restrito: bool
    mensagem: str | None = Field(None, max_length=280)


@router.get("/acesso-publico")
def get_acesso_publico(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Status visível na tela de login (sem autenticação)."""
    return obter_acesso_publico(db)


@router.get("/acesso")
def get_acesso(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_login)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    return obter_acesso(db)


@router.put("/acesso")
def put_acesso(
    body: AcessoBody,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Ativa/desativa acesso restrito. Ao ativar, encerra sessões não-admin."""
    return atualizar_acesso(
        db,
        restrito=body.restrito,
        mensagem=body.mensagem,
        usuario_id=user.id if user else None,
    )


@router.get("/prontidao")
def get_prontidao(
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    return avaliar_prontidao(db)


@router.get("/info")
def get_info(
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = user
    return {
        "produto": "observatorio-social-brasil",
        "version": APP_VERSION,
        "fase": "9",
        "power_bi": POWER_BI_ENABLED,
        "analytics": "nativo",
        "stack": "fastapi+sqlite+caddy",
    }


@router.get("/roadmap")
def get_roadmap(
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Roadmap pós-v1 — o que vem, o que fica de fora (incl. Power BI)."""
    _ = user
    return {
        "power_bi": False,
        "itens": [
            {
                "id": "alertas",
                "titulo": "Alertas configuráveis",
                "status": "entregue",
                "nota": "Fase 9 — regras nativas no app",
            },
            {
                "id": "comparativos",
                "titulo": "Comparativos por UASG/modalidade",
                "status": "entregue",
                "nota": "Agregações SQLite no escopo; sem Power BI",
            },
            {
                "id": "modulo_03",
                "titulo": "Pesquisa de preço (módulo 03)",
                "status": "adiado",
                "nota": "Após 2–4 semanas estáveis com coleta 07",
            },
            {
                "id": "modulo_04",
                "titulo": "PGC (módulo 04)",
                "status": "adiado",
                "nota": "Depende de catálogo e carga real na VM",
            },
            {
                "id": "postgres",
                "titulo": "Postgres gerenciado",
                "status": "condicional",
                "nota": "Só se DB > ~8–10 GB ou RPO exigir",
            },
            {
                "id": "power_bi",
                "titulo": "Power BI / embeds / CSV PBI",
                "status": "rejeitado",
                "nota": "Proibido neste produto — analytics nativos apenas",
            },
            {
                "id": "portais_filial",
                "titulo": "Extensões CSV/portais por filial",
                "status": "condicional",
                "nota": "Só sob demanda explícita da OSC; nunca via Power BI",
            },
        ],
    }


@router.post("/backup")
def post_backup(
    body: BackupBody,
    db: Session = Depends(get_db),
    user: Annotated[Usuario, Depends(require_admin)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    _ = db
    _ = user
    if POWER_BI_ENABLED:
        raise HTTPException(status_code=500, detail="Configuração inválida: Power BI.")
    pasta = criar_backup(label=body.label)
    removidas = podar_backups(manter=body.manter)
    return {
        "ok": True,
        "pasta": str(pasta),
        "removidas": len(removidas),
        "manter": body.manter,
    }
