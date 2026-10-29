"""Backup seguro do SQLite (API online via sqlite3.backup)."""

from __future__ import annotations

import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app import config

DB_FILENAME = "observatorio.db"


def _stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")


def _backup_root() -> Path:
    return config.DATA_DIR / "backups"


def criar_backup(
    *,
    destino_raiz: Path | None = None,
    label: str = "manual",
) -> Path:
    """Cria pasta ``data/backups/{label}-{stamp}/`` com cópia consistente do DB."""
    raiz = destino_raiz or _backup_root()
    pasta = raiz / f"{label}-{_stamp()}"
    pasta.mkdir(parents=True, exist_ok=True)

    db_path = config.DB_PATH
    if db_path.is_file():
        dest_db = pasta / DB_FILENAME
        src = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        try:
            dst = sqlite3.connect(str(dest_db))
            try:
                src.backup(dst)
            finally:
                dst.close()
        finally:
            src.close()

    (pasta / "BACKUP_META.txt").write_text(
        f"created_utc={datetime.now(timezone.utc).isoformat()}\n"
        f"label={label}\n"
        f"db_source={db_path}\n",
        encoding="utf-8",
    )
    return pasta


def podar_backups(
    *,
    destino_raiz: Path | None = None,
    manter: int = 7,
) -> list[Path]:
    """Mantém as N pastas mais recentes; remove o restante. Retorna removidas."""
    raiz = destino_raiz or _backup_root()
    if not raiz.is_dir() or manter < 1:
        return []
    pastas = sorted(
        [p for p in raiz.iterdir() if p.is_dir()],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    removidas: list[Path] = []
    for antiga in pastas[manter:]:
        shutil.rmtree(antiga, ignore_errors=True)
        removidas.append(antiga)
    return removidas
