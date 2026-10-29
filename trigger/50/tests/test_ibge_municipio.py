"""Lookup IBGE Localidades — Território (código → nome/UF)."""

from __future__ import annotations

import uuid


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _bootstrap_admin(client) -> None:
    r = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert r.status_code == 200, r.text


def test_lookup_ibge_usa_remoto_e_cacheia(client, monkeypatch):
    _bootstrap_admin(client)

    def fake_buscar(codigo: int):
        assert codigo == 3170206
        return {
            "codigo_ibge": 3170206,
            "nome": "Uberlândia",
            "uf": "MG",
            "fonte": "ibge_localidades",
        }

    monkeypatch.setattr(
        "app.territorial.service.buscar_municipio_ibge",
        fake_buscar,
    )

    r1 = client.get("/api/territorial/ibge/municipios/3170206")
    assert r1.status_code == 200, r1.text
    assert r1.json()["nome"] == "Uberlândia"
    assert r1.json()["uf"] == "MG"
    assert r1.json()["fonte"] == "ibge_localidades"

    # 2ª chamada: cache local (não deve chamar remoto)
    def boom(_codigo: int):
        raise AssertionError("não deveria consultar IBGE de novo")

    monkeypatch.setattr("app.territorial.service.buscar_municipio_ibge", boom)
    r2 = client.get("/api/territorial/ibge/municipios/3170206")
    assert r2.status_code == 200
    assert r2.json()["fonte"] == "cache_local"


def test_associar_municipio_so_com_codigo_ibge(client, monkeypatch):
    _bootstrap_admin(client)
    org_r = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org IBGE", "codigo": "IBGEORG"},
    )
    assert org_r.status_code == 201, org_r.text
    org = org_r.json()
    matriz_r = client.post(
        f"/api/org/organizacoes/{org['id']}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "MTZ"},
    )
    assert matriz_r.status_code == 201, matriz_r.text
    matriz = matriz_r.json()
    filial_r = client.post(
        f"/api/org/organizacoes/{org['id']}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial",
            "codigo": "FIL",
            "matriz_id": matriz["id"],
        },
    )
    assert filial_r.status_code == 201, filial_r.text
    filial = filial_r.json()

    monkeypatch.setattr(
        "app.territorial.service.buscar_municipio_ibge",
        lambda codigo: {
            "codigo_ibge": codigo,
            "nome": "Belo Horizonte",
            "uf": "MG",
            "fonte": "ibge_localidades",
        },
    )

    r = client.post(
        f"/api/territorial/filiais/{filial['id']}/municipios",
        json={"codigo_ibge": 3106200},
    )
    assert r.status_code == 201, r.text
    assert r.json()["nome"] == "Belo Horizonte"
    assert r.json()["uf"] == "MG"


def test_lookup_ibge_nao_encontrado(client, monkeypatch):
    from app.territorial.ibge import IbgeLookupError

    _bootstrap_admin(client)

    def not_found(_codigo: int):
        raise IbgeLookupError("Município IBGE 9999999 não encontrado.", not_found=True)

    monkeypatch.setattr("app.territorial.service.buscar_municipio_ibge", not_found)
    r = client.get("/api/territorial/ibge/municipios/9999999")
    assert r.status_code == 404
