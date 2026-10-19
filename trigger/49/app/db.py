from __future__ import annotations

from contextvars import ContextVar

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

filial_ctx: ContextVar[str] = ContextVar("app_filial_id", default="")
acesso_ctx: ContextVar[str] = ContextVar("app_acesso", default="")


def _aplicar(executor, filial: str, acesso: str) -> None:
    executor.execute(
        text(
            "SELECT set_config('app.filial_id', :filial, true), "
            "set_config('app.acesso', :acesso, true)"
        ),
        {"filial": filial, "acesso": acesso},
    )


@event.listens_for(Session, "after_begin")
def _aplicar_contexto_rls(session, transaction, connection) -> None:
    if session.info.get("rls_explicito"):
        filial = str(session.info.get("filial_id", ""))
        acesso = str(session.info.get("acesso", ""))
    else:
        filial = filial_ctx.get()
        acesso = acesso_ctx.get()
    _aplicar(connection, filial, acesso)


def definir_contexto(filial_id: str | None, *, master: bool) -> tuple[str, str]:
    anterior = (filial_ctx.get(), acesso_ctx.get())
    filial_ctx.set(filial_id or "")
    acesso_ctx.set("master" if master else "")
    return anterior


def restaurar_contexto(anterior: tuple[str, str]) -> None:
    filial_ctx.set(anterior[0])
    acesso_ctx.set(anterior[1])


def garantir_contexto(db: Session) -> None:
    """Reaplica o GUC na transação já aberta. after_begin só corre no início."""
    _aplicar(db, filial_ctx.get(), acesso_ctx.get())


def sessao_do_principal(filial_id: str | None, *, master: bool) -> Session:
    db = SessionLocal()
    db.info["rls_explicito"] = True
    db.info["filial_id"] = filial_id or ""
    db.info["acesso"] = "master" if master else ""
    return db
