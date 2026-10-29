"""Checklist de prontidão para produção (Lightsail) — sem Power BI."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app import config
from app.backup_ops import _backup_root
from app.database import ExecucaoColeta, Organizacao, Unidade, Usuario


def _check(ok: bool, detalhe: str) -> dict[str, Any]:
    return {"ok": ok, "detalhe": detalhe}


def avaliar_prontidao(db: Session) -> dict[str, Any]:
    """Itens verificáveis no app; itens de infra (DNS/HTTPS/snapshot) ficam manuais."""
    db_ok = True
    db_err = None
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        db_ok = False
        db_err = str(exc)

    n_users = int(db.scalar(select(func.count()).select_from(Usuario)) or 0)
    n_org = int(db.scalar(select(func.count()).select_from(Organizacao)) or 0)
    n_filial = int(
        db.scalar(
            select(func.count())
            .select_from(Unidade)
            .where(Unidade.tipo == "filial", Unidade.ativo.is_(True))
        )
        or 0
    )
    n_coleta = int(db.scalar(select(func.count()).select_from(ExecucaoColeta)) or 0)

    backups_dir = _backup_root()
    n_backups = 0
    if backups_dir.is_dir():
        n_backups = sum(1 for p in backups_dir.iterdir() if p.is_dir())

    data_ok = config.DATA_DIR.is_dir() and os_access_writable(config.DATA_DIR)

    itens = [
        {
            "id": "database",
            "titulo": "Banco SQLite responde",
            **_check(db_ok, db_err or "SELECT 1 ok"),
        },
        {
            "id": "data_dir",
            "titulo": "Diretório data gravável",
            **_check(data_ok, str(config.DATA_DIR)),
        },
        {
            "id": "usuario",
            "titulo": "Pelo menos um usuário cadastrado",
            **_check(n_users >= 1, f"{n_users} usuário(s)"),
        },
        {
            "id": "organizacao",
            "titulo": "Organização cadastrada",
            **_check(n_org >= 1, f"{n_org} org(s)"),
        },
        {
            "id": "filial",
            "titulo": "Pelo menos uma filial ativa",
            **_check(n_filial >= 1, f"{n_filial} filial(is)"),
        },
        {
            "id": "coleta",
            "titulo": "Pelo menos uma execução de coleta",
            **_check(n_coleta >= 1, f"{n_coleta} execução(ões)"),
        },
        {
            "id": "backup_local",
            "titulo": "Há backup local em data/backups",
            **_check(n_backups >= 1, f"{n_backups} pasta(s)"),
        },
        {
            "id": "power_bi",
            "titulo": "Power BI desabilitado (produto v1)",
            **_check(config.POWER_BI_ENABLED is False, "POWER_BI_ENABLED=false"),
        },
    ]

    manuais = [
        {
            "id": "dns_https",
            "titulo": "DNS A + HTTPS (Caddy profile https) validado",
            "ok": None,
            "detalhe": "curl -sI https://$DOMAIN/api/health",
        },
        {
            "id": "cron_backup",
            "titulo": "Cron de backup instalado na VM",
            "ok": None,
            "detalhe": "./scripts/install_backup_cron.sh",
        },
        {
            "id": "restore_ensaio",
            "titulo": "Restore ensaiado (cópia → restore → health)",
            "ok": None,
            "detalhe": "./scripts/restore_data.sh data/backups/<pasta>",
        },
        {
            "id": "snapshot_lightsail",
            "titulo": "Snapshot Lightsail rotulado (ex.: pre-prod-ok)",
            "ok": None,
            "detalhe": "Console AWS Lightsail → Snapshots",
        },
        {
            "id": "uptime",
            "titulo": "Monitor externo no /api/health (opcional)",
            "ok": None,
            "detalhe": "UptimeRobot / Hetrix → GET /api/health",
        },
    ]

    automaticos_ok = all(i["ok"] for i in itens)
    return {
        "pronto_app": automaticos_ok,
        "power_bi": False,
        "analytics": "nativo",
        "version": config.APP_VERSION,
        "itens": itens,
        "manuais": manuais,
        "resumo": {
            "usuarios": n_users,
            "organizacoes": n_org,
            "filiais": n_filial,
            "execucoes_coleta": n_coleta,
            "backups_locais": n_backups,
        },
    }


def os_access_writable(path: Path) -> bool:
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True
    except OSError:
        return False
