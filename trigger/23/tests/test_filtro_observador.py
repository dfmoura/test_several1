"""Filtro por observador nas listagens Compras.gov e Power BI."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.database import (
    CompraContratacao,
    Observador,
    PbiOrgao,
    PbiProcessoLicitatorio,
    SessionLocal,
)
from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def test_filtro_observador_compras_e_powerbi(client):
    token = uuid.uuid4().hex[:8]
    db = SessionLocal()
    try:
        obs_a = Observador(nome=f"Obs A {token}", ativo=True)
        obs_b = Observador(nome=f"Obs B {token}", ativo=True)
        db.add_all([obs_a, obs_b])
        db.flush()

        compra_a = CompraContratacao(
            unidade_compradora="T-OBS",
            unidade_nome="Teste filtro observador",
            ano=2096,
            chave_compra=f"OBS-A-{token}",
            id_compra=f"OBS-A-{token}",
            processo=f"OBS-A-{token}",
            observador_id=obs_a.id,
        )
        compra_b = CompraContratacao(
            unidade_compradora="T-OBS",
            unidade_nome="Teste filtro observador",
            ano=2096,
            chave_compra=f"OBS-B-{token}",
            id_compra=f"OBS-B-{token}",
            processo=f"OBS-B-{token}",
            observador_id=obs_b.id,
        )
        compra_sem = CompraContratacao(
            unidade_compradora="T-OBS",
            unidade_nome="Teste filtro observador",
            ano=2096,
            chave_compra=f"OBS-SEM-{token}",
            id_compra=f"OBS-SEM-{token}",
            processo=f"OBS-SEM-{token}",
            observador_id=None,
        )

        orgao = PbiOrgao(nome=f"Orgao obs {token}")
        db.add_all([compra_a, compra_b, compra_sem, orgao])
        db.flush()

        pbi_a = PbiProcessoLicitatorio(
            orgao_id=orgao.id,
            ano_processo=2096,
            processo=f"PBI-A-{token}",
            modalidade="Teste",
            fonte_ano_coleta=2096,
            observador_id=obs_a.id,
        )
        pbi_sem = PbiProcessoLicitatorio(
            orgao_id=orgao.id,
            ano_processo=2096,
            processo=f"PBI-SEM-{token}",
            modalidade="Teste",
            fonte_ano_coleta=2096,
            observador_id=None,
        )
        db.add_all([pbi_a, pbi_sem])
        db.commit()
        oid_a = obs_a.id
    finally:
        db.close()

    por_a = client.get(
        "/api/compras/contratacoes",
        params={"ano": 2096, "unidade_codigo": "T-OBS", "observador_id": oid_a},
    )
    assert por_a.status_code == 200
    assert por_a.json()["total"] == 1
    assert por_a.json()["items"][0]["processo"] == f"OBS-A-{token}"
    assert por_a.json()["items"][0]["observador_id"] == oid_a

    sem = client.get(
        "/api/compras/contratacoes",
        params={"ano": 2096, "unidade_codigo": "T-OBS", "observador_id": 0},
    )
    assert sem.status_code == 200
    assert sem.json()["total"] == 1
    assert sem.json()["items"][0]["processo"] == f"OBS-SEM-{token}"
    assert sem.json()["items"][0]["observador_id"] is None

    todos = client.get(
        "/api/compras/contratacoes",
        params={"ano": 2096, "unidade_codigo": "T-OBS"},
    )
    assert todos.status_code == 200
    assert todos.json()["total"] == 3

    pbi_por_a = client.get(
        "/api/powerbi/licitacoes",
        params={"ano_processo": 2096, "processo": token, "observador_id": oid_a},
    )
    assert pbi_por_a.status_code == 200
    assert pbi_por_a.json()["total"] == 1
    assert pbi_por_a.json()["items"][0]["processo"] == f"PBI-A-{token}"

    pbi_sem = client.get(
        "/api/powerbi/licitacoes",
        params={"ano_processo": 2096, "processo": token, "observador_id": 0},
    )
    assert pbi_sem.status_code == 200
    assert pbi_sem.json()["total"] == 1
    assert pbi_sem.json()["items"][0]["processo"] == f"PBI-SEM-{token}"
