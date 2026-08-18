"""Observador no Power BI: preservação na recoleta e herança no filtro."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import (
    Observador,
    PbiContrato,
    PbiContratoResponsavel,
    PbiFornecedor,
    PbiOrgao,
    PbiPessoa,
    PbiProcessoLicitatorio,
    SessionLocal,
)
from app.main import app
from app.powerbi_repo import importar_contratos, importar_processos


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def _token() -> str:
    return uuid.uuid4().hex[:8]


def test_reimportar_processo_preserva_observador():
    token = _token()
    db = SessionLocal()
    try:
        obs = Observador(nome=f"Obs reimp {token}", ativo=True)
        orgao = PbiOrgao(nome=f"Orgao reimp {token}")
        db.add_all([obs, orgao])
        db.flush()
        proc = PbiProcessoLicitatorio(
            orgao_id=orgao.id,
            ano_processo=2098,
            processo=f"REIMP-{token}",
            modalidade="Pregão Eletrônico",
            objeto="Objeto antigo",
            fonte_ano_coleta=2098,
            observador_id=obs.id,
        )
        db.add(proc)
        db.commit()
        oid = obs.id
        nome_orgao = orgao.nome
        processo = proc.processo

        inseridos, _, removidos = importar_processos(
            db,
            [
                {
                    "ANOPROCESSO": "2098",
                    "PROCESSO": processo,
                    "EMPRESA": nome_orgao,
                    "MODALIDADE": "Pregão Eletrônico",
                    "OBJETO": "Objeto atualizado pela coleta",
                    "SITUACAO": "Homologada",
                }
            ],
            2098,
        )
        assert inseridos == 1
        assert removidos == 1

        db.expire_all()
        novo = db.scalar(
            select(PbiProcessoLicitatorio).where(
                PbiProcessoLicitatorio.processo == processo,
                PbiProcessoLicitatorio.fonte_ano_coleta == 2098,
            )
        )
        assert novo is not None
        assert novo.observador_id == oid
        assert novo.objeto == "Objeto atualizado pela coleta"
    finally:
        db.close()


def test_reimportar_contrato_preserva_observador_proprio():
    token = _token()
    db = SessionLocal()
    try:
        obs = Observador(nome=f"Obs ctr {token}", ativo=True)
        orgao = PbiOrgao(nome=f"Orgao ctr {token}")
        db.add_all([obs, orgao])
        db.flush()
        ctr = PbiContrato(
            orgao_id=orgao.id,
            ano_contrato=2098,
            nr_contrato=f"C-{token}",
            nr_aditivo="0",
            nr_parcela="1",
            processo=f"P-{token}",
            ds_objeto_contrato="Objeto antigo",
            fonte_ano_coleta=2098,
            observador_id=obs.id,
        )
        db.add(ctr)
        db.commit()
        oid = obs.id
        nome_orgao = orgao.nome
        nr = ctr.nr_contrato
        processo = ctr.processo

        inseridos, _, removidos = importar_contratos(
            db,
            [
                {
                    "ANOCONTRATO": "2098",
                    "NRCONTRATO": nr,
                    "EMPRESA": nome_orgao,
                    "PROCESSO": processo,
                    "NRADITIVO": "0",
                    "NRPARCELA": "1",
                    "DSOBJETOCONTRATO": "Objeto atualizado",
                    "NMPESSOA": f"Fornecedor {token}",
                }
            ],
            2098,
        )
        assert inseridos == 1
        assert removidos == 1

        db.expire_all()
        novo = db.scalar(
            select(PbiContrato).where(
                PbiContrato.nr_contrato == nr,
                PbiContrato.fonte_ano_coleta == 2098,
            )
        )
        assert novo is not None
        assert novo.observador_id == oid
        assert novo.ds_objeto_contrato == "Objeto atualizado"
    finally:
        db.close()


def test_filtro_herda_observador_do_processo(client):
    token = _token()
    db = SessionLocal()
    try:
        obs = Observador(nome=f"Obs herda {token}", ativo=True)
        orgao = PbiOrgao(nome=f"Orgao herda {token}")
        fornecedor = PbiFornecedor(razao_social=f"Forn herda {token}")
        pessoa = PbiPessoa(nome=f"Pessoa herda {token}")
        db.add_all([obs, orgao, fornecedor, pessoa])
        db.flush()
        proc = PbiProcessoLicitatorio(
            orgao_id=orgao.id,
            ano_processo=2098,
            processo=f"HERDA-{token}",
            modalidade="Teste",
            fonte_ano_coleta=2098,
            observador_id=obs.id,
        )
        db.add(proc)
        db.flush()
        ctr = PbiContrato(
            orgao_id=orgao.id,
            fornecedor_id=fornecedor.id,
            processo_id=proc.id,
            ano_contrato=2098,
            ano_processo=2098,
            nr_contrato=f"CH-{token}",
            nr_aditivo="0",
            nr_parcela="1",
            processo=proc.processo,
            fonte_ano_coleta=2098,
            observador_id=None,
        )
        db.add(ctr)
        db.flush()
        resp = PbiContratoResponsavel(
            contrato_id=ctr.id,
            pessoa_id=pessoa.id,
            orgao_id=orgao.id,
            fornecedor_id=fornecedor.id,
            ano_contrato=2098,
            nr_contrato=ctr.nr_contrato,
            observador_id=None,
        )
        db.add(resp)
        db.commit()
        oid = obs.id
        nr = ctr.nr_contrato
        processo = proc.processo
    finally:
        db.close()

    agrupados = client.get(
        "/api/powerbi/contratos-agrupados",
        params={"ano_contrato": 2098, "processo": processo, "observador_id": oid},
    )
    assert agrupados.status_code == 200
    assert agrupados.json()["total"] == 1
    assert agrupados.json()["items"][0]["nr_contrato"] == nr
    assert agrupados.json()["items"][0]["observador_id"] == oid

    eventos = client.get(
        "/api/powerbi/contratos",
        params={"ano_contrato": 2098, "processo": processo, "observador_id": oid},
    )
    assert eventos.status_code == 200
    assert eventos.json()["total"] == 1
    assert eventos.json()["items"][0]["observador_id"] == oid
    assert eventos.json()["items"][0]["observador_nome"]

    gestores = client.get(
        "/api/powerbi/gestores",
        params={"ano_contrato": 2098, "nr_contrato": nr, "observador_id": oid},
    )
    assert gestores.status_code == 200
    assert gestores.json()["total"] == 1
    assert gestores.json()["items"][0]["observador_id"] == oid

    sem = client.get(
        "/api/powerbi/contratos",
        params={"ano_contrato": 2098, "processo": processo, "observador_id": 0},
    )
    assert sem.status_code == 200
    assert sem.json()["total"] == 0


def test_patch_licitacao_depois_recoleta_mantem_observador(client):
    token = _token()
    db = SessionLocal()
    try:
        obs = Observador(nome=f"Obs patch {token}", ativo=True)
        orgao = PbiOrgao(nome=f"Orgao patch {token}")
        db.add_all([obs, orgao])
        db.flush()
        proc = PbiProcessoLicitatorio(
            orgao_id=orgao.id,
            ano_processo=2098,
            processo=f"PATCH-{token}",
            modalidade="Convite",
            objeto="Antes",
            fonte_ano_coleta=2098,
            observador_id=None,
        )
        db.add(proc)
        db.commit()
        lid = proc.id
        oid = obs.id
        nome_orgao = orgao.nome
        processo = proc.processo
        modalidade = proc.modalidade
    finally:
        db.close()

    patched = client.patch(
        f"/api/powerbi/licitacoes/{lid}",
        json={"observador_id": oid},
    )
    assert patched.status_code == 200
    assert patched.json()["observador_id"] == oid
    assert patched.json()["observador_nome"]

    db = SessionLocal()
    try:
        importar_processos(
            db,
            [
                {
                    "ANOPROCESSO": "2098",
                    "PROCESSO": processo,
                    "EMPRESA": nome_orgao,
                    "MODALIDADE": modalidade,
                    "OBJETO": "Depois da coleta",
                }
            ],
            2098,
        )
        db.expire_all()
        novo = db.scalar(
            select(PbiProcessoLicitatorio).where(PbiProcessoLicitatorio.processo == processo)
        )
        assert novo is not None
        assert novo.observador_id == oid
        assert novo.objeto == "Depois da coleta"
    finally:
        db.close()
