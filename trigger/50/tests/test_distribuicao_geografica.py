"""Distribuição geográfica — Início (visão filial) + basemap."""

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
        json={"nome": "Org Dist", "codigo": _uid("OD").upper()[:8]},
    ).json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    filial = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial D",
            "codigo": "FD",
            "matriz_id": matriz["id"],
        },
    ).json()

    orgao = Orgao(codigo_orgao=9402, nome_orgao="ORG DIST")
    db.add(orgao)
    db.flush()
    uasg = Uasg(
        codigo_uasg="444444",
        orgao_id=orgao.id,
        nome_uasg="UASG D",
        sigla_uf="MG",
    )
    db.add(uasg)
    db.flush()
    db.add(FilialUasg(unidade_id=filial["id"], uasg_id=uasg.id, ativo=True))
    db.commit()

    r = client.post("/api/auth/filtro-visao", json={"unidade_id": filial["id"]})
    assert r.status_code == 200, r.text
    assert r.json()["escopo"]["modo"] == "filial"
    return filial["id"], "444444"


_CONTRATACOES = [
    {
        "idCompra": "compra-dist-001",
        "unidadeOrgaoCodigoUnidade": "444444",
        "unidadeOrgaoNomeUnidade": "UASG D",
        "anoCompraPncp": 2026,
        "numeroCompra": "200/2026",
        "codigoModalidade": 5,
        "modalidadeNome": "Pregão - Eletrônico",
        "objetoCompra": "Objeto distribuição",
        "situacaoCompraNomePncp": "Homologada",
        "numeroControlePNCP": "D-1",
        "processo": "PROC-D-1",
        "valorTotalEstimado": 5000.0,
        "valorTotalHomologado": 4500.0,
        "dataPublicacaoPncp": "2026-04-10T10:00:00",
        "existeResultado": True,
    }
]

_ITENS = [
    {
        "idCompraItem": "compra-dist-001-1",
        "idCompra": "compra-dist-001",
        "numeroItemPncp": 1,
        "descricaoResumida": "Item homologado",
        "materialOuServico": "M",
        "materialOuServicoNome": "Material",
        "quantidade": 5,
        "valorUnitarioEstimado": 900.0,
        "valorTotal": 4500.0,
        "situacaoCompraItemNome": "Homologado",
        "temResultado": True,
    }
]

_RESULTADOS = [
    {
        "idCompraItem": "compra-dist-001-1",
        "idCompra": "compra-dist-001",
        "sequencialResultado": 1,
        "niFornecedor": "98.765.432/0001-10",
        "nomeRazaoSocialFornecedor": "FORNECEDOR DIST LTDA",
        "quantidadeHomologada": 5,
        "valorUnitarioHomologado": 900.0,
        "valorTotalHomologado": 4500.0,
        "situacaoCompraItemResultadoNome": "Homologado",
        "porteFornecedorNome": "ME",
        "dataResultadoPncp": "2026-04-15",
    }
]


def test_distribuicao_exige_visao_filial(client, db):
    _bootstrap_admin(client)
    r = client.get("/api/consultas/distribuicao-geografica?periodo=ano_atual")
    assert r.status_code == 403
    assert "filial" in (r.json().get("detail") or "").lower()


def test_distribuicao_agrega_por_uf_municipio(client, db):
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

    forn = db.scalar(select(Fornecedor).where(Fornecedor.ni == "98765432000110"))
    assert forn is not None
    forn.uf = "MG"
    forn.municipio = "Uberlândia"
    forn.codigo_municipio_ibge = 3170206
    forn.cnpj_pendente = False
    forn.cnpj_enriquecido_em = datetime.utcnow()
    db.commit()

    r = client.get("/api/consultas/distribuicao-geografica?periodo=tudo")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["resumo"]["quantidade"] == 1
    assert body["resumo"]["ufs"] == 1
    assert body["resumo"]["municipios"] == 1
    assert body["resumo"]["contratacoes"] == 1
    assert body["resumo"]["escopo_total"] == 1
    assert body["resumo"]["escopo_homologadas"] == 1
    assert abs(float(body["resumo"]["escopo_valor_estimado"]) - 5000.0) < 0.01
    assert abs(float(body["resumo"]["escopo_valor_homologado"]) - 4500.0) < 0.01
    assert abs(float(body["resumo"]["valor"]) - 4500.0) < 0.01
    assert abs(float(body["resumo"]["valor_estimado"]) - 5000.0) < 0.01
    assert body["por_uf"][0]["uf"] == "MG"
    assert body["por_uf"][0]["contratacoes"] == 1
    assert abs(float(body["por_uf"][0]["valor_estimado"]) - 5000.0) < 0.01
    assert abs(float(body["por_uf"][0]["valor"]) - 4500.0) < 0.01
    assert body["por_municipio"][0]["ibge"] == 3170206
    assert abs(float(body["por_municipio"][0]["valor_estimado"]) - 5000.0) < 0.01
    assert "sede" in (body["interpretacao"]["eixo"] or "").lower()
    assert "valor_estimado" in body["interpretacao"]
    # Rateio: soma dos estimados por UF = estimado do resumo geográfico
    soma_est_uf = sum(float(u["valor_estimado"]) for u in body["por_uf"])
    assert abs(soma_est_uf - float(body["resumo"]["valor_estimado"])) < 0.02


def test_basemap_config(client):
    _bootstrap_admin(client)
    r = client.get("/api/mapa/basemap")
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "carto"
    assert "carto_api_key" in body
    assert "configured" in body


def test_geo_assets_static(client):
    _bootstrap_admin(client)
    for path in (
        "/static/geo/brasil-ufs.geojson",
        "/static/geo/municipio-centroids.json",
        "/static/geo/uf-centroids.json",
    ):
        r = client.get(path)
        assert r.status_code == 200, path
