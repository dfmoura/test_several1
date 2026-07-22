"""Testes da raiz do sistema + catálogo municipal de UASGs (sem rede)."""

from __future__ import annotations

from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal, SistemaRaiz, SistemaUasgMunicipio
from app.main import app
from app.origem_sistema import (
    defaults_env,
    resolver_ibge_municipio,
    resolver_orgaos_cnpj,
    resolver_uf_filtro,
)


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def _limpar_raiz_e_catalogo():
    db = SessionLocal()
    try:
        db.query(SistemaUasgMunicipio).delete()
        db.query(SistemaRaiz).delete()
        db.commit()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _isolamento_raiz():
    _limpar_raiz_e_catalogo()
    yield
    _limpar_raiz_e_catalogo()


def _payload_cnpj_fake(cnpj: str = "18431312000115") -> dict:
    return {
        "ni_fornecedor": cnpj,
        "cnpj": cnpj,
        "nome_razao_social_fornecedor": "PREFEITURA MUNICIPAL DE UBERLANDIA",
        "nome_fantasia": "PMU",
        "situacao_cadastral": "ATIVA",
        "natureza_juridica_nome": "Município",
        "porte_empresa_nome": None,
        "codigo_cnae": 8411600,
        "nome_cnae": "Administração pública",
        "codigo_municipio_ibge": 3170206,
        "nome_municipio": "UBERLANDIA",
        "uf_sigla": "MG",
        "cep": "38400000",
        "logradouro": "AV JOAO NAVES",
        "numero_endereco": "100",
        "bairro": "CENTRO",
        "cnpj_dados_json": "{}",
        "cnpj_enriquecido_em": datetime.utcnow(),
        "_fonte": "brasilapi",
    }


def test_get_raiz_sem_cadastro_retorna_defaults_env(client):
    r = client.get("/api/sistema/raiz")
    assert r.status_code == 200
    body = r.json()
    assert body["cadastrada"] is False
    assert body["raiz"] is None
    assert body["defaults_env"]["codigo_municipio_ibge"] == defaults_env()["codigo_municipio_ibge"]


def test_cadastrar_raiz_uma_vez(client):
    with patch("app.origem_sistema.consultar_cnpj_publico", return_value=_payload_cnpj_fake()):
        r = client.post("/api/sistema/raiz", json={"cnpj": "18.431.312/0001-15"})
    assert r.status_code == 201
    body = r.json()
    assert body["cadastrada"] is True
    assert body["raiz"]["cnpj"] == "18431312000115"
    assert body["raiz"]["codigo_municipio_ibge"] == 3170206
    assert body["raiz"]["uf"] == "MG"

    with patch("app.origem_sistema.consultar_cnpj_publico", return_value=_payload_cnpj_fake()):
        r2 = client.post("/api/sistema/raiz", json={"cnpj": "18431312000115"})
    assert r2.status_code == 409


def test_resolvers_usam_raiz_quando_cadastrada(client):
    assert resolver_ibge_municipio() == defaults_env()["codigo_municipio_ibge"]

    payload = _payload_cnpj_fake("11222333000181")
    payload["codigo_municipio_ibge"] = 3106200
    payload["uf_sigla"] = "MG"
    payload["nome_municipio"] = "BELO HORIZONTE"
    with patch("app.origem_sistema.consultar_cnpj_publico", return_value=payload):
        r = client.post("/api/sistema/raiz", json={"cnpj": "11222333000181"})
    assert r.status_code == 201

    assert resolver_ibge_municipio() == 3106200
    assert resolver_uf_filtro() == "MG"
    assert resolver_orgaos_cnpj() == ["11222333000181"]


def test_sincronizar_e_aderir_catalogo(client):
    with patch("app.origem_sistema.consultar_cnpj_publico", return_value=_payload_cnpj_fake()):
        assert client.post("/api/sistema/raiz", json={"cnpj": "18431312000115"}).status_code == 201

    fake_pages = [
        {
            "codigoUasg": "926922",
            "nomeUasg": "PMU — Prefeitura",
            "siglaUf": "MG",
            "codigoMunicipioIbge": 3170206,
            "nomeMunicipioIbge": "UBERLANDIA",
            "cnpjCpfOrgao": "18431312000115",
            "statusUasg": True,
        },
        {
            "codigoUasg": "999001",
            "nomeUasg": "UASG Nova do Municipio",
            "siglaUf": "MG",
            "codigoMunicipioIbge": 3170206,
            "nomeMunicipioIbge": "UBERLANDIA",
            "cnpjCpfOrgao": "18431312000115",
            "statusUasg": True,
        },
    ]

    class _FakeClient:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def paginar(self, *args, **kwargs):
            return iter(fake_pages)

    with patch("app.origem_sistema.ComprasGovClient", return_value=_FakeClient()):
        with patch("app.origem_sistema.time.sleep", return_value=None):
            sync = client.post("/api/sistema/uasgs-municipio/sincronizar")
    assert sync.status_code == 200
    assert sync.json()["total_catalogo"] == 2

    lista = client.get("/api/sistema/uasgs-municipio").json()
    assert lista["total"] == 2
    codigos = {i["codigo_uasg"] for i in lista["items"]}
    assert codigos == {"926922", "999001"}

    # 926922 provavelmente já está no seed do Setup
    aderir = client.post(
        "/api/sistema/uasgs-municipio/aderir",
        json={"codigos": ["999001"]},
    )
    assert aderir.status_code == 200
    assert aderir.json()["adicionados"] >= 1

    unidades = client.get("/api/sistema/unidades-compradoras").json()
    assert any(u["codigo"] == "999001" and u["ativo"] for u in unidades)


def test_limpeza_preserva_raiz_e_catalogo(client):
    with patch("app.origem_sistema.consultar_cnpj_publico", return_value=_payload_cnpj_fake()):
        assert client.post("/api/sistema/raiz", json={"cnpj": "18431312000115"}).status_code == 201

    db = SessionLocal()
    try:
        db.add(
            SistemaUasgMunicipio(
                codigo_uasg="999002",
                nome_uasg="Catalogo Preservar",
                codigo_municipio_ibge=3170206,
                sigla_uf="MG",
            )
        )
        db.commit()
    finally:
        db.close()

    r = client.post("/api/sistema/limpar-dados", json={"confirmacao": "LIMPAR"})
    assert r.status_code == 200
    assert "sistema_raiz" in r.json()["preservados"]
    assert "sistema_uasgs_municipio" in r.json()["preservados"]

    raiz = client.get("/api/sistema/raiz").json()
    assert raiz["cadastrada"] is True
    cat = client.get("/api/sistema/uasgs-municipio").json()
    assert any(i["codigo_uasg"] == "999002" for i in cat["items"])


def test_consultar_raiz_preview(client):
    with patch("app.origem_sistema.consultar_cnpj_publico", return_value=_payload_cnpj_fake()):
        r = client.post("/api/sistema/raiz/consultar", json={"cnpj": "18431312000115"})
    assert r.status_code == 200
    assert r.json()["preview"]["codigo_municipio_ibge"] == 3170206
    # não persiste
    assert client.get("/api/sistema/raiz").json()["cadastrada"] is False
