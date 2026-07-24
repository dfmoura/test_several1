"""Vínculos Compras.gov usam codigoModalidade — não modalidadeIdPncp."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import ModalidadeConsolidada, ModalidadeVinculo, SessionLocal, init_db
from app.main import app
from app.modalidades_vinculo import reparar_vinculos_compras_api


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def _seed_consolidadas_pncp_erradas(db) -> None:
    """Simula o estado legado: chave compras_api = id PNCP."""
    pares = [
        (3, "Concurso"),
        (4, "Concorrência - Eletrônica"),
        (5, "Concorrência - Presencial"),
        (6, "Pregão - Eletrônico"),
        (7, "Pregão - Presencial"),
        (8, "Dispensa de Licitação"),
        (9, "Inexigibilidade"),
        (1, "Leilão"),
    ]
    for pncp, nome in pares:
        cons = ModalidadeConsolidada(nome=nome, codigo_pncp=pncp, ativo=True)
        db.add(cons)
        db.flush()
        db.add(
            ModalidadeVinculo(
                modalidade_consolidada_id=cons.id,
                fonte="compras_api",
                chave=str(pncp),
                rotulo=nome,
            )
        )
    # Power BI deve ser preservado
    pregao = db.scalar(
        select(ModalidadeConsolidada).where(ModalidadeConsolidada.codigo_pncp == 6)
    )
    assert pregao is not None
    db.add(
        ModalidadeVinculo(
            modalidade_consolidada_id=pregao.id,
            fonte="powerbi",
            chave="PREGÃO ELETRÔNICO",
            rotulo="PREGÃO ELETRÔNICO",
        )
    )
    db.commit()


def test_reparar_vinculos_compras_realinha_codigo_modalidade():
    init_db()
    db = SessionLocal()
    try:
        for row in db.scalars(select(ModalidadeVinculo)).all():
            db.delete(row)
        for row in db.scalars(select(ModalidadeConsolidada)).all():
            db.delete(row)
        db.commit()
        _seed_consolidadas_pncp_erradas(db)

        # Antes: chave 6 → Pregão (errado)
        antes = db.scalar(
            select(ModalidadeVinculo)
            .options(selectinload(ModalidadeVinculo.modalidade_consolidada))
            .where(ModalidadeVinculo.fonte == "compras_api", ModalidadeVinculo.chave == "6")
        )
        assert antes is not None
        assert "Pregão" in (antes.modalidade_consolidada.nome or "")

        resultado = reparar_vinculos_compras_api(db)
        assert resultado["alterado"] is True
        assert resultado["preservados_powerbi"] == 1

        # Depois: chave 6 → Dispensa; chave 5 → Pregão
        mapa = {
            v.chave: v.modalidade_consolidada.nome
            for v in db.scalars(
                select(ModalidadeVinculo)
                .options(selectinload(ModalidadeVinculo.modalidade_consolidada))
                .where(ModalidadeVinculo.fonte == "compras_api")
            ).all()
        }
        assert "Dispensa" in mapa["6"]
        assert "Pregão" in mapa["5"]
        assert "Concorrência" in mapa["3"]
        assert "Inexigibilidade" in mapa["7"]

        pbi = db.scalars(
            select(ModalidadeVinculo).where(ModalidadeVinculo.fonte == "powerbi")
        ).all()
        assert len(pbi) == 1
        assert pbi[0].chave == "PREGÃO ELETRÔNICO"

        # Idempotente
        segundo = reparar_vinculos_compras_api(db)
        assert segundo["alterado"] is False
    finally:
        db.close()


def test_recusa_vinculo_compras_com_id_pncp(client):
    init_db()
    db = SessionLocal()
    try:
        cons = db.scalar(
            select(ModalidadeConsolidada).where(ModalidadeConsolidada.codigo_pncp == 6)
        )
        if not cons:
            cons = ModalidadeConsolidada(
                nome="Pregão - Eletrônico", codigo_pncp=6, ativo=True
            )
            db.add(cons)
            db.commit()
            db.refresh(cons)
        mid = cons.id
    finally:
        db.close()

    # chave 6 + consolidada PNCP 6 = padrão errado legado
    r = client.post(
        f"/api/modalidades-consolidadas/{mid}/vinculos",
        json={"fonte": "compras_api", "chave": "6", "rotulo": "Pregão"},
    )
    assert r.status_code == 400
    assert "codigoModalidade" in r.json()["detail"]
