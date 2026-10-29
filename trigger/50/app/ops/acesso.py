"""Modo acesso restrito — app no ar, usuários não-admin bloqueados."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.service import PAPEL_ADMIN
from app.database import ModoAcessoOperacao, Sessao, Usuario

MSG_PADRAO = (
    "Sistema em janela operacional (coleta/enriquecimento). "
    "Acesso liberado apenas para administradores."
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def garantir_modo_acesso(db: Session) -> ModoAcessoOperacao:
    row = db.get(ModoAcessoOperacao, 1)
    if row is None:
        row = ModoAcessoOperacao(id=1, restrito=False, mensagem=MSG_PADRAO)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def obter_acesso_publico(db: Session) -> dict[str, Any]:
    """Payload seguro para tela de login (sem dados sensíveis)."""
    row = garantir_modo_acesso(db)
    return {
        "restrito": bool(row.restrito),
        "mensagem": row.mensagem or MSG_PADRAO,
    }


def obter_acesso(db: Session) -> dict[str, Any]:
    row = garantir_modo_acesso(db)
    return {
        "restrito": bool(row.restrito),
        "mensagem": row.mensagem or MSG_PADRAO,
        "atualizado_em": row.atualizado_em.isoformat() if row.atualizado_em else None,
        "atualizado_por_id": row.atualizado_por_id,
    }


def _encerrar_sessoes_nao_admin(db: Session) -> int:
    """Encerra sessões de quem não é admin (consulta e contas inativas)."""
    admin_ids = {
        int(uid)
        for uid in db.scalars(
            select(Usuario.id).where(
                Usuario.papel == PAPEL_ADMIN,
                Usuario.ativo.is_(True),
            )
        ).all()
    }
    n = 0
    for sessao in list(db.scalars(select(Sessao)).all()):
        if sessao.usuario_id not in admin_ids:
            db.delete(sessao)
            n += 1
    if n:
        db.commit()
    return n


def atualizar_acesso(
    db: Session,
    *,
    restrito: bool,
    mensagem: str | None = None,
    usuario_id: int | None = None,
) -> dict[str, Any]:
    row = garantir_modo_acesso(db)
    row.restrito = bool(restrito)
    if mensagem is not None:
        texto = mensagem.strip()
        if not texto:
            texto = MSG_PADRAO
        if len(texto) > 280:
            texto = texto[:280]
        row.mensagem = texto
    row.atualizado_em = _utcnow()
    row.atualizado_por_id = usuario_id
    db.commit()

    sessoes_encerradas = 0
    if row.restrito:
        sessoes_encerradas = _encerrar_sessoes_nao_admin(db)

    out = obter_acesso(db)
    out["sessoes_nao_admin_encerradas"] = sessoes_encerradas
    return out


def acesso_restrito_ativo(db: Session) -> bool:
    return bool(garantir_modo_acesso(db).restrito)


def mensagem_acesso_restrito(db: Session) -> str:
    return garantir_modo_acesso(db).mensagem or MSG_PADRAO


def usuario_pode_acessar_em_restricao(user: Usuario) -> bool:
    return bool(user and user.ativo and user.papel == PAPEL_ADMIN)
