"""Testes da atualização pontual de contratação (sem rede)."""

from datetime import datetime
from unittest.mock import patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.compras.atualizar_contratacao import atualizar_contratacao_da_api
from app.compras_pncp import CompraContratacaoItem, CompraItemContratacao
from app.database import Base, CompraContratacao, CompraContratacaoItem as ItemORM


def _session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_atualizar_contratacao_preserva_observador_e_upserta_itens():
    db = _session()
    row = CompraContratacao(
        id_compra="92692205002122023",
        chave_compra="92692205002122023",
        unidade_compradora="926922",
        unidade_nome="Teste",
        ano=2023,
        numero_controle_pncp="18431312000115-1-000006/2023",
        objeto="Objeto antigo",
        observador_id=None,
        coletado_em=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    cid = row.id

    item_api = CompraContratacaoItem(
        id_compra="92692205002122023",
        unidade_compradora="926922",
        unidade_nome="Teste",
        ano=2023,
        numero="6",
        objeto="Objeto atualizado pela API",
        situacao_lista="Homologada",
        numero_controle_pncp="18431312000115-1-000006/2023",
        valor_total_estimado=1.0,
        valor_total_homologado=1.0,
        dados_pncp={},
    )
    item_linha = CompraItemContratacao(
        id_compra_item="9269220500212202300001",
        id_compra="92692205002122023",
        numero_controle_pncp_compra="18431312000115-1-000006/2023",
        numero_item_pncp=1,
        numero_item_compra=1,
        descricao_resumida="Item teste",
        dados_pncp={},
    )

    with (
        patch(
            "app.compras.atualizar_contratacao.coletar_contratacao",
            return_value=item_api,
        ),
        patch(
            "app.compras.atualizar_contratacao.coletar_itens_contratacao",
            return_value=[item_linha],
        ),
        patch(
            "app.compras.atualizar_contratacao.coletar_resultados",
            return_value=[],
        ),
    ):
        out = atualizar_contratacao_da_api(db, cid)

    assert out["contadores"]["itens_novos"] == 1
    atualizada = db.get(CompraContratacao, cid)
    assert atualizada.objeto == "Objeto atualizado pela API"
    assert atualizada.observador_id is None
    itens = db.scalars(select(ItemORM)).all()
    assert len(itens) == 1
    assert itens[0].id_compra_item == "9269220500212202300001"
    db.close()


def test_atualizar_contratacao_inexistente():
    db = _session()
    try:
        atualizar_contratacao_da_api(db, 999)
        assert False, "deveria falhar"
    except LookupError:
        pass
    db.close()
