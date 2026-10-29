"""Fase 6 — cadeias CNPJ/CEP com fallback; coleta 07 não aborta."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from sqlalchemy import select

from app.coleta.motor import planejar_e_executar
from app.compras.repository import upsert_fornecedor
from app.database import FilialUasg, Fornecedor, Orgao, Uasg
from app.enriquecimento.cep import consultar_cep_publico
from app.enriquecimento.cnpj import consultar_cnpj_publico
from app.enriquecimento.service import (
    contar_pendentes_cnpj,
    enriquecer_cep,
    enriquecer_cnpj,
    listar_pendentes_cnpj,
    processar_pendentes_cnpj,
    sanear_pendentes_nao_cnpj,
    tentar_enriquecer_pos_coleta,
)


def _uid(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _bootstrap_admin(client) -> None:
    r = client.post(
        "/api/auth/bootstrap",
        json={"username": _uid("adm"), "password": "admin123"},
    )
    assert r.status_code == 200


def test_cnpj_fallback_fonte1_para_fonte2():
    """Queda da fonte 1 usa fonte 2."""
    chamadas: list[str] = []

    def fonte1(_ni: str) -> dict:
        chamadas.append("brasilapi")
        raise RuntimeError("timeout simulado")

    def fonte2(ni: str) -> dict:
        chamadas.append("minhareceita")
        return {
            "cnpj": ni,
            "razao_social": "EMPRESA FALLBACK LTDA",
            "nome_fantasia": "FALLBACK",
            "uf": "MG",
            "municipio": "Uberlândia",
            "cep": "38400000",
            "descricao_situacao_cadastral": "ATIVA",
        }

    def fonte3(_ni: str) -> dict:
        chamadas.append("cnpja")
        raise AssertionError("não deveria chegar na 3ª fonte")

    mapped = consultar_cnpj_publico(
        "12.345.678/0001-95",
        fetchers=[
            ("brasilapi", fonte1),
            ("minhareceita", fonte2),
            ("cnpja", fonte3),
        ],
    )
    assert mapped["fonte_cnpj"] == "minhareceita"
    assert mapped["razao_social"] == "EMPRESA FALLBACK LTDA"
    assert chamadas == ["brasilapi", "minhareceita"]


def test_cep_fallback_fonte1_para_fonte2():
    chamadas: list[str] = []

    def fonte1(_cep: str) -> dict:
        chamadas.append("brasilapi")
        raise RuntimeError("503")

    def fonte2(cep: str) -> dict:
        chamadas.append("viacep")
        return {
            "cep": cep,
            "logradouro": "Av. João Naves",
            "bairro": "Santa Mônica",
            "localidade": "Uberlândia",
            "uf": "MG",
            "ibge": "3170206",
        }

    mapped = consultar_cep_publico(
        "38408-100",
        fetchers=[("brasilapi", fonte1), ("viacep", fonte2)],
    )
    assert mapped["fonte_cep"] == "viacep"
    assert mapped["codigo_municipio_ibge"] == 3170206
    assert chamadas == ["brasilapi", "viacep"]


def test_enriquecer_persiste_fonte_e_cache(client, db):
    _bootstrap_admin(client)
    ni = "12345678000195"

    def ok_fetch(n: str) -> dict:
        return {
            "cnpj": n,
            "razao_social": "FORNECEDOR TESTE SA",
            "uf": "SP",
            "municipio": "São Paulo",
            "cep": "01001000",
        }

    from sqlalchemy import select

    r1 = enriquecer_cnpj(
        db,
        ni,
        fetchers=[("brasilapi", ok_fetch)],
    )
    assert r1["ok"] and not r1["cache"]
    assert r1["fonte_cnpj"] == "brasilapi"

    row = db.scalar(select(Fornecedor).where(Fornecedor.ni == ni))
    assert row is not None
    assert row.cnpj_pendente is False
    assert row.fonte_cnpj == "brasilapi"

    r2 = enriquecer_cnpj(db, ni, fetchers=[("brasilapi", ok_fetch)])
    assert r2["cache"] is True

    # CEP
    def cep_ok(c: str) -> dict:
        return {
            "cep": c,
            "logradouro": "Praça da Sé",
            "localidade": "São Paulo",
            "uf": "SP",
            "ibge": "3550308",
        }

    c1 = enriquecer_cep(db, "01001-000", fetchers=[("viacep", cep_ok)], aplicar_em_ni=ni)
    assert c1["fonte_cep"] == "viacep"
    db.refresh(row)
    assert row.fonte_cep == "viacep"
    assert row.codigo_municipio_ibge == 3550308


def test_coleta_segue_se_enriquecimento_falhar(client, db):
    """Aceite: falha total da cadeia CNPJ não aborta coleta 07."""
    _bootstrap_admin(client)
    org = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org E", "codigo": _uid("OE").upper()[:8]},
    )
    assert org.status_code == 201, org.text
    org_id = org.json()["id"]
    matriz = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={"tipo": "matriz", "nome": "Matriz E", "codigo": "ME"},
    )
    assert matriz.status_code == 201, matriz.text
    filial = client.post(
        f"/api/org/organizacoes/{org_id}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial E",
            "codigo": "FE",
            "matriz_id": matriz.json()["id"],
        },
    )
    assert filial.status_code == 201, filial.text
    orgao = Orgao(codigo_orgao=9200, nome_orgao="O")
    db.add(orgao)
    db.flush()
    uasg = Uasg(codigo_uasg="333333", orgao_id=orgao.id, nome_uasg="U")
    db.add(uasg)
    db.flush()
    db.add(FilialUasg(unidade_id=filial.json()["id"], uasg_id=uasg.id, ativo=True))
    upsert_fornecedor(db, ni="99999999000191", razao_social="PENDENTE")
    db.commit()

    def sync_ok(session, *, codigo_uasg, data_inicial, data_final, **_kw):
        return {"ok": True, "codigo_uasg": codigo_uasg}

    exe = planejar_e_executar(db, origem="teste", periodo_dias=7, sync_fn=sync_ok)
    assert exe.situacao == "concluida"

    def sempre_falha(_ni: str) -> dict:
        raise RuntimeError("todas as fontes down")

    # hook pós-coleta nunca levanta
    result = tentar_enriquecer_pos_coleta(
        db,
        limit=10,
        fetchers=[
            ("brasilapi", sempre_falha),
            ("minhareceita", sempre_falha),
        ],
    )
    assert result["ok"] is True  # lote concluiu
    assert result["erros"] >= 1
    # coleta permanece concluída
    assert exe.situacao == "concluida"


def test_api_resumo_e_pendentes(client, db):
    _bootstrap_admin(client)
    upsert_fornecedor(db, ni="11111111000191", razao_social="A")
    db.commit()

    r = client.get("/api/enriquecimento/resumo")
    assert r.status_code == 200
    body = r.json()
    assert body["cnpj_pendentes"] >= 1
    assert "orcamento_pos_coleta" in body
    assert "ultimo_pos_coleta" in body
    assert body["orcamento_pos_coleta"]["habilitado"] is False  # conftest: limit=0

    p = client.get("/api/enriquecimento/pendentes")
    assert p.status_code == 200
    assert any(x["ni"] == "11111111000191" for x in p.json())


def test_fila_so_cnpj_14_ignora_cpf(client, db):
    """CPF (11) não entra na fila/KPI; CNPJ (14) sim."""
    _bootstrap_admin(client)
    upsert_fornecedor(db, ni="12345678000195", razao_social="PJ")
    upsert_fornecedor(db, ni="00933877684", razao_social="PF")
    db.commit()

    nis = {r.ni for r in listar_pendentes_cnpj(db, limit=50)}
    assert "12345678000195" in nis
    assert "00933877684" not in nis
    assert contar_pendentes_cnpj(db) == len(nis)

    cpf = db.scalar(select(Fornecedor).where(Fornecedor.ni == "00933877684"))
    assert cpf is not None
    assert cpf.cnpj_pendente is False


def test_sanear_pendentes_nao_cnpj(client, db):
    _bootstrap_admin(client)
    # legado: CPF marcado pendente antes do filtro
    row = Fornecedor(ni="76631818672", cnpj_pendente=True, razao_social="PF LEGADO")
    db.add(row)
    db.add(Fornecedor(ni="12345678000195", cnpj_pendente=True, razao_social="PJ"))
    db.commit()

    n = sanear_pendentes_nao_cnpj(db)
    assert n >= 1
    db.refresh(row)
    assert row.cnpj_pendente is False
    assert contar_pendentes_cnpj(db) >= 1
    assert all(len(r.ni) == 14 for r in listar_pendentes_cnpj(db, limit=100))


def test_lote_throttle_entre_itens(client, db):
    """Intervalo entre NIs; backoff após falha (sem sleep real)."""
    _bootstrap_admin(client)
    upsert_fornecedor(db, ni="11111111000191", razao_social="A")
    upsert_fornecedor(db, ni="22222222000191", razao_social="B")
    db.commit()

    sleeps: list[float] = []

    def fake_sleep(sec: float) -> None:
        sleeps.append(sec)

    def ok(ni: str) -> dict:
        return {"cnpj": ni, "razao_social": f"OK {ni}", "uf": "MG"}

    with patch("app.enriquecimento.service.time.sleep", fake_sleep):
        result = processar_pendentes_cnpj(
            db,
            limit=10,
            fetchers=[("brasilapi", ok)],
            intervalo_sec=3.0,
            backoff_sec=30.0,
        )
    assert result["ok_count"] == 2
    assert sleeps == [3.0]


def test_lote_backoff_apos_erro(client, db):
    _bootstrap_admin(client)
    upsert_fornecedor(db, ni="33333333000191", razao_social="C")
    upsert_fornecedor(db, ni="44444444000191", razao_social="D")
    db.commit()

    sleeps: list[float] = []
    n = {"i": 0}

    def flaky(ni: str) -> dict:
        n["i"] += 1
        if n["i"] == 1:
            raise RuntimeError("429")
        return {"cnpj": ni, "razao_social": "OK", "uf": "SP"}

    with patch("app.enriquecimento.service.time.sleep", lambda s: sleeps.append(s)):
        processar_pendentes_cnpj(
            db,
            limit=10,
            fetchers=[("brasilapi", flaky)],
            intervalo_sec=3.0,
            backoff_sec=30.0,
        )
    assert sleeps == [30.0]


def test_hook_pos_coleta_nao_altera_situacao(client, db, monkeypatch):
    """Hook roda após liberar lock; falha de CNPJ não muda situação da 07."""
    import app.config as cfg

    _bootstrap_admin(client)
    org_r = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org H", "codigo": _uid("OH").upper()[:8]},
    )
    assert org_r.status_code == 201, org_r.text
    org = org_r.json()["id"]
    matriz_r = client.post(
        f"/api/org/organizacoes/{org}/unidades",
        json={"tipo": "matriz", "nome": "Matriz H", "codigo": "MH"},
    )
    assert matriz_r.status_code == 201, matriz_r.text
    matriz = matriz_r.json()
    filial_r = client.post(
        f"/api/org/organizacoes/{org}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial H",
            "codigo": "FH",
            "matriz_id": matriz["id"],
        },
    )
    assert filial_r.status_code == 201, filial_r.text
    filial = filial_r.json()
    orgao = Orgao(codigo_orgao=9300, nome_orgao="O")
    db.add(orgao)
    db.flush()
    uasg = Uasg(codigo_uasg="444444", orgao_id=orgao.id, nome_uasg="U")
    db.add(uasg)
    db.flush()
    db.add(FilialUasg(unidade_id=filial["id"], uasg_id=uasg.id, ativo=True))
    upsert_fornecedor(db, ni="55555555000191", razao_social="PEND")
    db.commit()

    monkeypatch.setattr(cfg, "CNPJ_PUBLICO_POS_COLETA_LIMIT", 5)
    chamadas: list[str] = []

    def sync_ok(session, *, codigo_uasg, data_inicial, data_final, **_kw):
        return {"ok": True, "codigo_uasg": codigo_uasg}

    def sempre_falha(_ni: str) -> dict:
        chamadas.append("cnpj")
        raise RuntimeError("fonte down")

    with patch(
        "app.enriquecimento.service.consultar_cnpj_publico",
        side_effect=lambda ni, fetchers=None: sempre_falha(ni),
    ):
        exe = planejar_e_executar(db, origem="teste", periodo_dias=7, sync_fn=sync_ok)

    assert exe.situacao == "concluida"
    assert chamadas  # hook tentou enriquecer
    db.refresh(exe)
    assert exe.situacao == "concluida"

    # Telemetria persistida (fase 2) sem alterar a 07.
    from app.enriquecimento.service import obter_pos_coleta_status

    st = obter_pos_coleta_status(db)
    assert st["execucao_coleta_id"] == exe.id
    assert st["motivo_parada"] in ("lote", "fila_vazia", "tempo")
    assert int(st["total"] or 0) >= 1


def test_orcamento_para_por_tempo(client, db):
    """max_sec interrompe o lote sem processar a fila inteira."""
    _bootstrap_admin(client)
    for i, ni in enumerate(("77777777000191", "88888888000191", "99999999000191")):
        upsert_fornecedor(db, ni=ni, razao_social=f"T{i}")
    db.commit()

    mono = {"t": 0.0}

    def fake_mono() -> float:
        return mono["t"]

    def ok(ni: str) -> dict:
        mono["t"] += 10.0  # cada item “gasta” 10s do orçamento
        return {"cnpj": ni, "razao_social": f"OK {ni}", "uf": "MG"}

    with (
        patch("app.enriquecimento.service.time.monotonic", fake_mono),
        patch("app.enriquecimento.service.time.sleep", lambda _s: None),
    ):
        result = processar_pendentes_cnpj(
            db,
            limit=10,
            fetchers=[("brasilapi", ok)],
            intervalo_sec=0.0,
            backoff_sec=0.0,
            max_sec=15.0,
        )
    assert result["motivo_parada"] == "tempo"
    assert result["processados"] < 3
    assert result["ok_count"] >= 1


def test_fase2_persiste_apos_coleta(client, db, monkeypatch):
    import app.config as cfg
    from app.enriquecimento.service import obter_pos_coleta_status

    _bootstrap_admin(client)
    org_r = client.post(
        "/api/org/organizacoes",
        json={"nome": "Org F2", "codigo": _uid("OF").upper()[:8]},
    )
    assert org_r.status_code == 201, org_r.text
    org = org_r.json()["id"]
    matriz_r = client.post(
        f"/api/org/organizacoes/{org}/unidades",
        json={"tipo": "matriz", "nome": "Matriz F2", "codigo": "MF2"},
    )
    assert matriz_r.status_code == 201, matriz_r.text
    matriz = matriz_r.json()
    filial_r = client.post(
        f"/api/org/organizacoes/{org}/unidades",
        json={
            "tipo": "filial",
            "nome": "Filial F2",
            "codigo": "FF2",
            "matriz_id": matriz["id"],
        },
    )
    assert filial_r.status_code == 201, filial_r.text
    filial = filial_r.json()
    orgao = Orgao(codigo_orgao=9400, nome_orgao="O2")
    db.add(orgao)
    db.flush()
    uasg = Uasg(codigo_uasg="555555", orgao_id=orgao.id, nome_uasg="U2")
    db.add(uasg)
    db.flush()
    db.add(FilialUasg(unidade_id=filial["id"], uasg_id=uasg.id, ativo=True))
    upsert_fornecedor(db, ni="12121212000191", razao_social="PEND F2")
    db.commit()

    monkeypatch.setattr(cfg, "CNPJ_PUBLICO_POS_COLETA_LIMIT", 10)
    monkeypatch.setattr(cfg, "CNPJ_PUBLICO_POS_COLETA_MAX_SEC", 60.0)

    def sync_ok(session, *, codigo_uasg, data_inicial, data_final, **_kw):
        return {"ok": True, "codigo_uasg": codigo_uasg}

    def mapped(ni: str, fetchers=None):
        from datetime import datetime, timezone

        return {
            "ni": ni,
            "razao_social": "FASE2 OK",
            "nome_fantasia": None,
            "porte": None,
            "situacao_cadastral": None,
            "natureza_juridica": None,
            "codigo_cnae": None,
            "nome_cnae": None,
            "uf": "MG",
            "municipio": None,
            "codigo_municipio_ibge": None,
            "cep": None,
            "logradouro": None,
            "numero": None,
            "bairro": None,
            "fonte_cnpj": "brasilapi",
            "cnpj_dados_json": "{}",
            "cnpj_enriquecido_em": datetime.now(timezone.utc).replace(tzinfo=None),
            "cnpj_pendente": False,
            "cnpj_ultimo_erro": None,
        }

    with patch(
        "app.enriquecimento.service.consultar_cnpj_publico",
        side_effect=mapped,
    ):
        exe = planejar_e_executar(db, origem="teste", periodo_dias=7, sync_fn=sync_ok)

    assert exe.situacao == "concluida"
    st = obter_pos_coleta_status(db)
    assert st["execucao_coleta_id"] == exe.id
    assert int(st["ok_count"] or 0) >= 1
    assert st["motivo_parada"] in ("lote", "fila_vazia")

    ag = client.get("/api/coleta/agendamento")
    assert ag.status_code == 200
    pos = ag.json()["pos_coleta"]
    assert pos["orcamento"]["habilitado"] is True
    assert pos["ultimo"]["ok_count"] >= 1


def test_multi_lote_na_janela_ate_esvaziar(client, db):
    """Antes das 06:00: vários lotes com descanso até zerar a fila."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    from app.enriquecimento.service import tentar_enriquecer_pos_coleta

    _bootstrap_admin(client)
    nis = [f"{i:08d}000191" for i in range(101, 106)]  # 5 CNPJs
    for i, ni in enumerate(nis):
        upsert_fornecedor(db, ni=ni, razao_social=f"ML{i}")
    db.commit()

    def mapped(ni: str, fetchers=None):
        from datetime import timezone

        return {
            "ni": ni,
            "razao_social": "OK",
            "nome_fantasia": None,
            "porte": None,
            "situacao_cadastral": None,
            "natureza_juridica": None,
            "codigo_cnae": None,
            "nome_cnae": None,
            "uf": "MG",
            "municipio": None,
            "codigo_municipio_ibge": None,
            "cep": None,
            "logradouro": None,
            "numero": None,
            "bairro": None,
            "fonte_cnpj": "brasilapi",
            "cnpj_dados_json": "{}",
            "cnpj_enriquecido_em": datetime.now(timezone.utc).replace(tzinfo=None),
            "cnpj_pendente": False,
            "cnpj_ultimo_erro": None,
        }

    tz = ZoneInfo("America/Sao_Paulo")
    sleeps: list[float] = []

    with (
        patch("app.enriquecimento.service.consultar_cnpj_publico", side_effect=mapped),
        patch("app.enriquecimento.service.time.sleep", lambda s: sleeps.append(s)),
    ):
        result = tentar_enriquecer_pos_coleta(
            db,
            limit=2,
            max_sec=0,
            descanso_sec=5,
            ate_hora="06:00",
            agora_fn=lambda: datetime(2026, 10, 28, 2, 0, tzinfo=tz),
            persistir=True,
        )
    assert result["ok"] is True
    assert result["lotes"] >= 3  # 2+2+1
    assert result["ok_count"] == 5
    assert result["motivo_parada"] == "fila_vazia"
    assert sleeps.count(5) >= 2  # descanso entre lotes
    assert contar_pendentes_cnpj(db) == 0


def test_fora_da_janela_um_lote_so(client, db):
    """Depois das 06:00: um único lote (coleta manual de dia)."""
    from datetime import datetime
    from zoneinfo import ZoneInfo

    from app.enriquecimento.service import tentar_enriquecer_pos_coleta

    _bootstrap_admin(client)
    for i, ni in enumerate(("13131313000191", "14141414000191", "15151515000191")):
        upsert_fornecedor(db, ni=ni, razao_social=f"D{i}")
    db.commit()

    def mapped(ni: str, fetchers=None):
        from datetime import timezone

        return {
            "ni": ni,
            "razao_social": "OK",
            "nome_fantasia": None,
            "porte": None,
            "situacao_cadastral": None,
            "natureza_juridica": None,
            "codigo_cnae": None,
            "nome_cnae": None,
            "uf": "SP",
            "municipio": None,
            "codigo_municipio_ibge": None,
            "cep": None,
            "logradouro": None,
            "numero": None,
            "bairro": None,
            "fonte_cnpj": "brasilapi",
            "cnpj_dados_json": "{}",
            "cnpj_enriquecido_em": datetime.now(timezone.utc).replace(tzinfo=None),
            "cnpj_pendente": False,
            "cnpj_ultimo_erro": None,
        }

    tz = ZoneInfo("America/Sao_Paulo")
    with patch(
        "app.enriquecimento.service.consultar_cnpj_publico", side_effect=mapped
    ):
        result = tentar_enriquecer_pos_coleta(
            db,
            limit=2,
            max_sec=0,
            descanso_sec=5,
            ate_hora="06:00",
            agora_fn=lambda: datetime(2026, 10, 28, 10, 30, tzinfo=tz),
            persistir=False,
        )
    assert result["lotes"] == 1
    assert result["ok_count"] == 2
    assert result["motivo_parada"] == "lote"
    assert contar_pendentes_cnpj(db) == 1


def test_api_job_pendentes(client, db):
    from datetime import datetime, timezone

    _bootstrap_admin(client)
    upsert_fornecedor(db, ni="66666666000191", razao_social="J")
    db.commit()

    def mapped(ni: str, fetchers=None):
        return {
            "ni": ni,
            "razao_social": "JOB OK",
            "nome_fantasia": None,
            "porte": None,
            "situacao_cadastral": None,
            "natureza_juridica": None,
            "codigo_cnae": None,
            "nome_cnae": None,
            "uf": "MG",
            "municipio": None,
            "codigo_municipio_ibge": None,
            "cep": None,
            "logradouro": None,
            "numero": None,
            "bairro": None,
            "fonte_cnpj": "brasilapi",
            "cnpj_dados_json": "{}",
            "cnpj_enriquecido_em": datetime.now(timezone.utc).replace(tzinfo=None),
            "cnpj_pendente": False,
            "cnpj_ultimo_erro": None,
        }

    with patch("app.enriquecimento.service.consultar_cnpj_publico", side_effect=mapped):
        r = client.post("/api/enriquecimento/job/pendentes?limit=10")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body["ok_count"] >= 1
    assert "status" in body
