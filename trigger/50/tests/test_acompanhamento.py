"""Acompanhamento pessoal usuário↔contratação — preferência, fora do ACL."""

from __future__ import annotations

import uuid
from datetime import date

from app.compras.sync_contratacoes import sincronizar_contratacoes_uasg
from app.database import FilialUasg, Orgao, Uasg


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _bootstrap_admin(client) -> None:
    r = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert r.status_code == 200


def _org_matriz_filial(client, db) -> dict:
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Acomp", "codigo": _uid("OA").upper()[:8]},
    ).json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    filial = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial Acomp",
            "codigo": "FAC",
            "matriz_id": matriz["id"],
        },
    ).json()

    orgao = Orgao(codigo_orgao=9101, nome_orgao="ORGAO ACOMP")
    db.add(orgao)
    db.flush()
    uasg = Uasg(
        codigo_uasg="811111",
        orgao_id=orgao.id,
        nome_uasg="UASG ACOMP",
        sigla_uf="MG",
        codigo_municipio_ibge=3170206,
    )
    db.add(uasg)
    db.flush()
    db.add(FilialUasg(unidade_id=filial["id"], uasg_id=uasg.id, ativo=True))
    db.commit()

    contratacao = {
        "idCompra": "compra-acomp-001",
        "unidadeOrgaoCodigoUnidade": "811111",
        "unidadeOrgaoNomeUnidade": "UASG ACOMP",
        "anoCompraPncp": 2024,
        "numeroCompra": "1/2024",
        "codigoModalidade": 5,
        "modalidadeNome": "Pregão - Eletrônico",
        "objetoCompra": "Material de teste acompanhamento",
        "situacaoCompraNomePncp": "Divulgada no PNCP",
        "numeroControlePNCP": "00000000000191-1-000001/2024",
        "processo": "ACOMP-1",
        "valorTotalEstimado": 1000.0,
        "valorTotalHomologado": 900.0,
        "dataPublicacaoPncp": "2024-03-01T10:00:00",
        "orgaoEntidadeCnpj": "00000000000191",
        "sequencialCompraPncp": 1,
        "existeResultado": True,
    }
    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg="811111",
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[contratacao],
        itens=[],
        resultados=[],
        incluir_itens=False,
        incluir_resultados=False,
    )
    return {"matriz": matriz, "filial": filial, "codigo_uasg": "811111"}


def test_associar_exige_visao_filial(client, db):
    _bootstrap_admin(client)
    ctx = _org_matriz_filial(client, db)

    # Sem filtro = admin plataforma / consolidado → 403
    lista = client.get("/api/compras/contratacoes")
    # pode ser 403 (exige filial) — garante que não há associação em consolidado
    r = client.post("/api/acompanhamento/contratacoes/1")
    assert r.status_code == 403, r.text

    # Visão matriz (consolidado) também bloqueia
    r_m = client.post(
        "/api/auth/filtro-visao", json={"unidade_id": ctx["matriz"]["id"]}
    )
    assert r_m.status_code == 200
    assert r_m.json()["escopo"]["modo"] == "consolidado"
    assert client.post("/api/acompanhamento/contratacoes/1").status_code == 403


def test_associar_filtrar_e_cobertura_rede(client, db):
    _bootstrap_admin(client)
    ctx = _org_matriz_filial(client, db)
    filial_id = ctx["filial"]["id"]

    assert (
        client.post("/api/auth/filtro-visao", json={"unidade_id": filial_id}).status_code
        == 200
    )

    lista = client.get("/api/compras/contratacoes?periodo=tudo")
    assert lista.status_code == 200, lista.text
    items = lista.json()["items"]
    assert len(items) == 1
    cid = items[0]["id"]
    assert items[0]["acompanhada_por_mim"] is False

    # Associar
    assoc = client.post(f"/api/acompanhamento/contratacoes/{cid}")
    assert assoc.status_code == 200, assoc.text
    assert assoc.json()["ativo"] is True
    assert assoc.json()["contratacao_id"] == cid
    assert assoc.json()["unidade_id"] == filial_id

    # Idempotente (reativa)
    assoc2 = client.post(f"/api/acompanhamento/contratacoes/{cid}")
    assert assoc2.status_code == 200
    assert assoc2.json()["ativo"] is True

    det = client.get(f"/api/compras/contratacoes/{cid}")
    assert det.status_code == 200
    assert det.json()["acompanhada_por_mim"] is True
    assert det.json()["responsavel"] is not None
    assert det.json()["responsavel"]["id"]
    assert det.json()["responsavel"]["username"]

    minhas = client.get(
        "/api/compras/contratacoes?periodo=tudo&acompanhamento=minhas"
    )
    assert minhas.status_code == 200
    assert minhas.json()["total"] == 1
    assert minhas.json()["items"][0]["acompanhada_por_mim"] is True

    sem = client.get("/api/compras/contratacoes?periodo=tudo&acompanhamento=sem")
    assert sem.status_code == 200
    assert sem.json()["total"] == 0

    ind = client.get("/api/consultas/indicadores?periodo=tudo")
    assert ind.status_code == 200
    assert ind.json()["lente"] == "unidade"
    assert ind.json()["acompanhamentos_meus"] == 1
    assert ind.json()["contratacoes_com_acompanhamento"] == 1
    assert ind.json()["contratacoes_sem_acompanhamento"] == 0

    com = client.get("/api/compras/contratacoes?periodo=tudo&acompanhamento=com")
    assert com.status_code == 200
    assert com.json()["total"] == 1
    sem_resp = client.get(
        "/api/compras/contratacoes?periodo=tudo&acompanhamento=sem_resp"
    )
    assert sem_resp.status_code == 200
    assert sem_resp.json()["total"] == 0

    # Cobertura na rede (visão matriz)
    assert (
        client.post(
            "/api/auth/filtro-visao", json={"unidade_id": ctx["matriz"]["id"]}
        ).status_code
        == 200
    )
    comp = client.get("/api/consultas/comparativos?periodo=tudo")
    assert comp.status_code == 200
    assert comp.json()["lente"] == "rede"
    por = {r["filial_id"]: r for r in comp.json()["por_filial"]}
    assert filial_id in por
    assert por[filial_id]["com_acompanhamento"] == 1
    assert por[filial_id]["sem_acompanhamento"] == 0

    # Volta à filial e remove
    assert (
        client.post("/api/auth/filtro-visao", json={"unidade_id": filial_id}).status_code
        == 200
    )
    rem = client.delete(f"/api/acompanhamento/contratacoes/{cid}")
    assert rem.status_code == 200
    assert rem.json()["ativo"] is False

    minhas2 = client.get(
        "/api/compras/contratacoes?periodo=tudo&acompanhamento=minhas"
    )
    assert minhas2.json()["total"] == 0
    sem2 = client.get("/api/compras/contratacoes?periodo=tudo&acompanhamento=sem")
    assert sem2.json()["total"] == 1


def test_usuario_filial_associa_somente_seu_escopo(client, db):
    _bootstrap_admin(client)
    ctx = _org_matriz_filial(client, db)
    filial_id = ctx["filial"]["id"]

    user = _uid("anal")
    uf = client.post(
        "/api/auth/usuarios",
        json={"username": user, "password": "consulta1", "papel": "consulta"},
    ).json()
    assert (
        client.post(
            f"/api/org/unidades/{filial_id}/usuarios",
            json={"usuario_id": uf["id"], "papel": "analista_filial"},
        ).status_code
        == 201
    )

    # Admin pega id da contratação em visão filial
    assert (
        client.post("/api/auth/filtro-visao", json={"unidade_id": filial_id}).status_code
        == 200
    )
    cid = client.get("/api/compras/contratacoes?periodo=tudo").json()["items"][0]["id"]

    client.post("/api/auth/logout")
    assert (
        client.post(
            "/api/auth/login", json={"username": user, "password": "consulta1"}
        ).status_code
        == 200
    )
    # Login só de filial → escopo filial automático
    me = client.get("/api/auth/me").json()
    assert me["escopo"]["modo"] == "filial"

    assoc = client.post(f"/api/acompanhamento/contratacoes/{cid}")
    assert assoc.status_code == 200, assoc.text
    assert assoc.json()["ativo"] is True

    ind = client.get("/api/consultas/indicadores?periodo=tudo")
    assert ind.status_code == 200
    assert ind.json()["acompanhamentos_meus"] == 1


def test_assumir_transfere_responsavel_unico(client, db):
    """Um responsável ativo por contratação na filial — Assumir transfere."""
    _bootstrap_admin(client)
    ctx = _org_matriz_filial(client, db)
    filial_id = ctx["filial"]["id"]

    user_b = _uid("analb")
    uf = client.post(
        "/api/auth/usuarios",
        json={"username": user_b, "password": "consulta1", "papel": "consulta"},
    ).json()
    assert (
        client.post(
            f"/api/org/unidades/{filial_id}/usuarios",
            json={"usuario_id": uf["id"], "papel": "analista_filial"},
        ).status_code
        == 201
    )

    assert (
        client.post("/api/auth/filtro-visao", json={"unidade_id": filial_id}).status_code
        == 200
    )
    cid = client.get("/api/compras/contratacoes?periodo=tudo").json()["items"][0]["id"]
    admin_me = client.get("/api/auth/me").json()
    admin_id = admin_me["id"]

    assoc = client.post(f"/api/acompanhamento/contratacoes/{cid}")
    assert assoc.status_code == 200
    assert assoc.json()["responsavel"]["id"] == admin_id

    client.post("/api/auth/logout")
    assert (
        client.post(
            "/api/auth/login", json={"username": user_b, "password": "consulta1"}
        ).status_code
        == 200
    )

    lista = client.get("/api/compras/contratacoes?periodo=tudo")
    assert lista.status_code == 200
    item = lista.json()["items"][0]
    assert item["acompanhada_por_mim"] is False
    assert item["responsavel"]["id"] == admin_id
    assert item["responsavel"]["username"]

    assumir = client.post(f"/api/acompanhamento/contratacoes/{cid}")
    assert assumir.status_code == 200, assumir.text
    assert assumir.json()["ativo"] is True
    assert assumir.json()["responsavel"]["id"] == uf["id"]
    assert assumir.json()["transferido_de"]["id"] == admin_id

    det = client.get(f"/api/compras/contratacoes/{cid}")
    assert det.json()["acompanhada_por_mim"] is True
    assert det.json()["responsavel"]["id"] == uf["id"]

    # Admin não é mais responsável
    client.post("/api/auth/logout")
    assert (
        client.post(
            "/api/auth/login",
            json={"username": admin_me["username"], "password": "admin123"},
        ).status_code
        == 200
    )
    assert (
        client.post("/api/auth/filtro-visao", json={"unidade_id": filial_id}).status_code
        == 200
    )
    det_admin = client.get(f"/api/compras/contratacoes/{cid}")
    assert det_admin.json()["acompanhada_por_mim"] is False
    assert det_admin.json()["responsavel"]["id"] == uf["id"]
