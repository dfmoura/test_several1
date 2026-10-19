from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import IBGE_UBERLANDIA
from app.db import garantir_contexto
from app.models import Filial, FilialUasg, OrgaoPublico, Uasg
from app.tempo import agora_utc

# Lista inicial conhecida. Só vira adesão se o módulo 05 devolver a UASG ativa
# no município da filial. Não é verdade eterna.
ADESAO_INICIAL: dict[int, set[str]] = {
    IBGE_UBERLANDIA: {
        "926922",
        "926287",
        "926038",
        "931351",
        "930403",
        "929315",
        "929301",
        "925010",
    }
}


def _codigo(valor: object) -> str:
    texto = "".join(ch for ch in str(valor or "") if ch.isdigit())
    return texto


def sincronizar_registros(db: Session, filial: Filial, registros: list[dict]) -> dict:
    garantir_contexto(db)
    agora = agora_utc()
    aderidas = 0
    for bruto in registros:
        codigo = _codigo(bruto.get("codigoUasg"))
        if not codigo:
            continue
        ibge = bruto.get("codigoMunicipioIbge")
        try:
            ibge_int = int(ibge) if ibge is not None else None
        except (TypeError, ValueError):
            ibge_int = None
        if ibge_int != filial.codigo_ibge:
            continue
        ativa = bruto.get("statusUasg") is True
        uasg = db.get(Uasg, codigo)
        if uasg is None:
            uasg = Uasg(codigo_uasg=codigo)
            db.add(uasg)
        uasg.nome = str(bruto.get("nomeUasg") or "")
        uasg.cnpj_orgao = "".join(ch for ch in str(bruto.get("cnpjCpfOrgao") or "") if ch.isdigit())
        uasg.uf = str(bruto.get("siglaUf") or filial.uf)[:2]
        uasg.codigo_ibge = ibge_int
        uasg.ativa_oficial = ativa
        uasg.atualizada_em = agora
        db.flush()
        if uasg.cnpj_orgao:
            orgao = db.scalar(select(OrgaoPublico).where(OrgaoPublico.cnpj == uasg.cnpj_orgao))
            if orgao is None:
                db.add(
                    OrgaoPublico(
                        cnpj=uasg.cnpj_orgao,
                        nome=str(bruto.get("nomeOrgao") or uasg.nome),
                        uf=uasg.uf,
                        codigo_ibge=ibge_int,
                    )
                )
        adesao = db.scalar(
            select(FilialUasg).where(
                FilialUasg.tenant_id == filial.id,
                FilialUasg.codigo_uasg == codigo,
            )
        )
        if adesao is None:
            entra = ativa and codigo in ADESAO_INICIAL.get(filial.codigo_ibge, set())
            adesao = FilialUasg(tenant_id=filial.id, codigo_uasg=codigo, aderida=entra)
            db.add(adesao)
            if entra:
                aderidas += 1
        elif not ativa and adesao.aderida:
            adesao.aderida = False
    filial.ultima_sync_uasg = agora
    filial.atualizada_em = agora
    db.commit()
    return {"aderidas_novas": aderidas}


def definir_adesao(
    db: Session,
    filial_id: uuid.UUID,
    codigo_uasg: str,
    aderida: bool,
) -> FilialUasg:
    from app.contas import ErroRegra

    codigo = _codigo(codigo_uasg)
    uasg = db.get(Uasg, codigo)
    adesao = db.scalar(
        select(FilialUasg).where(
            FilialUasg.tenant_id == filial_id,
            FilialUasg.codigo_uasg == codigo,
        )
    )
    if uasg is None or adesao is None:
        raise ErroRegra("UASG não encontrada neste município.", status=404)
    if uasg.codigo_ibge is not None:
        filial = db.get(Filial, filial_id)
        if filial and uasg.codigo_ibge != filial.codigo_ibge:
            raise ErroRegra("UASG não encontrada neste município.", status=404)
    if aderida and not uasg.ativa_oficial:
        raise ErroRegra("UASG inativa no Compras.gov não entra na coleta.", status=409)
    adesao.aderida = aderida
    filial = db.get(Filial, filial_id)
    if filial is not None:
        filial.escopo_alterado_em = agora_utc()
    db.commit()
    db.refresh(adesao)
    return adesao


def listar_escopo(db: Session) -> list[tuple[Uasg, FilialUasg]]:
    linhas = db.execute(
        select(Uasg, FilialUasg).join(FilialUasg, FilialUasg.codigo_uasg == Uasg.codigo_uasg)
    ).all()
    return [(uasg, adesao) for uasg, adesao in linhas]


def uasgs_coletaveis(db: Session, filial_id: uuid.UUID) -> list[Uasg]:
    linhas = db.execute(
        select(Uasg)
        .join(FilialUasg, FilialUasg.codigo_uasg == Uasg.codigo_uasg)
        .where(
            FilialUasg.tenant_id == filial_id,
            FilialUasg.aderida.is_(True),
            Uasg.ativa_oficial.is_(True),
        )
    ).scalars()
    return list(linhas)
