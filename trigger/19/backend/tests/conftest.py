from __future__ import annotations

from pathlib import Path

import pytest

from app.domain.position_calculator import PositionCalculator
from app.infrastructure.b3_parser import B3MovementParser

OFFICIAL_XLSX = Path(__file__).resolve().parents[2] / "base13.xlsx"


@pytest.fixture
def official_xlsx() -> Path:
    if not OFFICIAL_XLSX.exists():
        pytest.skip("base13.xlsx não disponível")
    return OFFICIAL_XLSX


@pytest.fixture
def official_movements(official_xlsx: Path):
    return B3MovementParser().parse_file(str(official_xlsx))


@pytest.fixture
def official_positions(official_movements):
    return PositionCalculator().calculate_positions(official_movements)
