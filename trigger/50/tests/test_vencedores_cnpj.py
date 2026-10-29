"""CNPJs vencedores — consolidação 07.3 + escopo filial."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import select

from app.compras.sync_contratacoes import sincronizar_contratacoes_uasg
from app.database import FilialUasg, Fornecedor, Orgao, Uasg


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
        json={"nome": "Org Venc", "codigo": _uid("OV").upper()[:8]},
    ).json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    filial = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial V",
            "codigo": "FV",
            "matriz_id": matriz["id"],
        },
    ).json()

    orgao = Orgao(codigo_orgao=9401, nome_orgao="ORG VENCEDORES")
    db.add(orgao)
    db.flush()
    uasg = Uasg(
        codigo_uasg="333333",
        orgao_id=orgao.id,
        nome_uasg="UASG V",
        sigla_uf="MG",
    )
    db.add(uasg)
    db.flush()
    db.add(FilialUasg(unidade_id=filial["id"], uasg_id=uasg.id, ativo=True))
    db.commit()

    r = client.post("/api/auth/filtro-visao", json={"unidade_id": filial["id"]})
    assert r.status_code == 200, r.text
    assert r.json()["escopo"]["modo"] == "filial"
    return filial["id"], "333333"


_CONTRATACOES = [
    {
        "idCompra": "compra-venc-001",
        "unidadeOrgaoCodigoUnidade": "333333",
        "unidadeOrgaoNomeUnidade": "UASG V",
        "anoCompraPncp": 2026,
        "numeroCompra": "100/2026",
        "codigoModalidade": 5,
        "modalidadeNome": "Pregão - Eletrônico",
        "objetoCompra": "Objeto vencedores",
        "situacaoCompraNomePncp": "Homologada",
        "numeroControlePNCP": "V-1",
        "processo": "PROC-V-1",
        "valorTotalEstimado": 10000.0,
        "valorTotalHomologado": 9000.0,
        "dataPublicacaoPncp": "2026-03-10T10:00:00",
        "existeResultado": True,
    }
]

_ITENS = [
    {
        "idCompraItem": "compra-venc-001-1",
        "idCompra": "compra-venc-001",
        "numeroItemPncp": 1,
        "descricaoResumida": "Item homologado",
        "materialOuServico": "M",
        "materialOuServicoNome": "Material",
        "quantidade": 10,
        "valorUnitarioEstimado": 900.0,
        "valorTotal": 9000.0,
        "situacaoCompraItemNome": "Homologado",
        "temResultado": True,
    }
]

_RESULTADOS = [
    {
        "idCompraItem": "compra-venc-001-1",
        "idCompra": "compra-venc-001",
        "sequencialResultado": 1,
        "niFornecedor": "12.345.678/0001-90",
        "nomeRazaoSocialFornecedor": "FORNECEDOR VENCEDOR LTDA",
        "quantidadeHomologada": 10,
        "valorUnitarioHomologado": 900.0,
        "valorTotalHomologado": 9000.0,
        "situacaoCompraItemResultadoNome": "Homologado",
        "porteFornecedorNome": "ME",
        "dataResultadoPncp": "2026-03-15",
    }
]


def test_vencedores_exige_visao_filial(client, db):
    _bootstrap_admin(client)
    r = client.get("/api/consultas/vencedores-cnpj?periodo=ano_atual")
    assert r.status_code == 403
    assert "filial" in (r.json().get("detail") or "").lower()


def test_vencedores_lista_detalhe_homologacoes(client, db):
    _bootstrap_admin(client)
    _, codigo = _filial_com_uasg(client, db)

    result = sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=codigo,
        data_inicial=date(2026, 1, 1),
        data_final=date(2026, 12, 31),
        contratacoes=_CONTRATACOES,
        itens=_ITENS,
        resultados=_RESULTADOS,
    )
    assert result["ok"] is True
    assert result["resultados"] == 1

    forn = db.scalar(select(Fornecedor).where(Fornecedor.ni == "12345678000190"))
    assert forn is not None
    forn.uf = "MG"
    forn.municipio = "Uberlândia"
    forn.porte = "ME"
    forn.fonte_cnpj = "brasilapi"
    forn.cnpj_dados_json = (
        '{"fonte":"brasilapi","payload":{"qsa":['
        '{"nome_socio":"Sócio A","qualificacao_socio":"Administrador"}]}}'
    )
    forn.cnpj_enriquecido_em = datetime.utcnow()
    forn.cnpj_pendente = False
    forn.razao_social = "FORNECEDOR VENCEDOR LTDA"
    db.commit()

    filtros = client.get("/api/consultas/vencedores-cnpj/filtros")
    assert filtros.status_code == 200, filtros.text
    assert any(u["codigo"] == "333333" for u in filtros.json().get("uasgs") or [])

    lista = client.get(
        "/api/consultas/vencedores-cnpj",
        params={"periodo": "ano_atual", "page": 1, "page_size": 50},
    )
    assert lista.status_code == 200, lista.text
    body = lista.json()
    assert body["total"] >= 1
    assert body["page"] == 1
    assert body["page_size"] == 50
    item = next(
        (i for i in body["items"] if i["cod_fornecedor"] == "12345678000190"),
        None,
    )
    assert item is not None
    assert item["qtd_itens"] >= 1
    assert item["qtd_compras"] >= 1
    assert item["pode_atualizar"] is True
    assert item["status_cache"] == "atualizado"
    assert "municipio" in item

    # Paginação: página além do fim volta para a última válida
    p2 = client.get(
        "/api/consultas/vencedores-cnpj",
        params={"periodo": "ano_atual", "page": 999, "page_size": 50},
    )
    assert p2.status_code == 200
    assert p2.json()["page"] >= 1
    assert len(p2.json()["items"]) >= 1

    det = client.get("/api/consultas/vencedores-cnpj/12345678000190")
    assert det.status_code == 200
    assert det.json()["empresa"]["municipio"] == "Uberlândia"
    assert det.json()["empresa"]["qsa"][0]["nome"] == "Sócio A"

    hom = client.get(
        "/api/consultas/vencedores-cnpj/12345678000190/homologacoes",
        params={"periodo": "ano_atual"},
    )
    assert hom.status_code == 200, hom.text
    hb = hom.json()
    assert hb["total"] >= 1
    assert hb["items"][0].get("id_compra") == "compra-venc-001"


def test_vencedores_ordenacao_global_antes_da_pagina(client, db):
    """sort/sort_dir ordenam todos os vencedores filtrados — depois fatia a página."""
    _bootstrap_admin(client)
    _, codigo = _filial_com_uasg(client, db)

    contratacoes = [
        {
            **_CONTRATACOES[0],
            "idCompra": "compra-venc-a",
            "numeroCompra": "1/2026",
            "numeroControlePNCP": "V-A",
            "processo": "PROC-A",
            "valorTotalHomologado": 1000.0,
        },
        {
            **_CONTRATACOES[0],
            "idCompra": "compra-venc-b",
            "numeroCompra": "2/2026",
            "numeroControlePNCP": "V-B",
            "processo": "PROC-B",
            "valorTotalHomologado": 5000.0,
        },
        {
            **_CONTRATACOES[0],
            "idCompra": "compra-venc-c",
            "numeroCompra": "3/2026",
            "numeroControlePNCP": "V-C",
            "processo": "PROC-C",
            "valorTotalHomologado": 2500.0,
        },
    ]
    itens = [
        {
            **_ITENS[0],
            "idCompraItem": "compra-venc-a-1",
            "idCompra": "compra-venc-a",
            "valorTotal": 1000.0,
        },
        {
            **_ITENS[0],
            "idCompraItem": "compra-venc-b-1",
            "idCompra": "compra-venc-b",
            "valorTotal": 5000.0,
        },
        {
            **_ITENS[0],
            "idCompraItem": "compra-venc-c-1",
            "idCompra": "compra-venc-c",
            "valorTotal": 2500.0,
        },
    ]
    resultados = [
        {
            **_RESULTADOS[0],
            "idCompraItem": "compra-venc-a-1",
            "idCompra": "compra-venc-a",
            "niFornecedor": "11.111.111/0001-11",
            "nomeRazaoSocialFornecedor": "ALFA LTDA",
            "valorTotalHomologado": 1000.0,
        },
        {
            **_RESULTADOS[0],
            "idCompraItem": "compra-venc-b-1",
            "idCompra": "compra-venc-b",
            "niFornecedor": "22.222.222/0001-22",
            "nomeRazaoSocialFornecedor": "BETA LTDA",
            "valorTotalHomologado": 5000.0,
        },
        {
            **_RESULTADOS[0],
            "idCompraItem": "compra-venc-c-1",
            "idCompra": "compra-venc-c",
            "niFornecedor": "33.333.333/0001-33",
            "nomeRazaoSocialFornecedor": "GAMA LTDA",
            "valorTotalHomologado": 2500.0,
        },
    ]
    result = sincronizar_contratacoes_uasg(
        db,
        codigo_uasg=codigo,
        data_inicial=date(2026, 1, 1),
        data_final=date(2026, 12, 31),
        contratacoes=contratacoes,
        itens=itens,
        resultados=resultados,
    )
    assert result["ok"] is True

    p1 = client.get(
        "/api/consultas/vencedores-cnpj",
        params={
            "periodo": "ano_atual",
            "page": 1,
            "page_size": 1,
            "sort": "valor",
            "sort_dir": "desc",
        },
    )
    assert p1.status_code == 200, p1.text
    body1 = p1.json()
    assert body1["total"] >= 3
    assert body1["items"][0]["cod_fornecedor"] == "22222222000122"

    p2 = client.get(
        "/api/consultas/vencedores-cnpj",
        params={
            "periodo": "ano_atual",
            "page": 2,
            "page_size": 1,
            "sort": "valor",
            "sort_dir": "desc",
        },
    )
    assert p2.status_code == 200
    assert p2.json()["items"][0]["cod_fornecedor"] == "33333333000133"

    nome = client.get(
        "/api/consultas/vencedores-cnpj",
        params={
            "periodo": "ano_atual",
            "page": 1,
            "page_size": 50,
            "sort": "nome",
            "sort_dir": "asc",
        },
    )
    assert nome.status_code == 200
    nomes = [i["nome_fornecedor"] for i in nome.json()["items"]]
    assert nomes == sorted(nomes, key=lambda s: (s or "").casefold())
