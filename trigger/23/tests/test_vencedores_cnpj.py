"""Testes da consolidação de CNPJs vencedores (07.3 + fallback itens)."""

from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.compras.vencedores_cnpj import listar_vencedores_consolidados
from app.database import Base, CompraContratacaoItem, ComprasContratacaoResultado, ComprasFornecedor


def _db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_consolida_vencedores_fallback_itens():
    """Sem resultados: fallback para itens (compatível com bases parciais)."""
    db = _db()
    db.add_all(
        [
            CompraContratacaoItem(
                id_compra_item="i1",
                id_compra="c1",
                cod_fornecedor="12.345.678/0001-99",
                nome_fornecedor="ACME LTDA",
            ),
            CompraContratacaoItem(
                id_compra_item="i2",
                id_compra="c1",
                cod_fornecedor="12345678000199",
                nome_fornecedor="ACME LTDA",
            ),
            CompraContratacaoItem(
                id_compra_item="i3",
                id_compra="c2",
                cod_fornecedor="12345678901",
                nome_fornecedor="Fulano CPF",
            ),
        ]
    )
    db.add(
        ComprasFornecedor(
            ni_fornecedor="12345678000199",
            cnpj="12345678000199",
            nome_razao_social_fornecedor="ACME LTDA",
            cnpj_dados_json='{"fonte":"teste"}',
            cnpj_enriquecido_em=datetime.utcnow() - timedelta(days=60),
        )
    )
    db.commit()

    out = listar_vencedores_consolidados(db)
    assert out["total"] == 2
    assert out["resumo"]["vencido"] == 1
    assert out["resumo"]["cpf"] == 1
    assert out["fonte_canonica"] == "compras_contratacao_resultados"

    por_ni = {r["cod_fornecedor"]: r for r in out["items"]}
    assert por_ni["12345678000199"]["qtd_itens"] == 2
    assert por_ni["12345678000199"]["qtd_compras"] == 1
    assert por_ni["12345678000199"]["status_cache"] == "vencido"
    assert por_ni["12345678000199"]["fonte_agregacao"] == "itens"
    assert por_ni["12345678000199"]["pode_atualizar"] is True
    assert por_ni["12345678901"]["status_cache"] == "cpf"
    assert por_ni["12345678901"]["pode_atualizar"] is False
    db.close()


def test_preferencia_resultados_sobre_itens():
    """Item com resultado: conta só o 07.3 (não duplica o atalho do item)."""
    db = _db()
    db.add(
        CompraContratacaoItem(
            id_compra_item="i1",
            id_compra="c1",
            cod_fornecedor="12345678000199",
            nome_fornecedor="Nome no item",
            valor_total_resultado="R$ 9.999,00",  # ignorado — há resultado 07.3
        )
    )
    db.add(
        ComprasContratacaoResultado(
            id_compra="c1",
            id_compra_item="i1",
            sequencial_resultado=1,
            ni_fornecedor="12345678000199",
            nome_razao_social_fornecedor="Nome no resultado",
            valor_total_homologado="R$ 1.500,50",
        )
    )
    # Item sem resultado — entra pelo fallback
    db.add(
        CompraContratacaoItem(
            id_compra_item="i2",
            id_compra="c2",
            cod_fornecedor="11222333000181",
            nome_fornecedor="Só no item",
            valor_total_resultado="250,00",
        )
    )
    db.commit()

    out = listar_vencedores_consolidados(db)
    por_ni = {r["cod_fornecedor"]: r for r in out["items"]}
    assert out["total"] == 2
    assert por_ni["12345678000199"]["qtd_itens"] == 1
    assert por_ni["12345678000199"]["nome_fornecedor"] == "Nome no resultado"
    assert por_ni["12345678000199"]["fonte_agregacao"] == "resultados"
    assert por_ni["12345678000199"]["valor_total_homologado"] == 1500.50
    assert por_ni["11222333000181"]["fonte_agregacao"] == "itens"
    assert por_ni["11222333000181"]["valor_total_homologado"] == 250.0
    db.close()


def test_soma_valor_homologado_varios_resultados():
    db = _db()
    db.add_all(
        [
            ComprasContratacaoResultado(
                id_compra="c1",
                id_compra_item="i1",
                sequencial_resultado=1,
                ni_fornecedor="12345678000199",
                nome_razao_social_fornecedor="ACME",
                valor_total_homologado="100,00",
            ),
            ComprasContratacaoResultado(
                id_compra="c2",
                id_compra_item="i2",
                sequencial_resultado=1,
                ni_fornecedor="12345678000199",
                nome_razao_social_fornecedor="ACME",
                valor_total_homologado="R$ 50,25",
            ),
        ]
    )
    db.commit()
    out = listar_vencedores_consolidados(db)
    assert out["total"] == 1
    assert out["items"][0]["valor_total_homologado"] == 150.25
    db.close()

def test_filtro_status_pendente():
    db = _db()
    db.add(
        CompraContratacaoItem(
            id_compra_item="i1",
            id_compra="c1",
            cod_fornecedor="11222333000181",
            nome_fornecedor="Nova SA",
        )
    )
    db.commit()
    out = listar_vencedores_consolidados(db, status="pendente")
    assert out["total"] == 1
    assert out["items"][0]["status_cache"] == "pendente"
    db.close()


def test_filtro_porte_empresa():
    db = _db()
    db.add_all(
        [
            CompraContratacaoItem(
                id_compra_item="i1",
                id_compra="c1",
                cod_fornecedor="12345678000199",
                nome_fornecedor="ME Ltda",
            ),
            CompraContratacaoItem(
                id_compra_item="i2",
                id_compra="c2",
                cod_fornecedor="11222333000181",
                nome_fornecedor="ME variante",
            ),
            CompraContratacaoItem(
                id_compra_item="i3",
                id_compra="c3",
                cod_fornecedor="44555666000177",
                nome_fornecedor="EPP SA",
            ),
            CompraContratacaoItem(
                id_compra_item="i4",
                id_compra="c4",
                cod_fornecedor="99888777000166",
                nome_fornecedor="Sem porte",
            ),
        ]
    )
    db.add_all(
        [
            ComprasFornecedor(
                ni_fornecedor="12345678000199",
                cnpj="12345678000199",
                nome_razao_social_fornecedor="ME Ltda",
                porte_empresa_nome="MICRO EMPRESA",
            ),
            ComprasFornecedor(
                ni_fornecedor="11222333000181",
                cnpj="11222333000181",
                nome_razao_social_fornecedor="ME variante",
                porte_empresa_nome="MICROEMPRESA",
            ),
            ComprasFornecedor(
                ni_fornecedor="44555666000177",
                cnpj="44555666000177",
                nome_razao_social_fornecedor="EPP SA",
                porte_empresa_nome="Empresa de Pequeno Porte",
            ),
        ]
    )
    db.commit()

    out_me = listar_vencedores_consolidados(db, porte="MICROEMPRESA")
    assert out_me["total"] == 2
    assert {r["cod_fornecedor"] for r in out_me["items"]} == {
        "12345678000199",
        "11222333000181",
    }
    assert all(r["porte"] == "Microempresa" for r in out_me["items"])

    # Sigla e grafia bruta também resolvem
    assert listar_vencedores_consolidados(db, porte="ME")["total"] == 2
    assert listar_vencedores_consolidados(db, porte="MICRO EMPRESA")["total"] == 2

    out_epp = listar_vencedores_consolidados(db, porte="EPP")
    assert out_epp["total"] == 1
    assert out_epp["items"][0]["porte"] == "Empresa de Pequeno Porte"

    out_vazio = listar_vencedores_consolidados(db, porte="_vazio_")
    assert out_vazio["total"] == 1
    assert out_vazio["items"][0]["cod_fornecedor"] == "99888777000166"
    assert out_vazio["items"][0]["porte"] is None

    ids = {p["id"] for p in out_me["portes"]}
    nomes = {p["nome"] for p in out_me["portes"]}
    assert "MICROEMPRESA" in ids
    assert "EMPRESADEPEQUENOPORTE" in ids
    assert "Microempresa" in nomes
    assert "Empresa de Pequeno Porte" in nomes
    # Sem duplicatas tipográficas no select
    assert len([p for p in out_me["portes"] if p["id"] == "MICROEMPRESA"]) == 1
    db.close()


def test_listar_pendentes_enriquecimento_so_cnpj():
    from app.compras.vencedores_cnpj import listar_pendentes_enriquecimento

    db = _db()
    db.add_all(
        [
            CompraContratacaoItem(
                id_compra_item="i1",
                id_compra="c1",
                cod_fornecedor="11222333000181",
                nome_fornecedor="Nova SA",
            ),
            CompraContratacaoItem(
                id_compra_item="i2",
                id_compra="c2",
                cod_fornecedor="12345678901",
                nome_fornecedor="Pessoa",
            ),
        ]
    )
    db.commit()
    fila = listar_pendentes_enriquecimento(db)
    assert len(fila) == 1
    assert fila[0]["cod_fornecedor"] == "11222333000181"
    db.close()


def test_homologacoes_fornecedor_detalha_campos():
    from app.compras.vencedores_cnpj import listar_homologacoes_fornecedor
    from app.database import CompraContratacao

    db = _db()
    db.add(
        CompraContratacao(
            id_compra="c1",
            chave_compra="c1",
            unidade_compradora="1",
            unidade_nome="UASG Teste",
            ano=2024,
            numero="90001/2024",
            objeto="Aquisição de materiais de limpeza institucional",
            processo="123/2024",
        )
    )
    db.add(
        CompraContratacaoItem(
            id_compra_item="i1",
            id_compra="c1",
            descricao_detalhada="Detergent liquido neutro 5L",
            descricao_resumida="Detergente",
            numero_item_compra=1,
            cod_fornecedor="12345678000199",
            nome_fornecedor="ACME LTDA",
            valor_total_resultado="999,00",
            data_resultado="2024-01-01",
        )
    )
    db.add(
        ComprasContratacaoResultado(
            id_compra="c1",
            id_compra_item="i1",
            sequencial_resultado=1,
            ni_fornecedor="12345678000199",
            nome_razao_social_fornecedor="ACME LTDA",
            valor_total_homologado="1.500,50",
            data_resultado_pncp="2024-06-15",
        )
    )
    # Item sem resultado — entra pelo fallback
    db.add(
        CompraContratacaoItem(
            id_compra_item="i2",
            id_compra="c2",
            descricao_resumida="Papel sulfite A4",
            cod_fornecedor="12345678000199",
            nome_fornecedor="ACME LTDA",
            valor_total_resultado="250,00",
            data_resultado="2024-03-10",
        )
    )
    db.add(
        ComprasFornecedor(
            ni_fornecedor="12345678000199",
            cnpj="12345678000199",
            nome_razao_social_fornecedor="ACME LTDA",
            nome_fantasia="ACME",
            porte_empresa_nome="Demais",
            natureza_juridica_nome="Sociedade Empresária Limitada",
            codigo_cnae=4771701,
            nome_cnae="Comércio varejista de produtos farmacêuticos",
            nome_municipio="Uberlândia",
            uf_sigla="MG",
            de_uberlandia=True,
            situacao_cadastral="ATIVA",
            habilitado_licitar=True,
            cnpj_dados_json=(
                '{"fonte":"brasilapi","payload":{"cnaes_secundarios":'
                '[{"codigo":4781400,"descricao":"Comércio varejista de artigos do vestuário"}]}}'
            ),
        )
    )
    db.commit()

    out = listar_homologacoes_fornecedor(db, "12.345.678/0001-99")
    assert out["cod_fornecedor"] == "12345678000199"
    assert out["total"] == 2
    assert out["qtd_compras"] == 2
    assert out["valor_total_homologado"] == 1750.50

    emp = out["empresa"]
    assert emp is not None
    assert emp["cnae_codigo"] == 4771701
    assert "farmacêuticos" in (emp["cnae"] or "")
    assert emp["porte"] == "Demais"
    assert emp["municipio"] == "Uberlândia"
    assert emp["uf"] == "MG"
    assert emp["de_uberlandia"] is True
    assert emp["origem_local"] == "Uberlândia"
    assert emp["habilitado_licitar"] is True
    assert len(emp["cnaes_secundarios"]) == 1
    assert emp["cnaes_secundarios"][0]["codigo"] == 4781400

    por_item = {r["id_compra_item"]: r for r in out["items"]}
    r1 = por_item["i1"]
    assert r1["fonte"] == "resultados"
    assert r1["data"] == "2024-06-15"
    assert r1["objeto"] == "Aquisição de materiais de limpeza institucional"
    assert r1["descricao_item"] == "Detergent liquido neutro 5L"
    assert r1["valor_homologado_num"] == 1500.50
    assert r1["contratacao_id"] is not None
    assert r1["compra"] == "90001/2024"
    assert r1["processo"] == "123/2024"

    r2 = por_item["i2"]
    assert r2["fonte"] == "itens"
    assert r2["descricao_item"] == "Papel sulfite A4"
    assert r2["valor_homologado_num"] == 250.0
    assert r2["objeto"] is None  # compra c2 não cadastrada
    db.close()


def test_homologacoes_ni_invalido():
    from app.compras.vencedores_cnpj import listar_homologacoes_fornecedor

    db = _db()
    try:
        listar_homologacoes_fornecedor(db, "abc")
        assert False, "deveria rejeitar NI inválido"
    except ValueError:
        pass
    finally:
        db.close()


def test_job_pendentes_vazio_nao_corrompe_status():
    from app.compras import job_pendentes_cnpj as job
    from app.compras.vencedores_cnpj import listar_pendentes_enriquecimento

    # Garante estado limpo
    job.status.update(running=False, fase="idle", resultado=None, log=[])
    inicio = job.iniciar_job()
    assert inicio["status"] == "iniciada"

    # Sem banco real de produção: stub da fila vazia
    original = listar_pendentes_enriquecimento
    try:
        import app.compras.job_pendentes_cnpj as mod

        mod.listar_pendentes_enriquecimento = lambda _db: []
        job.executar_job()
    finally:
        mod.listar_pendentes_enriquecimento = original

    assert job.status["running"] is False
    assert job.status["resultado"]["ok"] is True
    assert job.status["resultado"]["total"] == 0


def test_filtros_padrao_orgao_modalidade_periodo():
    """Recorte analítico padrão restringe agregação (como Localidade)."""
    from app.compras.vencedores_cnpj import (
        listar_homologacoes_fornecedor,
        listar_vencedores_consolidados,
    )
    from app.database import (
        CompraContratacao,
        ModalidadeConsolidada,
        ModalidadeVinculo,
        OrgaoConsolidado,
        OrgaoVinculo,
    )
    from app.filtros_periodo import Periodo
    from datetime import date

    db = _db()
    org = OrgaoConsolidado(nome="Prefeitura Teste", sigla="PMU", ativo=True)
    mod = ModalidadeConsolidada(nome="Pregão Eletrônico", ativo=True)
    db.add_all([org, mod])
    db.flush()
    db.add_all(
        [
            OrgaoVinculo(
                orgao_consolidado_id=org.id,
                fonte="compras_api",
                chave="153001",
                rotulo="UASG A",
            ),
            ModalidadeVinculo(
                modalidade_consolidada_id=mod.id,
                fonte="compras_api",
                chave="6",
                rotulo="Pregão",
            ),
            CompraContratacao(
                id_compra="c-in",
                chave_compra="c-in",
                unidade_compradora="153001",
                unidade_nome="UASG A",
                ano=2024,
                modalidade_codigo="6",
                data_encerramento_proposta_pncp="2024-03-15T12:00:00",
                numero="1/2024",
            ),
            CompraContratacao(
                id_compra="c-out",
                chave_compra="c-out",
                unidade_compradora="999999",
                unidade_nome="UASG B",
                ano=2024,
                modalidade_codigo="8",
                data_encerramento_proposta_pncp="2024-08-01T12:00:00",
                numero="2/2024",
            ),
            CompraContratacaoItem(
                id_compra_item="i-in",
                id_compra="c-in",
                cod_fornecedor="12345678000199",
                nome_fornecedor="Dentro",
                valor_total_resultado="100,00",
            ),
            CompraContratacaoItem(
                id_compra_item="i-out",
                id_compra="c-out",
                cod_fornecedor="11222333000181",
                nome_fornecedor="Fora",
                valor_total_resultado="200,00",
            ),
            ComprasContratacaoResultado(
                id_compra="c-in",
                id_compra_item="i-in",
                sequencial_resultado=1,
                ni_fornecedor="12345678000199",
                nome_razao_social_fornecedor="Dentro",
                valor_total_homologado="100,00",
            ),
            ComprasContratacaoResultado(
                id_compra="c-out",
                id_compra_item="i-out",
                sequencial_resultado=1,
                ni_fornecedor="11222333000181",
                nome_razao_social_fornecedor="Fora",
                valor_total_homologado="200,00",
            ),
        ]
    )
    db.commit()

    # Sem filtro — ambos
    assert listar_vencedores_consolidados(db)["total"] == 2

    # Órgão consolidado
    out_org = listar_vencedores_consolidados(db, orgao_id=org.id)
    assert out_org["total"] == 1
    assert out_org["items"][0]["cod_fornecedor"] == "12345678000199"

    # Modalidade consolidada
    out_mod = listar_vencedores_consolidados(db, modalidade_id=[mod.id])
    assert out_mod["total"] == 1
    assert out_mod["items"][0]["cod_fornecedor"] == "12345678000199"

    # Período (intervalo cobrindo só a compra "in")
    out_per = listar_vencedores_consolidados(
        db,
        periodo_resolvido=Periodo(date(2024, 1, 1), date(2024, 4, 30)),
    )
    assert out_per["total"] == 1
    assert out_per["items"][0]["cod_fornecedor"] == "12345678000199"

    # UF da sede do vencedor
    db.add_all(
        [
            ComprasFornecedor(
                ni_fornecedor="12345678000199",
                cnpj="12345678000199",
                nome_razao_social_fornecedor="Dentro",
                uf_sigla="MG",
                nome_municipio="Uberlândia",
            ),
            ComprasFornecedor(
                ni_fornecedor="11222333000181",
                cnpj="11222333000181",
                nome_razao_social_fornecedor="Fora",
                uf_sigla="SP",
                nome_municipio="São Paulo",
            ),
        ]
    )
    db.commit()
    out_uf = listar_vencedores_consolidados(db, uf="MG")
    assert out_uf["total"] == 1
    assert out_uf["items"][0]["cod_fornecedor"] == "12345678000199"
    assert out_uf["items"][0]["uf"] == "MG"

    # Modal homologações respeita o mesmo recorte
    hom_all = listar_homologacoes_fornecedor(db, "12345678000199")
    assert hom_all["total"] == 1
    hom_org = listar_homologacoes_fornecedor(db, "12345678000199", orgao_id=org.id)
    assert hom_org["total"] == 1
    hom_uf_ok = listar_homologacoes_fornecedor(db, "12345678000199", uf="MG")
    assert hom_uf_ok["total"] == 1
    hom_uf_out = listar_homologacoes_fornecedor(db, "12345678000199", uf="SP")
    assert hom_uf_out["total"] == 0
    # Órgão sem vínculo → nenhuma homologação no recorte
    org2 = OrgaoConsolidado(nome="Outro", sigla="XX", ativo=True)
    db.add(org2)
    db.flush()
    db.add(
        OrgaoVinculo(
            orgao_consolidado_id=org2.id,
            fonte="compras_api",
            chave="000000",
            rotulo="Vazio",
        )
    )
    db.commit()
    hom_vazio = listar_homologacoes_fornecedor(db, "12345678000199", orgao_id=org2.id)
    assert hom_vazio["total"] == 0
    db.close()


def test_api_filtros_vencedores_cnpj():
    from fastapi.testclient import TestClient

    from app.main import app

    client = TestClient(app)
    r = client.get("/api/compras/vencedores-cnpj/filtros")
    assert r.status_code == 200
    data = r.json()
    assert "anos" in data
    assert "orgaos" in data
    assert "modalidades" in data
    assert "ufs" in data
    assert isinstance(data["anos"], list)
    assert isinstance(data["orgaos"], list)
    assert isinstance(data["modalidades"], list)
    assert isinstance(data["ufs"], list)
