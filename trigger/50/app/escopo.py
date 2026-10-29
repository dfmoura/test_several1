"""Escopo operacional pelo login (vínculos + hierarquia) — não por «unidade ativa».

Decisão oficial: o próprio login dita o que o usuário enxerga.
Um filtro de visão opcional (sessão) apenas estreita dentro do ACL — nunca amplia.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.service import obter_sessao_por_token
from app.config import AUTH_SESSION_COOKIE
from app.database import FilialUasg, Uasg, Unidade, Usuario
from app.org.service import (
    filiais_acessiveis,
    is_admin_plataforma,
    unidades_acessiveis,
    usuario_acessa_unidade,
)


@dataclass(frozen=True)
class ContextoEscopo:
    """Contexto efetivo de leitura/consulta para o request."""

    modo: str  # plataforma | consolidado | filial
    rotulo: str
    ids_filiais: list[int] | None  # None = sem filtro (admin plataforma)
    unidade_contexto: Unidade | None  # unidade de referência para rótulo/KPIs
    filtro_unidade_id: int | None


def filtro_visao_sessao(
    request: Request, db: Session, user: Usuario
) -> Unidade | None:
    """Filtro opcional persistido na sessão; deve estar ⊆ ACL."""
    token = request.cookies.get(AUTH_SESSION_COOKIE)
    sess = obter_sessao_por_token(db, token) if token else None
    if not sess or not sess.unidade_ativa_id:
        return None
    u = db.get(Unidade, sess.unidade_ativa_id)
    if u is None or not u.ativo:
        return None
    if not (is_admin_plataforma(user) or usuario_acessa_unidade(db, user, u.id)):
        return None
    return u


def ids_filiais_do_usuario(
    db: Session,
    user: Usuario,
    *,
    filtro_unidade: Unidade | None = None,
) -> list[int] | None:
    """IDs de filiais no escopo efetivo.

    None = admin sem filtro (vê a base inteira).
    Lista (pode ser vazia) = restrição obrigatória.
    """
    if filtro_unidade is not None:
        if filtro_unidade.tipo == "matriz":
            return [
                u.id
                for u in filiais_acessiveis(db, user)
                if u.organizacao_id == filtro_unidade.organizacao_id
            ]
        if filtro_unidade.tipo == "filial":
            return [filtro_unidade.id]
        return []

    if is_admin_plataforma(user):
        return None

    return [u.id for u in filiais_acessiveis(db, user)]


def codigos_uasg_por_filiais(
    db: Session, ids_filiais: list[int] | None
) -> list[str] | None:
    """None = vê tudo; [] = sem UASG monitorada; senão lista de códigos."""
    if ids_filiais is None:
        return None
    if not ids_filiais:
        return []
    rows = db.scalars(
        select(Uasg.codigo_uasg)
        .join(FilialUasg, FilialUasg.uasg_id == Uasg.id)
        .where(
            FilialUasg.unidade_id.in_(ids_filiais),
            FilialUasg.ativo.is_(True),
        )
    ).all()
    return list(rows)


def resolver_escopo(
    db: Session,
    user: Usuario,
    *,
    request: Request | None = None,
    filtro_unidade_id: int | None = None,
    usar_filtro_sessao: bool = True,
) -> ContextoEscopo:
    """Resolve escopo: vínculos do login + filtro opcional (query ou sessão)."""
    filtro: Unidade | None = None
    if filtro_unidade_id is not None:
        cand = db.get(Unidade, filtro_unidade_id)
        if cand and cand.ativo and (
            is_admin_plataforma(user) or usuario_acessa_unidade(db, user, cand.id)
        ):
            filtro = cand
    elif usar_filtro_sessao and request is not None:
        filtro = filtro_visao_sessao(request, db, user)

    ids = ids_filiais_do_usuario(db, user, filtro_unidade=filtro)

    if is_admin_plataforma(user) and filtro is None:
        return ContextoEscopo(
            modo="plataforma",
            rotulo="Plataforma (visão geral)",
            ids_filiais=None,
            unidade_contexto=None,
            filtro_unidade_id=None,
        )

    if filtro is not None:
        if filtro.tipo == "matriz":
            return ContextoEscopo(
                modo="consolidado",
                rotulo=f"Consolidado · {filtro.nome}",
                ids_filiais=ids if ids is not None else [],
                unidade_contexto=filtro,
                filtro_unidade_id=filtro.id,
            )
        return ContextoEscopo(
            modo="filial",
            rotulo=filtro.nome,
            ids_filiais=ids if ids is not None else [filtro.id],
            unidade_contexto=filtro,
            filtro_unidade_id=filtro.id,
        )

    # Sem filtro: consolidado do ACL (matriz e/ou várias filiais)
    acessiveis = unidades_acessiveis(db, user)
    matrizes = [u for u in acessiveis if u.tipo == "matriz"]
    filiais = [u for u in acessiveis if u.tipo == "filial"]
    if matrizes:
        m = matrizes[0]
        return ContextoEscopo(
            modo="consolidado",
            rotulo=f"Consolidado · {m.nome}",
            ids_filiais=ids if ids is not None else [],
            unidade_contexto=m,
            filtro_unidade_id=None,
        )
    if len(filiais) == 1:
        f = filiais[0]
        return ContextoEscopo(
            modo="filial",
            rotulo=f.nome,
            ids_filiais=[f.id],
            unidade_contexto=f,
            filtro_unidade_id=None,
        )
    if filiais:
        return ContextoEscopo(
            modo="consolidado",
            rotulo=f"Minhas filiais ({len(filiais)})",
            ids_filiais=ids if ids is not None else [],
            unidade_contexto=None,
            filtro_unidade_id=None,
        )
    return ContextoEscopo(
        modo="filial",
        rotulo="Sem unidade vinculada",
        ids_filiais=[],
        unidade_contexto=None,
        filtro_unidade_id=None,
    )


def codigos_uasg_escopo_usuario(
    request: Request,
    db: Session,
    user: Usuario,
) -> tuple[ContextoEscopo, list[str] | None]:
    ctx = resolver_escopo(db, user, request=request)
    return ctx, codigos_uasg_por_filiais(db, ctx.ids_filiais)


def eh_visao_filial(ctx: ContextoEscopo) -> bool:
    """True quando a consulta analítica Compras.gov pode ser usada."""
    return ctx.modo == "filial"


# --- Compatibilidade (chamadores legados) ---------------------------------


def unidade_ativa(request: Request, db: Session, user: Usuario) -> Unidade | None:
    """Compat: retorna unidade de contexto (filtro ou referência do escopo)."""
    return resolver_escopo(db, user, request=request).unidade_contexto


def ids_filiais_escopo(db: Session, unidade: Unidade | None) -> list[int] | None:
    """Compat: expansão a partir de uma unidade explícita (matriz→filiais)."""
    if unidade is None:
        return None
    if unidade.tipo == "matriz":
        return list(
            db.scalars(
                select(Unidade.id).where(
                    Unidade.organizacao_id == unidade.organizacao_id,
                    Unidade.tipo == "filial",
                    Unidade.ativo.is_(True),
                )
            ).all()
        )
    return [unidade.id]


def codigos_uasg_escopo(db: Session, unidade: Unidade | None) -> list[str] | None:
    """Compat: UASGs a partir de uma unidade explícita."""
    return codigos_uasg_por_filiais(db, ids_filiais_escopo(db, unidade))
