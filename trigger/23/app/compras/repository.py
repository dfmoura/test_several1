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


# Campos exclusivos do enriquecimento CNPJ público — nunca apagar com None de outra fonte.
_CAMPOS_CNPJ_PUBLICO = frozenset(
    {
        "qsa_json",
        "cnpj_dados_json",
        "cnpj_enriquecido_em",
        "situacao_cadastral",
        "nome_fantasia",
        "cep",
        "logradouro",
        "numero_endereco",
        "bairro",
        "codigo_municipio_ibge",
    }
)
# Campos exclusivos do módulo 10 Compras.gov.
_CAMPOS_COMPRAS_GOV = frozenset(
    {
        "compras_gov_dados_json",
        "compras_gov_enriquecido_em",
        "ativo",
        "habilitado_licitar",
        "porte_empresa_id",
        "natureza_juridica_id",
    }
)
# Fontes de razão social no domínio de compras (têm prioridade sobre CNPJ público).
_FONTES_RAZAO_COMPRAS = frozenset({"07.3", "10"})


def _merge_fornecedor_payload(
    existing: ComprasFornecedor | None,
    data: dict[str, Any],
    *,
    fonte: str | None,
) -> dict[str, Any]:
    """
    Merge seguro entre stub (07.3), módulo 10 e CNPJ público.

    Regras:
    - None nunca apaga enriquecimento de outra fonte.
    - CNPJ público não sobrescreve razão social já definida por 07.3/10.
    - Módulo 10 não sobrescreve de_uberlandia se já houver IBGE (CNPJ).
    """
    out = {k: v for k, v in data.items() if k != "_fonte"}
    if fonte:
        out.setdefault("fonte_razao_social", fonte)

    if existing is None:
        return out

    # Não apagar campos de outra fonte com None.
    for k in list(out.keys()):
        if out[k] is not None:
            continue
        if k in _CAMPOS_CNPJ_PUBLICO or k in _CAMPOS_COMPRAS_GOV or k in (
            "de_uberlandia",
            "fonte_razao_social",
            "nome_razao_social_fornecedor",
        ):
            out.pop(k, None)

    if fonte == "cnpj_publico":
        # Razão social do domínio de compras (07.3/10) ou stub legado prevalece.
        if existing.nome_razao_social_fornecedor and out.get("nome_razao_social_fornecedor"):
            if existing.fonte_razao_social in _FONTES_RAZAO_COMPRAS or existing.fonte_razao_social is None:
                out.pop("nome_razao_social_fornecedor", None)
                out.pop("fonte_razao_social", None)

    if fonte == "10":
        # Classificação geográfica por IBGE (CNPJ) prevalece sobre município textual do 10.
        if existing.codigo_municipio_ibge is not None:
            out.pop("de_uberlandia", None)

    return out


def upsert_fornecedor(db: Session, data: dict[str, Any]) -> tuple[ComprasFornecedor, bool]:
    fonte = data.get("_fonte") or data.get("fonte_razao_social")
    existing = db.scalar(
        select(ComprasFornecedor).where(
            ComprasFornecedor.ni_fornecedor == data["ni_fornecedor"]
        )
    )
    merged = _merge_fornecedor_payload(existing, data, fonte=fonte if isinstance(fonte, str) else None)
    merged = {**merged, "coletado_em": datetime.utcnow()}
    if existing:
        for k, v in merged.items():
            if v is None and k in (
                *_CAMPOS_CNPJ_PUBLICO,
                *_CAMPOS_COMPRAS_GOV,
                "de_uberlandia",
                "fonte_razao_social",
                "nome_razao_social_fornecedor",
            ):
                continue
            setattr(existing, k, v)
        return existing, False
    # Remove chave interna se ainda presente
    merged.pop("_fonte", None)
    row = ComprasFornecedor(**{k: v for k, v in merged.items() if hasattr(ComprasFornecedor, k)})
    db.add(row)
    db.flush()
    return row, True


def precisa_enrich_compras_gov(row: ComprasFornecedor | None) -> bool:
    """True se ainda não há snapshot do módulo 10 (stub ou só CNPJ público)."""
    if row is None:
        return True
    return row.compras_gov_enriquecido_em is None


def ensure_fornecedor_stub(
    db: Session,
    ni: str,
    *,
    nome: str | None = None,
) -> tuple[ComprasFornecedor, bool]:
    """Garante dimensão mínima a partir do NI do resultado (sem HTTP)."""
    from app.compras.normalizers import normalizar_ni

    ni_norm = normalizar_ni(ni)
    if not ni_norm:
        raise ValueError("ni_fornecedor inválido")
    existing = db.scalar(
        select(ComprasFornecedor).where(ComprasFornecedor.ni_fornecedor == ni_norm)
    )
    if existing:
        if nome and not existing.nome_razao_social_fornecedor:
            existing.nome_razao_social_fornecedor = nome
            if not existing.fonte_razao_social:
                existing.fonte_razao_social = "07.3"
        return existing, False
    payload: dict[str, Any] = {
        "ni_fornecedor": ni_norm,
        "nome_razao_social_fornecedor": nome,
        "fonte_razao_social": "07.3" if nome else None,
        "_fonte": "07.3",
    }
    if len(ni_norm) > 11:
        payload["cnpj"] = ni_norm
    else:
        payload["cpf"] = ni_norm
    return upsert_fornecedor(db, payload)


def vincular_fornecedores_resultados(db: Session) -> int:
    """Preenche fornecedor_id nos resultados a partir de ni_fornecedor."""
    mapa = {
        row.ni_fornecedor: row.id
        for row in db.scalars(select(ComprasFornecedor)).all()
        if row.ni_fornecedor
    }
    atualizados = 0
    for row in db.scalars(
        select(ComprasContratacaoResultado).where(
            ComprasContratacaoResultado.ni_fornecedor.isnot(None)
        )
    ):
        fid = mapa.get(row.ni_fornecedor or "")
        if fid and row.fornecedor_id != fid:
            row.fornecedor_id = fid
            atualizados += 1
    return atualizados


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
