"""Testes da API Compras.gov (rotas extraídas) — mocks de HTTP, sem rede."""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.compras import api as compras_api
from app.database import CompraContratacao, CompraContratacaoItem, SessionLocal, init_db
from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_status_coleta():
    compras_api._compras_coleta_status.update(
        running=False, fase="idle", log=[], resultado=None, contadores={}
    )
    yield
    compras_api._compras_coleta_status.update(
        running=False, fase="idle", log=[], resultado=None, contadores={}
    )


def test_compras_stats_e_modalidades(client):
    r = client.get("/api/compras/stats")
    assert r.status_code == 200
    body = r.json()
    assert "total" in body
    assert "por_ano" in body

    mods = client.get("/api/compras/modalidades")
    assert mods.status_code == 200
    assert isinstance(mods.json(), list)
    assert mods.json()
    assert {m["codigo"] for m in mods.json()} >= {13, 14}


def test_filtro_modalidade_restringe_a_selecao(client):
    """Filtra por codigoModalidade (modalidade_codigo), alinhado ao Painel/vínculos.

    A API federal expõe dois códigos distintos; o filtro da listagem não deve
    usar modalidadeIdPncp, senão a busca diverge do agrupamento do Painel.
    """
    db = SessionLocal()
    try:
        rows = [
            CompraContratacao(
                unidade_compradora="926922",
                unidade_nome="Teste filtro modalidade",
                ano=2099,
                chave_compra=f"TESTE-FILTRO-MOD-{codigo_compras}",
                id_compra=f"TESTE-FILTRO-MOD-{codigo_compras}",
                modalidade_id_pncp=codigo_pncp,
                modalidade_codigo=str(codigo_compras),
                modalidade_descricao=descricao,
            )
            for codigo_pncp, codigo_compras, descricao in (
                (6, 5, "Pregão - Eletrônico"),
                (8, 6, "Dispensa"),
                (13, 12, "Leilão - Presencial"),
            )
        ]
        db.add_all(rows)
        db.commit()
    finally:
        db.close()

    # codigoModalidade=5 (não modalidadeIdPncp=6) → Pregão da fixture
    somente_codigo_5 = client.get(
        "/api/compras/contratacoes",
        params={"ano": 2099, "modalidade_codigo": "5"},
    )
    assert somente_codigo_5.status_code == 200
    assert somente_codigo_5.json()["total"] == 1
    assert somente_codigo_5.json()["items"][0]["modalidade_descricao"] == "Pregão - Eletrônico"
    assert somente_codigo_5.json()["items"][0]["modalidade_codigo"] == "5"

    # Garante que não filtra pelo id PNCP: id_pncp=6 existe, mas codigo=6 é Dispensa
    por_id_pncp_equivocado = client.get(
        "/api/compras/contratacoes",
        params={"ano": 2099, "modalidade_codigo": "6"},
    )
    assert por_id_pncp_equivocado.status_code == 200
    assert por_id_pncp_equivocado.json()["total"] == 1
    assert por_id_pncp_equivocado.json()["items"][0]["modalidade_descricao"] == "Dispensa"

    duas_modalidades = client.get(
        "/api/compras/contratacoes",
        params=[
            ("ano", "2099"),
            ("modalidade_codigo", "5"),
            ("modalidade_codigo", "12"),
        ],
    )
    assert duas_modalidades.status_code == 200
    assert duas_modalidades.json()["total"] == 2
    assert {item["modalidade_descricao"] for item in duas_modalidades.json()["items"]} == {
        "Pregão - Eletrônico",
        "Leilão - Presencial",
    }


def test_filtro_tipo_restringe_contratacoes_e_informa_tipo_na_tabela(client):
    db = SessionLocal()
    try:
        material = CompraContratacao(
            unidade_compradora="926922",
            unidade_nome="Teste tipo material",
            ano=2098,
            chave_compra="TESTE-TIPO-M",
            id_compra="TESTE-TIPO-M",
        )
        servico = CompraContratacao(
            unidade_compradora="926922",
            unidade_nome="Teste tipo serviço",
            ano=2098,
            chave_compra="TESTE-TIPO-S",
            id_compra="TESTE-TIPO-S",
        )
        mista = CompraContratacao(
            unidade_compradora="926922",
            unidade_nome="Teste tipo misto",
            ano=2098,
            chave_compra="TESTE-TIPO-MS",
            id_compra="TESTE-TIPO-MS",
        )
        db.add_all([material, servico, mista])
        db.flush()
        db.add_all(
            [
                CompraContratacaoItem(
                    id_compra_item="TESTE-TIPO-M-1",
                    id_compra=material.id_compra,
                    contratacao_id=material.id,
                    material_ou_servico="M",
                ),
                CompraContratacaoItem(
                    id_compra_item="TESTE-TIPO-S-1",
                    id_compra=servico.id_compra,
                    contratacao_id=servico.id,
                    material_ou_servico="S",
                ),
                CompraContratacaoItem(
                    id_compra_item="TESTE-TIPO-MS-1",
                    id_compra=mista.id_compra,
                    contratacao_id=mista.id,
                    material_ou_servico="M",
                ),
                CompraContratacaoItem(
                    id_compra_item="TESTE-TIPO-MS-2",
                    id_compra=mista.id_compra,
                    contratacao_id=mista.id,
                    material_ou_servico="S",
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    materiais = client.get(
        "/api/compras/contratacoes",
        params={"ano": 2098, "material_ou_servico": "M"},
    )
    assert materiais.status_code == 200
    assert materiais.json()["total"] == 2
    assert {
        item["id_compra"]: item["tipos_item"] for item in materiais.json()["items"]
    } == {
        "TESTE-TIPO-M": ["M"],
        "TESTE-TIPO-MS": ["M", "S"],
    }

    servicos = client.get(
        "/api/compras/contratacoes",
        params={"ano": 2098, "material_ou_servico": "S"},
    )
    assert servicos.status_code == 200
    assert servicos.json()["total"] == 2
    assert {item["id_compra"] for item in servicos.json()["items"]} == {
        "TESTE-TIPO-S",
        "TESTE-TIPO-MS",
    }


def test_compras_coletar_com_mocks(client, monkeypatch):
    """Dispara coleta sem chamar a API federal."""

    def fake_coletar(**kwargs):
        return []

    def fake_itens(**kwargs):
        return []

    def fake_resultados(**kwargs):
        return []

    monkeypatch.setattr(compras_api, "coletar_compras", fake_coletar)
    monkeypatch.setattr(compras_api, "coletar_itens", fake_itens)
    monkeypatch.setattr(compras_api, "coletar_resultados", fake_resultados)

    r = client.post("/api/compras/coletar", json={"ano": 2024})
    assert r.status_code == 200
    assert r.json()["status"] == "iniciada"
    assert r.json()["modo"] == "api_pncp"

    # background do TestClient roda inline
    st = client.get("/api/compras/coletar/status").json()
    assert st["running"] is False
    assert st["resultado"] is not None
    assert st["resultado"]["ok"] is True
    assert st["resultado"]["total"] == 0


def test_compras_coletar_completo_mock_pipeline(client, monkeypatch):
    def fake_pipeline(**kwargs):
        return SimpleNamespace(contadores={"fase_07": 0, "itens": 0})

    monkeypatch.setattr(compras_api, "executar_pipeline", fake_pipeline)
    r = client.post(
        "/api/compras/coletar-completo",
        json={"ano": 2024, "fases": ["07"]},
    )
    assert r.status_code == 200
    assert r.json()["modo"] == "orquestrador"
    st = client.get("/api/compras/coletar/status").json()
    assert st["resultado"]["ok"] is True


def test_compras_coletar_conflito_409(client):
    compras_api._compras_coleta_status["running"] = True
    r = client.post("/api/compras/coletar", json={"ano": 2024})
    assert r.status_code == 409


def test_listar_contratacoes_apos_inserir(client):
    init_db()
    db = SessionLocal()
    try:
        row = CompraContratacao(
            unidade_compradora="926922",
            unidade_nome="Teste",
            ano=2024,
            chave_compra="TESTE-CHAVE-API-1",
            id_compra="TESTE-CHAVE-API-1",
            objeto="Objeto teste proteção",
            situacao_lista="Divulgada no PNCP",
        )
        db.add(row)
        db.commit()
        cid = row.id
    finally:
        db.close()

    r = client.get("/api/compras/contratacoes", params={"ano": 2024, "texto": "proteção"})
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert any(i["id"] == cid for i in data["items"])

    det = client.get(f"/api/compras/contratacoes/{cid}")
    assert det.status_code == 200
    assert det.json()["chave_compra"] == "TESTE-CHAVE-API-1"


def test_resolver_periodo_coleta():
    req = compras_api.ComprasColetaRequest(
        data_inicial=date(2024, 3, 1), data_final=date(2024, 3, 31)
    )
    assert compras_api._resolver_periodo_coleta(req) == (date(2024, 3, 1), date(2024, 3, 31))
    req2 = compras_api.ComprasColetaRequest(ano=2023)
    assert compras_api._resolver_periodo_coleta(req2) == (date(2023, 1, 1), date(2023, 12, 31))
