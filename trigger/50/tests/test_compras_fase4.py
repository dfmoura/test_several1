"""Fase 4 — sync 07 mockável + consultas por escopo."""

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


def _filial_com_uasg(client, db) -> tuple[int, str]:
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Compras", "codigo": _uid("OC").upper()[:8]},
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

    orgao = Orgao(codigo_orgao=9001, nome_orgao="PREFEITURA TESTE")
    db.add(orgao)
    db.flush()
    uasg = Uasg(
        codigo_uasg="926922",
        orgao_id=orgao.id,
        nome_uasg="PMU TESTE",
        sigla_uf="MG",
        codigo_municipio_ibge=3170206,
    )
    db.add(uasg)
    db.flush()
    db.add(
        FilialUasg(unidade_id=filial["id"], uasg_id=uasg.id, ativo=True)
    )
    db.commit()

    # filtro de visão opcional (admin) — estreita para a filial do fixture
    r = client.post("/api/auth/filtro-visao", json={"unidade_id": filial["id"]})
    assert r.status_code == 200, r.text
    return filial["id"], "926922"


_CONTRATACOES = [
    {
        "idCompra": "compra-teste-001",
        "unidadeOrgaoCodigoUnidade": "926922",
        "unidadeOrgaoNomeUnidade": "PMU TESTE",
        "anoCompraPncp": 2024,
        "numeroCompra": "10/2024",
        "codigoModalidade": 5,
        "modalidadeNome": "Pregão - Eletrônico",
        "objetoCompra": "Aquisição de material de expediente",
        "situacaoCompraNomePncp": "Divulgada no PNCP",
        "numeroControlePNCP": "18431312000115-1-000010/2024",
        "processo": "12345",
        "valorTotalEstimado": 15000.5,
        "valorTotalHomologado": 14000.0,
        "dataPublicacaoPncp": "2024-03-01T10:00:00",
        "orgaoEntidadeCnpj": "18431312000115",
        "sequencialCompraPncp": 10,
        "existeResultado": True,
    }
]

_ITENS = [
    {
        "idCompraItem": "item-teste-001",
        "idCompra": "compra-teste-001",
        "numeroItemPncp": 1,
        "descricaoResumida": "Papel A4",
        "materialOuServico": "M",
        "materialOuServicoNome": "Material",
        "quantidade": 100,
        "valorUnitarioEstimado": 25.0,
        "valorTotal": 2500.0,
        "situacaoCompraItemNome": "Homologado",
        "temResultado": True,
    }
]

_RESULTADOS = [
    {
        "idCompraItem": "item-teste-001",
        "idCompra": "compra-teste-001",
        "sequencialResultado": 1,
        "niFornecedor": "12.345.678/0001-90",
        "nomeRazaoSocialFornecedor": "FORNECEDOR TESTE LTDA",
        "quantidadeHomologada": 100,
        "valorUnitarioHomologado": 24.0,
        "valorTotalHomologado": 2400.0,
        "situacaoCompraItemResultadoNome": "Homologado",
        "porteFornecedorNome": "ME",
        "dataResultadoPncp": "2024-03-15",
    }
]


def test_sync_mock_persiste_e_consulta_escopo(client, db):
    _bootstrap_admin(client)
    _, codigo = _filial_com_uasg(client, db)

    result = sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=codigo,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=_CONTRATACOES,
        itens=_ITENS,
        resultados=_RESULTADOS,
    )
    assert result["ok"] is True
    assert result["contratacoes"] == 1
    assert result["itens"] == 1
    assert result["resultados"] == 1
    assert result["contratacoes_novas"] == 1

    # idempotente
    result2 = sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=codigo,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=_CONTRATACOES,
        itens=_ITENS,
        resultados=_RESULTADOS,
    )
    assert result2["contratacoes_novas"] == 0
    assert result2["itens_novos"] == 0
    assert result2["resultados_novos"] == 0

    lista = client.get("/api/compras/contratacoes")
    assert lista.status_code == 200, lista.text
    payload = lista.json()
    assert "items" in payload
    body = payload["items"]
    assert payload["total"] == 1
    assert len(body) == 1
    assert body[0]["id_compra"] == "compra-teste-001"
    assert body[0]["total_itens"] == 1
    assert "expediente" in (body[0]["objeto"] or "")

    det = client.get(f"/api/compras/contratacoes/{body[0]['id']}")
    assert det.status_code == 200
    d = det.json()
    assert len(d["itens"]) == 1
    assert d["itens"][0]["descricao_resumida"] == "Papel A4"
    assert len(d["itens"][0]["resultados"]) == 1
    assert d["itens"][0]["resultados"][0]["ni_fornecedor"] == "12345678000190"

    filtros = client.get("/api/compras/filtros")
    assert filtros.status_code == 200
    fac = filtros.json()
    assert any(u["codigo"] == codigo for u in fac["uasgs"])

    resumo = client.get("/api/compras/resumo")
    assert resumo.status_code == 200
    r = resumo.json()
    assert r["contratacoes"] == 1
    assert r["itens"] == 1
    assert r["resultados"] == 1
    assert r["uasgs_monitoradas"] == 1


def test_consulta_filtrada_por_uasg_monitorada(client, db):
    _bootstrap_admin(client)
    _, codigo = _filial_com_uasg(client, db)

    # outra UASG no catálogo, sem vínculo à filial
    db.add(Uasg(codigo_uasg="999999", nome_uasg="OUTRA"))
    db.commit()

    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=codigo,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=_CONTRATACOES,
        itens=_ITENS,
        resultados=[],
        incluir_resultados=False,
    )
    # contratação "fantasma" de outra UASG (injeção direta no escopo errado)
    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg="999999",
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=[
            {
                **_CONTRATACOES[0],
                "idCompra": "outra-uasg",
                "unidadeOrgaoCodigoUnidade": "999999",
            }
        ],
        itens=[],
        resultados=[],
        incluir_itens=False,
        incluir_resultados=False,
    )

    lista = client.get("/api/compras/contratacoes")
    assert lista.status_code == 200
    ids = {c["id_compra"] for c in lista.json()["items"]}
    assert "compra-teste-001" in ids
    assert "outra-uasg" not in ids


def test_consulta_compras_exige_visao_filial(client, db):
    """Plataforma/matriz não acessa listagem Compras.gov — só visão filial."""
    _bootstrap_admin(client)
    # Admin sem filtro → modo plataforma
    neg = client.get("/api/compras/contratacoes")
    assert neg.status_code == 403, neg.text
    assert "filial" in (neg.json().get("detail") or "").lower()

    _, codigo = _filial_com_uasg(client, db)
    sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=codigo,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=_CONTRATACOES,
        itens=_ITENS,
        resultados=[],
        incluir_resultados=False,
    )
    # _filial_com_uasg já aplica filtro de visão na filial
    ok = client.get("/api/compras/contratacoes")
    assert ok.status_code == 200, ok.text
    assert ok.json()["total"] >= 1


def test_normalizadores_ni_e_chaves():
    from app.compras.normalizers import (
        contratacao_da_api,
        normalizar_ni,
        resultado_da_api,
    )

    assert normalizar_ni("12.345.678/0001-90") == "12345678000190"
    assert normalizar_ni("123.456.789-09") == "12345678909"
    c = contratacao_da_api(_CONTRATACOES[0])
    assert c is not None
    assert c["id_compra"] == "compra-teste-001"
    assert c["unidade_compradora"] == "926922"
    r = resultado_da_api(_RESULTADOS[0])
    assert r is not None
    assert r["sequencial_resultado"] == 1


def test_compras_ordenacao_global_antes_da_pagina(client, db):
    """sort/sort_dir ordenam o conjunto filtrado inteiro — não só a página."""
    _bootstrap_admin(client)
    _, codigo = _filial_com_uasg(client, db)

    base = {**_CONTRATACOES[0]}
    contratacoes = [
        {
            **base,
            "idCompra": "compra-sort-a",
            "numeroCompra": "1/2024",
            "processo": "PROC-A",
            "valorTotalHomologado": 100.0,
            "numeroControlePNCP": "PNCP-A",
        },
        {
            **base,
            "idCompra": "compra-sort-b",
            "numeroCompra": "2/2024",
            "processo": "PROC-B",
            "valorTotalHomologado": 5000.0,
            "numeroControlePNCP": "PNCP-B",
        },
        {
            **base,
            "idCompra": "compra-sort-c",
            "numeroCompra": "3/2024",
            "processo": "PROC-C",
            "valorTotalHomologado": 900.0,
            "numeroControlePNCP": "PNCP-C",
        },
    ]
    result = sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=codigo,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 12, 31),
        contratacoes=contratacoes,
        itens=[],
        resultados=[],
        incluir_itens=False,
        incluir_resultados=False,
    )
    assert result["ok"] is True

    # Página 1 com page_size=1 + sort valor_hom desc → maior valor global
    p1 = client.get(
        "/api/compras/contratacoes",
        params={
            "periodo": "tudo",
            "page": 1,
            "page_size": 1,
            "sort": "valor_hom",
            "sort_dir": "desc",
        },
    )
    assert p1.status_code == 200, p1.text
    body1 = p1.json()
    assert body1["total"] >= 3
    assert body1["items"][0]["id_compra"] == "compra-sort-b"

    p2 = client.get(
        "/api/compras/contratacoes",
        params={
            "periodo": "tudo",
            "page": 2,
            "page_size": 1,
            "sort": "valor_hom",
            "sort_dir": "desc",
        },
    )
    assert p2.status_code == 200
    assert p2.json()["items"][0]["id_compra"] == "compra-sort-c"

    # sort inválido não quebra — cai no default id DESC
    bad = client.get(
        "/api/compras/contratacoes",
        params={"periodo": "tudo", "sort": "coluna_inexistente", "sort_dir": "asc"},
    )
    assert bad.status_code == 200
    assert bad.json()["total"] >= 3
