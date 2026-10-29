"""Fase 5 — planejador com dedupe UASG; falhas parciais recuperáveis."""

from __future__ import annotations

import uuid
from datetime import date

from app.coleta.motor import planejar_e_executar, reprocessar_falhas
from app.coleta.planejador import planejar_coleta
from app.database import FilialUasg, Orgao, Uasg


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _bootstrap_admin(client) -> None:
    r = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert r.status_code == 200


def _duas_filiais_mesma_uasg(client, db) -> tuple[int, int, str]:
    """Retorna (filial_a_id, filial_b_id, codigo_uasg) compartilhando a mesma UASG."""
    org_id = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org Coleta", "codigo": _uid("OG").upper()[:8]},
    ).json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz", "codigo": "M"},
    ).json()
    fa = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial A",
            "codigo": "FA",
            "matriz_id": matriz["id"],
        },
    ).json()
    fb = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial B",
            "codigo": "FB",
            "matriz_id": matriz["id"],
        },
    ).json()

    orgao = Orgao(codigo_orgao=9100, nome_orgao="ORGAO TESTE")
    db.add(orgao)
    db.flush()
    uasg = Uasg(
        codigo_uasg="111111",
        orgao_id=orgao.id,
        nome_uasg="UASG COMPARTILHADA",
        sigla_uf="MG",
    )
    db.add(uasg)
    db.flush()
    db.add(FilialUasg(unidade_id=fa["id"], uasg_id=uasg.id, ativo=True))
    db.add(FilialUasg(unidade_id=fb["id"], uasg_id=uasg.id, ativo=True))
    db.commit()
    return fa["id"], fb["id"], "111111"


def test_plano_dedupe_duas_filiais_uma_uasg(client, db):
    _bootstrap_admin(client)
    _duas_filiais_mesma_uasg(client, db)

    plano = planejar_coleta(db, periodo_dias=30)
    assert plano.total_vinculos_filial == 2
    assert plano.total_uasgs_unicas == 1
    assert plano.to_dict()["dedupe_economia"] == 1

    api = client.get("/api/coleta/plano?periodo_dias=30")
    assert api.status_code == 200
    body = api.json()
    assert body["total_uasgs_unicas"] == 1
    assert body["total_vinculos_filial"] == 2
    assert body["necessidades"][0]["filiais_count"] == 2


def test_execucao_uma_sequencia_http_para_uasg_compartilhada(client, db):
    _bootstrap_admin(client)
    _duas_filiais_mesma_uasg(client, db)

    chamadas: list[str] = []

    def sync_mock(session, *, codigo_uasg, data_inicial, data_final, **_kw):
        chamadas.append(codigo_uasg)
        return {
            "ok": True,
            "codigo_uasg": codigo_uasg,
            "contratacoes": 0,
            "itens": 0,
            "resultados": 0,
        }

    exe = planejar_e_executar(
        db,
        origem="teste",
        periodo_dias=30,
        sync_fn=sync_mock,
    )
    assert len(chamadas) == 1
    assert chamadas[0] == "111111"
    assert exe.sequencias_http == 1
    assert exe.total_tarefas == 1
    assert exe.tarefas_ok == 1
    assert exe.situacao == "concluida"

    det = client.get(f"/api/coleta/execucoes/{exe.id}")
    assert det.status_code == 200
    d = det.json()
    assert d["sequencias_http"] == 1
    assert len(d["tarefas"]) == 1
    assert d["tarefas"][0]["filiais"]["ids"]  # duas filiais no audit
    assert len(d["tarefas"][0]["filiais"]["ids"]) == 2


def test_falha_parcial_recuperavel(client, db):
    _bootstrap_admin(client)
    fa, fb, codigo = _duas_filiais_mesma_uasg(client, db)

    # segunda UASG só na filial A
    u2 = Uasg(codigo_uasg="222222", nome_uasg="UASG B")
    db.add(u2)
    db.flush()
    db.add(FilialUasg(unidade_id=fa, uasg_id=u2.id, ativo=True))
    db.commit()

    ja_falhou: set[str] = set()

    def sync_flaky(session, *, codigo_uasg, data_inicial, data_final, **_kw):
        if codigo_uasg == "222222" and codigo_uasg not in ja_falhou:
            ja_falhou.add(codigo_uasg)
            raise RuntimeError("API timeout simulado")
        return {"ok": True, "codigo_uasg": codigo_uasg}

    # primeira execução: 111111 ok, 222222 falha → 2 sequências HTTP tentadas
    exe = planejar_e_executar(
        db,
        origem="teste",
        periodo_dias=7,
        data_inicial=date(2024, 1, 1),
        data_final=date(2024, 1, 7),
        sync_fn=sync_flaky,
    )
    assert exe.total_tarefas == 2
    assert exe.tarefas_falha == 1
    assert exe.tarefas_ok == 1
    assert exe.situacao == "concluida_com_ressalvas"

    # reprocesso só da falha → mais 1 sequência
    exe2 = reprocessar_falhas(db, exe.id, sync_fn=sync_flaky)
    assert exe2.tarefas_falha == 0
    assert exe2.tarefas_ok == 2
    assert exe2.situacao == "concluida"

    r = client.post(f"/api/coleta/execucoes/{exe.id}/reprocessar")
    # já sem falhas — ainda 200, nada a fazer ou ok
    assert r.status_code == 200


def test_agendamento_config_api(client, db):
    _bootstrap_admin(client)
    g = client.get("/api/coleta/agendamento")
    assert g.status_code == 200
    body = g.json()
    assert body["ativo"] is False
    assert body["status_operacional"] == "inativo"
    assert body["disparador"]["habilitado"] is False
    assert body["disparador"]["modo"] == "off"

    put = client.put(
        "/api/coleta/agendamento",
        json={"ativo": True, "hora_local": "03:30", "periodo_dias": 90},
    )
    assert put.status_code == 200, put.text
    assert put.json()["ativo"] is True
    assert put.json()["hora_local"] == "03:30"
    assert put.json()["periodo_dias"] == 90
    assert put.json()["status_operacional"] == "ativo_sem_disparador"

    # Plano/execução sem periodo_dias → usa Agendamento (90)
    plano = client.get("/api/coleta/plano")
    assert plano.status_code == 200
    assert plano.json()["data_inicial"]  # período aplicado
    # 90 dias atrás a partir de hoje
    from datetime import date, timedelta

    hoje = date.today()
    assert plano.json()["data_final"] == hoje.isoformat()
    assert plano.json()["data_inicial"] == (hoje - timedelta(days=90)).isoformat()


def test_tick_catchup_apos_horario(client, db, monkeypatch):
    """Após o horário, sem disparo no dia → catch-up; 2º tick no mesmo dia não repete."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    from app.coleta import agendamento as ag
    from app.coleta import motor as motor_mod

    _bootstrap_admin(client)
    _duas_filiais_mesma_uasg(client, db)

    put = client.put(
        "/api/coleta/agendamento",
        json={"ativo": True, "hora_local": "01:00", "periodo_dias": 30},
    )
    assert put.status_code == 200

    tz = ZoneInfo("America/Sao_Paulo")
    # Ainda antes das 01:00 → não dispara
    monkeypatch.setattr(
        ag, "_agora_local", lambda: datetime(2026, 10, 27, 0, 30, tzinfo=tz)
    )
    early = client.post("/api/coleta/agendamento/tick")
    assert early.status_code == 200
    assert early.json()["disparado"] is False
    assert early.json()["motivo"] == "aguardando_hora"

    chamadas: list[str] = []

    def sync_mock(session, *, codigo_uasg, data_inicial, data_final, **_kw):
        chamadas.append(codigo_uasg)
        return {"ok": True, "codigo_uasg": codigo_uasg}

    # Motor real (FK válido) com sync mockado — sem HTTP externo.
    monkeypatch.setattr(motor_mod, "sincronizar_contratacoes_uasg", sync_mock)

    # Depois das 01:00 (fora da antiga janela de 15 min) → catch-up
    monkeypatch.setattr(
        ag, "_agora_local", lambda: datetime(2026, 10, 27, 9, 45, tzinfo=tz)
    )
    mid = client.post("/api/coleta/agendamento/tick")
    assert mid.status_code == 200, mid.text
    assert mid.json()["disparado"] is True
    assert mid.json()["chave_dia"] == "2026-10-27"
    assert mid.json()["execucao_id"]
    assert len(chamadas) == 1

    # Dia já marcado no início — 2º tick não repete
    g = client.get("/api/coleta/agendamento")
    assert g.json()["ultimo_disparo_chave"] == "2026-10-27"
    assert g.json()["status_operacional"] in (
        "disparado_hoje",
        "ativo_sem_disparador",
    )

    again = client.post("/api/coleta/agendamento/tick")
    assert again.status_code == 200
    assert again.json()["disparado"] is False
    assert again.json()["motivo"] == "ja_disparado_hoje"
    assert len(chamadas) == 1


def test_coleta_pontual_por_codigo_uasg(client, db):
    """Executar com codigo_uasg gera 1 tarefa/HTTP só da UASG pedida."""
    _bootstrap_admin(client)
    fa, _fb, codigo = _duas_filiais_mesma_uasg(client, db)

    u2 = Uasg(codigo_uasg="222222", nome_uasg="UASG B")
    db.add(u2)
    db.flush()
    db.add(FilialUasg(unidade_id=fa, uasg_id=u2.id, ativo=True))
    db.commit()

    plano_filtro = planejar_coleta(db, periodo_dias=30, codigo_uasg=codigo)
    assert plano_filtro.total_uasgs_unicas == 1
    assert plano_filtro.necessidades[0].codigo_uasg == codigo
    assert len(plano_filtro.necessidades[0].filiais_ids) == 2

    chamadas: list[str] = []

    def sync_mock(session, *, codigo_uasg, data_inicial, data_final, **_kw):
        chamadas.append(codigo_uasg)
        return {"ok": True, "codigo_uasg": codigo_uasg}

    exe = planejar_e_executar(
        db,
        origem="teste",
        periodo_dias=30,
        codigo_uasg=codigo,
        sync_fn=sync_mock,
    )
    assert chamadas == [codigo]
    assert exe.total_tarefas == 1
    assert exe.sequencias_http == 1
    assert exe.situacao == "concluida"

    api = client.post(
        "/api/coleta/executar",
        json={"codigo_uasg": codigo, "dry_run": True, "periodo_dias": 30},
    )
    assert api.status_code == 200, api.text
    body = api.json()
    assert body["total_tarefas"] == 1
    assert body["tarefas"][0]["codigo_uasg"] == codigo
    assert len(body["tarefas"][0]["filiais"]["ids"]) == 2

    miss = client.post(
        "/api/coleta/executar",
        json={"codigo_uasg": "999999", "dry_run": True},
    )
    assert miss.status_code == 400
    assert "999999" in miss.json()["detail"]
