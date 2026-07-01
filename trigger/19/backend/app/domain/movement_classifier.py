from __future__ import annotations

from app.domain.b3_schema import (
    BONUS_MOVEMENTS,
    BUY_MOVEMENTS,
    CUSTODY_TRANSFER_MOVEMENTS,
    DIRECTION_CREDIT,
    FRACTION_MOVEMENTS,
    INCOME_MOVEMENTS,
    POSITION_SET_MOVEMENTS,
    SELL_MOVEMENTS,
    SETTLEMENT_MOVEMENT,
)
from app.domain.value_objects import IncomeType, MovementKind

_INCOME_TYPE_MAP = {label: IncomeType(kind) for label, kind in INCOME_MOVEMENTS.items()}


def classify_movement(movement: str, direction: str) -> tuple[MovementKind, IncomeType | None]:
    movement = (movement or "").strip()
    direction = (direction or "").strip().lower()

    if movement in _INCOME_TYPE_MAP:
        return MovementKind.INCOME, _INCOME_TYPE_MAP[movement]

    if movement in BUY_MOVEMENTS:
        return MovementKind.BUY, None

    if movement in SELL_MOVEMENTS:
        return MovementKind.SELL, None

    if movement == SETTLEMENT_MOVEMENT:
        if direction == DIRECTION_CREDIT:
            return MovementKind.BUY, None
        return MovementKind.SELL, None

    if movement in CUSTODY_TRANSFER_MOVEMENTS:
        # Resolução final (custódia vs fração bonificada) em transfer_resolver.
        return MovementKind.IGNORE, None

    if movement in BONUS_MOVEMENTS:
        return MovementKind.BONUS, None

    if movement in POSITION_SET_MOVEMENTS:
        if direction == DIRECTION_CREDIT:
            return MovementKind.POSITION_SET, None
        return MovementKind.IGNORE, None

    if movement in FRACTION_MOVEMENTS:
        return MovementKind.SPLIT, None

    if movement.startswith("Direito"):
        return MovementKind.IGNORE, None

    return MovementKind.IGNORE, None
