"""Território: municípios, sync UASG (mock) e histórico FILIAL_UASG — Fase 2."""

from __future__ import annotations

import uuid

from app import database
from app.compras.sync_uasg import sincronizar_uasgs_municipio
from app.territorial.service import sync_municipio_filial


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _bootstrap_admin(client) -> None:
    r = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert r.status_code == 200


def _filial_pronta(client) -> tuple[int, int]:
    """Retorna (org_id, filial_id) com matriz criada."""
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Terr", "codigo": _uid("OT").upper()[:8]},
    ).json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    filial = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial UDI",
            "codigo": "UDI",
            "matriz_id": matriz["id"],
        },
    ).json()
    return org_id, filial["id"]


_SAMPLE_UASGS = [
    {
        "codigoUasg": "926922",
        "nomeUasg": "PMU — Prefeitura",
        "siglaUf": "MG",
        "codigoMunicipioIbge": 3170206,
        "nomeMunicipioIbge": "UBERLANDIA",
        "cnpjCpfOrgao": "18431312000115",
        "codigoOrgao": 1001,
        "nomeOrgao": "PREFEITURA MUNICIPAL",
        "statusUasg": True,
    },
    {
        "codigoUasg": "926287",
        "nomeUasg": "DMAE",
        "siglaUf": "MG",
        "codigoMunicipioIbge": 3170206,
        "nomeMunicipioIbge": "UBERLANDIA",
        "cnpjCpfOrgao": "18431312000115",
        "codigoOrgao": 1001,
        "nomeOrgao": "PREFEITURA MUNICIPAL",
        "statusUasg": True,
    },
]


def test_associar_sync_ativar_desativar_preserva_historico(client):
    _bootstrap_admin(client)
    _, filial_id = _filial_pronta(client)

    # Matriz não aceita município
    matriz_id = client.get(f"/api/org/unidades").json()
    matriz = next(u for u in matriz_id if u["tipo"] == "matriz")
    bad = client.post(
        f"/api/territorial/filiais/{matriz['id']}/municipios",
        json={"codigo_ibge": 3170206, "nome": "Uberlândia", "uf": "MG"},
    )
    assert bad.status_code == 400

    mun = client.post(
        f"/api/territorial/filiais/{filial_id}/municipios",
        json={"codigo_ibge": 3170206, "nome": "Uberlândia", "uf": "MG"},
    )
    assert mun.status_code == 201, mun.text
    assert mun.json()["ativo"] is True

    # Sync via service com payload mock (sem HTTP)
    db = database.SessionLocal()
    try:
        result = sync_municipio_filial(
            db,
            unidade_id=filial_id,
            codigo_ibge=3170206,
            registros=_SAMPLE_UASGS,
        )
    finally:
        db.close()
    assert result["total_catalogo"] == 2

    catalogo = client.get(
        f"/api/territorial/filiais/{filial_id}/municipios/3170206/uasgs"
    )
    assert catalogo.status_code == 200
    assert len(catalogo.json()) == 2
    uasg_id = catalogo.json()[0]["id"]

    ativar = client.post(
        f"/api/territorial/filiais/{filial_id}/uasgs",
        json={"uasg_id": uasg_id},
    )
    assert ativar.status_code == 201
    assert ativar.json()["ativo"] is True

    desativar = client.delete(
        f"/api/territorial/filiais/{filial_id}/uasgs/{uasg_id}"
    )
    assert desativar.status_code == 200
    assert desativar.json()["ativo"] is False
    assert desativar.json()["desativado_em"] is not None

    hist = client.get(f"/api/territorial/filiais/{filial_id}/uasgs")
    assert hist.status_code == 200
    assert len(hist.json()) == 1
    assert hist.json()[0]["ativo"] is False

    # reativar
    re = client.post(
        f"/api/territorial/filiais/{filial_id}/uasgs",
        json={"uasg_id": uasg_id},
    )
    assert re.status_code == 201
    assert re.json()["ativo"] is True

    # desassociar município preserva histórico
    off = client.delete(
        f"/api/territorial/filiais/{filial_id}/municipios/3170206"
    )
    assert off.status_code == 200
    assert off.json()["ativo"] is False
    lista = client.get(f"/api/territorial/filiais/{filial_id}/municipios")
    assert any(m["codigo_municipio_ibge"] == 3170206 for m in lista.json())


def test_isolamento_territorio_entre_filiais(client):
    _bootstrap_admin(client)
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Iso T", "codigo": _uid("IT").upper()[:8]},
    ).json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    f1 = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial A",
            "codigo": "FA",
            "matriz_id": matriz["id"],
        },
    ).json()
    f2 = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial B",
            "codigo": "FB",
            "matriz_id": matriz["id"],
        },
    ).json()

    user = _uid("fa")
    ua = client.post(
        "/api/auth/usuarios",
        json={"username": user, "password": "consulta1", "papel": "consulta"},
    ).json()
    client.post(
        f"/api/org/unidades/{f1['id']}/usuarios",
        json={"usuario_id": ua["id"], "papel": "gestor_filial"},
    )

    client.post("/api/auth/logout")
    assert (
        client.post(
            "/api/auth/login",
            json={"username": user, "password": "consulta1"},
        ).status_code
        == 200
    )

    # Consulta: Cadastros/Território é admin (menu + API) — mesmo com vínculo na filial.
    ok = client.post(
        f"/api/territorial/filiais/{f1['id']}/municipios",
        json={"codigo_ibge": 3170206, "nome": "Uberlândia", "uf": "MG"},
    )
    assert ok.status_code == 403

    neg = client.post(
        f"/api/territorial/filiais/{f2['id']}/municipios",
        json={"codigo_ibge": 3106200, "nome": "Belo Horizonte", "uf": "MG"},
    )
    assert neg.status_code == 403

    neg2 = client.get(f"/api/territorial/filiais/{f2['id']}/municipios")
    assert neg2.status_code == 403


def test_sync_catalogo_direto(client):
    _bootstrap_admin(client)
    db = database.SessionLocal()
    try:
        if db.get(database.Municipio, 3170206) is None:
            db.add(database.Municipio(codigo_ibge=3170206, nome="Uberlândia", uf="MG"))
            db.commit()
        result = sincronizar_uasgs_municipio(
            db,
            codigo_municipio_ibge=3170206,
            uf="MG",
            registros=_SAMPLE_UASGS,
        )
    finally:
        db.close()
    assert result["ok"] is True
    assert result["total_catalogo"] == 2
