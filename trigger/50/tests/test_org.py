"""Organização, unidades e isolamento de escopo — Fase 1."""

from __future__ import annotations

import uuid


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _bootstrap_admin(client) -> str:
    user = _uid("adm")
    r = client.post(
        "/api/auth/bootstrap",
        json={"username": user, "password": "admin123"},
    )
    assert r.status_code == 200, r.text
    return user


def test_admin_cria_org_matriz_filial_e_vinculo(client):
    _bootstrap_admin(client)

    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "OSB Nacional", "codigo": "OSB"},
    )
    assert org.status_code == 201, org.text
    org_id = org.json()["id"]

    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz OSB", "codigo": "MTZ"},
    )
    assert matriz.status_code == 201, matriz.text
    matriz_id = matriz.json()["id"]

    filial = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial Uberlândia",
            "codigo": "UDI",
            "matriz_id": matriz_id,
        },
    )
    assert filial.status_code == 201, filial.text
    filial_id = filial.json()["id"]

    # segunda matriz ativa → 409
    dup = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Outra matriz"},
    )
    assert dup.status_code == 409

    cons = _uid("cons")
    u = client.post(
        "/api/auth/usuarios",
        json={"username": cons, "password": "consulta1", "papel": "consulta"},
    )
    assert u.status_code == 201
    uid = u.json()["id"]

    vinc = client.post(
        f"/api/org/unidades/{filial_id}/usuarios",
        json={"usuario_id": uid, "papel": "analista_filial"},
    )
    assert vinc.status_code == 201, vinc.text
    assert vinc.json()["papel"] == "analista_filial"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    ids = {x["id"] for x in me.json()["unidades"]}
    assert matriz_id in ids and filial_id in ids


def test_isolamento_filial_nao_ve_outra(client):
    _bootstrap_admin(client)

    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Iso", "codigo": "ISO"},
    ).json()
    org_id = org["id"]

    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M1"},
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

    user_a = _uid("fa")
    ua = client.post(
        "/api/auth/usuarios",
        json={"username": user_a, "password": "consulta1", "papel": "consulta"},
    ).json()
    client.post(
        f"/api/org/unidades/{f1['id']}/usuarios",
        json={"usuario_id": ua["id"], "papel": "gestor_filial"},
    )

    # login como usuário da filial A
    client.post("/api/auth/logout")
    login = client.post(
        "/api/auth/login",
        json={"username": user_a, "password": "consulta1"},
    )
    assert login.status_code == 200
    me = login.json()
    ids = {u["id"] for u in me["unidades"]}
    assert f1["id"] in ids
    assert f2["id"] not in ids
    # Escopo vem do login — sem precisar de «unidade ativa»
    assert me["escopo"]["modo"] == "filial"
    assert f1["id"] in me["escopo"]["filiais_ids"]
    assert me.get("filtro_visao") is None

    # não acessa filial B
    r = client.get(f"/api/org/unidades/{f2['id']}")
    assert r.status_code == 403

    # acessa a própria
    r2 = client.get(f"/api/org/unidades/{f1['id']}")
    assert r2.status_code == 200

    # não cria organização
    r3 = client.post("/api/org/organizacoes", json={"nome": "Hack"})
    assert r3.status_code == 403


def test_matriz_expande_filiais_no_acl(client):
    """Papel na matriz inclui filiais da org no ACL (hierarquia)."""
    _bootstrap_admin(client)
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Matriz ACL", "codigo": "MACL"},
    ).json()["id"]
    m = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    f1 = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial 1",
            "codigo": "F1",
            "matriz_id": m["id"],
        },
    ).json()
    f2 = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial 2",
            "codigo": "F2",
            "matriz_id": m["id"],
        },
    ).json()

    user_m = _uid("mat")
    um = client.post(
        "/api/auth/usuarios",
        json={"username": user_m, "password": "consulta1", "papel": "consulta"},
    ).json()
    client.post(
        f"/api/org/unidades/{m['id']}/usuarios",
        json={"usuario_id": um["id"], "papel": "admin_matriz"},
    )

    client.post("/api/auth/logout")
    me = client.post(
        "/api/auth/login",
        json={"username": user_m, "password": "consulta1"},
    ).json()
    ids = {u["id"] for u in me["unidades"]}
    assert m["id"] in ids
    assert f1["id"] in ids
    assert f2["id"] in ids
    assert me["escopo"]["modo"] == "consolidado"
    assert set(me["escopo"]["filiais_ids"]) == {f1["id"], f2["id"]}

    assert client.get(f"/api/org/unidades/{f1['id']}").status_code == 200
    assert client.get(f"/api/org/unidades/{f2['id']}").status_code == 200


def test_filtro_visao_opcional(client):
    """Filtro de visão estreita o contexto; não substitui o ACL do login."""
    _bootstrap_admin(client)
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Ctx", "codigo": "CTX"},
    ).json()["id"]
    m = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    f = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial",
            "codigo": "F",
            "matriz_id": m["id"],
        },
    ).json()

    r = client.post("/api/auth/filtro-visao", json={"unidade_id": f["id"]})
    assert r.status_code == 200
    body = r.json()
    assert body["filtro_visao"]["id"] == f["id"]
    assert body["filtro_visao"]["tipo"] == "filial"
    assert body["escopo"]["modo"] == "filial"
    # alias legado
    r2 = client.post("/api/auth/unidade-ativa", json={"unidade_id": m["id"]})
    assert r2.status_code == 200
    assert r2.json()["escopo"]["modo"] == "consolidado"


def test_filial_sem_matriz_id_usa_unica_matriz_ativa(client):
    """UI às vezes omite matriz_id; com uma matriz ativa o backend resolve."""
    _bootstrap_admin(client)
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Auto Matriz", "codigo": "AUTO"},
    ).json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz Única", "codigo": "MU"},
    ).json()

    filial = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "filial", "nome": "Filial Auto", "codigo": "FA"},
    )
    assert filial.status_code == 201, filial.text
    assert filial.json()["matriz_id"] == matriz["id"]
    assert filial.json()["tipo"] == "filial"


def test_filial_sem_matriz_falha_se_org_sem_matriz(client):
    _bootstrap_admin(client)
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Sem Matriz", "codigo": "SMTZ"},
    ).json()["id"]
    r = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "filial", "nome": "Filial Órfã", "codigo": "FO"},
    )
    assert r.status_code == 400
    assert "matriz" in r.json()["detail"].lower()


def test_unidade_aceita_cnpj_formatado(client):
    _bootstrap_admin(client)
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org CNPJ", "codigo": "CNPJORG"},
    ).json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "matriz",
            "nome": "Matriz CNPJ",
            "codigo": "MC",
            "cnpj": "12.345.678/0001-95",
        },
    )
    assert matriz.status_code == 201, matriz.text
    assert matriz.json()["cnpj"] == "12345678000195"

    patch = client.patch(
        f"/api/org/unidades/{matriz.json()['id']}",
        json={"cnpj": "98.765.432/0001-10"},
    )
    assert patch.status_code == 200, patch.text
    assert patch.json()["cnpj"] == "98765432000110"


def test_codigo_mnemonico_org_e_unidade(client):
    """Códigos só numéricos são rejeitados; PATCH altera para mnemônico (ex.: OSB)."""
    _bootstrap_admin(client)
    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Observatório Social Brasil", "codigo": "TMPORG"},
    )
    assert org.status_code == 201, org.text
    org_id = org.json()["id"]

    rejeita_org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org numérica", "codigo": "1"},
    )
    assert rejeita_org.status_code == 400
    assert "mnemônico" in rejeita_org.json()["detail"].lower()

    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Observatório Social Brasil", "codigo": "TMP"},
    )
    assert matriz.status_code == 201, matriz.text
    matriz_id = matriz.json()["id"]

    rejeita_uni = client.patch(
        f"/api/org/unidades/{matriz_id}",
        json={"codigo": "1"},
    )
    assert rejeita_uni.status_code == 400

    patch_org = client.patch(
        f"/api/org/organizacoes/{org_id}",
        json={"codigo": "osb"},
    )
    assert patch_org.status_code == 200, patch_org.text
    assert patch_org.json()["codigo"] == "OSB"

    patch_uni = client.patch(
        f"/api/org/unidades/{matriz_id}",
        json={"codigo": "osb"},
    )
    assert patch_uni.status_code == 200, patch_uni.text
    assert patch_uni.json()["codigo"] == "OSB"


def test_excluir_organizacao_com_derivacoes_e_confirmacao(client):
    """Exclusão definitiva remove org, unidades e vínculos; exige código; preserva outras orgs."""
    _bootstrap_admin(client)

    keep = client.post(
        "/api/org/organizacoes",
        json={"nome": "Observatório Social Brasil", "codigo": "OSB"},
    ).json()
    demo = client.post(
        "/api/org/organizacoes",
        json={"nome": "OSC Demonstração", "codigo": "OSB-DEMO"},
    ).json()
    demo_id = demo["id"]

    matriz = client.post(
        f"/api/org/organizacoes/{demo_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz Demo", "codigo": "MAT-DEMO"},
    ).json()
    filial = client.post(
        f"/api/org/organizacoes/{demo_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial Demo",
            "codigo": "FIL-DEMO",
            "matriz_id": matriz["id"],
        },
    ).json()
    client.post(
        f"/api/org/unidades/{matriz['id']}/usuarios",
        json={"usuario_id": 1, "papel": "admin_matriz"},
    )

    impacto = client.get(f"/api/org/organizacoes/{demo_id}/impacto-exclusao")
    assert impacto.status_code == 200, impacto.text
    body = impacto.json()
    assert body["confirmacao_requerida"] == "OSB-DEMO"
    assert body["totais"]["unidades"] == 2
    assert body["totais"]["vinculos_usuario"] >= 1

    falha = client.request(
        "DELETE",
        f"/api/org/organizacoes/{demo_id}",
        json={"confirmacao": "ERRADO"},
    )
    assert falha.status_code == 400

    ok = client.request(
        "DELETE",
        f"/api/org/organizacoes/{demo_id}",
        json={"confirmacao": "osb-demo"},
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["ok"] is True
    assert ok.json()["excluida"]["codigo"] == "OSB-DEMO"
    assert ok.json()["impacto"]["unidades"] == 2

    assert client.get(f"/api/org/organizacoes/{demo_id}").status_code == 404
    unidades_keep = client.get(f"/api/org/organizacoes/{keep['id']}/unidades")
    assert unidades_keep.status_code == 200
    assert all(u["id"] != filial["id"] for u in unidades_keep.json())

    orgs = client.get("/api/org/organizacoes").json()
    codigos = {o["codigo"] for o in orgs}
    assert "OSB" in codigos
    assert "OSB-DEMO" not in codigos
    assert client.get(f"/api/org/organizacoes/{keep['id']}").status_code == 200


def test_excluir_filial_com_derivacoes_e_confirmacao(client):
    """Exclusão de filial remove derivações de escopo; matriz permanece; exige código."""
    _bootstrap_admin(client)

    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Observatório Social Brasil", "codigo": "OSB"},
    ).json()
    org_id = org["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz OSB", "codigo": "OSB"},
    ).json()
    keep = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "OSB Uberlândia/MG",
            "codigo": "OSBUDI",
            "matriz_id": matriz["id"],
        },
    ).json()
    alvo = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial Centro",
            "codigo": "FIL-CENTRO",
            "matriz_id": matriz["id"],
        },
    ).json()
    client.post(
        f"/api/org/unidades/{alvo['id']}/usuarios",
        json={"usuario_id": 1, "papel": "gestor_filial"},
    )

    impacto = client.get(f"/api/org/unidades/{alvo['id']}/impacto-exclusao")
    assert impacto.status_code == 200, impacto.text
    body = impacto.json()
    assert body["confirmacao_requerida"] == "FIL-CENTRO"
    assert body["pode_excluir"] is True
    assert body["totais"]["vinculos_usuario"] >= 1

    falha = client.request(
        "DELETE",
        f"/api/org/unidades/{alvo['id']}",
        json={"confirmacao": "ERRADO"},
    )
    assert falha.status_code == 400

    ok = client.request(
        "DELETE",
        f"/api/org/unidades/{alvo['id']}",
        json={"confirmacao": "fil-centro"},
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["ok"] is True
    assert ok.json()["excluida"]["codigo"] == "FIL-CENTRO"

    assert client.get(f"/api/org/unidades/{alvo['id']}").status_code == 404
    restantes = client.get(f"/api/org/organizacoes/{org_id}/unidades").json()
    codigos = {u["codigo"] for u in restantes}
    assert "OSB" in codigos
    assert "OSBUDI" in codigos
    assert "FIL-CENTRO" not in codigos


def test_excluir_matriz_bloqueada_enquanto_houver_filial(client):
    """Matriz com filiais não pode ser excluída — filiais primeiro."""
    _bootstrap_admin(client)
    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Matriz Block", "codigo": "OMB"},
    ).json()
    matriz = client.post(
        f"/api/org/organizacoes/{org['id']}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "MAT-OMB"},
    ).json()
    client.post(
        f"/api/org/organizacoes/{org['id']}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial",
            "codigo": "FIL-OMB",
            "matriz_id": matriz["id"],
        },
    )

    impacto = client.get(f"/api/org/unidades/{matriz['id']}/impacto-exclusao")
    assert impacto.status_code == 200
    assert impacto.json()["pode_excluir"] is False
    assert impacto.json()["totais"]["filiais_dependentes"] == 1

    bloqueado = client.request(
        "DELETE",
        f"/api/org/unidades/{matriz['id']}",
        json={"confirmacao": "MAT-OMB"},
    )
    assert bloqueado.status_code == 409


def test_editar_e_excluir_vinculo_usuario_unidade(client):
    """PATCH altera papel; DELETE soft desativa; DELETE permanente remove o registro."""
    _bootstrap_admin(client)
    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Vinculo CRUD", "codigo": "OVC"},
    ).json()
    matriz = client.post(
        f"/api/org/organizacoes/{org['id']}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "MTZ-OVC"},
    ).json()
    filial = client.post(
        f"/api/org/organizacoes/{org['id']}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial",
            "codigo": "FIL-OVC",
            "matriz_id": matriz["id"],
        },
    ).json()
    user = client.post(
        "/api/auth/usuarios",
        json={
            "username": _uid("vinc"),
            "password": "consulta1",
            "papel": "consulta",
        },
    ).json()
    uid = user["id"]
    filial_id = filial["id"]

    criado = client.post(
        f"/api/org/unidades/{filial_id}/usuarios",
        json={"usuario_id": uid, "papel": "analista_filial"},
    )
    assert criado.status_code == 201, criado.text

    # papel de matriz em filial → 400
    bad = client.patch(
        f"/api/org/unidades/{filial_id}/usuarios/{uid}",
        json={"papel": "admin_matriz"},
    )
    assert bad.status_code == 400

    patched = client.patch(
        f"/api/org/unidades/{filial_id}/usuarios/{uid}",
        json={"papel": "gestor_filial"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["papel"] == "gestor_filial"
    assert patched.json()["ativo"] is True

    soft = client.delete(f"/api/org/unidades/{filial_id}/usuarios/{uid}")
    assert soft.status_code == 200
    lista = client.get(f"/api/org/unidades/{filial_id}/usuarios")
    assert lista.status_code == 200
    row = next(v for v in lista.json() if v["usuario_id"] == uid)
    assert row["ativo"] is False

    reativado = client.patch(
        f"/api/org/unidades/{filial_id}/usuarios/{uid}",
        json={"ativo": True},
    )
    assert reativado.status_code == 200
    assert reativado.json()["ativo"] is True

    hard = client.delete(
        f"/api/org/unidades/{filial_id}/usuarios/{uid}?permanente=true"
    )
    assert hard.status_code == 200
    assert hard.json().get("excluido", {}).get("usuario_id") == uid
    lista2 = client.get(f"/api/org/unidades/{filial_id}/usuarios")
    assert all(v["usuario_id"] != uid for v in lista2.json())

    # soft delete de inexistente → 404
    missing = client.delete(f"/api/org/unidades/{filial_id}/usuarios/{uid}")
    assert missing.status_code == 404
