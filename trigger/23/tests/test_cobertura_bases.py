"""Cobertura entre bases: só Compras.gov / só Power BI (mesma chave do painel)."""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.database import (
    CompraContratacao,
    OrgaoConsolidado,
    OrgaoVinculo,
    PbiOrgao,
    PbiProcessoLicitatorio,
    SessionLocal,
)
from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def _seed_divergencia():
    """Cria 1 processo só em Compras, 1 só em Power BI e 1 nas duas."""
    token = uuid4().hex[:8]
    # UASG numérica de 6 dígitos (padrão Compras.gov)
    uasg = f"9{int(token[:5], 16) % 100000:05d}"
    nome_org = f"Órgão cob {token}"
    nome_pbi = f"Empresa cob {token}"
    sigla = f"T{token[:3]}"

    # Números de processo estritamente numéricos (chave de cruzamento)
    base = int(token[:6], 16) % 80000 + 10000
    proc_so_compras = str(base)
    proc_so_pbi = str(base + 1)
    proc_ambas = str(base + 2)
    ano = 2096

    db = SessionLocal()
    try:
        consolidado = OrgaoConsolidado(nome=nome_org, sigla=sigla, ativo=True)
        orgao_pbi = PbiOrgao(nome=nome_pbi)
        db.add_all([consolidado, orgao_pbi])
        db.flush()
        db.add_all(
            [
                OrgaoVinculo(
                    orgao_consolidado_id=consolidado.id,
                    fonte="compras_api",
                    chave=uasg,
                    rotulo=nome_org,
                ),
                OrgaoVinculo(
                    orgao_consolidado_id=consolidado.id,
                    fonte="powerbi",
                    chave=nome_pbi,
                    rotulo=nome_pbi,
                ),
                CompraContratacao(
                    ano=ano,
                    chave_compra=f"COB-A-{token}",
                    id_compra=f"COB-A-{token}",
                    unidade_compradora=uasg,
                    unidade_nome=nome_org,
                    processo=f"{proc_so_compras}/{ano}",
                    modalidade_codigo="6",
                    modalidade_descricao="Pregão - Eletrônico",
                    situacao_lista="Publicada",
                ),
                CompraContratacao(
                    ano=ano,
                    chave_compra=f"COB-B-{token}",
                    id_compra=f"COB-B-{token}",
                    unidade_compradora=uasg,
                    unidade_nome=nome_org,
                    processo=f"{proc_ambas}/{ano}",
                    modalidade_codigo="6",
                    modalidade_descricao="Pregão - Eletrônico",
                    situacao_lista="Homologada",
                ),
                PbiProcessoLicitatorio(
                    orgao_id=orgao_pbi.id,
                    ano_processo=ano,
                    processo=proc_so_pbi,
                    modalidade="PREGÃO ELETRÔNICO",
                    situacao="Em andamento",
                    valor_licitacao="500,00",
                    fonte_ano_coleta=ano,
                ),
                PbiProcessoLicitatorio(
                    orgao_id=orgao_pbi.id,
                    ano_processo=ano,
                    processo=proc_ambas,
                    modalidade="PREGÃO ELETRÔNICO",
                    situacao="Homologado",
                    valor_licitacao="900,00",
                    fonte_ano_coleta=ano,
                ),
            ]
        )
        db.commit()
        return {
            "token": token,
            "orgao_id": consolidado.id,
            "ano": ano,
            "proc_so_compras": proc_so_compras,
            "proc_so_pbi": proc_so_pbi,
            "proc_ambas": proc_ambas,
            "uasg": uasg,
            "nome_org": nome_org,
            "nome_pbi": nome_pbi,
        }
    finally:
        db.close()


def _limpar(seed: dict):
    token = seed["token"]
    db = SessionLocal()
    try:
        db.query(PbiProcessoLicitatorio).filter(
            PbiProcessoLicitatorio.fonte_ano_coleta == seed["ano"],
            PbiProcessoLicitatorio.processo.in_(
                [seed["proc_so_pbi"], seed["proc_ambas"]]
            ),
        ).delete(synchronize_session=False)
        db.query(CompraContratacao).filter(
            CompraContratacao.chave_compra.in_([f"COB-A-{token}", f"COB-B-{token}"])
        ).delete(synchronize_session=False)
        db.query(OrgaoVinculo).filter_by(chave=seed["uasg"]).delete()
        db.query(OrgaoVinculo).filter_by(chave=seed["nome_pbi"]).delete()
        db.query(OrgaoConsolidado).filter_by(id=seed["orgao_id"]).delete()
        db.query(PbiOrgao).filter_by(nome=seed["nome_pbi"]).delete()
        db.commit()
    finally:
        db.close()


def test_cobertura_somente_compras_e_somente_powerbi(client):
    seed = _seed_divergencia()
    try:
        r = client.get(
            "/api/cobertura-bases",
            params={
                "orgao_id": seed["orgao_id"],
                "ano": seed["ano"],
                "vista": "somente_compras",
            },
        )
        assert r.status_code == 200
        body = r.json()
        resumo = body["resumo"]
        assert resumo["compras"]["somente_esta_base"] >= 1
        assert resumo["powerbi"]["somente_esta_base"] >= 1
        assert resumo["compras"]["em_ambas"] >= 1

        procs = {i["processo_numero"] for i in body["lista"]["items"]}
        assert int(seed["proc_so_compras"]) in procs
        assert int(seed["proc_ambas"]) not in procs

        # Cada item tem chave para abrir a consulta unificada
        item = next(
            i
            for i in body["lista"]["items"]
            if i["processo_numero"] == int(seed["proc_so_compras"])
        )
        assert item["chave"]["orgao_id"] == seed["orgao_id"]
        assert item["chave"]["ano"] == seed["ano"]
        assert item["chave"]["numero"] == int(seed["proc_so_compras"])

        r2 = client.get(
            "/api/cobertura-bases",
            params={
                "orgao_id": seed["orgao_id"],
                "ano": seed["ano"],
                "vista": "somente_powerbi",
            },
        )
        assert r2.status_code == 200
        procs_pbi = {i["processo_numero"] for i in r2.json()["lista"]["items"]}
        assert int(seed["proc_so_pbi"]) in procs_pbi
        assert int(seed["proc_ambas"]) not in procs_pbi

        # Vista «nas duas bases» — Compras.gov também no Power BI
        r3 = client.get(
            "/api/cobertura-bases",
            params={
                "orgao_id": seed["orgao_id"],
                "ano": seed["ano"],
                "vista": "em_ambas",
            },
        )
        assert r3.status_code == 200
        body3 = r3.json()
        assert body3["lista"]["total"] == body3["resumo"]["compras"]["em_ambas"]
        procs_ambas = {i["processo_numero"] for i in body3["lista"]["items"]}
        assert int(seed["proc_ambas"]) in procs_ambas
        assert int(seed["proc_so_compras"]) not in procs_ambas
        item_ambas = next(
            i
            for i in body3["lista"]["items"]
            if i["processo_numero"] == int(seed["proc_ambas"])
        )
        assert item_ambas["chave"]["orgao_id"] == seed["orgao_id"]

        # Alinhado ao painel
        dash = client.get(
            "/api/dashboard-gerencial/stats",
            params={"orgao_id": seed["orgao_id"], "ano": seed["ano"]},
        )
        assert dash.status_code == 200
        d = dash.json()
        assert (
            d["api"]["cruzamento"]["somente_esta_base"]
            == body["resumo"]["compras"]["somente_esta_base"]
        )
        assert (
            d["powerbi"]["cruzamento"]["somente_esta_base"]
            == r2.json()["resumo"]["powerbi"]["somente_esta_base"]
        )
        assert d["api"]["cruzamento"]["em_ambas"] == body3["resumo"]["compras"]["em_ambas"]
    finally:
        _limpar(seed)


def test_cobertura_vista_invalida_rejeitada(client):
    r = client.get("/api/cobertura-bases", params={"vista": "inexistente"})
    assert r.status_code == 422
