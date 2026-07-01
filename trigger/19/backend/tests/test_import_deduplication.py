from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.application.movement_importer import MovementImporter
from app.application.portfolio_service import PortfolioService
from app.domain.models import Movement
from app.domain.value_objects import MovementKind
from app.infrastructure.database import Base, ImportBatchORM, MovementORM


@pytest.fixture
def session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with factory() as db:
        yield db


def _sample_movement(
    *,
    trade_date: date = date(2024, 6, 15),
    external_key: str = "key-a",
    ticker: str = "PETR4",
) -> Movement:
    return Movement(
        trade_date=trade_date,
        kind=MovementKind.BUY,
        ticker=ticker,
        product=f"{ticker} - EMPRESA",
        institution="Corretora X",
        direction="Credito",
        movement_label="Transferência - Liquidação",
        quantity=Decimal("100"),
        unit_price=Decimal("30.50"),
        total_value=Decimal("3050.00"),
        external_key=external_key,
    )


def test_dedupes_rows_within_same_file(session: Session) -> None:
    batch = ImportBatchORM(filename="a.xlsx", file_hash="hash-a")
    session.add(batch)
    session.flush()

    movement = _sample_movement()
    importer = MovementImporter(session)
    imported, duplicates = importer.persist([movement, movement, movement], batch.id)
    session.commit()

    assert imported == 1
    assert duplicates == 2
    assert session.scalar(select(MovementORM).where(MovementORM.external_key == "key-a")) is not None


def test_skips_movements_already_in_database(session: Session) -> None:
    first_batch = ImportBatchORM(filename="first.xlsx", file_hash="hash-first")
    session.add(first_batch)
    session.flush()

    movement = _sample_movement()
    importer = MovementImporter(session)
    imported, duplicates = importer.persist([movement], first_batch.id)
    session.commit()
    assert imported == 1
    assert duplicates == 0

    second_batch = ImportBatchORM(filename="second.xlsx", file_hash="hash-second")
    session.add(second_batch)
    session.flush()

    imported, duplicates = importer.persist([movement], second_batch.id)
    session.commit()

    assert imported == 0
    assert duplicates == 1
    count = session.scalar(select(MovementORM).where(MovementORM.external_key == "key-a"))
    assert count is not None
    total = session.scalar(select(MovementORM).where(MovementORM.external_key == "key-a").limit(1))
    assert total is not None
    all_rows = session.scalars(select(MovementORM)).all()
    assert len(all_rows) == 1


def test_reimport_same_file_by_hash_is_idempotent(session: Session, tmp_path) -> None:
    sample = tmp_path / "base13.xlsx"
    source = Path(__file__).resolve().parents[2] / "base13.xlsx"
    if not source.exists():
        pytest.skip("base13.xlsx não disponível")

    sample.write_bytes(source.read_bytes())
    service = PortfolioService(session)

    first = service.import_xlsx(str(sample), "base13.xlsx")
    second = service.import_xlsx(str(sample), "base13.xlsx")

    assert first.imported > 0
    assert second.imported == 0
    assert second.duplicates == first.imported + first.duplicates
    assert second.total_movements == first.total_movements
    assert session.scalar(select(ImportBatchORM)) is not None
    batches = session.scalars(select(ImportBatchORM)).all()
    assert len(batches) == 1


def test_overlapping_spreadsheet_imports_only_new_rows(session: Session) -> None:
    batch = ImportBatchORM(filename="periodo-1.xlsx", file_hash="hash-1")
    session.add(batch)
    session.flush()

    shared = _sample_movement(external_key="shared-key")
    new_only = _sample_movement(external_key="new-key", ticker="VALE3", trade_date=date(2024, 7, 1))

    importer = MovementImporter(session)
    imported, duplicates = importer.persist([shared], batch.id)
    session.commit()
    assert imported == 1

    second_batch = ImportBatchORM(filename="periodo-2.xlsx", file_hash="hash-2")
    session.add(second_batch)
    session.flush()

    imported, duplicates = importer.persist([shared, new_only], second_batch.id)
    session.commit()

    assert imported == 1
    assert duplicates == 1
    assert len(session.scalars(select(MovementORM)).all()) == 2
