"""Repositório e importação normalizada — Power BI / Dados Abertos PMU."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from sqlalchemy import ColumnElement, delete, select
from sqlalchemy.orm import Session

from app.database import (
    PbiContrato,
    PbiContratoResponsavel,
    PbiFornecedor,
    PbiOrgao,
    PbiPapel,
    PbiPessoa,
    PbiProcessoLicitatorio,
)
from app.powerbi_csv import contrato_para_db, gestor_para_db, licitacao_para_db


def _norm_nome(val: str | None) -> str | None:
    if not val:
        return None
    return " ".join(val.split())


def get_or_create_orgao(db: Session, nome: str | None) -> PbiOrgao | None:
    nome = _norm_nome(nome)
    if not nome:
        return None
    row = db.scalar(select(PbiOrgao).where(PbiOrgao.nome == nome))
    if row:
        return row
    row = PbiOrgao(nome=nome)
    db.add(row)
    db.flush()
    return row


def get_or_create_fornecedor(db: Session, razao: str | None) -> PbiFornecedor | None:
    razao = _norm_nome(razao)
    if not razao:
        return None
    row = db.scalar(select(PbiFornecedor).where(PbiFornecedor.razao_social == razao))
    if row:
        return row
    row = PbiFornecedor(razao_social=razao)
    db.add(row)
    db.flush()
    return row


def get_or_create_pessoa(db: Session, nome: str | None) -> PbiPessoa | None:
    nome = _norm_nome(nome)
    if not nome:
        return None
    row = db.scalar(select(PbiPessoa).where(PbiPessoa.nome == nome))
    if row:
        return row
    row = PbiPessoa(nome=nome)
    db.add(row)
    db.flush()
    return row


def get_or_create_papel(db: Session, descricao: str | None) -> PbiPapel | None:
    descricao = _norm_nome(descricao)
    if not descricao:
        return None
    row = db.scalar(select(PbiPapel).where(PbiPapel.descricao == descricao))
    if row:
        return row
    row = PbiPapel(descricao=descricao)
    db.add(row)
    db.flush()
    return row


def find_processo(
    db: Session,
    *,
    orgao_id: int,
    processo: str | None,
    ano_processo: int | None,
    modalidade: str | None = None,
) -> PbiProcessoLicitatorio | None:
    if not processo:
        return None
    stmt = select(PbiProcessoLicitatorio).where(
        PbiProcessoLicitatorio.orgao_id == orgao_id,
        PbiProcessoLicitatorio.processo == processo,
    )
    if ano_processo:
        stmt = stmt.where(PbiProcessoLicitatorio.ano_processo == ano_processo)
    if modalidade:
        stmt = stmt.where(PbiProcessoLicitatorio.modalidade == modalidade)
    return db.scalar(stmt.order_by(PbiProcessoLicitatorio.id.desc()))


def find_contrato(
    db: Session,
    *,
    orgao_id: int | None,
    ano_contrato: int,
    nr_contrato: str,
    fornecedor_id: int | None = None,
) -> PbiContrato | None:
    stmt = select(PbiContrato).where(
        PbiContrato.ano_contrato == ano_contrato,
        PbiContrato.nr_contrato == nr_contrato,
    )
    if orgao_id:
        stmt = stmt.where(PbiContrato.orgao_id == orgao_id)
    if fornecedor_id:
        stmt = stmt.where(PbiContrato.fornecedor_id == fornecedor_id)
    return db.scalar(stmt.order_by(PbiContrato.id.desc()))


def _snapshot_observador(
    db: Session,
    model: type,
    chave_fn: Callable[[Any], tuple],
    where: ColumnElement[bool] | None = None,
) -> dict[tuple, int]:
    """Fotografa observador_id pela chave natural ANTES do DELETE da recoleta."""
    stmt = select(model)
    if where is not None:
        stmt = stmt.where(where)
    out: dict[tuple, int] = {}
    for row in db.scalars(stmt).all():
        oid = row.observador_id
        if oid is None:
            continue
        out[chave_fn(row)] = oid
    return out


def importar_processos(
    db: Session,
    rows: list[dict[str, str]],
    fonte_ano: int,
) -> tuple[int, int, int]:
    """Importa licitações → órgãos + processos licitatórios."""
    preservados = _snapshot_observador(
        db,
        PbiProcessoLicitatorio,
        lambda p: (p.ano_processo, p.orgao_id, p.processo, p.modalidade),
        PbiProcessoLicitatorio.fonte_ano_coleta == fonte_ano,
    )
    removidos = db.execute(
        delete(PbiProcessoLicitatorio).where(PbiProcessoLicitatorio.fonte_ano_coleta == fonte_ano)
    ).rowcount

    inseridos = ignorados = duplicados = 0
    vistos: set[tuple] = set()

    for row in rows:
        try:
            payload = licitacao_para_db(row, fonte_ano)
        except ValueError:
            ignorados += 1
            continue

        orgao = get_or_create_orgao(db, payload.pop("empresa"))
        if not orgao:
            ignorados += 1
            continue

        chave = (payload["ano_processo"], orgao.id, payload["processo"], payload["modalidade"])
        if chave in vistos:
            duplicados += 1
            continue
        vistos.add(chave)

        obj = PbiProcessoLicitatorio(orgao_id=orgao.id, **payload)
        if chave in preservados:
            obj.observador_id = preservados[chave]
        db.add(obj)
        inseridos += 1

    db.commit()
    return inseridos, ignorados, removidos


def importar_contratos(
    db: Session,
    rows: list[dict[str, str]],
    fonte_ano: int,
) -> tuple[int, int, int]:
    """Importa contratos → órgãos, fornecedores, vínculo com processo."""
    preservados = _snapshot_observador(
        db,
        PbiContrato,
        lambda c: (
            c.ano_contrato,
            c.orgao_id,
            c.nr_contrato,
            c.nr_aditivo,
            c.nr_parcela,
            c.processo,
        ),
        PbiContrato.fonte_ano_coleta == fonte_ano,
    )
    removidos = db.execute(
        delete(PbiContrato).where(PbiContrato.fonte_ano_coleta == fonte_ano)
    ).rowcount

    inseridos = ignorados = duplicados = 0
    vistos: set[tuple] = set()

    for row in rows:
        try:
            payload = contrato_para_db(row, fonte_ano)
        except ValueError:
            ignorados += 1
            continue

        empresa = payload.pop("empresa")
        nm_pessoa = payload.pop("nm_pessoa")

        orgao = get_or_create_orgao(db, empresa)
        if not orgao:
            ignorados += 1
            continue

        fornecedor = get_or_create_fornecedor(db, nm_pessoa)
        processo_ref = find_processo(
            db,
            orgao_id=orgao.id,
            processo=payload.get("processo"),
            ano_processo=payload.get("ano_processo"),
        )

        chave = (
            payload["ano_contrato"],
            orgao.id,
            payload["nr_contrato"],
            payload["nr_aditivo"],
            payload["nr_parcela"],
            payload["processo"],
        )
        if chave in vistos:
            duplicados += 1
            continue
        vistos.add(chave)

        obj = PbiContrato(
            orgao_id=orgao.id,
            fornecedor_id=fornecedor.id if fornecedor else None,
            processo_id=processo_ref.id if processo_ref else None,
            **payload,
        )
        if chave in preservados:
            obj.observador_id = preservados[chave]
        db.add(obj)
        inseridos += 1

    db.commit()
    return inseridos, ignorados, removidos


def importar_responsaveis(
    db: Session,
    rows: list[dict[str, str]],
) -> tuple[int, int, int]:
    """Importa gestores/fiscais → pessoas, papéis, órgãos, fornecedores, responsáveis."""
    preservados: dict[tuple, int | None] = {}
    for g in db.scalars(select(PbiContratoResponsavel)).all():
        preservados[
            (
                g.ano_contrato,
                g.nr_contrato,
                g.orgao_id,
                g.papel_id,
                g.pessoa_id,
                g.dt_inicio,
                g.fornecedor_id,
            )
        ] = g.observador_id

    removidos = db.execute(delete(PbiContratoResponsavel)).rowcount

    inseridos = ignorados = duplicados = 0
    vistos: set[tuple] = set()

    for row in rows:
        try:
            payload = gestor_para_db(row)
        except ValueError:
            ignorados += 1
            continue

        orgao = get_or_create_orgao(db, payload.pop("ds_orgao"))
        papel = get_or_create_papel(db, payload.pop("ds_papeis"))
        fornecedor = get_or_create_fornecedor(db, payload.pop("fornecedor"))
        pessoa = get_or_create_pessoa(db, payload.pop("nm_pessoa_papel"))
        if not pessoa:
            ignorados += 1
            continue

        contrato = find_contrato(
            db,
            orgao_id=orgao.id if orgao else None,
            ano_contrato=payload["ano_contrato"],
            nr_contrato=payload["nr_contrato"],
            fornecedor_id=fornecedor.id if fornecedor else None,
        )
        if not contrato:
            contrato = find_contrato(
                db,
                orgao_id=None,
                ano_contrato=payload["ano_contrato"],
                nr_contrato=payload["nr_contrato"],
            )

        chave = (
            payload["ano_contrato"],
            payload["nr_contrato"],
            orgao.id if orgao else None,
            papel.id if papel else None,
            pessoa.id,
            payload["dt_inicio"],
            fornecedor.id if fornecedor else None,
        )
        if chave in vistos:
            duplicados += 1
            continue
        vistos.add(chave)

        obj = PbiContratoResponsavel(
            contrato_id=contrato.id if contrato else None,
            pessoa_id=pessoa.id,
            papel_id=papel.id if papel else None,
            orgao_id=orgao.id if orgao else None,
            fornecedor_id=fornecedor.id if fornecedor else None,
            **payload,
        )
        obs = preservados.get(chave)
        if obs:
            obj.observador_id = obs
        db.add(obj)
        inseridos += 1

    db.commit()
    return inseridos, ignorados, removidos
