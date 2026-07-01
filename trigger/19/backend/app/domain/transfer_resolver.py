from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal

from app.domain.b3_schema import CUSTODY_TRANSFER_MOVEMENTS, DIRECTION_CREDIT, DIRECTION_DEBIT
from app.domain.models import Movement
from app.domain.value_objects import MovementKind


@dataclass(frozen=True)
class TransferKey:
    trade_date: date
    product: str
    quantity: Decimal


def custody_transfer_keys(movements: list[Movement]) -> set[TransferKey]:
    """Transferências pareadas (crédito + débito, mesmo ativo/data/qtd) = custódia."""
    directions: dict[TransferKey, set[str]] = defaultdict(set)
    for movement in movements:
        if movement.movement_label not in CUSTODY_TRANSFER_MOVEMENTS:
            continue
        key = TransferKey(movement.trade_date, movement.product, movement.quantity)
        directions[key].add(movement.direction.strip().lower())

    return {
        key
        for key, seen in directions.items()
        if DIRECTION_CREDIT in seen and DIRECTION_DEBIT in seen
    }


def classify_transfer(
    *,
    trade_date: date,
    product: str,
    quantity: Decimal,
    direction: str,
    custody_keys: set[TransferKey],
) -> MovementKind:
    key = TransferKey(trade_date, product, quantity)
    if key in custody_keys:
        return MovementKind.IGNORE

    if direction.strip().lower() == DIRECTION_DEBIT:
        return MovementKind.SPLIT

    return MovementKind.IGNORE


def apply_transfer_resolution(movements: list[Movement]) -> list[Movement]:
    custody_keys = custody_transfer_keys(movements)
    resolved: list[Movement] = []

    for movement in movements:
        if movement.movement_label not in CUSTODY_TRANSFER_MOVEMENTS:
            resolved.append(movement)
            continue

        kind = classify_transfer(
            trade_date=movement.trade_date,
            product=movement.product,
            quantity=movement.quantity,
            direction=movement.direction,
            custody_keys=custody_keys,
        )
        if kind == MovementKind.IGNORE:
            continue
        resolved.append(replace(movement, kind=kind))

    return resolved
