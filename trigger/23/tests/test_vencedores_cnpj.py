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
    db.commit()

    out = listar_homologacoes_fornecedor(db, "12.345.678/0001-99")
    assert out["cod_fornecedor"] == "12345678000199"
    assert out["total"] == 2
    assert out["qtd_compras"] == 2
    assert out["valor_total_homologado"] == 1750.50

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
