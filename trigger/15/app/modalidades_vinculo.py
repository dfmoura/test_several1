"""Vínculo manual de modalidades entre Portal, Compras.gov (API) e Power BI."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.config import MODALIDADES_PNCP
from app.database import (
    FONTES_MODALIDADE_VINCULO,
    CompraContratacao,
    Licitacao,
    ModalidadeConsolidada,
    ModalidadeVinculo,
    PbiProcessoLicitatorio,
    get_db,
)

router = APIRouter(tags=["modalidades-consolidadas"])

FONTES_META: dict[str, dict[str, str]] = {
    "portal": {
        "label": "Portal Prefeitura",
        "campo_chave": "modalidade",
        "campo_rotulo": "MODALIDADE",
    },
    "compras_api": {
        "label": "Compras.gov (API)",
        "campo_chave": "codigoModalidade",
        "campo_rotulo": "modalidadeNome",
    },
    "powerbi": {
        "label": "Power BI",
        "campo_chave": "modalidade",
        "campo_rotulo": "MODALIDADE",
    },
}


class VinculoOut(BaseModel):
    id: int
    fonte: str
    chave: str
    rotulo: str | None = None
    criado_em: datetime | None = None

    model_config = {"from_attributes": True}


class ModalidadeConsolidadaOut(BaseModel):
    id: int
    nome: str
    codigo_pncp: int | None = None
    observacoes: str | None = None
    ativo: bool = True
    vinculos: list[VinculoOut] = Field(default_factory=list)
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None

    model_config = {"from_attributes": True}


class ModalidadeConsolidadaCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    codigo_pncp: int | None = Field(default=None, ge=1, le=99)
    observacoes: str | None = None


class ModalidadeConsolidadaUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=200)
    codigo_pncp: int | None = Field(default=None, ge=1, le=99)
    observacoes: str | None = None
    ativo: bool | None = None


class VinculoCreate(BaseModel):
    fonte: str
    chave: str = Field(min_length=1, max_length=200)
    rotulo: str | None = Field(default=None, max_length=200)


class ValorFonteOut(BaseModel):
    fonte: str
    chave: str
    rotulo: str | None = None
    total_registros: int = 0
    vinculado: bool = False
    modalidade_consolidada_id: int | None = None
    modalidade_consolidada_nome: str | None = None


def _to_out(row: ModalidadeConsolidada) -> ModalidadeConsolidadaOut:
    return ModalidadeConsolidadaOut(
        id=row.id,
        nome=row.nome,
        codigo_pncp=row.codigo_pncp,
        observacoes=row.observacoes,
        ativo=row.ativo,
        vinculos=[VinculoOut.model_validate(v) for v in row.vinculos],
        criado_em=row.criado_em,
        atualizado_em=row.atualizado_em,
    )


def _validar_fonte(fonte: str) -> str:
    fonte = fonte.strip().lower()
    if fonte not in FONTES_MODALIDADE_VINCULO:
        raise HTTPException(400, f"Fonte inválida: {fonte}")
    return fonte


def _mapa_vinculos(db: Session) -> dict[tuple[str, str], ModalidadeVinculo]:
    rows = db.scalars(
        select(ModalidadeVinculo).options(selectinload(ModalidadeVinculo.modalidade_consolidada))
    ).all()
    return {(v.fonte, v.chave): v for v in rows}


def _valores_portal(db: Session) -> list[tuple[str, str, int]]:
    rows = db.execute(
        select(Licitacao.modalidade, func.count())
        .where(Licitacao.modalidade.isnot(None), Licitacao.modalidade != "")
        .group_by(Licitacao.modalidade)
        .order_by(Licitacao.modalidade)
    ).all()
    return [(mod, mod, total) for mod, total in rows if mod]


def _valores_compras(db: Session) -> list[tuple[str, str, int]]:
    vistos: dict[str, tuple[str, int]] = {}
    for codigo, nome in MODALIDADES_PNCP.items():
        vistos[str(codigo)] = (nome, 0)
    rows = db.execute(
        select(
            CompraContratacao.modalidade_codigo,
            CompraContratacao.modalidade_descricao,
            func.count(),
        )
        .where(
            CompraContratacao.modalidade_codigo.isnot(None),
            CompraContratacao.modalidade_codigo != "",
        )
        .group_by(
            CompraContratacao.modalidade_codigo,
            CompraContratacao.modalidade_descricao,
        )
        .order_by(CompraContratacao.modalidade_codigo)
    ).all()
    for codigo, nome, total in rows:
        chave = str(codigo).strip()
        if not chave:
            continue
        if chave in vistos:
            rotulo, prev = vistos[chave]
            vistos[chave] = (rotulo or nome or MODALIDADES_PNCP.get(int(chave), chave), prev + total)
        else:
            vistos[chave] = (nome or MODALIDADES_PNCP.get(int(chave), chave) if chave.isdigit() else nome or chave, total)
    return [(cod, rotulo, total) for cod, (rotulo, total) in sorted(vistos.items(), key=lambda x: int(x[0]) if x[0].isdigit() else x[0])]


def _valores_powerbi(db: Session) -> list[tuple[str, str, int]]:
    rows = db.execute(
        select(PbiProcessoLicitatorio.modalidade, func.count())
        .where(
            PbiProcessoLicitatorio.modalidade.isnot(None),
            PbiProcessoLicitatorio.modalidade != "",
        )
        .group_by(PbiProcessoLicitatorio.modalidade)
        .order_by(PbiProcessoLicitatorio.modalidade)
    ).all()
    return [(mod, mod, total) for mod, total in rows if mod]


def resolver_modalidade(db: Session, fonte: str, chave: str) -> ModalidadeConsolidada | None:
    fonte = fonte.strip().lower()
    chave = chave.strip()
    if fonte not in FONTES_MODALIDADE_VINCULO or not chave:
        return None
    vinculo = db.scalar(
        select(ModalidadeVinculo)
        .options(selectinload(ModalidadeVinculo.modalidade_consolidada))
        .where(ModalidadeVinculo.fonte == fonte, ModalidadeVinculo.chave == chave)
    )
    if not vinculo or not vinculo.modalidade_consolidada.ativo:
        return None
    return vinculo.modalidade_consolidada


@router.get("/api/modalidades-consolidadas/meta")
def meta_fontes():
    return {
        "fontes": FONTES_META,
        "catalogo_pncp": [{"codigo": k, "nome": v} for k, v in sorted(MODALIDADES_PNCP.items())],
    }


@router.get("/api/modalidades-consolidadas/stats")
def stats_modalidades(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(ModalidadeConsolidada)) or 0
    ativos = (
        db.scalar(
            select(func.count())
            .select_from(ModalidadeConsolidada)
            .where(ModalidadeConsolidada.ativo.is_(True))
        )
        or 0
    )
    vinculos = db.scalar(select(func.count()).select_from(ModalidadeVinculo)) or 0
    mapa = _mapa_vinculos(db)
    por_fonte: dict[str, dict[str, int]] = {}
    for fonte in FONTES_MODALIDADE_VINCULO:
        if fonte == "portal":
            valores = _valores_portal(db)
        elif fonte == "compras_api":
            valores = _valores_compras(db)
        else:
            valores = _valores_powerbi(db)
        vinculados = sum(1 for chave, _, _ in valores if (fonte, chave) in mapa)
        por_fonte[fonte] = {
            "total_valores": len(valores),
            "vinculados": vinculados,
            "pendentes": len(valores) - vinculados,
        }
    return {
        "modalidades_total": total,
        "modalidades_ativas": ativos,
        "vinculos_total": vinculos,
        "por_fonte": por_fonte,
    }


@router.get("/api/modalidades-consolidadas/valores", response_model=list[ValorFonteOut])
def listar_valores_fonte(
    db: Session = Depends(get_db),
    fonte: str | None = None,
    apenas_pendentes: bool = Query(False),
):
    mapa = _mapa_vinculos(db)
    fontes = [fonte] if fonte else sorted(FONTES_MODALIDADE_VINCULO)
    out: list[ValorFonteOut] = []
    for f in fontes:
        f = _validar_fonte(f)
        if f == "portal":
            valores = _valores_portal(db)
        elif f == "compras_api":
            valores = _valores_compras(db)
        else:
            valores = _valores_powerbi(db)
        for chave, rotulo, total in valores:
            vinc = mapa.get((f, chave))
            vinculado = vinc is not None
            if apenas_pendentes and vinculado:
                continue
            out.append(
                ValorFonteOut(
                    fonte=f,
                    chave=chave,
                    rotulo=rotulo,
                    total_registros=total,
                    vinculado=vinculado,
                    modalidade_consolidada_id=vinc.modalidade_consolidada_id if vinc else None,
                    modalidade_consolidada_nome=vinc.modalidade_consolidada.nome if vinc else None,
                )
            )
    return out


@router.get("/api/modalidades-consolidadas/resolver")
def resolver(
    db: Session = Depends(get_db),
    fonte: str = Query(...),
    chave: str = Query(...),
):
    modalidade = resolver_modalidade(db, fonte, chave)
    if not modalidade:
        return {"encontrado": False}
    return {
        "encontrado": True,
        "modalidade": ModalidadeConsolidadaOut.model_validate(
            db.scalar(
                select(ModalidadeConsolidada)
                .options(selectinload(ModalidadeConsolidada.vinculos))
                .where(ModalidadeConsolidada.id == modalidade.id)
            )
        ),
    }


@router.get("/api/modalidades-consolidadas", response_model=list[ModalidadeConsolidadaOut])
def listar_modalidades(
    db: Session = Depends(get_db),
    ativos: bool = Query(True),
):
    stmt = (
        select(ModalidadeConsolidada)
        .options(selectinload(ModalidadeConsolidada.vinculos))
        .order_by(
            ModalidadeConsolidada.codigo_pncp.asc().nulls_last(),
            ModalidadeConsolidada.nome,
        )
    )
    if ativos:
        stmt = stmt.where(ModalidadeConsolidada.ativo.is_(True))
    return [_to_out(r) for r in db.scalars(stmt).all()]


@router.get("/api/modalidades-consolidadas/{mid}", response_model=ModalidadeConsolidadaOut)
def detalhe_modalidade(mid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(ModalidadeConsolidada)
        .options(selectinload(ModalidadeConsolidada.vinculos))
        .where(ModalidadeConsolidada.id == mid)
    )
    if not row:
        raise HTTPException(404, "Modalidade consolidada não encontrada")
    return _to_out(row)


@router.post("/api/modalidades-consolidadas", response_model=ModalidadeConsolidadaOut, status_code=201)
def criar_modalidade(payload: ModalidadeConsolidadaCreate, db: Session = Depends(get_db)):
    if payload.codigo_pncp is not None and payload.codigo_pncp not in MODALIDADES_PNCP:
        raise HTTPException(400, f"Código PNCP inválido: {payload.codigo_pncp}")
    row = ModalidadeConsolidada(
        nome=payload.nome.strip(),
        codigo_pncp=payload.codigo_pncp,
        observacoes=(payload.observacoes or "").strip() or None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.patch("/api/modalidades-consolidadas/{mid}", response_model=ModalidadeConsolidadaOut)
def atualizar_modalidade(mid: int, payload: ModalidadeConsolidadaUpdate, db: Session = Depends(get_db)):
    row = db.scalar(
        select(ModalidadeConsolidada)
        .options(selectinload(ModalidadeConsolidada.vinculos))
        .where(ModalidadeConsolidada.id == mid)
    )
    if not row:
        raise HTTPException(404, "Modalidade consolidada não encontrada")
    if payload.nome is not None:
        row.nome = payload.nome.strip()
    if "codigo_pncp" in payload.model_fields_set:
        if payload.codigo_pncp is not None and payload.codigo_pncp not in MODALIDADES_PNCP:
            raise HTTPException(400, f"Código PNCP inválido: {payload.codigo_pncp}")
        row.codigo_pncp = payload.codigo_pncp
    if payload.observacoes is not None:
        row.observacoes = payload.observacoes.strip() or None
    if payload.ativo is not None:
        row.ativo = payload.ativo
    row.atualizado_em = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/api/modalidades-consolidadas/{mid}", status_code=204)
def excluir_modalidade(mid: int, db: Session = Depends(get_db)):
    row = db.get(ModalidadeConsolidada, mid)
    if not row:
        raise HTTPException(404, "Modalidade consolidada não encontrada")
    db.delete(row)
    db.commit()


@router.post("/api/modalidades-consolidadas/{mid}/vinculos", response_model=VinculoOut, status_code=201)
def adicionar_vinculo(mid: int, payload: VinculoCreate, db: Session = Depends(get_db)):
    row = db.get(ModalidadeConsolidada, mid)
    if not row:
        raise HTTPException(404, "Modalidade consolidada não encontrada")
    fonte = _validar_fonte(payload.fonte)
    chave = payload.chave.strip()
    if not chave:
        raise HTTPException(400, "Chave obrigatória")
    existente = db.scalar(
        select(ModalidadeVinculo)
        .options(selectinload(ModalidadeVinculo.modalidade_consolidada))
        .where(ModalidadeVinculo.fonte == fonte, ModalidadeVinculo.chave == chave)
    )
    if existente:
        if existente.modalidade_consolidada_id == mid:
            return VinculoOut.model_validate(existente)
        raise HTTPException(
            409,
            f"Valor já vinculado à modalidade «{existente.modalidade_consolidada.nome}»",
        )
    vinculo = ModalidadeVinculo(
        modalidade_consolidada_id=mid,
        fonte=fonte,
        chave=chave,
        rotulo=(payload.rotulo or "").strip() or None,
    )
    db.add(vinculo)
    row.atualizado_em = datetime.utcnow()
    db.commit()
    db.refresh(vinculo)
    return VinculoOut.model_validate(vinculo)


@router.delete("/api/modalidades-vinculos/{vid}", status_code=204)
def remover_vinculo(vid: int, db: Session = Depends(get_db)):
    vinculo = db.get(ModalidadeVinculo, vid)
    if not vinculo:
        raise HTTPException(404, "Vínculo não encontrado")
    modalidade = db.get(ModalidadeConsolidada, vinculo.modalidade_consolidada_id)
    db.delete(vinculo)
    if modalidade:
        modalidade.atualizado_em = datetime.utcnow()
    db.commit()
