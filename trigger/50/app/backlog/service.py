"""Serviço de backlog operacional (padrão trigger/43, com início/fim explícitos)."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import BacklogItem

_CODIGO_RE = re.compile(r"^BLG-(\d+)$")


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.replace(microsecond=0).isoformat(sep=" ")


def to_out(item: BacklogItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "codigo": item.codigo,
        "tarefa": item.tarefa,
        "inicio_em": _iso(item.inicio_em),
        "fim_em": _iso(item.fim_em),
        "observacao_conclusao": item.observacao_conclusao,
        "situacao": "CONCLUIDO" if item.is_concluido() else "ABERTO",
        "criado_em": _iso(item.criado_em),
        "atualizado_em": _iso(item.atualizado_em),
    }


def _normalize_tarefa(tarefa: str | None) -> str:
    trimmed = (tarefa or "").strip()
    if not trimmed:
        raise ValueError("Informe a tarefa.")
    if len(trimmed) > 500:
        raise ValueError("Tarefa deve ter no máximo 500 caracteres.")
    return trimmed


def _normalize_obs(observacao: str | None) -> str | None:
    if observacao is None:
        return None
    trimmed = observacao.strip()
    if not trimmed:
        return None
    if len(trimmed) > 500:
        raise ValueError("Observação deve ter no máximo 500 caracteres.")
    return trimmed


def _parse_dt(value: str | datetime | None, *, campo: str) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.replace(microsecond=0)
    raw = str(value).strip().replace("T", " ")
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(raw[:19] if len(raw) > 16 else raw, fmt)
        except ValueError:
            continue
    raise ValueError(f"{campo}: data/hora inválida (use AAAA-MM-DD HH:MM).")


def _proximo_codigo(db: Session) -> str:
    rows = (
        db.query(BacklogItem.codigo)
        .filter(BacklogItem.codigo.like("BLG-%"))
        .all()
    )
    max_n = 0
    for (codigo,) in rows:
        m = _CODIGO_RE.match(codigo or "")
        if m:
            max_n = max(max_n, int(m.group(1)))
    return f"BLG-{max_n + 1:05d}"


def listar(
    db: Session,
    *,
    q: str | None = None,
    situacao: str | None = None,
) -> list[dict[str, Any]]:
    query = db.query(BacklogItem).filter(BacklogItem.excluido_em.is_(None))
    if situacao == "abertos":
        query = query.filter(BacklogItem.fim_em.is_(None))
    elif situacao == "concluidos":
        query = query.filter(BacklogItem.fim_em.is_not(None))

    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                BacklogItem.codigo.ilike(like),
                BacklogItem.tarefa.ilike(like),
                BacklogItem.observacao_conclusao.ilike(like),
            )
        )

    rows = query.order_by(
        BacklogItem.fim_em.is_not(None),
        BacklogItem.inicio_em.desc(),
    ).all()
    return [to_out(r) for r in rows]


def obter(db: Session, item_id: int) -> BacklogItem:
    item = (
        db.query(BacklogItem)
        .filter(BacklogItem.id == item_id, BacklogItem.excluido_em.is_(None))
        .one_or_none()
    )
    if item is None:
        raise LookupError("Item de backlog não encontrado.")
    return item


def criar(
    db: Session,
    *,
    tarefa: str,
    inicio_em: str | datetime,
    fim_em: str | datetime | None = None,
    observacao_conclusao: str | None = None,
    codigo: str | None = None,
) -> dict[str, Any]:
    tarefa_n = _normalize_tarefa(tarefa)
    inicio = _parse_dt(inicio_em, campo="inicio_em")
    if inicio is None:
        raise ValueError("Informe a data/hora de início.")
    fim = _parse_dt(fim_em, campo="fim_em")
    obs = _normalize_obs(observacao_conclusao)
    if fim is not None and fim < inicio:
        raise ValueError("Data/hora de fim não pode ser anterior ao início.")
    if fim is None and obs is not None:
        raise ValueError("Observação de conclusão exige data/hora de fim.")

    cod = (codigo or "").strip().upper() or _proximo_codigo(db)
    if db.query(BacklogItem).filter(BacklogItem.codigo == cod).first():
        raise ValueError(f"Código {cod} já existe.")

    item = BacklogItem(
        codigo=cod,
        tarefa=tarefa_n,
        inicio_em=inicio,
        fim_em=fim,
        observacao_conclusao=obs if fim is not None else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return to_out(item)


def atualizar(
    db: Session,
    item_id: int,
    *,
    tarefa: str | None = None,
    inicio_em: str | datetime | None = None,
) -> dict[str, Any]:
    item = obter(db, item_id)
    if tarefa is not None:
        item.tarefa = _normalize_tarefa(tarefa)
    if inicio_em is not None:
        inicio = _parse_dt(inicio_em, campo="inicio_em")
        if inicio is None:
            raise ValueError("Informe a data/hora de início.")
        if item.fim_em is not None and item.fim_em < inicio:
            raise ValueError("Início não pode ser posterior ao fim já registrado.")
        item.inicio_em = inicio
    db.commit()
    db.refresh(item)
    return to_out(item)


def concluir(
    db: Session,
    item_id: int,
    *,
    fim_em: str | datetime | None = None,
    observacao_conclusao: str | None = None,
) -> dict[str, Any]:
    item = obter(db, item_id)
    obs = _normalize_obs(observacao_conclusao)
    fim = _parse_dt(fim_em, campo="fim_em") if fim_em is not None else datetime.now().replace(
        microsecond=0
    )
    if fim is None:
        raise ValueError("Informe a data/hora de fim.")
    if fim < item.inicio_em:
        raise ValueError("Data/hora de fim não pode ser anterior ao início.")

    if item.is_concluido():
        if obs is not None:
            item.observacao_conclusao = obs
        if fim_em is not None:
            item.fim_em = fim
        db.commit()
        db.refresh(item)
        return to_out(item)

    item.fim_em = fim
    item.observacao_conclusao = obs
    db.commit()
    db.refresh(item)
    return to_out(item)


def reabrir(db: Session, item_id: int) -> dict[str, Any]:
    item = obter(db, item_id)
    if not item.is_concluido():
        return to_out(item)
    item.fim_em = None
    item.observacao_conclusao = None
    db.commit()
    db.refresh(item)
    return to_out(item)


def excluir(db: Session, item_id: int) -> None:
    item = obter(db, item_id)
    item.excluido_em = datetime.now().replace(microsecond=0)
    db.commit()


def contagem_ativa(db: Session) -> int:
    return (
        db.query(func.count(BacklogItem.id))
        .filter(BacklogItem.excluido_em.is_(None))
        .scalar()
        or 0
    )
