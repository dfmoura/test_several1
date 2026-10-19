from __future__ import annotations

import uuid
from datetime import date, datetime
from zoneinfo import ZoneInfo

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.agenda import ciclo, enfileirar_noite, processar_disponiveis
from app.coleta import PaginaInterrompida, executar_faixa_a, upsert_contratacao
from app.contas import criar_filial, criar_usuario
from app.db import SessionLocal, definir_contexto, engine, garantir_contexto, restaurar_contexto
from app.escopo import sincronizar_registros
from app.faixa_b import executar_faixa_b
from app.http_oficial import ClienteHttp
from app.main import app
from app.models import AnotacaoInterna, AuditoriaAcesso, ColetaCursor, ColetaEtapa, ColetaJob, Contratacao, ContratacaoItem, Filial
from app.regras import periodo_diario
from app.tempo import FUSO, agora_utc
from tests.fabrica import cnpj_valido_de, filial_uberlandia, gravar_uasg

SENHA = "senha-forte"


class _Principal:
    def __init__(self, usuario_id, filial_id=None):
        self.usuario_id = usuario_id
        self.filial_id = filial_id


def _db():
    return SessionLocal()


def _gestor(db, filial, username):
    return criar_usuario(
        db,
        username=username,
        senha=SENHA,
        papel="filial_gestor",
        filial_id=filial.id,
        autor=None,
    )


def test_sem_sessao_nao_ha_dado():
    with TestClient(app) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/painel").status_code == 401
        assert client.get("/api/contratacoes").status_code == 401
        assert client.get("/api/master/fila").status_code == 401


def test_cota_filial_e_master_separadas():
    db = _db()
    try:
        uber = filial_uberlandia(db)
        master = criar_usuario(
            db, username="master.admin", senha=SENHA, papel="master_admin", filial_id=None
        )
        autor = _Principal(master.id)
        for i in range(5):
            papel = "filial_gestor" if i == 0 else "filial_analista"
            criar_usuario(
                db,
                username=f"pessoa{i}",
                senha=SENHA,
                papel=papel,
                filial_id=uber.id,
                autor=autor,
            )
        try:
            criar_usuario(
                db,
                username="pessoa6",
                senha=SENHA,
                papel="filial_analista",
                filial_id=uber.id,
                autor=autor,
            )
            raise AssertionError("a sexta conta deveria ser recusada")
        except Exception as exc:
            assert getattr(exc, "status", None) == 409
            assert "5" in str(exc)
        outra = criar_filial(
            db,
            nome="Filial B",
            cnpj=cnpj_valido_de("112223330001"),
            municipio="Araguari",
            uf="MG",
            codigo_ibge=3103504,
            autor=autor,
        )
        criar_usuario(
            db,
            username="master.analista",
            senha=SENHA,
            papel="master_analista",
            filial_id=None,
            autor=autor,
        )
        assert outra.cnpj != uber.cnpj
    finally:
        db.close()


def test_isolamento_entre_filiais():
    db = _db()
    try:
        uber = filial_uberlandia(db)
        master = criar_usuario(
            db, username="master.iso", senha=SENHA, papel="master_admin", filial_id=None
        )
        autor = _Principal(master.id)
        outra = criar_filial(
            db,
            nome="Observatório Vizinho",
            cnpj=cnpj_valido_de("223334440001"),
            municipio="Araguari",
            uf="MG",
            codigo_ibge=3103504,
            autor=autor,
        )
        gestor_a = _gestor(db, uber, "gestor.uber")
        gestor_b = _gestor(db, outra, "gestor.viz")
        criar_usuario(
            db,
            username="analista.uber",
            senha=SENHA,
            papel="filial_analista",
            filial_id=uber.id,
            autor=_Principal(gestor_a.id, uber.id),
        )
        gravar_uasg(db, uber, "926922", "18431312000115")
        gravar_uasg(db, outra, "111111", "11222333000181")
        tokens = definir_contexto(str(uber.id), master=False)
        upsert_contratacao(
            db,
            uber.id,
            {
                "numeroControlePNCP": "PNCP-UBER",
                "objetoCompra": "Obra de Uberlândia",
                "modalidadeIdPncp": 8,
                "codigoModalidade": 6,
                "modalidadeNome": "Dispensa",
                "valorTotalEstimado": "10.50",
                "valorTotalHomologado": "9.00",
                "dataPublicacaoPncp": "2026-02-01",
                "existeResultado": False,
            },
            "926922",
        )
        db.add(
            AnotacaoInterna(
                tenant_id=uber.id,
                alvo_tipo="contratacao",
                alvo_chave="PNCP-UBER",
                texto="marcação interna",
            )
        )
        db.commit()
        restaurar_contexto(tokens)
        tokens = definir_contexto(str(outra.id), master=False)
        upsert_contratacao(
            db,
            outra.id,
            {
                "numeroControlePNCP": "PNCP-VIZ",
                "objetoCompra": "Obra vizinha",
                "modalidadeIdPncp": 6,
                "codigoModalidade": 5,
                "modalidadeNome": "Pregão - Eletrônico",
                "dataPublicacaoPncp": "2026-03-01",
                "existeResultado": True,
            },
            "111111",
        )
        from app.models import ContratoPncp, AtaPncp

        db.add(
            ContratoPncp(
                tenant_id=outra.id,
                numero_controle_pncp="CTR-VIZ",
                numero_controle_pncp_compra=None,
                cnpj_orgao="11222333000181",
                codigo_uasg="111111",
                objeto="Contrato vizinho",
                atualizado_em=agora_utc(),
            )
        )
        db.add(
            AtaPncp(
                tenant_id=outra.id,
                numero_controle_pncp="ATA-VIZ",
                numero_controle_pncp_compra="PNCP-VIZ",
                cnpj_orgao="11222333000181",
                codigo_uasg="111111",
                objeto="Ata vizinha",
                atualizado_em=agora_utc(),
            )
        )
        db.commit()
        restaurar_contexto(tokens)
        with engine.connect() as conn:
            with conn.begin():
                conn.execute(
                    text("SELECT set_config('app.filial_id', :id, true), set_config('app.acesso', '', true)"),
                    {"id": str(uber.id)},
                )
                vistos = conn.execute(text("SELECT numero_controle_pncp FROM contratacao")).scalars().all()
                assert vistos == ["PNCP-UBER"]
        with TestClient(app) as client:
            entrar = client.post("/api/sessao", json={"usuario": "gestor.uber", "senha": SENHA})
            assert entrar.status_code == 200
            lista = client.get("/api/contratacoes?de=2026-01-01&ate=2026-12-31")
            assert lista.status_code == 200
            numeros = [item["numero_controle_pncp"] for item in lista.json()["contratacoes"]]
            assert numeros == ["PNCP-UBER"]
            assert lista.json()["contratacoes"][0]["modalidade_nome"] == "Dispensa"
            assert lista.json()["contratacoes"][0]["codigo_modalidade"] == 6
            por_codigo = client.get("/api/contratacoes?codigo_modalidade=6&de=2026-01-01&ate=2026-12-31")
            assert len(por_codigo.json()["contratacoes"]) == 1
            por_id_pncp = client.get("/api/contratacoes?codigo_modalidade=8&de=2026-01-01&ate=2026-12-31")
            assert por_id_pncp.json()["contratacoes"] == []
            alheia = client.get("/api/contratacoes/" + _id_de(db, "PNCP-VIZ"))
            assert alheia.status_code == 404
            usuarios = client.get("/api/usuarios").json()["usuarios"]
            assert {u["usuario"] for u in usuarios} == {"gestor.uber", "analista.uber"}
            escopo = {item["codigo_uasg"] for item in client.get("/api/escopo").json()["uasgs"]}
            assert escopo == {"926922"}
            client.post("/api/sessao", json={"usuario": "gestor.viz", "senha": SENHA, "encerrar_anterior": True})
            # a sessão de uber foi trocada; entra como vizinho
            saida = client.post(
                "/api/sessao",
                json={"usuario": "gestor.viz", "senha": SENHA, "encerrar_anterior": True},
            )
            assert saida.status_code == 200
            assert "PNCP-UBER" not in str(client.get("/api/contratacoes").json())
            assert client.get("/api/contratos").json()["contratos"][0]["vinculo_rotulo"] == "não vinculado"
            assert "ATA-VIZ" in str(client.get("/api/atas").json())
        tokens = definir_contexto(str(uber.id), master=False)
        upsert_contratacao(
            db,
            uber.id,
            {
                "numeroControlePNCP": "PNCP-UBER",
                "objetoCompra": "Obra revisada",
                "modalidadeIdPncp": 8,
                "codigoModalidade": 6,
                "modalidadeNome": "Dispensa",
                "existeResultado": False,
            },
            "926922",
        )
        db.commit()
        nota = db.scalar(
            select(AnotacaoInterna).where(AnotacaoInterna.alvo_chave == "PNCP-UBER")
        )
        objeto = db.scalar(select(Contratacao).where(Contratacao.numero_controle_pncp == "PNCP-UBER"))
        assert nota.texto == "marcação interna"
        assert objeto.objeto == "Obra revisada"
        restaurar_contexto(tokens)
        assert gestor_b.filial_id == outra.id
    finally:
        db.close()


def _id_de(db, numero: str) -> str:
    tokens = definir_contexto(None, master=True)
    try:
        garantir_contexto(db)
        row = db.scalar(select(Contratacao).where(Contratacao.numero_controle_pncp == numero))
        return str(row.id)
    finally:
        restaurar_contexto(tokens)
        db.commit()


def test_sessao_unica_idle_e_auditoria_sem_senha():
    db = _db()
    try:
        uber = filial_uberlandia(db)
        _gestor(db, uber, "gestor.sessao")
    finally:
        db.close()
    with TestClient(app) as client:
        primeiro = client.post("/api/sessao", json={"usuario": "gestor.sessao", "senha": SENHA})
        assert primeiro.status_code == 200
        segundo = client.post("/api/sessao", json={"usuario": "gestor.sessao", "senha": SENHA})
        assert segundo.status_code == 409
        assert segundo.json()["acao"] == "encerrar_sessao_anterior"
        falha = client.post("/api/sessao", json={"usuario": "gestor.sessao", "senha": "errada-demais"})
        assert falha.status_code == 401
    db = _db()
    try:
        detalhes = " ".join(linha.detalhe for linha in db.scalars(select(AuditoriaAcesso)).all())
        assert SENHA not in detalhes
        assert "errada-demais" not in detalhes
        from datetime import timedelta

        from app.models import Sessao

        with TestClient(app) as client:
            assert client.post(
                "/api/sessao",
                json={"usuario": "gestor.sessao", "senha": SENHA, "encerrar_anterior": True},
            ).status_code == 200
            sessao = db.scalar(select(Sessao))
            sessao.ultimo_acesso_em = agora_utc() - timedelta(minutes=31)
            db.commit()
            assert client.get("/api/eu").status_code == 401
    finally:
        db.close()


def test_analista_nao_gerencia():
    db = _db()
    try:
        uber = filial_uberlandia(db)
        gestor = _gestor(db, uber, "gestor.perm")
        criar_usuario(
            db,
            username="analista.perm",
            senha=SENHA,
            papel="filial_analista",
            filial_id=uber.id,
            autor=_Principal(gestor.id, uber.id),
        )
    finally:
        db.close()
    with TestClient(app) as client:
        assert client.post("/api/sessao", json={"usuario": "analista.perm", "senha": SENHA}).status_code == 200
        assert client.post("/api/coleta", json={"tipo": "diario"}).status_code == 403
        assert client.post("/api/usuarios", json={"usuario": "novo.user", "senha": SENHA, "papel": "filial_analista"}).status_code == 403
        assert client.post("/api/escopo/926922", json={"aderida": True}).status_code == 403
        assert client.post("/api/filiais", json={
            "nome": "X", "cnpj": "23497346000142", "municipio": "Uberlândia", "uf": "MG", "codigo_ibge": 3170206
        }).status_code == 403


def test_master_analista_nao_cria_filial():
    db = _db()
    try:
        criar_usuario(db, username="master.le", senha=SENHA, papel="master_admin", filial_id=None)
        criar_usuario(
            db,
            username="master.leitura",
            senha=SENHA,
            papel="master_analista",
            filial_id=None,
            autor=None,
        )
    finally:
        db.close()
    with TestClient(app) as client:
        client.post("/api/sessao", json={"usuario": "master.leitura", "senha": SENHA})
        resposta = client.post(
            "/api/filiais",
            json={
                "nome": "Nova",
                "cnpj": cnpj_valido_de("334445550001"),
                "municipio": "Ituiutaba",
                "uf": "MG",
                "codigo_ibge": 3134202,
            },
        )
        assert resposta.status_code == 403
        fila = client.get("/api/master/fila")
        assert fila.status_code == 200


class _Coleta:
    def __init__(self) -> None:
        self.chamadas: list[tuple] = []
        self.falhar_pagina: int | None = 2
        self.total = 2

    def uasgs(self, *, ibge: int, uf: str):
        self.chamadas.append(("uasgs", ibge, uf))
        return [
            {
                "codigoUasg": "926922",
                "nomeUasg": "PMU",
                "siglaUf": "MG",
                "codigoMunicipioIbge": 3170206,
                "statusUasg": True,
                "cnpjCpfOrgao": "18431312000115",
            },
            {
                "codigoUasg": "999999",
                "nomeUasg": "Outra cidade",
                "siglaUf": "MG",
                "codigoMunicipioIbge": 3103504,
                "statusUasg": True,
                "cnpjCpfOrgao": "11222333000181",
            },
            {
                "codigoUasg": "926287",
                "nomeUasg": "DMAE",
                "siglaUf": "MG",
                "codigoMunicipioIbge": 3170206,
                "statusUasg": False,
                "cnpjCpfOrgao": "18431312000115",
            },
        ]

    def contratacoes(self, *, uasg, inicio, fim, codigo_modalidade, pagina, tamanho):
        self.chamadas.append(("contratacoes", inicio, fim, codigo_modalidade, uasg))
        return {
            "resultado": [
                {
                    "numeroControlePNCP": "PNCP-NOITE",
                    "objetoCompra": "Material",
                    "modalidadeIdPncp": 8,
                    "codigoModalidade": codigo_modalidade,
                    "modalidadeNome": "Dispensa" if codigo_modalidade == 6 else "Outra",
                    "dataPublicacaoPncp": "2026-10-18",
                    "existeResultado": False,
                    "orgaoEntidadeCnpj": "18431312000115",
                    "anoCompraPncp": 2026,
                }
            ],
            "totalPaginas": 1,
        }

    def por_numero(self, numero):
        self.chamadas.append(("por_numero", numero))
        return None

    def itens(self, *, uasg, inicio, fim, pagina, tamanho):
        self.chamadas.append(("itens", pagina, inicio, fim))
        if pagina == self.falhar_pagina:
            raise PaginaInterrompida(pagina)
        return {
            "resultado": [
                {
                    "numeroControlePNCPCompra": "PNCP-NOITE",
                    "numeroItemPncp": pagina,
                    "descricaoResumida": f"item {pagina}",
                    "temResultado": False,
                }
            ],
            "totalPaginas": self.total,
        }

    def resultados(self, numero):
        self.chamadas.append(("resultados", numero))
        return []

    def catalogo(self, codigo, tipo):
        raise RuntimeError("catálogo indisponível")


def test_coleta_incremental_cursor_e_barreira():
    db = _db()
    cliente = _Coleta()
    try:
        uber = filial_uberlandia(db)
        job = ColetaJob(
            filial_id=uber.id,
            faixa="A",
            tipo="diario",
            noite=date(2026, 10, 19),
            status="pendente",
        )
        db.add(job)
        db.commit()
        tokens = definir_contexto(str(uber.id), master=False)
        executar_faixa_a(db, job, cliente, hoje=date(2026, 10, 19))
        db.refresh(job)
        assert job.status == "continua_amanha"
        assert "Faixa B" in job.motivo
        janelas = [c for c in cliente.chamadas if c[0] == "contratacoes"]
        assert janelas
        assert all(c[1] == date(2026, 10, 12) and c[2] == date(2026, 10, 19) for c in janelas)
        assert all(c[3] != 8 for c in janelas)
        assert ("por_numero", "PNCP-NOITE") in cliente.chamadas
        assert not any(c[0] == "uasgs" and c[1] != 3170206 for c in cliente.chamadas)
        cursor = db.scalar(select(ColetaCursor))
        assert cursor.pagina == 2
        b = db.scalar(select(ColetaJob).where(ColetaJob.faixa == "B"))
        assert b is None
        with TestClient(app) as client_http:
            criar_usuario(db, username="master.fila", senha=SENHA, papel="master_admin", filial_id=None)
            client_http.post("/api/sessao", json={"usuario": "master.fila", "senha": SENHA})
            motivos = " ".join(item["motivo"] for item in client_http.get("/api/master/fila").json()["jobs"])
            assert "Faixa B" in motivos
        cliente.falhar_pagina = None
        executar_faixa_a(db, job, cliente, hoje=date(2026, 10, 19))
        db.refresh(job)
        assert job.status == "ok"
        itens = db.scalars(select(ContratacaoItem)).all()
        assert {item.numero_item for item in itens} == {1, 2}
        paginas = [c[1] for c in cliente.chamadas if c[0] == "itens"]
        assert paginas.count(1) == 1
        restaurar_contexto(tokens)
    finally:
        db.close()


def test_faixa_b_recusa_sem_a_e_grava_nao_vinculado():
    db = _db()
    try:
        uber = filial_uberlandia(db)
        gravar_uasg(db, uber, "926922", "18431312000115")
        job_b = ColetaJob(
            filial_id=uber.id, faixa="B", tipo="diario", noite=date(2026, 10, 19), status="pendente"
        )
        db.add(job_b)
        db.commit()

        class Bomba:
            def contratos(self, **kwargs):
                raise AssertionError(kwargs)

            def atas(self, **kwargs):
                raise AssertionError(kwargs)

        tokens = definir_contexto(str(uber.id), master=False)
        executar_faixa_b(db, job_b, Bomba())
        db.refresh(job_b)
        assert job_b.status == "erro"
        assert "Faixa B" in job_b.motivo
        job_a = ColetaJob(
            filial_id=uber.id, faixa="A", tipo="diario", noite=date(2026, 10, 18), status="ok"
        )
        db.add(job_a)
        db.flush()
        for codigo in ("A2", "A3", "A4"):
            db.add(ColetaEtapa(job_id=job_a.id, codigo=codigo, status="ok"))
        job_b2 = ColetaJob(
            filial_id=uber.id, faixa="B", tipo="diario", noite=date(2026, 10, 18), status="pendente"
        )
        db.add(job_b2)
        db.commit()

        class Ok:
            def __init__(self):
                self.cnpjs = []

            def contratos(self, **kwargs):
                self.cnpjs.append(kwargs["cnpj_orgao"])
                assert kwargs["cnpj_orgao"] != "23497346000142"
                return {
                    "data": [
                        {"numeroControlePNCP": "CTR-1", "objetoContrato": "Serviço", "valorGlobal": 3}
                    ],
                    "totalPaginas": 1,
                }

            def atas(self, **kwargs):
                self.cnpjs.append(kwargs["cnpj_orgao"])
                return {"data": [], "totalPaginas": 1}

        cliente = Ok()
        executar_faixa_b(db, job_b2, cliente, hoje=date(2026, 10, 18))
        db.refresh(job_b2)
        assert job_b2.status == "ok"
        assert "23497346000142" not in cliente.cnpjs
        job_a3 = ColetaJob(
            filial_id=uber.id, faixa="A", tipo="diario", noite=date(2026, 10, 17), status="ok"
        )
        db.add(job_a3)
        db.flush()
        for codigo in ("A2", "A3", "A4"):
            db.add(ColetaEtapa(job_id=job_a3.id, codigo=codigo, status="ok"))
        job_b3 = ColetaJob(
            filial_id=uber.id, faixa="B", tipo="diario", noite=date(2026, 10, 17), status="pendente"
        )
        db.add(job_b3)
        db.commit()

        class Limite:
            def contratos(self, **kwargs):
                raise RuntimeError("HTTP 429")

            def atas(self, **kwargs):
                raise AssertionError("atas")

        executar_faixa_b(db, job_b3, Limite(), hoje=date(2026, 10, 17))
        db.refresh(job_b3)
        assert job_b3.status == "continua_amanha"
        assert job_b3.motivo == "RuntimeError"
        restaurar_contexto(tokens)
    finally:
        db.close()


def test_agenda_so_na_madrugada_e_carga_segura_o_diario():
    db = _db()
    try:
        uber = filial_uberlandia(db)
        outra = criar_filial(
            db,
            nome="Filial C",
            cnpj=cnpj_valido_de("445556660001"),
            municipio="Patos de Minas",
            uf="MG",
            codigo_ibge=3148004,
            autor=_Principal(
                criar_usuario(db, username="master.ag", senha=SENHA, papel="master_admin", filial_id=None).id
            ),
        )
        manha = datetime(2026, 10, 19, 10, 0, tzinfo=FUSO)
        assert enfileirar_noite(db, manha) == []
        madrugada = datetime(2026, 10, 19, 2, 10, tzinfo=FUSO)
        db.add(
            ColetaJob(
                filial_id=uber.id,
                faixa="A",
                tipo="carga_inicial",
                noite=date(2026, 10, 18),
                status="continua_amanha",
            )
        )
        db.commit()
        criados = enfileirar_noite(db, madrugada)
        tipos = {(job.filial_id, job.tipo) for job in criados}
        assert (uber.id, "diario") not in tipos
        assert (outra.id, "diario") in tipos
        antes = datetime(2026, 10, 19, 2, 9, tzinfo=FUSO)
        assert enfileirar_noite(db, antes) == []
    finally:
        db.close()


def test_restart_retoma_job_em_execucao():
    db = _db()
    try:
        uber = filial_uberlandia(db)
        gravar_uasg(db, uber, "926922", "18431312000115")
        tokens = definir_contexto(str(uber.id), master=False)
        upsert_contratacao(
            db,
            uber.id,
            {
                "numeroControlePNCP": "PNCP-NOITE",
                "objetoCompra": "Material",
                "codigoModalidade": 6,
                "modalidadeIdPncp": 8,
                "modalidadeNome": "Dispensa",
                "existeResultado": False,
                "dataPublicacaoPncp": "2026-10-18",
            },
            "926922",
        )
        job = ColetaJob(
            filial_id=uber.id,
            faixa="A",
            tipo="diario",
            noite=date(2026, 10, 19),
            status="executando",
        )
        db.add(job)
        db.flush()
        for codigo in ("A1", "A2"):
            db.add(ColetaEtapa(job_id=job.id, codigo=codigo, status="ok"))
        hoje = agora_utc().date()
        inicio, fim = periodo_diario(hoje, 7)
        db.add(
            ColetaCursor(
                filial_id=uber.id,
                codigo_uasg="926922",
                tipo="itens",
                janela_ini=inicio,
                janela_fim=fim,
                pagina=2,
                tamanho_pagina=100,
                atualizado_em=agora_utc(),
            )
        )
        db.commit()
        cliente = _Coleta()
        cliente.falhar_pagina = None
        cliente.total = 2
        processar_disponiveis(db, cliente, cliente)
        db.refresh(job)
        assert job.status == "ok"
        assert any(c[0] == "itens" and c[1] == 2 for c in cliente.chamadas)
        assert not any(c[0] == "itens" and c[1] == 1 for c in cliente.chamadas)
        restaurar_contexto(tokens)
    finally:
        db.close()


def test_retry_http_respeita_429():
    estado = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        estado["n"] += 1
        if estado["n"] == 1:
            return httpx.Response(429, headers={"Retry-After": "1"}, json={"erro": True})
        return httpx.Response(200, json={"resultado": [{"ok": True}]})

    cliente = ClienteHttp(transporte=httpx.MockTransport(handler), dormir=lambda _s: None, tentativas=3)
    corpo = cliente.get_json("https://dadosabertos.compras.gov.br/modulo-uasg/1_consultarUasg")
    assert corpo["resultado"][0]["ok"] is True
    assert estado["n"] == 2
    cliente.close()


def test_sincronismo_nao_adere_outro_municipio_nem_inativa():
    db = _db()
    try:
        uber = filial_uberlandia(db)
        tokens = definir_contexto(str(uber.id), master=False)
        resumo = sincronizar_registros(
            db,
            uber,
            [
                {
                    "codigoUasg": "926922",
                    "nomeUasg": "PMU",
                    "codigoMunicipioIbge": 3170206,
                    "statusUasg": True,
                    "cnpjCpfOrgao": "18431312000115",
                    "siglaUf": "MG",
                },
                {
                    "codigoUasg": "926287",
                    "nomeUasg": "DMAE",
                    "codigoMunicipioIbge": 3170206,
                    "statusUasg": False,
                    "cnpjCpfOrgao": "18431312000115",
                    "siglaUf": "MG",
                },
                {
                    "codigoUasg": "000001",
                    "nomeUasg": "Fora",
                    "codigoMunicipioIbge": 3103504,
                    "statusUasg": True,
                    "cnpjCpfOrgao": "11222333000181",
                    "siglaUf": "MG",
                },
            ],
        )
        from app.models import FilialUasg

        adesoes = db.scalars(select(FilialUasg)).all()
        assert resumo["aderidas_novas"] == 1
        assert {a.codigo_uasg for a in adesoes if a.aderida} == {"926922"}
        assert "000001" not in {a.codigo_uasg for a in adesoes}
        restaurar_contexto(tokens)
    finally:
        db.close()


def test_ciclo_nao_dispara_cnpj():
    class Bomba:
        def consultar_cnpj(self, _cnpj):
            raise AssertionError("cnpj")

        def consultar_cep(self, _cep):
            raise AssertionError("cep")

        def uasgs(self, **kwargs):
            raise AssertionError("rede")

        def contratacoes(self, **kwargs):
            raise AssertionError("rede")

        def por_numero(self, _numero):
            raise AssertionError("rede")

        def itens(self, **kwargs):
            raise AssertionError("rede")

        def resultados(self, _numero):
            raise AssertionError("rede")

        def catalogo(self, _codigo, _tipo):
            raise AssertionError("rede")

        def contratos(self, **kwargs):
            raise AssertionError("rede")

        def atas(self, **kwargs):
            raise AssertionError("rede")

    db = _db()
    try:
        ciclo(db, Bomba(), Bomba(), Bomba(), datetime(2026, 10, 19, 12, 0, tzinfo=ZoneInfo("America/Sao_Paulo")))
    finally:
        db.close()


def test_master_abre_a_cidade_e_filtra_sem_vazar():
    from app.models import ContratoPncp

    db = _db()
    try:
        uber = filial_uberlandia(db)
        master = criar_usuario(
            db, username="master.cidade", senha=SENHA, papel="master_admin", filial_id=None
        )
        outra = criar_filial(
            db,
            nome="Observatório Araguari",
            cnpj=cnpj_valido_de("334445550001"),
            municipio="Araguari",
            uf="MG",
            codigo_ibge=3103504,
            autor=_Principal(master.id),
        )
        _gestor(db, uber, "gestor.cidade")
        gravar_uasg(db, uber, "926922", "18431312000115")
        gravar_uasg(db, outra, "222222", "11222333000181")
        tokens = definir_contexto(str(uber.id), master=False)
        garantir_contexto(db)
        upsert_contratacao(
            db,
            uber.id,
            {
                "numeroControlePNCP": "PNCP-CIDADE",
                "objetoCompra": "Obra da cidade",
                "modalidadeIdPncp": 8,
                "codigoModalidade": 6,
                "modalidadeNome": "Dispensa",
                "dataPublicacaoPncp": "2026-04-01",
                "existeResultado": False,
            },
            "926922",
        )
        db.add(
            ContratoPncp(
                tenant_id=uber.id,
                numero_controle_pncp="CTR-CIDADE-SOLTO",
                numero_controle_pncp_compra=None,
                cnpj_orgao="18431312000115",
                codigo_uasg="926922",
                objeto="Contrato sem compra da cidade",
                atualizado_em=agora_utc(),
            )
        )
        db.add(
            ContratoPncp(
                tenant_id=uber.id,
                numero_controle_pncp="CTR-CIDADE-LIGADO",
                numero_controle_pncp_compra="PNCP-CIDADE",
                cnpj_orgao="18431312000115",
                codigo_uasg="926922",
                objeto="Contrato ligado",
                atualizado_em=agora_utc(),
            )
        )
        db.commit()
        restaurar_contexto(tokens)
        tokens = definir_contexto(str(outra.id), master=False)
        garantir_contexto(db)
        upsert_contratacao(
            db,
            outra.id,
            {
                "numeroControlePNCP": "PNCP-OUTRA",
                "objetoCompra": "Obra de outra cidade",
                "modalidadeIdPncp": 6,
                "codigoModalidade": 5,
                "modalidadeNome": "Pregão - Eletrônico",
                "dataPublicacaoPncp": "2026-05-01",
                "existeResultado": True,
            },
            "222222",
        )
        db.commit()
        restaurar_contexto(tokens)
        cidade = str(uber.id)
    finally:
        db.close()

    with TestClient(app) as client:
        entrada = client.post("/api/sessao", json={"usuario": "master.cidade", "senha": SENHA})
        assert entrada.status_code == 200
        catalogo = client.get("/api/catalogo/modalidades").json()["modalidades"]
        dispensa = next(item for item in catalogo if item["nome"] == "Dispensa")
        assert dispensa["codigo"] == 6
        lista = client.get(f"/api/master/filiais/{cidade}/contratacoes?de=2026-01-01&ate=2026-12-31")
        assert lista.status_code == 200
        assert lista.json()["filial"]["municipio"] == "Uberlândia"
        assert [item["numero_controle_pncp"] for item in lista.json()["contratacoes"]] == ["PNCP-CIDADE"]
        soltos = client.get(
            f"/api/master/filiais/{cidade}/contratos?vinculo=nao_vinculado&de=2026-01-01&ate=2026-12-31"
        )
        assert [item["numero_controle_pncp"] for item in soltos.json()["contratos"]] == ["CTR-CIDADE-SOLTO"]
        assert soltos.json()["contratos"][0]["vinculo_rotulo"] == "não vinculado"
        gestor = client.post(
            "/api/sessao",
            json={"usuario": "gestor.cidade", "senha": SENHA, "encerrar_anterior": True},
        )
        assert gestor.status_code == 200
        assert client.get(f"/api/master/filiais/{cidade}/contratacoes").status_code == 403


def test_http_204_e_pagina_vazia():
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(204)

    cliente = ClienteHttp(transporte=httpx.MockTransport(handler), dormir=lambda _s: None, tentativas=1)
    assert cliente.get_json("https://exemplo.test/vazio") == {}
    cliente.close()


def test_observador_fica_na_filial_e_sobrevive_a_coleta():
    db = _db()
    try:
        uber = filial_uberlandia(db)
        master = criar_usuario(
            db, username="master.obs", senha=SENHA, papel="master_admin", filial_id=None
        )
        outra = criar_filial(
            db,
            nome="Observatório Patos",
            cnpj=cnpj_valido_de("445556660001"),
            municipio="Patos de Minas",
            uf="MG",
            codigo_ibge=3148004,
            autor=_Principal(master.id),
        )
        gestor = _gestor(db, uber, "gestor.obs")
        criar_usuario(
            db,
            username="analista.obs",
            senha=SENHA,
            papel="filial_analista",
            filial_id=uber.id,
            autor=_Principal(gestor.id, uber.id),
        )
        _gestor(db, outra, "gestor.patos")
        gravar_uasg(db, uber, "926922", "18431312000115")
        gravar_uasg(db, outra, "333333", "11222333000181")
        tokens = definir_contexto(str(uber.id), master=False)
        garantir_contexto(db)
        upsert_contratacao(
            db,
            uber.id,
            {
                "numeroControlePNCP": "PNCP-OBS",
                "objetoCompra": "Obra acompanhada",
                "modalidadeIdPncp": 8,
                "codigoModalidade": 6,
                "modalidadeNome": "Dispensa",
                "valorTotalEstimado": "10.00",
                "valorTotalHomologado": "8.00",
                "dataPublicacaoPncp": "2026-06-01",
                "existeResultado": True,
            },
            "926922",
        )
        db.commit()
        restaurar_contexto(tokens)
        filial_id = str(uber.id)
    finally:
        db.close()

    with TestClient(app) as client:
        assert client.post("/api/sessao", json={"usuario": "gestor.obs", "senha": SENHA}).status_code == 200
        criado = client.post("/api/observadores", json={"nome": "Ana Lima", "email": "ana@exemplo.org"})
        assert criado.status_code == 201
        obs_id = criado.json()["id"]
        lista = client.get("/api/contratacoes?de=2026-01-01&ate=2026-12-31")
        compra_id = lista.json()["contratacoes"][0]["id"]
        assert lista.json()["contratacoes"][0]["observador_nome"] == ""
        vinculo = client.put(
            f"/api/contratacoes/{compra_id}/observador",
            json={"observador_id": obs_id},
        )
        assert vinculo.status_code == 200
        detalhe = client.get(f"/api/contratacoes/{compra_id}").json()
        assert detalhe["observador_nome"] == "Ana Lima"
        assert detalhe["delta_valor"] == "-R$ 2,00"
        assert detalhe["delta_percentual"] == "-20,0%"
        painel = client.get("/api/painel?de=2026-01-01&ate=2026-12-31").json()
        assert painel["por_modalidade"][0]["nome"] == "Dispensa"
        assert painel["por_modalidade"][0]["codigo"] == 6
        assert painel["por_uasg"][0]["codigo_uasg"] == "926922"
        sem = client.get("/api/contratacoes?observador=sem&de=2026-01-01&ate=2026-12-31").json()
        assert sem["contratacoes"] == []
        com = client.get(f"/api/contratacoes?observador={obs_id}&de=2026-01-01&ate=2026-12-31").json()
        assert com["contratacoes"][0]["numero_controle_pncp"] == "PNCP-OBS"
        analista = client.post(
            "/api/sessao",
            json={"usuario": "analista.obs", "senha": SENHA, "encerrar_anterior": True},
        )
        assert analista.status_code == 200
        assert client.post("/api/observadores", json={"nome": "Outra Pessoa"}).status_code == 403
        master_login = client.post(
            "/api/sessao",
            json={"usuario": "master.obs", "senha": SENHA, "encerrar_anterior": True},
        )
        assert master_login.status_code == 200
        assert client.post("/api/observadores", json={"nome": "Pelo master"}).status_code == 403
        visto = client.get(f"/api/master/filiais/{filial_id}/contratacoes?de=2026-01-01&ate=2026-12-31")
        assert visto.json()["contratacoes"][0]["observador_nome"] == "Ana Lima"
        patos = client.post(
            "/api/sessao",
            json={"usuario": "gestor.patos", "senha": SENHA, "encerrar_anterior": True},
        )
        assert patos.status_code == 200
        assert client.get("/api/observadores").json()["observadores"] == []
        assert "PNCP-OBS" not in str(client.get("/api/contratacoes").json())

    db = _db()
    try:
        tokens = definir_contexto(filial_id, master=False)
        garantir_contexto(db)
        upsert_contratacao(
            db,
            uuid.UUID(filial_id),
            {
                "numeroControlePNCP": "PNCP-OBS",
                "objetoCompra": "Obra acompanhada, atualizada",
                "modalidadeIdPncp": 8,
                "codigoModalidade": 6,
                "modalidadeNome": "Dispensa",
                "valorTotalEstimado": "10.00",
                "valorTotalHomologado": "8.00",
                "dataPublicacaoPncp": "2026-06-01",
                "existeResultado": True,
            },
            "926922",
        )
        db.commit()
        restaurar_contexto(tokens)
    finally:
        db.close()
    with TestClient(app) as client:
        client.post("/api/sessao", json={"usuario": "gestor.obs", "senha": SENHA, "encerrar_anterior": True})
        de_novo = client.get("/api/contratacoes?de=2026-01-01&ate=2026-12-31").json()
        assert de_novo["contratacoes"][0]["observador_nome"] == "Ana Lima"
        assert de_novo["contratacoes"][0]["objeto"] == "Obra acompanhada, atualizada"

