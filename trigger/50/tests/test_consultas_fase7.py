"""Fase 7 — indicadores por escopo batem com o banco; isolamento filial."""

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


def _setup_duas_filiais(client, db) -> tuple[int, int, str, str]:
    """Filial A monitora UASG 111111; Filial B monitora 222222."""
    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Ind", "codigo": _uid("OI").upper()[:8]},
    )
    assert org.status_code == 201, org.text
    org_id = org.json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    )
    assert matriz.status_code == 201, matriz.text
    fa = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial A",
            "codigo": "FA",
            "matriz_id": matriz.json()["id"],
        },
    )
    assert fa.status_code == 201, fa.text
    fb = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial B",
            "codigo": "FB",
            "matriz_id": matriz.json()["id"],
        },
    )
    assert fb.status_code == 201, fb.text

    orgao = Orgao(codigo_orgao=9300, nome_orgao="ORG")
    db.add(orgao)
    db.flush()
    ua = Uasg(codigo_uasg="111111", orgao_id=orgao.id, nome_uasg="UASG A")
    ub = Uasg(codigo_uasg="222222", orgao_id=orgao.id, nome_uasg="UASG B")
    db.add(ua)
    db.add(ub)
    db.flush()
    db.add(FilialUasg(unidade_id=fa.json()["id"], uasg_id=ua.id, ativo=True))
    db.add(FilialUasg(unidade_id=fb.json()["id"], uasg_id=ub.id, ativo=True))
    db.commit()
    return fa.json()["id"], fb.json()["id"], "111111", "222222"


_CONTRATO_A = {
    "idCompra": "compra-a-001",
    "unidadeOrgaoCodigoUnidade": "111111",
    "unidadeOrgaoNomeUnidade": "UASG A",
    "anoCompraPncp": 2024,
    "objetoCompra": "Objeto exclusivo filial A",
    "situacaoCompraNomePncp": "Divulgada",
    "numeroControlePNCP": "A-1",
    "codigoModalidade": 5,
    "modalidadeNome": "Pregão - Eletrônico",
    "valorTotalEstimado": 1000.0,
    "valorTotalHomologado": 900.0,
}

_CONTRATO_B = {
    "idCompra": "compra-b-001",
    "unidadeOrgaoCodigoUnidade": "222222",
    "unidadeOrgaoNomeUnidade": "UASG B",
    "anoCompraPncp": 2024,
    "objetoCompra": "Objeto exclusivo filial B",
    "situacaoCompraNomePncp": "Divulgada",
    "numeroControlePNCP": "B-1",
    "codigoModalidade": 5,
    "modalidadeNome": "Pregão - Eletrônico",
    "valorTotalEstimado": 2000.0,
    "valorTotalHomologado": 1800.0,
}

_ITEM_A = {
    "idCompraItem": "item-a-001",
    "idCompra": "compra-a-001",
    "numeroItemPncp": 1,
    "descricaoResumida": "Item A",
    "temResultado": True,
}

_ITEM_B = {
    "idCompraItem": "item-b-001",
    "idCompra": "compra-b-001",
    "numeroItemPncp": 1,
    "descricaoResumida": "Item B",
    "temResultado": True,
}

_RESULTADO_A = {
    "idCompraItem": "item-a-001",
    "idCompra": "compra-a-001",
    "sequencialResultado": 1,
    "niFornecedor": "11111111000111",
    "nomeRazaoSocialFornecedor": "FORN A ME",
    "situacaoCompraItemResultadoNome": "Homologado",
    "porteFornecedorNome": "ME",
}

_RESULTADO_B = {
    "idCompraItem": "item-b-001",
    "idCompra": "compra-b-001",
    "sequencialResultado": 1,
    "niFornecedor": "22222222000122",
    "nomeRazaoSocialFornecedor": "FORN B EPP",
    "situacaoCompraItemResultadoNome": "Homologado",
    "porteFornecedorNome": "EPP",
}


def test_indicadores_batem_com_banco_e_isolamento(client, db):
    _bootstrap_admin(client)
    fa_id, fb_id, cod_a, cod_b = _setup_duas_filiais(client, db)

    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=cod_a,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[_CONTRATO_A],
        itens=[],
        resultados=[],
        incluir_itens=False,
        incluir_resultados=False,
    )
    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=cod_b,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[_CONTRATO_B],
        itens=[],
        resultados=[],
        incluir_itens=False,
        incluir_resultados=False,
    )

    # Filial A
    assert client.post("/api/auth/unidade-ativa", json={"unidade_id": fa_id}).status_code == 200
    ind_a = client.get("/api/consultas/indicadores")
    assert ind_a.status_code == 200
    body_a = ind_a.json()
    assert body_a["contratacoes"] == 1
    assert body_a["contratacoes_homologadas"] == 0  # sync sem resultados
    assert body_a["uasgs_monitoradas"] == 1

    lista_a = client.get("/api/consultas/contratacoes")
    assert lista_a.status_code == 200
    ids_a = {c["id_compra"] for c in lista_a.json()}
    assert ids_a == {"compra-a-001"}
    assert body_a["contratacoes"] == len(lista_a.json())

    # Filial B — não vê A
    assert client.post("/api/auth/unidade-ativa", json={"unidade_id": fb_id}).status_code == 200
    ind_b = client.get("/api/consultas/indicadores").json()
    assert ind_b["contratacoes"] == 1
    lista_b = client.get("/api/consultas/contratacoes").json()
    ids_b = {c["id_compra"] for c in lista_b}
    assert ids_b == {"compra-b-001"}
    assert "compra-a-001" not in ids_b


def test_status_sem_power_bi(client):
    _bootstrap_admin(client)
    st = client.get("/api/consultas/status")
    assert st.status_code == 200
    assert st.json()["analytics"] == "nativo"
    # garantia explícita: payload não menciona Power BI
    raw = st.text.lower()
    assert "power" not in raw
    assert "powerbi" not in raw


def test_onboarding_api(client, db):
    _bootstrap_admin(client)
    r = client.get("/api/consultas/onboarding")
    assert r.status_code == 200
    body = r.json()
    assert "passos" in body
    assert body["total"] == 4
    assert body["concluidos"] >= 0


def test_lentes_matriz_rede_e_filial_unidade(client, db):
    """Matriz → lente rede + por_filial; filial → lente unidade sem por_filial."""
    _bootstrap_admin(client)
    fa_id, fb_id, cod_a, cod_b = _setup_duas_filiais(client, db)

    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=cod_a,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[_CONTRATO_A],
        itens=[_ITEM_A],
        resultados=[_RESULTADO_A],
    )
    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=cod_b,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[_CONTRATO_B],
        itens=[_ITEM_B],
        resultados=[_RESULTADO_B],
    )

    # Descobre matriz_id via org
    orgs = client.get("/api/org/organizacoes")
    assert orgs.status_code == 200
    org_id = orgs.json()[0]["id"]
    unidades = client.get(f"/api/org/organizacoes/{org_id}/unidades")
    assert unidades.status_code == 200
    matriz = next(u for u in unidades.json() if u["tipo"] == "matriz")

    user_m = _uid("mtx")
    user_f = _uid("fil")
    um = client.post(
        "/api/auth/usuarios",
        json={"username": user_m, "password": "consulta1", "papel": "consulta"},
    ).json()
    uf = client.post(
        "/api/auth/usuarios",
        json={"username": user_f, "password": "consulta1", "papel": "consulta"},
    ).json()
    assert (
        client.post(
            f"/api/org/unidades/{matriz['id']}/usuarios",
            json={"usuario_id": um["id"], "papel": "gestor_matriz"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/api/org/unidades/{fa_id}/usuarios",
            json={"usuario_id": uf["id"], "papel": "analista_filial"},
        ).status_code
        == 201
    )

    # —— Usuário matriz: lente rede, vê as duas filiais ——
    client.post("/api/auth/logout")
    assert (
        client.post(
            "/api/auth/login",
            json={"username": user_m, "password": "consulta1"},
        ).status_code
        == 200
    )
    ind_m = client.get("/api/consultas/indicadores").json()
    assert ind_m["lente"] == "rede"
    assert ind_m["escopo_modo"] == "consolidado"
    assert ind_m["contratacoes"] == 2
    assert ind_m["contratacoes_homologadas"] == 2
    assert ind_m["valor_contratacoes"] == 3000.0
    assert ind_m["valor_contratacoes_homologadas"] == 2700.0
    assert ind_m["filiais_no_escopo"] == 2

    comp_m = client.get("/api/consultas/comparativos").json()
    assert comp_m["lente"] == "rede"
    assert comp_m["power_bi"] is False
    assert "por_situacao" in comp_m
    assert "por_porte" in comp_m
    # Contratado × Homologado nas dimensões de contratação
    assert len(comp_m["por_modalidade"]) >= 1
    mod = next(r for r in comp_m["por_modalidade"] if "Pregão" in (r["modalidade"] or ""))
    assert mod["total"] == 2
    assert mod["homologadas"] == 2
    assert mod["valor"] == 3000.0
    assert mod["valor_homologado"] == 2700.0
    sit = next(r for r in comp_m["por_situacao"] if r["situacao"] == "Divulgada")
    assert sit["total"] == 2 and sit["homologadas"] == 2
    assert sit["valor"] == 3000.0 and sit["valor_homologado"] == 2700.0
    portes_m = {r["porte"]: r for r in comp_m["por_porte"]}
    assert portes_m["ME"]["total"] == 1
    assert portes_m["EPP"]["total"] == 1
    assert portes_m["ME"].get("serie") == "homologado"
    assert portes_m["ME"].get("unidade") == "contratacao"
    # Valor = homologado da contratação (não soma de itens)
    assert portes_m["ME"]["valor"] == 900.0
    assert portes_m["EPP"]["valor"] == 1800.0
    assert sum(r["total"] for r in comp_m["por_porte"]) == 2
    assert "homologadas" not in portes_m["ME"]  # porte = série única
    assert len(comp_m["por_filial"]) == 2
    por_filial = {r["filial_nome"]: r for r in comp_m["por_filial"]}
    assert por_filial["Filial A"]["total"] == 1
    assert por_filial["Filial B"]["total"] == 1
    # Volume × homologação × valores + território.
    assert por_filial["Filial A"]["valor"] == 1000.0
    assert por_filial["Filial A"]["valor_homologado"] == 900.0
    assert por_filial["Filial B"]["valor"] == 2000.0
    assert por_filial["Filial B"]["valor_homologado"] == 1800.0
    for nome in ("Filial A", "Filial B"):
        row = por_filial[nome]
        assert "homologadas" in row and "municipios" in row
        assert "valor" in row and "valor_homologado" in row
        assert "itens" not in row and "resultados" not in row
        assert "filiais_no_escopo" not in row
        assert row["homologadas"] == 1
        assert row["municipios"] == 0
        assert row["uasgs"] == 1
        # Sede geográfica (mapa da rede) — sem município associado → nulos
        assert "uf" in row and "ibge" in row and "municipio_sede" in row
        assert row["uf"] is None and row["ibge"] is None
        assert row["municipio_sede"] is None

    # —— Usuário filial A: lente unidade, só A ——
    client.post("/api/auth/logout")
    assert (
        client.post(
            "/api/auth/login",
            json={"username": user_f, "password": "consulta1"},
        ).status_code
        == 200
    )
    ind_f = client.get("/api/consultas/indicadores").json()
    assert ind_f["lente"] == "unidade"
    assert ind_f["escopo_modo"] == "filial"
    assert ind_f["contratacoes"] == 1
    assert ind_f["contratacoes_homologadas"] == 1
    assert ind_f["valor_contratacoes"] == 1000.0
    assert ind_f["valor_contratacoes_homologadas"] == 900.0

    comp_f = client.get("/api/consultas/comparativos").json()
    assert comp_f["lente"] == "unidade"
    assert comp_f["por_filial"] == []
    uasg_a = next(r for r in comp_f["por_uasg"] if r["codigo_uasg"] == cod_a)
    assert uasg_a["total"] == 1
    assert uasg_a["homologadas"] == 1
    assert uasg_a["valor"] == 1000.0
    assert uasg_a["valor_homologado"] == 900.0
    assert uasg_a["nome_uasg"] == "UASG A"
    assert not any(r.get("codigo_uasg") == cod_b for r in comp_f["por_uasg"])
    portes_f = {r["porte"]: r["total"] for r in comp_f["por_porte"]}
    assert portes_f.get("ME") == 1
    assert "EPP" not in portes_f  # porte da filial B isolado
    lista = client.get("/api/consultas/contratacoes").json()
    assert {c["id_compra"] for c in lista} == {"compra-a-001"}


def test_por_porte_agrega_por_contratacao_sem_duplicar(client, db):
    """Vários itens 07.3 na mesma compra → 1 contagem; dominante por valor."""
    _bootstrap_admin(client)
    fa_id, _fb_id, cod_a, _cod_b = _setup_duas_filiais(client, db)

    contrato = {
        **_CONTRATO_A,
        "idCompra": "compra-porte-multi",
        "valorTotalEstimado": 5000.0,
        "valorTotalHomologado": 4800.0,
    }
    itens = [
        {
            "idCompraItem": "item-pm-1",
            "idCompra": "compra-porte-multi",
            "numeroItemPncp": 1,
            "descricaoResumida": "Item ME baixo",
            "temResultado": True,
        },
        {
            "idCompraItem": "item-pm-2",
            "idCompra": "compra-porte-multi",
            "numeroItemPncp": 2,
            "descricaoResumida": "Item Demais alto",
            "temResultado": True,
        },
        {
            "idCompraItem": "item-pm-3",
            "idCompra": "compra-porte-multi",
            "numeroItemPncp": 3,
            "descricaoResumida": "Item ME medio",
            "temResultado": True,
        },
    ]
    resultados = [
        {
            "idCompraItem": "item-pm-1",
            "idCompra": "compra-porte-multi",
            "sequencialResultado": 1,
            "niFornecedor": "11111111000111",
            "nomeRazaoSocialFornecedor": "FORN ME",
            "situacaoCompraItemResultadoNome": "Homologado",
            "porteFornecedorNome": "ME",
            "valorTotalHomologado": 500.0,
        },
        {
            "idCompraItem": "item-pm-2",
            "idCompra": "compra-porte-multi",
            "sequencialResultado": 1,
            "niFornecedor": "33333333000133",
            "nomeRazaoSocialFornecedor": "FORN DEMAIS",
            "situacaoCompraItemResultadoNome": "Homologado",
            "porteFornecedorNome": "Demais",
            "valorTotalHomologado": 3500.0,
        },
        {
            "idCompraItem": "item-pm-3",
            "idCompra": "compra-porte-multi",
            "sequencialResultado": 1,
            "niFornecedor": "11111111000111",
            "nomeRazaoSocialFornecedor": "FORN ME",
            "situacaoCompraItemResultadoNome": "Homologado",
            "porteFornecedorNome": "ME",
            "valorTotalHomologado": 800.0,
        },
    ]
    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=cod_a,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[contrato],
        itens=itens,
        resultados=resultados,
    )
    assert (
        client.post("/api/auth/unidade-ativa", json={"unidade_id": fa_id}).status_code
        == 200
    )
    comp = client.get("/api/consultas/comparativos").json()
    portes = {r["porte"]: r for r in comp["por_porte"]}
    # 3 itens, mas 1 contratação → dominante Demais (R$ 3500 > ME 1300)
    assert sum(r["total"] for r in comp["por_porte"]) == 1
    assert portes["Demais"]["total"] == 1
    assert portes["Demais"]["valor"] == 4800.0
    assert portes["Demais"]["unidade"] == "contratacao"
    assert "ME" not in portes
    ind = client.get("/api/consultas/indicadores").json()
    assert sum(r["total"] for r in comp["por_porte"]) == ind["contratacoes_homologadas"]
    assert round(sum(r["valor"] for r in comp["por_porte"]), 2) == round(
        ind["valor_contratacoes_homologadas"], 2
    )


def test_por_porte_bate_com_kpi_homologadas_incluindo_sem_07_3(client, db):
    """Flag homologado sem item 07.3 → Não informado; soma = KPI."""
    _bootstrap_admin(client)
    fa_id, _fb_id, cod_a, _cod_b = _setup_duas_filiais(client, db)

    # Com resultado ME
    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=cod_a,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[_CONTRATO_A],
        itens=[_ITEM_A],
        resultados=[_RESULTADO_A],
    )
    # Homologada só por flag, sem itens 07.3
    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=cod_a,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[
            {
                "idCompra": "compra-flag-only",
                "unidadeOrgaoCodigoUnidade": cod_a,
                "anoCompraPncp": 2024,
                "objetoCompra": "Homologada sem 07.3",
                "situacaoCompraNomePncp": "Divulgada",
                "codigoModalidade": 5,
                "modalidadeNome": "Pregão - Eletrônico",
                "valorTotalEstimado": 2000.0,
                "valorTotalHomologado": 1800.0,
                "existeResultado": True,
            }
        ],
        itens=[],
        resultados=[],
        incluir_itens=False,
        incluir_resultados=False,
    )
    assert (
        client.post("/api/auth/unidade-ativa", json={"unidade_id": fa_id}).status_code
        == 200
    )
    ind = client.get("/api/consultas/indicadores").json()
    comp = client.get("/api/consultas/comparativos").json()
    portes = {r["porte"]: r for r in comp["por_porte"]}
    assert ind["contratacoes_homologadas"] == 2
    assert ind["valor_contratacoes_homologadas"] == 2700.0  # 900 + 1800
    assert sum(r["total"] for r in comp["por_porte"]) == 2
    assert round(sum(r["valor"] for r in comp["por_porte"]), 2) == 2700.0
    assert portes["ME"]["total"] == 1
    assert portes["ME"]["valor"] == 900.0
    assert portes["Não informado"]["total"] == 1
    assert portes["Não informado"]["valor"] == 1800.0
