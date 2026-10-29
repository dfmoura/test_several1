"""Configuração herdada global → matriz → filial — Fase 3."""

from __future__ import annotations

import uuid


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


def _matriz_filial(client) -> tuple[int, int]:
    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Cfg", "codigo": _uid("CF").upper()[:8]},
    ).json()
    matriz = client.post(
        f"/api/org/organizacoes/{org['id']}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    filial = client.post(
        f"/api/org/organizacoes/{org['id']}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial",
            "codigo": "F",
            "matriz_id": matriz["id"],
        },
    ).json()
    return matriz["id"], filial["id"]


def _valor(efetiva: list, chave: str) -> dict:
    return next(r for r in efetiva if r["chave"] == chave)


def test_seed_parametros_e_efetiva_catalogo(client):
    _bootstrap(client)
    params = client.get("/api/config/parametros")
    assert params.status_code == 200
    chaves = {p["chave"] for p in params.json()}
    assert "coleta.periodo_dias" in chaves
    assert "coleta.incremental" in chaves

    efetiva = client.get("/api/config/efetiva")
    assert efetiva.status_code == 200
    periodo = _valor(efetiva.json(), "coleta.periodo_dias")
    assert periodo["origem"] == "catalogo"
    assert periodo["valor"] == "365"


def test_matriz_altera_e_filial_herda(client):
    _bootstrap(client)
    matriz_id, filial_id = _matriz_filial(client)

    r = client.put(
        "/api/config/valores",
        json={
            "escopo": "matriz",
            "unidade_id": matriz_id,
            "chave": "coleta.periodo_dias",
            "valor": "180",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["valor"] == "180"

    # Filial sem exceção → herda 180 da matriz
    efetiva = client.get(f"/api/config/efetiva?unidade_id={filial_id}")
    assert efetiva.status_code == 200
    periodo = _valor(efetiva.json(), "coleta.periodo_dias")
    assert periodo["valor"] == "180"
    assert periodo["origem"] == "matriz"

    # Alterar matriz de novo → filial reflete (herança, não cópia)
    client.put(
        "/api/config/valores",
        json={
            "escopo": "matriz",
            "unidade_id": matriz_id,
            "chave": "coleta.periodo_dias",
            "valor": "90",
        },
    )
    efetiva2 = client.get(f"/api/config/efetiva?unidade_id={filial_id}")
    assert _valor(efetiva2.json(), "coleta.periodo_dias")["valor"] == "90"


def test_filial_so_sobrescreve_se_autorizada_e_param_permitido(client):
    _bootstrap(client)
    matriz_id, filial_id = _matriz_filial(client)

    client.put(
        "/api/config/valores",
        json={
            "escopo": "matriz",
            "unidade_id": matriz_id,
            "chave": "coleta.periodo_dias",
            "valor": "120",
        },
    )

    # Sem autorização → 403
    neg = client.put(
        "/api/config/valores",
        json={
            "escopo": "filial",
            "unidade_id": filial_id,
            "chave": "coleta.periodo_dias",
            "valor": "30",
        },
    )
    assert neg.status_code == 403

    auth = client.post(
        f"/api/config/filiais/{filial_id}/autorizar-excecoes",
        json={"autorizar": True},
    )
    assert auth.status_code == 200
    assert auth.json()["excecoes_config_autorizadas"] is True

    # Parametro que NÃO permite exceção
    neg2 = client.put(
        "/api/config/valores",
        json={
            "escopo": "filial",
            "unidade_id": filial_id,
            "chave": "coleta.incremental",
            "valor": "false",
        },
    )
    assert neg2.status_code == 403

    # Parametro permitido
    ok = client.put(
        "/api/config/valores",
        json={
            "escopo": "filial",
            "unidade_id": filial_id,
            "chave": "coleta.periodo_dias",
            "valor": "30",
        },
    )
    assert ok.status_code == 200

    efetiva = client.get(f"/api/config/efetiva?unidade_id={filial_id}")
    periodo = _valor(efetiva.json(), "coleta.periodo_dias")
    assert periodo["valor"] == "30"
    assert periodo["origem"] == "filial"

    # Matriz muda — filial com exceção NÃO acompanha
    client.put(
        "/api/config/valores",
        json={
            "escopo": "matriz",
            "unidade_id": matriz_id,
            "chave": "coleta.periodo_dias",
            "valor": "200",
        },
    )
    efetiva2 = client.get(f"/api/config/efetiva?unidade_id={filial_id}")
    assert _valor(efetiva2.json(), "coleta.periodo_dias")["valor"] == "30"

    # Limpar exceção → volta a herdar 200
    limpar = client.delete(f"/api/config/filiais/{filial_id}/excecoes/coleta.periodo_dias")
    assert limpar.status_code == 200
    efetiva3 = client.get(f"/api/config/efetiva?unidade_id={filial_id}")
    assert _valor(efetiva3.json(), "coleta.periodo_dias")["valor"] == "200"
    assert _valor(efetiva3.json(), "coleta.periodo_dias")["origem"] == "matriz"


def test_global_sobre_catalogo(client):
    _bootstrap(client)
    r = client.put(
        "/api/config/valores",
        json={"escopo": "global", "chave": "coleta.rate_limit_rpm", "valor": "45"},
    )
    assert r.status_code == 200
    efetiva = client.get("/api/config/efetiva")
    row = _valor(efetiva.json(), "coleta.rate_limit_rpm")
    assert row["valor"] == "45"
    assert row["origem"] == "global"
