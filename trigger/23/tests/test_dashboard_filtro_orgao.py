"""Painel: órgão consolidado sem vínculo Power BI deve zerar a base PMU."""

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


def test_painel_orgao_so_compras_zera_powerbi(client):
    """CAM-like: vínculo só em Compras.gov → Power BI sem registros, não o consolidado geral."""
    token = uuid4().hex[:8]
    uasg = f"9{token[:5]}"
    sigla = f"C{token[:3]}"
    nome = f"Câmara teste {token}"
    nome_pbi_outro = f"Prefeitura outra {token}"
    processo_api = f"100{token[:4]}/2095"
    processo_pbi = f"200{token[:4]}"

    db = SessionLocal()
    try:
        consolidado = OrgaoConsolidado(nome=nome, sigla=sigla, ativo=True)
        orgao_pbi = PbiOrgao(nome=nome_pbi_outro)
        db.add_all([consolidado, orgao_pbi])
        db.flush()
        db.add_all(
            [
                OrgaoVinculo(
                    orgao_consolidado_id=consolidado.id,
                    fonte="compras_api",
                    chave=uasg,
                    rotulo=nome,
                ),
                CompraContratacao(
                    ano=2095,
                    chave_compra=f"DASH-{token}",
                    id_compra=f"DASH-{token}",
                    unidade_compradora=uasg,
                    unidade_nome=nome,
                    processo=processo_api,
                    modalidade_codigo="6",
                    modalidade_descricao="Pregão - Eletrônico",
                ),
                PbiProcessoLicitatorio(
                    orgao_id=orgao_pbi.id,
                    ano_processo=2095,
                    processo=processo_pbi,
                    modalidade="PREGÃO ELETRÔNICO",
                    situacao="Homologado",
                    valor_licitacao="1000,00",
                    fonte_ano_coleta=2095,
                ),
            ]
        )
        db.commit()
        orgao_id = consolidado.id

        sem_filtro = client.get("/api/dashboard-gerencial/stats")
        assert sem_filtro.status_code == 200
        assert sem_filtro.json()["powerbi"]["total_processos"] >= 1

        com_filtro = client.get(
            "/api/dashboard-gerencial/stats",
            params={"orgao_id": orgao_id},
        )
        assert com_filtro.status_code == 200
        body = com_filtro.json()
        assert body["filtros"]["orgao_id"] == orgao_id
        assert body["api"]["total_processos"] == 1
        assert body["powerbi"]["total_processos"] == 0
        assert body["powerbi"]["por_orgao"] == []
        assert body["powerbi"]["valor_solicitacao_total"] is None
    finally:
        db.query(PbiProcessoLicitatorio).filter_by(processo=processo_pbi).delete()
        db.query(CompraContratacao).filter_by(chave_compra=f"DASH-{token}").delete()
        db.query(OrgaoVinculo).filter_by(chave=uasg).delete()
        db.query(OrgaoConsolidado).filter_by(nome=nome).delete()
        db.query(PbiOrgao).filter_by(nome=nome_pbi_outro).delete()
        db.commit()
        db.close()
