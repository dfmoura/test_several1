"""UASGs / unidades compradoras do Compras.gov — configuráveis no Setup.

A lista em ``config.UNIDADES_COMPRADORAS`` é apenas o *seed* inicial.
Após o primeiro uso, a fonte da verdade é a tabela ``sistema_unidades_compradoras``.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.config import UNIDADES_COMPRADORAS
from app.database import SessionLocal, SistemaUnidadeCompradora


def _codigo_limpo(codigo: str) -> str | None:
    limpo = str(codigo or "").strip()
    return limpo or None


def _fallback_seed() -> dict[str, str]:
    """Usado quando a tabela ainda não existe (ex.: testes sem init_db)."""
    return dict(UNIDADES_COMPRADORAS)


def garantir_seed(db: Session) -> int:
    """Insere as UASGs padrão quando a tabela ainda está vazia. Retorna quantas inseriu."""
    try:
        existe = db.scalar(select(SistemaUnidadeCompradora.id).limit(1))
    except (OperationalError, ProgrammingError):
        db.rollback()
        return 0
    if existe is not None:
        return 0
    for ordem, (codigo, nome) in enumerate(UNIDADES_COMPRADORAS.items()):
        db.add(
            SistemaUnidadeCompradora(
                codigo=str(codigo).strip(),
                nome=str(nome).strip(),
                ativo=True,
                ordem=ordem,
            )
        )
    db.commit()
    return len(UNIDADES_COMPRADORAS)


def obter_unidades_compradoras(
    db: Session | None = None,
    *,
    apenas_ativas: bool = True,
) -> dict[str, str]:
    """Retorna ``{codigo: nome}`` das unidades configuradas no Setup."""
    propria = db is None
    if propria:
        db = SessionLocal()
    try:
        garantir_seed(db)
        stmt = select(SistemaUnidadeCompradora).order_by(
            SistemaUnidadeCompradora.ordem,
            SistemaUnidadeCompradora.codigo,
        )
        if apenas_ativas:
            stmt = stmt.where(SistemaUnidadeCompradora.ativo.is_(True))
        rows = db.scalars(stmt).all()
        return {r.codigo: r.nome for r in rows}
    except (OperationalError, ProgrammingError):
        db.rollback()
        return _fallback_seed()
    finally:
        if propria:
            db.close()


def listar_unidades(
    db: Session,
    *,
    apenas_ativas: bool | None = None,
) -> list[SistemaUnidadeCompradora]:
    garantir_seed(db)
    stmt = select(SistemaUnidadeCompradora).order_by(
        SistemaUnidadeCompradora.ordem,
        SistemaUnidadeCompradora.codigo,
    )
    if apenas_ativas is True:
        stmt = stmt.where(SistemaUnidadeCompradora.ativo.is_(True))
    elif apenas_ativas is False:
        stmt = stmt.where(SistemaUnidadeCompradora.ativo.is_(False))
    return list(db.scalars(stmt).all())


def restaurar_padroes(db: Session) -> int:
    """Inclui códigos do seed que faltam; não remove nem sobrescreve os já cadastrados."""
    garantir_seed(db)
    existentes = {
        r.codigo for r in db.scalars(select(SistemaUnidadeCompradora)).all()
    }
    max_ordem = db.scalar(select(func.max(SistemaUnidadeCompradora.ordem))) or 0
    adicionados = 0
    for codigo, nome in UNIDADES_COMPRADORAS.items():
        codigo_n = _codigo_limpo(codigo)
        if not codigo_n or codigo_n in existentes:
            continue
        max_ordem += 1
        db.add(
            SistemaUnidadeCompradora(
                codigo=codigo_n,
                nome=str(nome).strip(),
                ativo=True,
                ordem=max_ordem,
            )
        )
        adicionados += 1
    if adicionados:
        db.commit()
    return adicionados
