"""Responsável operacional usuário ↔ contratação (visão de filial).

Decisão: o login + USUARIO_UNIDADE autorizam a ver a contratação; esta
camada registra **um responsável ativo por (contratação, filial)**.
Preferência operacional — não altera ACL.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.database import Contratacao, Usuario, UsuarioContratacao
from app.escopo import ContextoEscopo, eh_visao_filial


class AcompanhamentoError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _exigir_filial(ctx: ContextoEscopo) -> None:
    if not eh_visao_filial(ctx):
        raise AcompanhamentoError(
            "Acompanhamento disponível apenas na visão de filial. "
            "Use o filtro de visão ou acesse com um login de filial.",
            status_code=403,
        )


def _unidade_filial_id(ctx: ContextoEscopo) -> int:
    _exigir_filial(ctx)
    if ctx.unidade_contexto is not None and ctx.unidade_contexto.tipo == "filial":
        return int(ctx.unidade_contexto.id)
    ids = ctx.ids_filiais or []
    if len(ids) == 1:
        return int(ids[0])
    raise AcompanhamentoError(
        "Não foi possível determinar a filial do escopo para o acompanhamento.",
        status_code=400,
    )


def _obter_contratacao_no_escopo(
    db: Session,
    *,
    contratacao_id: int,
    escopo_uasgs: list[str] | None,
) -> Contratacao:
    c = db.get(Contratacao, contratacao_id)
    if c is None:
        raise AcompanhamentoError("Contratação não encontrada.", status_code=404)
    if escopo_uasgs is not None and c.unidade_compradora not in escopo_uasgs:
        raise AcompanhamentoError(
            "Contratação fora do escopo da filial.",
            status_code=403,
        )
    return c


def _username(db: Session, usuario_id: int) -> str:
    u = db.get(Usuario, usuario_id)
    return (u.username if u and u.username else str(usuario_id))


def _responsavel_payload(
    db: Session, *, usuario_id: int | None
) -> dict[str, Any] | None:
    if usuario_id is None:
        return None
    return {"id": int(usuario_id), "username": _username(db, int(usuario_id))}


def responsavel_da_contratacao(
    db: Session,
    *,
    contratacao_id: int,
    unidade_id: int | None,
) -> dict[str, Any] | None:
    """Responsável ativo da contratação na filial (no máximo um)."""
    stmt = select(UsuarioContratacao).where(
        UsuarioContratacao.contratacao_id == contratacao_id,
        UsuarioContratacao.ativo.is_(True),
    )
    if unidade_id is not None:
        stmt = stmt.where(UsuarioContratacao.unidade_id == unidade_id)
    stmt = stmt.order_by(
        UsuarioContratacao.atualizado_em.desc(),
        UsuarioContratacao.id.desc(),
    )
    row = db.scalars(stmt).first()
    if row is None:
        return None
    return _responsavel_payload(db, usuario_id=row.usuario_id)


def mapa_responsaveis(
    db: Session,
    *,
    contratacao_ids: list[int],
    unidade_id: int | None,
) -> dict[int, dict[str, Any]]:
    """Mapa contratação → ``{id, username}`` do responsável ativo na filial."""
    if not contratacao_ids:
        return {}
    stmt = (
        select(
            UsuarioContratacao.contratacao_id,
            UsuarioContratacao.usuario_id,
            Usuario.username,
            UsuarioContratacao.atualizado_em,
            UsuarioContratacao.id,
        )
        .join(Usuario, Usuario.id == UsuarioContratacao.usuario_id)
        .where(
            UsuarioContratacao.ativo.is_(True),
            UsuarioContratacao.contratacao_id.in_(contratacao_ids),
        )
        .order_by(
            UsuarioContratacao.contratacao_id,
            UsuarioContratacao.atualizado_em.desc(),
            UsuarioContratacao.id.desc(),
        )
    )
    if unidade_id is not None:
        stmt = stmt.where(UsuarioContratacao.unidade_id == unidade_id)

    out: dict[int, dict[str, Any]] = {}
    for cid, uid, uname, _upd, _rid in db.execute(stmt).all():
        key = int(cid)
        if key in out:
            continue  # já ficou o mais recente
        out[key] = {
            "id": int(uid),
            "username": uname or str(uid),
        }
    return out


def ids_acompanhadas_usuario(
    db: Session,
    *,
    usuario_id: int,
    unidade_id: int | None = None,
) -> set[int]:
    """IDs de contratações em que o usuário é o responsável ativo."""
    stmt = select(UsuarioContratacao.contratacao_id).where(
        UsuarioContratacao.usuario_id == usuario_id,
        UsuarioContratacao.ativo.is_(True),
    )
    if unidade_id is not None:
        stmt = stmt.where(UsuarioContratacao.unidade_id == unidade_id)
    return {int(x) for x in db.scalars(stmt).all()}


def esta_acompanhada(
    db: Session,
    *,
    usuario_id: int,
    contratacao_id: int,
    unidade_id: int | None = None,
) -> bool:
    stmt = select(UsuarioContratacao.id).where(
        UsuarioContratacao.usuario_id == usuario_id,
        UsuarioContratacao.contratacao_id == contratacao_id,
        UsuarioContratacao.ativo.is_(True),
    )
    if unidade_id is not None:
        stmt = stmt.where(UsuarioContratacao.unidade_id == unidade_id)
    return db.scalar(stmt) is not None


def mapa_acompanhadas(
    db: Session,
    *,
    usuario_id: int,
    contratacao_ids: list[int],
    unidade_id: int | None = None,
) -> dict[int, bool]:
    if not contratacao_ids:
        return {}
    stmt = select(UsuarioContratacao.contratacao_id).where(
        UsuarioContratacao.usuario_id == usuario_id,
        UsuarioContratacao.contratacao_id.in_(contratacao_ids),
        UsuarioContratacao.ativo.is_(True),
    )
    if unidade_id is not None:
        stmt = stmt.where(UsuarioContratacao.unidade_id == unidade_id)
    ativos = set(db.scalars(stmt).all())
    return {int(cid): int(cid) in ativos for cid in contratacao_ids}


def _desativar_outros(
    db: Session,
    *,
    contratacao_id: int,
    unidade_id: int,
    exceto_usuario_id: int,
) -> dict[str, Any] | None:
    """Desativa outros responsáveis ativos; devolve o anterior (se houver)."""
    anteriores = list(
        db.scalars(
            select(UsuarioContratacao)
            .where(
                UsuarioContratacao.contratacao_id == contratacao_id,
                UsuarioContratacao.unidade_id == unidade_id,
                UsuarioContratacao.ativo.is_(True),
                UsuarioContratacao.usuario_id != exceto_usuario_id,
            )
            .order_by(
                UsuarioContratacao.atualizado_em.desc(),
                UsuarioContratacao.id.desc(),
            )
        ).all()
    )
    transferido_de: dict[str, Any] | None = None
    if anteriores:
        transferido_de = _responsavel_payload(
            db, usuario_id=anteriores[0].usuario_id
        )
    if anteriores:
        db.execute(
            update(UsuarioContratacao)
            .where(
                UsuarioContratacao.contratacao_id == contratacao_id,
                UsuarioContratacao.unidade_id == unidade_id,
                UsuarioContratacao.ativo.is_(True),
                UsuarioContratacao.usuario_id != exceto_usuario_id,
            )
            .values(ativo=False)
        )
    return transferido_de


def associar(
    db: Session,
    *,
    user: Usuario,
    ctx: ContextoEscopo,
    escopo_uasgs: list[str] | None,
    contratacao_id: int,
) -> dict[str, Any]:
    """Assume o acompanhamento: 1 responsável ativo por contratação na filial."""
    unidade_id = _unidade_filial_id(ctx)
    c = _obter_contratacao_no_escopo(
        db, contratacao_id=contratacao_id, escopo_uasgs=escopo_uasgs
    )

    transferido_de = _desativar_outros(
        db,
        contratacao_id=c.id,
        unidade_id=unidade_id,
        exceto_usuario_id=user.id,
    )

    row = db.scalar(
        select(UsuarioContratacao).where(
            UsuarioContratacao.usuario_id == user.id,
            UsuarioContratacao.contratacao_id == c.id,
        )
    )
    if row is None:
        row = UsuarioContratacao(
            usuario_id=user.id,
            contratacao_id=c.id,
            unidade_id=unidade_id,
            ativo=True,
        )
        db.add(row)
    else:
        row.ativo = True
        row.unidade_id = unidade_id
    db.commit()
    db.refresh(row)
    out = _out(db, row, c)
    out["transferido_de"] = transferido_de
    return out


def desassociar(
    db: Session,
    *,
    user: Usuario,
    ctx: ContextoEscopo,
    escopo_uasgs: list[str] | None,
    contratacao_id: int,
) -> dict[str, Any]:
    unidade_id = _unidade_filial_id(ctx)
    c = _obter_contratacao_no_escopo(
        db, contratacao_id=contratacao_id, escopo_uasgs=escopo_uasgs
    )
    row = db.scalar(
        select(UsuarioContratacao).where(
            UsuarioContratacao.usuario_id == user.id,
            UsuarioContratacao.contratacao_id == c.id,
            UsuarioContratacao.unidade_id == unidade_id,
            UsuarioContratacao.ativo.is_(True),
        )
    )
    if row is None:
        raise AcompanhamentoError(
            "Você não é o responsável desta contratação.",
            status_code=404,
        )
    row.ativo = False
    db.commit()
    db.refresh(row)
    return _out(db, row, c)


def subquery_cobertura_ids(unidade_ids: list[int] | None = None):
    """IDs de contratação com responsável ativo (opcionalmente na filial).

    Preferência operacional — não é ACL. ``unidade_ids`` restringe ao
    ``UsuarioContratacao.unidade_id`` (filial no momento da associação).
    """
    stmt = select(UsuarioContratacao.contratacao_id).where(
        UsuarioContratacao.ativo.is_(True),
    )
    if unidade_ids is not None:
        if not unidade_ids:
            return select(UsuarioContratacao.contratacao_id).where(
                UsuarioContratacao.id == -1
            )
        stmt = stmt.where(UsuarioContratacao.unidade_id.in_(unidade_ids))
    return stmt


def contar_meus(
    db: Session,
    *,
    usuario_id: int,
    unidade_id: int | None,
    escopo_uasgs: list[str] | None,
    ids_periodo: set[str] | None = None,
) -> int:
    """Quantas contratações o usuário é responsável no escopo (e período)."""
    if escopo_uasgs is not None and not escopo_uasgs:
        return 0
    if ids_periodo is not None and not ids_periodo:
        return 0

    stmt = (
        select(func.count())
        .select_from(UsuarioContratacao)
        .join(Contratacao, Contratacao.id == UsuarioContratacao.contratacao_id)
        .where(
            UsuarioContratacao.usuario_id == usuario_id,
            UsuarioContratacao.ativo.is_(True),
        )
    )
    if unidade_id is not None:
        stmt = stmt.where(UsuarioContratacao.unidade_id == unidade_id)
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    if ids_periodo is not None:
        stmt = stmt.where(Contratacao.id_compra.in_(ids_periodo))
    return int(db.scalar(stmt) or 0)


def cobertura_por_filial(
    db: Session,
    *,
    ids_filiais: list[int],
    escopo_uasgs: list[str] | None,
    ids_periodo: set[str] | None = None,
) -> dict[int, dict[str, int]]:
    """Por filial: distinct contratações com responsável ativo no escopo."""
    out: dict[int, dict[str, int]] = {
        int(fid): {"com_acompanhamento": 0} for fid in ids_filiais
    }
    if not ids_filiais:
        return out
    if escopo_uasgs is not None and not escopo_uasgs:
        return out
    if ids_periodo is not None and not ids_periodo:
        return out

    stmt = (
        select(
            UsuarioContratacao.unidade_id,
            func.count(func.distinct(UsuarioContratacao.contratacao_id)),
        )
        .join(Contratacao, Contratacao.id == UsuarioContratacao.contratacao_id)
        .where(
            UsuarioContratacao.ativo.is_(True),
            UsuarioContratacao.unidade_id.in_(ids_filiais),
        )
        .group_by(UsuarioContratacao.unidade_id)
    )
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    if ids_periodo is not None:
        stmt = stmt.where(Contratacao.id_compra.in_(ids_periodo))

    for fid, n in db.execute(stmt).all():
        if fid is None:
            continue
        out.setdefault(int(fid), {"com_acompanhamento": 0})
        out[int(fid)]["com_acompanhamento"] = int(n or 0)
    return out


def cobertura_rede(
    db: Session,
    *,
    ids_filiais: list[int] | None,
    escopo_uasgs: list[str] | None,
    ids_periodo: set[str] | None = None,
) -> int:
    """Distinct contratações com responsável ativo no escopo da rede."""
    if escopo_uasgs is not None and not escopo_uasgs:
        return 0
    if ids_periodo is not None and not ids_periodo:
        return 0
    if ids_filiais is not None and not ids_filiais:
        return 0

    stmt = (
        select(func.count(func.distinct(UsuarioContratacao.contratacao_id)))
        .select_from(UsuarioContratacao)
        .join(Contratacao, Contratacao.id == UsuarioContratacao.contratacao_id)
        .where(UsuarioContratacao.ativo.is_(True))
    )
    if ids_filiais is not None:
        stmt = stmt.where(UsuarioContratacao.unidade_id.in_(ids_filiais))
    if escopo_uasgs is not None:
        stmt = stmt.where(Contratacao.unidade_compradora.in_(escopo_uasgs))
    if ids_periodo is not None:
        stmt = stmt.where(Contratacao.id_compra.in_(ids_periodo))
    return int(db.scalar(stmt) or 0)


def _out(
    db: Session, row: UsuarioContratacao, c: Contratacao
) -> dict[str, Any]:
    resp = (
        _responsavel_payload(db, usuario_id=row.usuario_id)
        if row.ativo
        else None
    )
    return {
        "id": row.id,
        "usuario_id": row.usuario_id,
        "contratacao_id": row.contratacao_id,
        "unidade_id": row.unidade_id,
        "ativo": bool(row.ativo),
        "id_compra": c.id_compra,
        "unidade_compradora": c.unidade_compradora,
        "responsavel": resp,
        "criado_em": row.criado_em.isoformat() if row.criado_em else None,
        "atualizado_em": row.atualizado_em.isoformat() if row.atualizado_em else None,
    }
