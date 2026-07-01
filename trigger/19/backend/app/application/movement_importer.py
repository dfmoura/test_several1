from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.domain.models import Movement
from app.infrastructure.database import MovementORM

_INSERT_CHUNK_SIZE = 500


class MovementImporter:
    """Persiste movimentações com deduplicação em três camadas:

    1. Chaves únicas dentro do mesmo arquivo (parser pode repetir linhas).
    2. Consulta em lote das chaves já existentes no banco.
    3. INSERT … ON CONFLICT DO NOTHING (garantia atômica em concorrência).
    """

    def __init__(self, session: Session) -> None:
        self.session = session

    def persist(self, movements: list[Movement], batch_id: int) -> tuple[int, int]:
        unique, within_file_duplicates = self._dedupe_within_file(movements)
        if not unique:
            return 0, within_file_duplicates

        existing_keys = self._load_existing_keys({movement.external_key for movement in unique})
        pending = [movement for movement in unique if movement.external_key not in existing_keys]
        cross_import_duplicates = len(unique) - len(pending)
        duplicates = within_file_duplicates + cross_import_duplicates

        imported = self._insert_pending(pending, batch_id)
        return imported, duplicates

    @staticmethod
    def _dedupe_within_file(movements: list[Movement]) -> tuple[list[Movement], int]:
        seen: set[str] = set()
        unique: list[Movement] = []
        duplicates = 0

        for movement in movements:
            if movement.external_key in seen:
                duplicates += 1
                continue
            seen.add(movement.external_key)
            unique.append(movement)

        return unique, duplicates

    def _load_existing_keys(self, keys: set[str] | list[str]) -> set[str]:
        key_list = list(keys)
        if not key_list:
            return set()

        found: set[str] = set()
        for offset in range(0, len(key_list), _INSERT_CHUNK_SIZE):
            chunk = key_list[offset : offset + _INSERT_CHUNK_SIZE]
            rows = self.session.scalars(
                select(MovementORM.external_key).where(MovementORM.external_key.in_(chunk))
            ).all()
            found.update(rows)
        return found

    def _insert_pending(self, movements: list[Movement], batch_id: int) -> int:
        if not movements:
            return 0

        insert_fn = pg_insert if self.session.bind and self.session.bind.dialect.name == "postgresql" else sqlite_insert
        inserted = 0
        for offset in range(0, len(movements), _INSERT_CHUNK_SIZE):
            chunk = movements[offset : offset + _INSERT_CHUNK_SIZE]
            rows = [_movement_row(movement, batch_id) for movement in chunk]
            stmt = (
                insert_fn(MovementORM)
                .values(rows)
                .on_conflict_do_nothing(index_elements=["external_key"])
            )
            result = self.session.execute(stmt)
            inserted += result.rowcount or 0
        return inserted


def _movement_row(movement: Movement, batch_id: int) -> dict:
    return {
        "import_batch_id": batch_id,
        "external_key": movement.external_key,
        "trade_date": movement.trade_date,
        "kind": movement.kind.value,
        "ticker": movement.ticker,
        "product": movement.product,
        "institution": movement.institution,
        "direction": movement.direction,
        "movement_label": movement.movement_label,
        "quantity": movement.quantity,
        "unit_price": movement.unit_price,
        "total_value": movement.total_value,
        "income_type": movement.income_type.value if movement.income_type else None,
    }
