"""Montagem da árvore Licitação → Contrato → Evento → Responsável (Power BI PMU)."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import PbiContrato, PbiContratoResponsavel, PbiProcessoLicitatorio

_CTR_OPTS = (
    selectinload(PbiContrato.orgao),
    selectinload(PbiContrato.fornecedor),
    selectinload(PbiContrato.processo_licitatorio),
    selectinload(PbiContrato.observador),
)
_RESP_OPTS = (
    selectinload(PbiContratoResponsavel.pessoa),
    selectinload(PbiContratoResponsavel.papel),
    selectinload(PbiContratoResponsavel.orgao),
    selectinload(PbiContratoResponsavel.fornecedor),
    selectinload(PbiContratoResponsavel.observador),
)


def chave_contrato(evento: PbiContrato) -> tuple[Any, ...]:
    return (
        evento.orgao_id,
        evento.ano_contrato,
        evento.nr_contrato,
        evento.fornecedor_id or 0,
        evento.processo or "",
        evento.ano_processo or 0,
    )


def _parse_valor(v: str | None) -> Decimal | None:
    if not v:
        return None
    s = v.strip().replace("R$", "").strip()
    if not s:
        return None
    # BR: 1.234.567,89 — US/CSV: 3136352.40
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def _fmt_valor(total: Decimal | None) -> str | None:
    if total is None:
        return None
    return f"{total:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def eventos_do_processo(db: Session, proc: PbiProcessoLicitatorio) -> list[PbiContrato]:
    stmt = (
        select(PbiContrato)
        .options(*_CTR_OPTS)
        .where(
            or_(
                PbiContrato.processo_id == proc.id,
                and_(
                    PbiContrato.orgao_id == proc.orgao_id,
                    PbiContrato.processo == proc.processo,
                    PbiContrato.ano_processo == proc.ano_processo,
                ),
            )
        )
        .order_by(
            PbiContrato.ano_contrato.desc(),
            PbiContrato.nr_contrato,
            PbiContrato.nr_aditivo,
            PbiContrato.nr_parcela,
            PbiContrato.dt_assinatura,
        )
    )
    return list(db.scalars(stmt).all())


def responsaveis_do_contrato(
    db: Session,
    *,
    ano_contrato: int,
    nr_contrato: str,
    fornecedor_id: int | None,
    objeto_contrato: str | None = None,
) -> list[PbiContratoResponsavel]:
    """Vincula por nº contrato + ano + fornecedor (órgão pode variar grafia no CSV)."""
    stmt = (
        select(PbiContratoResponsavel)
        .options(*_RESP_OPTS)
        .where(
            PbiContratoResponsavel.ano_contrato == ano_contrato,
            PbiContratoResponsavel.nr_contrato == nr_contrato,
        )
    )
    if fornecedor_id:
        stmt = stmt.where(PbiContratoResponsavel.fornecedor_id == fornecedor_id)
    if objeto_contrato:
        stmt = stmt.where(
            or_(
                PbiContratoResponsavel.objeto_contrato == objeto_contrato,
                PbiContratoResponsavel.objeto_contrato.is_(None),
            )
        )
    return list(
        db.scalars(
            stmt.order_by(
                PbiContratoResponsavel.papel_id,
                PbiContratoResponsavel.pessoa_id,
                PbiContratoResponsavel.dt_inicio,
            )
        ).all()
    )


def agrupar_eventos(eventos: list[PbiContrato]) -> list[dict[str, Any]]:
    grupos: dict[tuple, list[PbiContrato]] = defaultdict(list)
    for ev in eventos:
        grupos[chave_contrato(ev)].append(ev)

    resultado: list[dict[str, Any]] = []
    for _, itens in sorted(grupos.items(), key=lambda x: (x[0][1], x[0][2]), reverse=True):
        base = itens[0]
        total = Decimal(0)
        tem_valor = False
        for ev in itens:
            v = _parse_valor(ev.vr_inicial)
            if v is not None:
                total += v
                tem_valor = True
        resultado.append(
            {
                "chave": {
                    "orgao_id": base.orgao_id,
                    "ano_contrato": base.ano_contrato,
                    "nr_contrato": base.nr_contrato,
                    "fornecedor_id": base.fornecedor_id,
                    "processo": base.processo,
                    "ano_processo": base.ano_processo,
                },
                "orgao_nome": base.orgao.nome if base.orgao else None,
                "fornecedor_nome": base.fornecedor.razao_social if base.fornecedor else None,
                "ds_objeto_contrato": base.ds_objeto_contrato,
                "processo_id": base.processo_id,
                "qtd_eventos": len(itens),
                "valor_total": _fmt_valor(total) if tem_valor else None,
                "eventos": itens,
            }
        )
    return resultado


def contagem_contratos(db: Session, proc: PbiProcessoLicitatorio) -> tuple[int, int]:
    eventos = eventos_do_processo(db, proc)
    grupos = {chave_contrato(e) for e in eventos}
    return len(grupos), len(eventos)
