"""Backup SQLite — Fase 0."""

from __future__ import annotations

from pathlib import Path

from app import config
from app.backup_ops import criar_backup, podar_backups


def test_criar_e_podar_backup(client, tmp_path):
    # Garante que o DB de teste existe (lifespan).
    assert client.get("/api/health").status_code == 200
    assert config.DB_PATH.is_file()

    raiz = tmp_path / "backups"
    p1 = criar_backup(destino_raiz=raiz, label="t")
    assert (p1 / "observatorio.db").is_file()
    assert (p1 / "BACKUP_META.txt").is_file()

    criar_backup(destino_raiz=raiz, label="t")
    criar_backup(destino_raiz=raiz, label="t")
    removidas = podar_backups(destino_raiz=raiz, manter=1)
    assert len(removidas) == 2
    assert len([p for p in Path(raiz).iterdir() if p.is_dir()]) == 1
