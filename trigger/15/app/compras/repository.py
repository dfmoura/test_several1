"""Persistência idempotente SQLite — upsert por chave natural."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import (
    COMPRAS_CAMPOS_PRESERVADOS_SYNC,
    CompraContratacao,
    CompraContratacaoItem,
    ComprasContratacaoResultado,
    ComprasFornecedor,
    ComprasItemCatalogo,
    ComprasOrgao,
    ComprasPgcItem,
    ComprasPrecoPraticado,
    ComprasSyncMeta,
    ComprasUasg,
)


def registrar_sync_meta(db: Session, modulo: str, contadores: dict[str, Any]) -> None:
    row = db.scalar(select(ComprasSyncMeta).where(ComprasSyncMeta.modulo == modulo))
    payload = json.dumps(contadores, ensure_ascii=False)
    if row:
        row.ultima_sync_em = datetime.utcnow()
        row.contadores_json = payload
    else:
        db.add(
            ComprasSyncMeta(
                modulo=modulo,
                contadores_json=payload,
            )
        )


def upsert_contratacao(db: Session, data: dict[str, Any]) -> tuple[CompraContratacao, bool]:
    id_compra = data.get("id_compra") or data.get("chave_compra")
    existing = None
    if id_compra:
        existing = db.scalar(
            select(CompraContratacao).where(CompraContratacao.id_compra == id_compra)
        )
    if not existing and id_compra:
        existing = db.scalar(
            select(CompraContratacao).where(CompraContratacao.chave_compra == id_compra)
        )
    data = {**data, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in data.items():
            if k in COMPRAS_CAMPOS_PRESERVADOS_SYNC:
                continue
            setattr(existing, k, v)
        return existing, False
    row = CompraContratacao(**data)
    db.add(row)
    db.flush()
    return row, True


def upsert_item(db: Session, data: dict[str, Any]) -> tuple[CompraContratacaoItem, bool]:
    existing = db.scalar(
        select(CompraContratacaoItem).where(
            CompraContratacaoItem.id_compra_item == data["id_compra_item"]
        )
    )
    data = {**data, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        return existing, False
    row = CompraContratacaoItem(**data)
    db.add(row)
    db.flush()
    return row, True


def upsert_resultado(db: Session, data: dict[str, Any]) -> tuple[ComprasContratacaoResultado, bool]:
    seq = data.get("sequencial_resultado") or 0
    existing = db.scalar(
        select(ComprasContratacaoResultado).where(
            ComprasContratacaoResultado.id_compra_item == data["id_compra_item"],
            ComprasContratacaoResultado.sequencial_resultado == seq,
        )
    )
    data = {**data, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        return existing, False
    row = ComprasContratacaoResultado(**data)
    db.add(row)
    db.flush()
    return row, True


def upsert_orgao(db: Session, data: dict[str, Any]) -> tuple[ComprasOrgao, bool]:
    existing = db.scalar(
        select(ComprasOrgao).where(ComprasOrgao.codigo_orgao == data["codigo_orgao"])
    )
    data = {**data, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        return existing, False
    row = ComprasOrgao(**data)
    db.add(row)
    db.flush()
    return row, True


def upsert_uasg(db: Session, data: dict[str, Any]) -> tuple[ComprasUasg, bool]:
    existing = db.scalar(
        select(ComprasUasg).where(ComprasUasg.codigo_uasg == data["codigo_uasg"])
    )
    data = {**data, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        return existing, False
    row = ComprasUasg(**data)
    db.add(row)
    db.flush()
    return row, True


def upsert_fornecedor(db: Session, data: dict[str, Any]) -> tuple[ComprasFornecedor, bool]:
    existing = db.scalar(
        select(ComprasFornecedor).where(
            ComprasFornecedor.ni_fornecedor == data["ni_fornecedor"]
        )
    )
    data = {**data, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        return existing, False
    row = ComprasFornecedor(**data)
    db.add(row)
    db.flush()
    return row, True


def upsert_catalogo(db: Session, data: dict[str, Any]) -> tuple[ComprasItemCatalogo, bool]:
    existing = db.scalar(
        select(ComprasItemCatalogo).where(
            ComprasItemCatalogo.tipo_item == data["tipo_item"],
            ComprasItemCatalogo.codigo_item_catalogo == data["codigo_item_catalogo"],
        )
    )
    data = {**data, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        return existing, False
    row = ComprasItemCatalogo(**data)
    db.add(row)
    db.flush()
    return row, True


def upsert_pgc(db: Session, data: dict[str, Any]) -> tuple[ComprasPgcItem, bool]:
    existing = db.scalar(
        select(ComprasPgcItem).where(
            ComprasPgcItem.orgao == data["orgao"],
            ComprasPgcItem.ano_pca_projeto_compra == data["ano_pca_projeto_compra"],
            ComprasPgcItem.codigo_uasg == data.get("codigo_uasg"),
            ComprasPgcItem.codigo_item_catalogo == data.get("codigo_item_catalogo"),
            ComprasPgcItem.numero_item_pncp == data.get("numero_item_pncp"),
            ComprasPgcItem.ordem_dfd == data.get("ordem_dfd"),
        )
    )
    data = {**data, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        return existing, False
    row = ComprasPgcItem(**data)
    db.add(row)
    db.flush()
    return row, True


def upsert_preco(db: Session, data: dict[str, Any]) -> tuple[ComprasPrecoPraticado, bool]:
    existing = db.scalar(
        select(ComprasPrecoPraticado).where(
            ComprasPrecoPraticado.tipo_item == data["tipo_item"],
            ComprasPrecoPraticado.id_item_compra == data["id_item_compra"],
            ComprasPrecoPraticado.id_compra == data.get("id_compra"),
            ComprasPrecoPraticado.ni_fornecedor == data.get("ni_fornecedor"),
            ComprasPrecoPraticado.data_compra == data.get("data_compra"),
        )
    )
    data = {**data, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        return existing, False
    row = ComprasPrecoPraticado(**data)
    db.add(row)
    db.flush()
    return row, True


def vincular_uasg_contratacoes(db: Session) -> int:
    """Liga uasg_id em contratações onde codigo bate."""
    atualizados = 0
    uasgs = {u.codigo_uasg: u.id for u in db.scalars(select(ComprasUasg)).all()}
    for row in db.scalars(
        select(CompraContratacao).where(CompraContratacao.uasg_id.is_(None))
    ):
        uid = uasgs.get(row.unidade_compradora)
        if uid:
            row.uasg_id = uid
            atualizados += 1
    return atualizados
