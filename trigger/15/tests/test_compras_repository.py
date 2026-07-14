"""Testes de repository — upsert idempotente."""

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.compras.repository import upsert_resultado
from app.database import Base, ComprasContratacaoResultado


def test_upsert_resultado_nao_duplica():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db: Session = SessionLocal()
    data = {
        "id_compra": "1",
        "id_compra_item": "item-1",
        "sequencial_resultado": 1,
        "ni_fornecedor": "12345678000199",
        "nome_razao_social_fornecedor": "Fornecedor Teste",
        "valor_total_homologado": "R$ 100,00",
        "dados_resultado_json": "{}",
    }
    _, criado1 = upsert_resultado(db, data)
    _, criado2 = upsert_resultado(db, {**data, "valor_total_homologado": "R$ 200,00"})
    db.commit()
    count = len(db.scalars(select(ComprasContratacaoResultado)).all())
    assert criado1 is True
    assert criado2 is False
    assert count == 1
    db.close()
