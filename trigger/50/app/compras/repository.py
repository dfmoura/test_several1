"""Persistência idempotente — upsert por chave natural (módulo 07)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Contratacao, Fornecedor, ItemContratacao, ResultadoItem, Uasg


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def garantir_uasg_id(db: Session, codigo_uasg: str) -> int | None:
    row = db.scalar(select(Uasg).where(Uasg.codigo_uasg == codigo_uasg))
    return row.id if row else None


def upsert_fornecedor(
    db: Session,
    *,
    ni: str,
    razao_social: str | None = None,
    porte: str | None = None,
) -> Fornecedor:
    # Só CNPJ (14) entra na fila de enriquecimento; CPF (11) permanece no cadastro.
    elegivel_cnpj = len(ni) == 14
    row = db.scalar(select(Fornecedor).where(Fornecedor.ni == ni))
    if row is None:
        row = Fornecedor(ni=ni, cnpj_pendente=elegivel_cnpj)
        db.add(row)
    elif not elegivel_cnpj:
        row.cnpj_pendente = False
    if razao_social and not row.fonte_cnpj:
        row.razao_social = razao_social
    elif razao_social and not row.razao_social:
        row.razao_social = razao_social
    if porte and not row.porte:
        row.porte = porte
    row.coletado_em = _utcnow()
    db.flush()
    return row


def upsert_contratacao(
    db: Session,
    data: dict[str, Any],
    *,
    uasg_id: int | None = None,
) -> tuple[Contratacao, bool]:
    id_compra = data["id_compra"]
    existing = db.scalar(select(Contratacao).where(Contratacao.id_compra == id_compra))
    payload = {**data, "coletado_em": _utcnow()}
    if uasg_id is not None:
        payload["uasg_id"] = uasg_id
    if existing:
        for k, v in payload.items():
            setattr(existing, k, v)
        return existing, False
    row = Contratacao(**payload)
    db.add(row)
    db.flush()
    return row, True


def upsert_item(
    db: Session,
    data: dict[str, Any],
    *,
    contratacao_id: int | None = None,
) -> tuple[ItemContratacao, bool]:
    existing = db.scalar(
        select(ItemContratacao).where(
            ItemContratacao.id_compra_item == data["id_compra_item"]
        )
    )
    payload = {**data, "coletado_em": _utcnow()}
    if contratacao_id is not None:
        payload["contratacao_id"] = contratacao_id
    if existing:
        for k, v in payload.items():
            setattr(existing, k, v)
        return existing, False
    row = ItemContratacao(**payload)
    db.add(row)
    db.flush()
    return row, True


def upsert_resultado(
    db: Session,
    data: dict[str, Any],
    *,
    item_id: int | None = None,
    fornecedor_id: int | None = None,
) -> tuple[ResultadoItem, bool]:
    seq = data.get("sequencial_resultado") or 0
    existing = db.scalar(
        select(ResultadoItem).where(
            ResultadoItem.id_compra_item == data["id_compra_item"],
            ResultadoItem.sequencial_resultado == seq,
        )
    )
    payload = {**data, "coletado_em": _utcnow(), "sequencial_resultado": seq}
    if item_id is not None:
        payload["item_id"] = item_id
    if fornecedor_id is not None:
        payload["fornecedor_id"] = fornecedor_id
    if existing:
        for k, v in payload.items():
            setattr(existing, k, v)
        return existing, False
    row = ResultadoItem(**payload)
    db.add(row)
    db.flush()
    return row, True
