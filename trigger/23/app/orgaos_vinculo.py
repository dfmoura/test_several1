"""Vínculo manual de órgãos entre Compras.gov (UASG) e Power BI."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.unidades_compradoras import obter_unidades_compradoras
from app.database import (
    CompraContratacao,
    FONTES_ORGAO_VINCULO,
    OrgaoConsolidado,
    OrgaoVinculo,
    PbiOrgao,
    PbiProcessoLicitatorio,
    get_db,
)

router = APIRouter(tags=["orgaos-consolidados"])

FONTES_META: dict[str, dict[str, str]] = {
    "compras_api": {
        "label": "Compras.gov (UASG)",
        "campo_chave": "codigoUasg",
        "campo_rotulo": "nomeUasg",
    },
    "powerbi": {
        "label": "Power BI",
        "campo_chave": "empresa",
        "campo_rotulo": "empresa",
    },
}


class VinculoOut(BaseModel):
    id: int
    fonte: str
    chave: str
    rotulo: str | None = None
    criado_em: datetime | None = None

    model_config = {"from_attributes": True}


class OrgaoConsolidadoOut(BaseModel):
    id: int
    nome: str
    sigla: str | None = None
    observacoes: str | None = None
    ativo: bool = True
    vinculos: list[VinculoOut] = Field(default_factory=list)
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None

    model_config = {"from_attributes": True}


class OrgaoConsolidadoCreate(BaseModel):
    nome: str = Field(min_length=2, max_length=200)
    sigla: str | None = Field(default=None, max_length=40)
    observacoes: str | None = None


class OrgaoConsolidadoUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=200)
    sigla: str | None = Field(default=None, max_length=40)
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
    orgao_consolidado_id: int | None = None
    orgao_consolidado_nome: str | None = None


def _to_out(row: OrgaoConsolidado) -> OrgaoConsolidadoOut:
    return OrgaoConsolidadoOut(
        id=row.id,
        nome=row.nome,
        sigla=row.sigla,
        observacoes=row.observacoes,
        ativo=row.ativo,
        vinculos=[VinculoOut.model_validate(v) for v in row.vinculos],
        criado_em=row.criado_em,
        atualizado_em=row.atualizado_em,
    )


def _validar_fonte(fonte: str) -> str:
    fonte = fonte.strip().lower()
    if fonte not in FONTES_ORGAO_VINCULO:
        raise HTTPException(400, f"Fonte inválida: {fonte}")
    return fonte


def _mapa_vinculos(db: Session) -> dict[tuple[str, str], OrgaoVinculo]:
    rows = db.scalars(
        select(OrgaoVinculo).options(selectinload(OrgaoVinculo.orgao_consolidado))
    ).all()
    return {(v.fonte, v.chave): v for v in rows}


def _valores_compras(db: Session) -> list[tuple[str, str, int]]:
    vistos: dict[str, tuple[str, int]] = {}
    for codigo, nome in obter_unidades_compradoras(db, apenas_ativas=False).items():
        vistos[codigo] = (nome, 0)
    rows = db.execute(
        select(
            CompraContratacao.unidade_compradora,
            CompraContratacao.unidade_nome,
            func.count(),
        )
        .group_by(CompraContratacao.unidade_compradora, CompraContratacao.unidade_nome)
        .order_by(CompraContratacao.unidade_compradora)
    ).all()
    for codigo, nome, total in rows:
        if codigo in vistos:
            rotulo, prev = vistos[codigo]
            vistos[codigo] = (rotulo or nome, prev + total)
        else:
            vistos[codigo] = (nome, total)
    return [(cod, rotulo, total) for cod, (rotulo, total) in sorted(vistos.items())]


def _valores_powerbi(db: Session) -> list[tuple[str, str, int]]:
    rows = db.execute(
        select(PbiOrgao.nome, func.count())
        .join(PbiProcessoLicitatorio, PbiProcessoLicitatorio.orgao_id == PbiOrgao.id)
        .group_by(PbiOrgao.nome)
        .order_by(PbiOrgao.nome)
    ).all()
    return [(nome, nome, total) for nome, total in rows if nome]


def resolver_orgao(db: Session, fonte: str, chave: str) -> OrgaoConsolidado | None:
    fonte = fonte.strip().lower()
    chave = chave.strip()
    if fonte not in FONTES_ORGAO_VINCULO or not chave:
        return None
    vinculo = db.scalar(
        select(OrgaoVinculo)
        .options(selectinload(OrgaoVinculo.orgao_consolidado))
        .where(OrgaoVinculo.fonte == fonte, OrgaoVinculo.chave == chave)
    )
    if not vinculo or not vinculo.orgao_consolidado.ativo:
        return None
    return vinculo.orgao_consolidado


@router.get("/api/orgaos-consolidados/meta")
def meta_fontes():
    return {"fontes": FONTES_META}


@router.get("/api/orgaos-consolidados/stats")
def stats_orgaos(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(OrgaoConsolidado)) or 0
    ativos = (
        db.scalar(
            select(func.count()).select_from(OrgaoConsolidado).where(OrgaoConsolidado.ativo.is_(True))
        )
        or 0
    )
    vinculos = db.scalar(select(func.count()).select_from(OrgaoVinculo)) or 0
    mapa = _mapa_vinculos(db)
    por_fonte: dict[str, dict[str, int]] = {}
    for fonte in FONTES_ORGAO_VINCULO:
        if fonte == "compras_api":
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
        "orgaos_total": total,
        "orgaos_ativos": ativos,
        "vinculos_total": vinculos,
        "por_fonte": por_fonte,
    }


@router.get("/api/orgaos-consolidados/valores", response_model=list[ValorFonteOut])
def listar_valores_fonte(
    db: Session = Depends(get_db),
    fonte: str | None = None,
    apenas_pendentes: bool = Query(False),
):
    mapa = _mapa_vinculos(db)
    fontes = [fonte] if fonte else sorted(FONTES_ORGAO_VINCULO)
    out: list[ValorFonteOut] = []
    for f in fontes:
        f = _validar_fonte(f)
        if f == "compras_api":
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
                    orgao_consolidado_id=vinc.orgao_consolidado_id if vinc else None,
                    orgao_consolidado_nome=vinc.orgao_consolidado.nome if vinc else None,
                )
            )
    return out


@router.get("/api/orgaos-consolidados/resolver")
def resolver(
    db: Session = Depends(get_db),
    fonte: str = Query(...),
    chave: str = Query(...),
):
    orgao = resolver_orgao(db, fonte, chave)
    if not orgao:
        return {"encontrado": False}
    return {
        "encontrado": True,
        "orgao": OrgaoConsolidadoOut.model_validate(
            db.scalar(
                select(OrgaoConsolidado)
                .options(selectinload(OrgaoConsolidado.vinculos))
                .where(OrgaoConsolidado.id == orgao.id)
            )
        ),
    }


@router.get("/api/orgaos-consolidados", response_model=list[OrgaoConsolidadoOut])
def listar_orgaos(
    db: Session = Depends(get_db),
    ativos: bool = Query(True),
):
    stmt = (
        select(OrgaoConsolidado)
        .options(selectinload(OrgaoConsolidado.vinculos))
        .order_by(OrgaoConsolidado.nome)
    )
    if ativos:
        stmt = stmt.where(OrgaoConsolidado.ativo.is_(True))
    return [_to_out(r) for r in db.scalars(stmt).all()]


@router.get("/api/orgaos-consolidados/{oid}", response_model=OrgaoConsolidadoOut)
def detalhe_orgao(oid: int, db: Session = Depends(get_db)):
    row = db.scalar(
        select(OrgaoConsolidado)
        .options(selectinload(OrgaoConsolidado.vinculos))
        .where(OrgaoConsolidado.id == oid)
    )
    if not row:
        raise HTTPException(404, "Órgão consolidado não encontrado")
    return _to_out(row)


@router.post("/api/orgaos-consolidados", response_model=OrgaoConsolidadoOut, status_code=201)
def criar_orgao(payload: OrgaoConsolidadoCreate, db: Session = Depends(get_db)):
    row = OrgaoConsolidado(
        nome=payload.nome.strip(),
        sigla=(payload.sigla or "").strip() or None,
        observacoes=(payload.observacoes or "").strip() or None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.patch("/api/orgaos-consolidados/{oid}", response_model=OrgaoConsolidadoOut)
def atualizar_orgao(oid: int, payload: OrgaoConsolidadoUpdate, db: Session = Depends(get_db)):
    row = db.scalar(
        select(OrgaoConsolidado)
        .options(selectinload(OrgaoConsolidado.vinculos))
        .where(OrgaoConsolidado.id == oid)
    )
    if not row:
        raise HTTPException(404, "Órgão consolidado não encontrado")
    if payload.nome is not None:
        row.nome = payload.nome.strip()
    if payload.sigla is not None:
        row.sigla = payload.sigla.strip() or None
    if payload.observacoes is not None:
        row.observacoes = payload.observacoes.strip() or None
    if payload.ativo is not None:
        row.ativo = payload.ativo
    row.atualizado_em = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/api/orgaos-consolidados/{oid}", status_code=204)
def excluir_orgao(oid: int, db: Session = Depends(get_db)):
    row = db.get(OrgaoConsolidado, oid)
    if not row:
        raise HTTPException(404, "Órgão consolidado não encontrado")
    db.delete(row)
    db.commit()


@router.post("/api/orgaos-consolidados/{oid}/vinculos", response_model=VinculoOut, status_code=201)
def adicionar_vinculo(oid: int, payload: VinculoCreate, db: Session = Depends(get_db)):
    row = db.get(OrgaoConsolidado, oid)
    if not row:
        raise HTTPException(404, "Órgão consolidado não encontrado")
    fonte = _validar_fonte(payload.fonte)
    chave = payload.chave.strip()
    if not chave:
        raise HTTPException(400, "Chave obrigatória")
    existente = db.scalar(
        select(OrgaoVinculo)
        .options(selectinload(OrgaoVinculo.orgao_consolidado))
        .where(OrgaoVinculo.fonte == fonte, OrgaoVinculo.chave == chave)
    )
    if existente:
        if existente.orgao_consolidado_id == oid:
            return VinculoOut.model_validate(existente)
        raise HTTPException(
            409,
            f"Valor já vinculado ao órgão «{existente.orgao_consolidado.nome}»",
        )
    vinculo = OrgaoVinculo(
        orgao_consolidado_id=oid,
        fonte=fonte,
        chave=chave,
        rotulo=(payload.rotulo or "").strip() or None,
    )
    db.add(vinculo)
    row.atualizado_em = datetime.utcnow()
    db.commit()
    db.refresh(vinculo)
    return VinculoOut.model_validate(vinculo)


@router.delete("/api/orgaos-vinculos/{vid}", status_code=204)
def remover_vinculo(vid: int, db: Session = Depends(get_db)):
    vinculo = db.get(OrgaoVinculo, vid)
    if not vinculo:
        raise HTTPException(404, "Vínculo não encontrado")
    orgao = db.get(OrgaoConsolidado, vinculo.orgao_consolidado_id)
    db.delete(vinculo)
    if orgao:
        orgao.atualizado_em = datetime.utcnow()
    db.commit()
