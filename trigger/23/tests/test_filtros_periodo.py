from datetime import date
from uuid import uuid4

import pytest
from sqlalchemy import select
from fastapi.testclient import TestClient

from app.database import (
    CompraContratacao,
    OrgaoConsolidado,
    OrgaoVinculo,
    PbiOrgao,
    PbiProcessoLicitatorio,
    SessionLocal,
)
from app.filtros_periodo import (
    anos_disponiveis,
    condicao_periodo,
    data_filtro_powerbi,
    data_iso_pncp,
    resolver_periodo,
)
from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_resolver_ano_e_quadrimestres():
    assert resolver_periodo(periodo="ano", ano=2026) == resolver_periodo(
        periodo="intervalo",
        data_inicial=date(2026, 1, 1),
        data_final=date(2026, 12, 31),
    )
    assert resolver_periodo(periodo="quadrimestre", ano=2026, quadrimestre=1).fim == date(
        2026, 4, 30
    )
    assert resolver_periodo(periodo="quadrimestre", ano=2026, quadrimestre=2).inicio == date(
        2026, 5, 1
    )
    assert resolver_periodo(periodo="quadrimestre", ano=2026, quadrimestre=3).fim == date(
        2026, 12, 31
    )


@pytest.mark.parametrize(
    "kwargs",
    [
        {"periodo": "ano"},
        {"periodo": "quadrimestre", "ano": 2026, "quadrimestre": 4},
        {"periodo": "intervalo", "data_inicial": date(2026, 1, 1)},
        {
            "periodo": "intervalo",
            "data_inicial": date(2026, 2, 1),
            "data_final": date(2026, 1, 1),
        },
    ],
)
def test_resolver_periodo_rejeita_selecao_invalida(kwargs):
    with pytest.raises(ValueError):
        resolver_periodo(**kwargs)


def test_expressoes_normalizam_formatos_e_excluem_datas_invalidas():
    db = SessionLocal()
    try:
        compra = CompraContratacao(
            ano=2025,
            chave_compra="PERIODO-PNCP",
            id_compra="PERIODO-PNCP",
            unidade_compradora="T-PER",
            unidade_nome="Teste período",
            data_encerramento_proposta_pncp="30/04/2026 23:59",
        )
        orgao = PbiOrgao(nome="Teste período filtros")
        db.add(orgao)
        db.flush()
        pbi = PbiProcessoLicitatorio(
            orgao_id=orgao.id,
            ano_processo=2025,
            processo="PERIODO-PBI",
            modalidade="Teste",
            dt_abertura="2026-05-01 00:00:00.0",
            dt_homologacao="2026-09-15 00:00:00.0",
            fonte_ano_coleta=2025,
        )
        pbi_fallback = PbiProcessoLicitatorio(
            orgao_id=orgao.id,
            ano_processo=2025,
            processo="PERIODO-PBI-FB",
            modalidade="Teste",
            dt_abertura=None,
            dt_homologacao="2026-06-10 00:00:00.0",
            fonte_ano_coleta=2025,
        )
        db.add_all([compra, pbi, pbi_fallback])
        db.commit()

        primeiro = resolver_periodo(periodo="quadrimestre", ano=2026, quadrimestre=1)
        segundo = resolver_periodo(periodo="quadrimestre", ano=2026, quadrimestre=2)
        data_pbi = data_filtro_powerbi(
            PbiProcessoLicitatorio.dt_abertura,
            PbiProcessoLicitatorio.dt_homologacao,
        )

        compras_q1 = db.scalars(
            select(CompraContratacao).where(
                condicao_periodo(
                    data_iso_pncp(CompraContratacao.data_encerramento_proposta_pncp),
                    primeiro,
                )
            )
        ).all()
        pbi_q2 = db.scalars(
            select(PbiProcessoLicitatorio).where(condicao_periodo(data_pbi, segundo))
        ).all()
        pbi_so_abertura = db.scalars(
            select(PbiProcessoLicitatorio).where(
                condicao_periodo(
                    data_filtro_powerbi(
                        PbiProcessoLicitatorio.dt_abertura,
                        PbiProcessoLicitatorio.dt_homologacao,
                        fallback_homologacao=False,
                    ),
                    segundo,
                )
            )
        ).all()

        assert compra in compras_q1
        assert pbi in pbi_q2
        assert pbi_fallback in pbi_q2
        assert pbi in pbi_so_abertura
        assert pbi_fallback not in pbi_so_abertura
        assert 2026 in anos_disponiveis(
            db, data_iso_pncp(CompraContratacao.data_encerramento_proposta_pncp)
        )
        assert 2026 in anos_disponiveis(db, data_pbi)
    finally:
        db.query(CompraContratacao).filter_by(chave_compra="PERIODO-PNCP").delete()
        db.query(PbiProcessoLicitatorio).filter(
            PbiProcessoLicitatorio.processo.in_(["PERIODO-PBI", "PERIODO-PBI-FB"])
        ).delete()
        db.query(PbiOrgao).filter_by(nome="Teste período filtros").delete()
        db.commit()
        db.close()


def test_endpoints_usam_data_canonica_e_preservam_ano_legado(client):
    token = uuid4().hex[:10]
    processo = f"PERIODO-{token}"
    db = SessionLocal()
    try:
        compra = CompraContratacao(
            ano=2097,
            chave_compra=processo,
            id_compra=processo,
            unidade_compradora="T-PER",
            unidade_nome="Teste período endpoint",
            processo=processo,
            data_encerramento_proposta_pncp="01/05/2098 08:00",
        )
        orgao = PbiOrgao(nome=f"Teste período endpoint {token}")
        db.add_all([compra, orgao])
        db.flush()
        pbi = PbiProcessoLicitatorio(
            orgao_id=orgao.id,
            ano_processo=2097,
            processo=processo,
            modalidade="Teste",
            dt_abertura="2098-05-01 10:00:00.0",
            dt_homologacao="2098-09-01 10:00:00.0",
            fonte_ano_coleta=2097,
        )
        db.add(pbi)
        db.commit()

        params_periodo = {"periodo": "quadrimestre", "ano": 2098, "quadrimestre": 2}
        compras = client.get(
            "/api/compras/contratacoes",
            params={**params_periodo, "texto": processo},
        )
        assert compras.status_code == 200
        assert compras.json()["total"] == 1

        legado = client.get(
            "/api/compras/contratacoes",
            params={"ano": 2097, "texto": processo},
        )
        assert legado.status_code == 200
        assert legado.json()["total"] == 1

        powerbi = client.get(
            "/api/powerbi/licitacoes",
            params={**params_periodo, "processo": processo},
        )
        assert powerbi.status_code == 200
        assert powerbi.json()["total"] == 1

        consulta = client.get(
            "/api/consulta-processo/buscar",
            params={**params_periodo, "processo": processo},
        )
        assert consulta.status_code == 200
        assert consulta.json()["total_registros"] == 2

        propostas = client.get(
            "/api/propostas-abertas/resumo",
            params={**params_periodo, "texto": processo},
        )
        assert propostas.status_code == 200
        assert propostas.json()["contratacoes"] == 1
    finally:
        db.query(PbiProcessoLicitatorio).filter_by(processo=processo).delete()
        db.query(CompraContratacao).filter_by(chave_compra=processo).delete()
        db.query(PbiOrgao).filter(PbiOrgao.nome == f"Teste período endpoint {token}").delete()
        db.commit()
        db.close()


def test_consulta_por_numero_compra_cruza_processo_com_powerbi(client):
    token = uuid4().hex[:8]
    uasg = f"T{token[:7]}"
    nome_orgao = f"Órgão compra {token}"
    numero_compra = f"900{token[:4]}/2096"
    processo_api = "98765/2096"

    db = SessionLocal()
    try:
        consolidado = OrgaoConsolidado(nome=nome_orgao, sigla=f"C{token[:4]}")
        orgao_pbi = PbiOrgao(nome=nome_orgao)
        db.add_all([consolidado, orgao_pbi])
        db.flush()
        db.add_all(
            [
                OrgaoVinculo(
                    orgao_consolidado_id=consolidado.id,
                    fonte="compras_api",
                    chave=uasg,
                ),
                OrgaoVinculo(
                    orgao_consolidado_id=consolidado.id,
                    fonte="powerbi",
                    chave=nome_orgao,
                ),
                CompraContratacao(
                    ano=2096,
                    chave_compra=f"CHAVE-{token}",
                    id_compra=f"ID-{token}",
                    numero=numero_compra,
                    unidade_compradora=uasg,
                    unidade_nome=nome_orgao,
                    processo=processo_api,
                ),
                PbiProcessoLicitatorio(
                    orgao_id=orgao_pbi.id,
                    ano_processo=2096,
                    processo="98765",
                    modalidade="Teste",
                    fonte_ano_coleta=2096,
                ),
            ]
        )
        db.commit()

        busca = client.get(
            "/api/consulta-processo/buscar",
            params={"numero_compra": numero_compra, "ano": 2096},
        )
        assert busca.status_code == 200
        payload = busca.json()
        assert payload["numero_compra"] == numero_compra
        assert payload["total_registros"] == 2
        assert payload["grupos"][0]["cobertura"] == {"api": True, "powerbi": True}

        detalhe = client.get(
            "/api/consulta-processo/detalhe",
            params={"numero_compra": numero_compra, "ano": 2096},
        )
        assert detalhe.status_code == 200
        assert detalhe.json()["cobertura"]["nas_duas"] is True

        sem_filtro = client.get("/api/consulta-processo/detalhe")
        assert sem_filtro.status_code == 400
    finally:
        db.query(CompraContratacao).filter_by(chave_compra=f"CHAVE-{token}").delete()
        db.query(PbiProcessoLicitatorio).filter_by(orgao_id=orgao_pbi.id).delete()
        db.query(OrgaoVinculo).filter_by(orgao_consolidado_id=consolidado.id).delete()
        db.query(PbiOrgao).filter_by(id=orgao_pbi.id).delete()
        db.query(OrgaoConsolidado).filter_by(id=consolidado.id).delete()
        db.commit()
        db.close()
