"""Fase 9 — alertas, comparativos nativos, fence Power BI, roadmap."""

from __future__ import annotations

import uuid
from datetime import date

import pytest

from app.compras.sync_contratacoes import sincronizar_contratacoes_uasg
from app.config import assert_power_bi_proibido
from app.database import FilialUasg, Orgao, Uasg


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _bootstrap(client) -> None:
    assert (
        client.post(
            "/api/auth/bootstrap",
            json={"username": _uid("adm"), "password": "admin123"},
        ).status_code
        == 200
    )


def test_assert_power_bi_proibido_com_env(monkeypatch):
    monkeypatch.setenv("ENABLE_POWER_BI", "1")
    with pytest.raises(RuntimeError, match="Power BI"):
        assert_power_bi_proibido()
    monkeypatch.delenv("ENABLE_POWER_BI", raising=False)
    assert_power_bi_proibido()  # ok


def test_health_fase9(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["fase"] == "9"
    assert body["power_bi"] is False
    assert body["version"].startswith("1.")


def test_alertas_seed_e_avaliacao(client, db):
    _bootstrap(client)
    regras = client.get("/api/alertas/regras")
    assert regras.status_code == 200
    assert len(regras.json()) >= 3

    av = client.get("/api/alertas/avaliacao")
    assert av.status_code == 200
    body = av.json()
    assert body["power_bi"] is False
    assert "metricas" in body
    assert body["total_ativos"] >= 1


def test_comparativos_nativos_sem_power_bi(client, db):
    _bootstrap(client)
    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org9", "codigo": _uid("O9").upper()[:8]},
    )
    assert org.status_code == 201, org.text
    matriz = client.post(
        f"/api/org/organizacoes/{org.json()['id']}/unidades",
        json={"tipo": "matriz", "nome": "Matriz 9", "codigo": "M9"},
    )
    assert matriz.status_code == 201, matriz.text
    filial = client.post(
        f"/api/org/organizacoes/{org.json()['id']}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial 9",
            "codigo": "F9",
            "matriz_id": matriz.json()["id"],
        },
    )
    assert filial.status_code == 201, filial.text
    orgao = Orgao(codigo_orgao=9400, nome_orgao="O")
    db.add(orgao)
    db.flush()
    u = Uasg(codigo_uasg="444444", orgao_id=orgao.id, nome_uasg="U9")
    db.add(u)
    db.flush()
    db.add(FilialUasg(unidade_id=filial.json()["id"], uasg_id=u.id, ativo=True))
    db.commit()

    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg="444444",
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[
            {
                "idCompra": "c9-1",
                "unidadeOrgaoCodigoUnidade": "444444",
                "anoCompraPncp": 2024,
                "objetoCompra": "Item fase 9",
                "modalidadeNome": "Pregão - Eletrônico",
                "codigoModalidade": 5,
            }
        ],
        itens=[],
        resultados=[],
        incluir_itens=False,
        incluir_resultados=False,
    )
    client.post("/api/auth/unidade-ativa", json={"unidade_id": filial.json()["id"]})

    r = client.get("/api/consultas/comparativos")
    assert r.status_code == 200
    body = r.json()
    assert body["power_bi"] is False
    assert body["fonte"] == "sqlite_nativo"
    u9 = next(x for x in body["por_uasg"] if x["codigo_uasg"] == "444444")
    assert u9["nome_uasg"] == "U9"


def test_roadmap_rejeita_power_bi(client):
    _bootstrap(client)
    r = client.get("/api/ops/roadmap")
    assert r.status_code == 200
    body = r.json()
    assert body["power_bi"] is False
    pbi = next(i for i in body["itens"] if i["id"] == "power_bi")
    assert pbi["status"] == "rejeitado"
