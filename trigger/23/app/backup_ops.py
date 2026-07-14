"""Backup seguro do SQLite e artefatos em data/ (API online via sqlite3.backup)."""

from __future__ import annotations

import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app.config import DATA_DIR, DB_PATH

DEFAULT_BACKUP_ROOT = DATA_DIR / "backups"


def _stamp() -> str:
    # Inclui microssegundos para permitir vários backups no mesmo segundo.
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")


def criar_backup(
    *,
    destino_raiz: Path | None = None,
    label: str = "manual",
    incluir_powerbi: bool = True,
    incluir_fernet: bool = True,
) -> Path:
    """Cria pasta ``data/backups/{label}-{stamp}/`` com DB (e opcionalmente CSVs/chave)."""
    raiz = destino_raiz or DEFAULT_BACKUP_ROOT
    pasta = raiz / f"{label}-{_stamp()}"
    pasta.mkdir(parents=True, exist_ok=True)

    if DB_PATH.is_file():
        dest_db = pasta / "licitacoes.db"
        src = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        try:
            dst = sqlite3.connect(str(dest_db))
            try:
                src.backup(dst)
            finally:
                dst.close()
        finally:
            src.close()

    if incluir_fernet:
        key = DATA_DIR / ".ia_fernet_key"
        if key.is_file():
            shutil.copy2(key, pasta / ".ia_fernet_key")

    if incluir_powerbi:
        pbi = DATA_DIR / "powerbi"
        if pbi.is_dir():
            shutil.copytree(pbi, pasta / "powerbi", dirs_exist_ok=True)

    (pasta / "BACKUP_META.txt").write_text(
        f"created_utc={datetime.now(timezone.utc).isoformat()}\n"
        f"label={label}\n"
        f"db_source={DB_PATH}\n",
        encoding="utf-8",
    )
    return pasta


def podar_backups(
    *,
    destino_raiz: Path | None = None,
    manter: int = 7,
) -> list[Path]:
    """Mantém as N pastas mais recentes; remove o restante. Retorna removidas."""
    raiz = destino_raiz or DEFAULT_BACKUP_ROOT
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
