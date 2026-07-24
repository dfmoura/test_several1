"""Testes do agendamento: config, cadeia, lock e bloqueio sem admin."""

from __future__ import annotations

import time
import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app import agendamento
from app.auth.service import criar_usuario
from app.database import SessionLocal, Usuario, init_db
from app.main import app


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "1")
    init_db()
    with TestClient(app) as c:
        agendamento.parar_scheduler()
        yield c
    agendamento.parar_scheduler()
    agendamento.status.update(
        running=False,
        fase="idle",
        origem=None,
        log=[],
        resultado=None,
        execucao_id=None,
        iniciado_em=None,
        atualizado_em=None,
        finalizado_em=None,
    )
    from app import job_mercado_ia as jm

    jm.status.update(
        running=False,
        fase="idle",
        cancelado=False,
        total=0,
        processados=0,
        ok=0,
        erros=0,
        atual=None,
        ultimo_erro=None,
        log=[],
        resultado=None,
    )


@pytest.fixture()
def client_auth(monkeypatch):
    monkeypatch.setenv("AUTH_DISABLED", "0")
    init_db()
    with TestClient(app) as c:
        agendamento.parar_scheduler()
        yield c
    agendamento.parar_scheduler()


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def test_obter_e_salvar_agendamento(client):
    r = client.get("/api/sistema/agendamento")
    assert r.status_code == 200
    body = r.json()
    assert "ativo" in body
    assert body["fuso"] == "America/Sao_Paulo"
    assert "params_coleta" in body
    assert body.get("incluir_mercado_ia") is False

    r2 = client.put(
        "/api/sistema/agendamento",
        json={
            "ativo": True,
            "hora": 2,
            "minuto": 30,
            "fuso": "America/Sao_Paulo",
            "incluir_coleta": True,
            "incluir_cnpjs": True,
            "incluir_mercado_ia": True,
        },
    )
    assert r2.status_code == 200
    data = r2.json()
    assert data["ativo"] is True
    assert data["horario"] == "02:30"
    assert data["incluir_coleta"] is True
    assert data["incluir_cnpjs"] is True
    assert data["incluir_mercado_ia"] is True


def test_iso_api_marca_naive_como_utc():
    """Timestamps naive no SQLite são UTC; API deve expor fuso para o frontend."""
    from datetime import datetime, timezone

    naive = datetime(2026, 7, 22, 13, 0, 0)
    iso = agendamento._iso_api(naive)
    assert iso is not None
    assert iso.endswith("+00:00") or iso.endswith("Z")
    # 13:00 UTC ≡ 10:00 America/Sao_Paulo
    aware = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    local = aware.astimezone(agendamento._fuso("America/Sao_Paulo"))
    assert local.hour == 10
    assert local.minute == 0

    assert agendamento._iso_api(None) is None
    already = datetime(2026, 7, 22, 13, 0, 0, tzinfo=timezone.utc)
    out = agendamento._iso_api(already)
    assert out is not None
    assert "+00:00" in out or out.endswith("Z")


def test_tick_compara_hora_no_fuso_sao_paulo(client, monkeypatch):
    """Disparo usa relógio America/Sao_Paulo — não UTC do container (+3h)."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    client.put(
        "/api/sistema/agendamento",
        json={
            "ativo": True,
            "hora": 10,
            "minuto": 0,
            "fuso": "America/Sao_Paulo",
            "incluir_coleta": True,
            "incluir_cnpjs": False,
        },
    )

    disparos: list[str] = []

    def _fake_disparar(*, origem: str = "manual"):
        disparos.append(origem)
        return {"status": "iniciada", "origem": origem}

    monkeypatch.setattr(agendamento, "disparar_cadeia", _fake_disparar)
    monkeypatch.setattr(agendamento, "cadeia_ocupada", lambda: False)

    sp_10 = datetime(2026, 7, 22, 10, 0, 5, tzinfo=ZoneInfo("America/Sao_Paulo"))
    with patch("app.agendamento.datetime") as mock_dt:
        mock_dt.now = lambda tz=None: sp_10 if tz is not None else sp_10.replace(tzinfo=None)
        agendamento._tick_scheduler()

    assert disparos == ["agendado"]

    # 13:00 SP não deve disparar (horário configurado é 10:00).
    disparos.clear()
    sp_13 = datetime(2026, 7, 22, 13, 0, 5, tzinfo=ZoneInfo("America/Sao_Paulo"))
    with patch("app.agendamento.datetime") as mock_dt:
        mock_dt.now = lambda tz=None: sp_13 if tz is not None else sp_13.replace(tzinfo=None)
        agendamento._tick_scheduler()
    assert disparos == []


def test_salvar_exige_ao_menos_uma_etapa(client):
    r = client.put(
        "/api/sistema/agendamento",
        json={
            "ativo": True,
            "hora": 3,
            "minuto": 0,
            "incluir_coleta": False,
            "incluir_cnpjs": False,
            "incluir_mercado_ia": False,
        },
    )
    assert r.status_code == 400


def test_salvar_permite_somente_mercado_ia(client):
    r = client.put(
        "/api/sistema/agendamento",
        json={
            "ativo": False,
            "hora": 3,
            "minuto": 0,
            "incluir_coleta": False,
            "incluir_cnpjs": False,
            "incluir_mercado_ia": True,
        },
    )
    assert r.status_code == 200
    assert r.json()["incluir_mercado_ia"] is True
    assert r.json()["incluir_coleta"] is False


def test_sem_login_bloqueado_no_agendamento(client_auth):
    assert client_auth.get("/api/sistema/agendamento").status_code == 401
    assert client_auth.post("/api/sistema/agendamento/rodar").status_code == 401


def test_consulta_nao_acessa_agendamento(client_auth):
    db = SessionLocal()
    admin = _uid("adm")
    cons = _uid("cons")
    criados: list[str] = []
    try:
        from app.auth.service import AuthError

        try:
            criar_usuario(db, username=admin, senha="admin123", papel="admin")
            criados.append(admin)
        except AuthError as exc:
            pytest.skip(str(exc))

        assert (
            client_auth.post(
                "/api/auth/login",
                json={"username": admin, "password": "admin123"},
            ).status_code
            == 200
        )

        r_cons = client_auth.post(
            "/api/auth/usuarios",
            json={"username": cons, "password": "consulta1", "papel": "consulta"},
        )
        if r_cons.status_code == 409:
            pytest.skip(r_cons.json().get("detail", "teto consulta"))
        assert r_cons.status_code == 201, r_cons.text
        criados.append(cons)

        client_auth.post("/api/auth/logout")
        assert (
            client_auth.post(
                "/api/auth/login",
                json={"username": cons, "password": "consulta1"},
            ).status_code
            == 200
        )
        assert client_auth.get("/api/sistema/agendamento").status_code == 403
        assert client_auth.post("/api/sistema/agendamento/rodar").status_code == 403
    finally:
        for nome in criados:
            row = db.scalar(select(Usuario).where(Usuario.username == nome))
            if row:
                db.delete(row)
                db.commit()
        db.close()


def test_segundo_disparo_simultaneo_recusado(client):
    client.put(
        "/api/sistema/agendamento",
        json={
            "ativo": False,
            "hora": 2,
            "minuto": 0,
            "incluir_coleta": False,
            "incluir_cnpjs": True,
        },
    )

    liberar = {"go": False}

    def _job_lento():
        while not liberar["go"]:
            time.sleep(0.05)
        # Simula job OK sem rede.
        from app.compras import job_pendentes_cnpj as jp

        jp.status["resultado"] = {
            "ok": True,
            "mensagem": "mock",
            "total": 0,
            "ok_count": 0,
            "erros": 0,
        }
        jp.status["running"] = False
        jp.status["fase"] = "idle"

    with patch("app.agendamento.executar_job_pendentes_cnpj", side_effect=_job_lento):
        with patch("app.agendamento.iniciar_job_pendentes_cnpj", return_value={"status": "iniciada"}):
            # Marca running no job para cadeia_ocupada durante o mock lento.
            from app.compras import job_pendentes_cnpj as jp

            def _iniciar():
                jp.status["running"] = True
                return {"status": "iniciada"}

            with patch("app.agendamento.iniciar_job_pendentes_cnpj", side_effect=_iniciar):
                r1 = client.post("/api/sistema/agendamento/rodar")
                assert r1.status_code == 200

                # Aguarda a cadeia marcar running.
                for _ in range(40):
                    if agendamento.status.get("running"):
                        break
                    time.sleep(0.05)

                r2 = client.post("/api/sistema/agendamento/rodar")
                assert r2.status_code == 409

                liberar["go"] = True
                for _ in range(60):
                    if not agendamento.status.get("running"):
                        break
                    time.sleep(0.05)


def test_cadeia_nao_roda_cnpjs_se_coleta_falha(client):
    client.put(
        "/api/sistema/agendamento",
        json={
            "ativo": False,
            "hora": 2,
            "minuto": 0,
            "incluir_coleta": True,
            "incluir_cnpjs": True,
        },
    )

    cnpj_chamado = {"n": 0}

    def _coleta_falha(**kwargs):
        from app import coleta_hub as hub

        hub.status["resultado"] = {"ok": False, "erro": "falha simulada", "fontes": {}}
        hub.status["running"] = False
        hub.status["fase"] = "idle"

    def _cnpj_contar():
        cnpj_chamado["n"] += 1

    with patch("app.agendamento.coleta_hub.preparar_status"):
        with patch("app.agendamento.coleta_hub.executar_coleta_unificada", side_effect=_coleta_falha):
            with patch(
                "app.agendamento.iniciar_job_pendentes_cnpj",
                side_effect=_cnpj_contar,
            ):
                inicio = agendamento.iniciar_cadeia(origem="manual")
                assert inicio["status"] == "iniciada"
                agendamento.executar_cadeia(origem="manual")

    assert cnpj_chamado["n"] == 0
    assert agendamento.status["resultado"]["ok"] is False
    assert "Coleta falhou" in (agendamento.status["resultado"]["resumo"] or "")


def test_cadeia_roda_cnpjs_apos_coleta_ok(client):
    client.put(
        "/api/sistema/agendamento",
        json={
            "ativo": False,
            "hora": 2,
            "minuto": 0,
            "incluir_coleta": True,
            "incluir_cnpjs": True,
        },
    )

    cnpj_chamado = {"n": 0}

    def _coleta_ok(**kwargs):
        from app import coleta_hub as hub

        hub.status["resultado"] = {"ok": True, "fontes": {"compras": {"ok": True}}}
        hub.status["running"] = False
        hub.status["fase"] = "idle"
        hub.status["log"] = ["coleta mock ok"]

    def _iniciar():
        return {"status": "iniciada"}

    def _executar():
        cnpj_chamado["n"] += 1
        from app.compras import job_pendentes_cnpj as jp

        jp.status["resultado"] = {
            "ok": True,
            "mensagem": "ok",
            "total": 0,
            "ok_count": 0,
            "erros": 0,
        }
        jp.status["log"] = ["cnpj mock ok"]
        jp.status["running"] = False

    with patch("app.agendamento.coleta_hub.preparar_status"):
        with patch("app.agendamento.coleta_hub.executar_coleta_unificada", side_effect=_coleta_ok):
            with patch("app.agendamento.iniciar_job_pendentes_cnpj", side_effect=_iniciar):
                with patch("app.agendamento.executar_job_pendentes_cnpj", side_effect=_executar):
                    agendamento.iniciar_cadeia(origem="manual")
                    agendamento.executar_cadeia(origem="manual")

    assert cnpj_chamado["n"] == 1
    assert agendamento.status["resultado"]["ok"] is True

    db = SessionLocal()
    try:
        from app.database import AgendamentoExecucao

        ultima = db.scalars(
            select(AgendamentoExecucao).order_by(AgendamentoExecucao.id.desc()).limit(1)
        ).first()
        assert ultima is not None
        assert ultima.ok is True
        assert ultima.origem == "manual"
    finally:
        db.close()


def test_cadeia_roda_mercado_ia_apos_etapas_ok(client, monkeypatch):
    """Etapa final: preços de mercado só após coleta/CNPJs OK; item a item."""
    client.put(
        "/api/sistema/agendamento",
        json={
            "ativo": False,
            "hora": 2,
            "minuto": 0,
            "incluir_coleta": True,
            "incluir_cnpjs": True,
            "incluir_mercado_ia": True,
        },
    )

    mercado_chamado = {"n": 0}

    def _coleta_ok(**kwargs):
        from app import coleta_hub as hub

        hub.status["resultado"] = {"ok": True, "fontes": {"compras": {"ok": True}}}
        hub.status["running"] = False
        hub.status["fase"] = "idle"
        hub.status["log"] = ["coleta mock ok"]

    def _cnpj_ok():
        from app.compras import job_pendentes_cnpj as jp

        jp.status["resultado"] = {
            "ok": True,
            "mensagem": "ok",
            "total": 0,
            "ok_count": 0,
            "erros": 0,
        }
        jp.status["log"] = ["cnpj mock ok"]
        jp.status["running"] = False

    def _mercado_ok():
        mercado_chamado["n"] += 1
        from app import job_mercado_ia as jm

        jm.status["resultado"] = {
            "ok": True,
            "mensagem": "mercado mock",
            "total": 2,
            "ok_count": 2,
            "erros": 0,
        }
        jm.status["log"] = ["mercado mock ok"]
        jm.status["running"] = False

    with patch("app.agendamento.coleta_hub.preparar_status"):
        with patch("app.agendamento.coleta_hub.executar_coleta_unificada", side_effect=_coleta_ok):
            with patch("app.agendamento.iniciar_job_pendentes_cnpj", return_value={"status": "iniciada"}):
                with patch("app.agendamento.executar_job_pendentes_cnpj", side_effect=_cnpj_ok):
                    with patch("app.agendamento.job_mercado_ia.iniciar_job", return_value={"status": "iniciada"}):
                        with patch(
                            "app.agendamento.job_mercado_ia.executar_job",
                            side_effect=_mercado_ok,
                        ):
                            agendamento.iniciar_cadeia(origem="manual")
                            agendamento.executar_cadeia(origem="manual")

    assert mercado_chamado["n"] == 1
    assert agendamento.status["resultado"]["ok"] is True
    detalhes = agendamento.status["resultado"]["detalhes"]
    assert detalhes["etapas"]["mercado_ia"]["ok"] is True
    assert "mercado 2 ok" in (agendamento.status["resultado"]["resumo"] or "")

def test_cadeia_nao_roda_mercado_se_coleta_falha(client):
    client.put(
        "/api/sistema/agendamento",
        json={
            "ativo": False,
            "hora": 2,
            "minuto": 0,
            "incluir_coleta": True,
            "incluir_cnpjs": False,
            "incluir_mercado_ia": True,
        },
    )

    mercado_chamado = {"n": 0}

    def _coleta_falha(**kwargs):
        from app import coleta_hub as hub

        hub.status["resultado"] = {"ok": False, "erro": "falha simulada", "fontes": {}}
        hub.status["running"] = False
        hub.status["fase"] = "idle"

    def _mercado_contar():
        mercado_chamado["n"] += 1

    with patch("app.agendamento.coleta_hub.preparar_status"):
        with patch("app.agendamento.coleta_hub.executar_coleta_unificada", side_effect=_coleta_falha):
            with patch(
                "app.agendamento.job_mercado_ia.iniciar_job",
                side_effect=_mercado_contar,
            ):
                agendamento.iniciar_cadeia(origem="manual")
                agendamento.executar_cadeia(origem="manual")

    assert mercado_chamado["n"] == 0
    assert agendamento.status["resultado"]["ok"] is False


def test_job_mercado_ia_somente_material_e_um_a_um(client, monkeypatch):
    """Fila = só Material; executa busca uma vez por item, na ordem."""
    from datetime import datetime, timedelta
    from unittest.mock import MagicMock

    from app import job_mercado_ia
    from app.database import CompraContratacao, CompraContratacaoItem

    monkeypatch.setattr(job_mercado_ia, "MERCADO_IA_LOTE_INTERVALO_SEC", 0)

    db = SessionLocal()
    try:
        enc = (datetime.now() + timedelta(days=3)).strftime("%d/%m/%Y %H:%M")
        sufixo = uuid.uuid4().hex[:8]
        id_compra = f"ag{sufixo}"
        c = CompraContratacao(
            chave_compra=id_compra,
            id_compra=id_compra,
            numero="AG-MERC-1",
            processo="PROC-AG/2026",
            ano=2026,
            unidade_compradora="926922",
            unidade_nome="TEST",
            data_encerramento_proposta_pncp=enc,
        )
        db.add(c)
        db.flush()
        mat = CompraContratacaoItem(
            contratacao_id=c.id,
            id_compra=id_compra,
            id_compra_item=f"{id_compra}m",
            numero_item_compra=1,
            descricao_resumida="Material teste agendamento",
            material_ou_servico="M",
            material_ou_servico_nome="Material",
            quantidade="10",
            valor_unitario_estimado="1,00",
            valor_total="10,00",
        )
        serv = CompraContratacaoItem(
            contratacao_id=c.id,
            id_compra=id_compra,
            id_compra_item=f"{id_compra}s",
            numero_item_compra=2,
            descricao_resumida="Serviço não deve entrar",
            material_ou_servico="S",
            material_ou_servico_nome="Serviço",
            quantidade="1",
            valor_unitario_estimado="100,00",
            valor_total="100,00",
        )
        db.add_all([mat, serv])
        db.commit()
        mat_id = mat.id
    finally:
        db.close()

    chamados: list[int] = []

    def _fake_busca(db, item_id, *, usuario=None):
        chamados.append(item_id)
        row = MagicMock()
        row.status = "ok"
        row.erro = None
        return row

    with patch("app.job_mercado_ia.executar_busca_mercado", side_effect=_fake_busca):
        job_mercado_ia.iniciar_job()
        job_mercado_ia.executar_job()

    assert chamados == [mat_id]
    assert job_mercado_ia.status["resultado"]["ok"] is True
    assert job_mercado_ia.status["resultado"]["ok_count"] == 1
    assert job_mercado_ia.status["resultado"]["erros"] == 0