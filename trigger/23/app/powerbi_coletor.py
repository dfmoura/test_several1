"""Coleta CSV dos painéis Power BI — fonte Dados Abertos PMU."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Callable

import httpx
from sqlalchemy.orm import Session

from app.config import POWERBI_DATASETS, POWERBI_DIR, POWERBI_PANEL_URL, POWERBI_PMU_BASE, USER_AGENT
from app.powerbi_csv import (
    CONTRATOS_COLUNAS,
    GESTORES_COLUNAS,
    LICITACOES_COLUNAS,
    decode_csv_bytes,
    parse_csv_dicts,
)
from app.powerbi_repo import importar_contratos, importar_processos, importar_responsaveis

LogFn = Callable[[str], None]


def _log(on_log: LogFn | None, msg: str) -> None:
    if on_log:
        on_log(msg)


def _salvar_backup(dataset: str, ano: int | None, data: bytes) -> Path | None:
    try:
        POWERBI_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        sufixo = f"_{ano}" if ano else ""
        path = POWERBI_DIR / f"{dataset}{sufixo}_{ts}.csv"
        path.write_bytes(data)
        latest = POWERBI_DIR / f"{dataset}{sufixo}_latest.csv"
        latest.write_bytes(data)
        return path
    except OSError:
        return None


def _baixar_csv(url: str, timeout: float = 120.0) -> bytes:
    with httpx.Client(
        headers={"User-Agent": USER_AGENT},
        timeout=timeout,
        follow_redirects=True,
    ) as client:
        r = client.get(url)
        r.raise_for_status()
        return r.content


def coletar(
    db: Session,
    anos: list[int],
    datasets: list[str],
    on_log: LogFn | None = None,
) -> dict[str, Any]:
    resultado: dict[str, Any] = {"datasets": {}, "anos": anos}
    anos_ordenados = sorted({int(a) for a in anos})

    _log(on_log, f"Painel Power BI: {POWERBI_PANEL_URL}")
    _log(on_log, f"Fonte CSV: {POWERBI_PMU_BASE}")
    _log(on_log, "Modelo: ÓRGÃOS → PROCESSOS → CONTRATOS → RESPONSÁVEIS (+ FORNECEDORES, PESSOAS, PAPÉIS)")

    if "gestores" in datasets:
        cfg = POWERBI_DATASETS["gestores"]
        url = f"{POWERBI_PMU_BASE}{cfg['endpoint']}"
        _log(on_log, f"\n▶ {cfg['nome']}")
        _log(on_log, f"GET {url}")
        data = _baixar_csv(url)
        texto, enc = decode_csv_bytes(data)
        _log(on_log, f"  Encoding: {enc} · {len(data):,} bytes")
        backup = _salvar_backup("gestores_fiscais", None, data)
        if backup:
            _log(on_log, f"  Backup: {backup}")
        rows = parse_csv_dicts(data, GESTORES_COLUNAS)
        _log(on_log, f"  {len(rows)} registro(s) no CSV")
        ins, ign, rem = importar_responsaveis(db, rows)
        _log(on_log, f"  Importados: {ins} · ignorados: {ign} · substituídos: {rem}")
        resultado["datasets"]["gestores"] = {"csv": len(rows), "inseridos": ins, "ignorados": ign}

    for ano in anos_ordenados:
        if "licitacoes" in datasets:
            cfg = POWERBI_DATASETS["licitacoes"]
            url = f"{POWERBI_PMU_BASE}{cfg['endpoint'].format(ano=ano)}"
            _log(on_log, f"\n▶ {cfg['nome']} — ano {ano}")
            _log(on_log, f"GET {url}")
            data = _baixar_csv(url)
            if not data:
                _log(on_log, f"  AVISO: CSV vazio para {ano}")
                resultado.setdefault("datasets", {}).setdefault("licitacoes", {})[str(ano)] = {
                    "csv": 0, "inseridos": 0, "ignorados": 0, "vazio": True,
                }
                continue
            texto, enc = decode_csv_bytes(data)
            _log(on_log, f"  Encoding: {enc} · {len(data):,} bytes")
            backup = _salvar_backup("licitacoes", ano, data)
            if backup:
                _log(on_log, f"  Backup: {backup}")
            rows = parse_csv_dicts(data, LICITACOES_COLUNAS)
            _log(on_log, f"  {len(rows)} registro(s) no CSV")
            ins, ign, rem = importar_processos(db, rows, ano)
            _log(on_log, f"  Importados: {ins} · ignorados: {ign} · substituídos: {rem}")
            resultado["datasets"].setdefault("licitacoes", {})[str(ano)] = {
                "csv": len(rows), "inseridos": ins, "ignorados": ign,
            }

        if "contratos" in datasets:
            cfg = POWERBI_DATASETS["contratos"]
            url = f"{POWERBI_PMU_BASE}{cfg['endpoint'].format(ano=ano)}"
            _log(on_log, f"\n▶ {cfg['nome']} — ano {ano}")
            _log(on_log, f"GET {url}")
            data = _baixar_csv(url)
            if not data:
                _log(on_log, f"  AVISO: CSV vazio para {ano}")
                resultado.setdefault("datasets", {}).setdefault("contratos", {})[str(ano)] = {
                    "csv": 0, "inseridos": 0, "ignorados": 0, "vazio": True,
                }
                continue
            texto, enc = decode_csv_bytes(data)
            _log(on_log, f"  Encoding: {enc} · {len(data):,} bytes")
            backup = _salvar_backup("contratos", ano, data)
            if backup:
                _log(on_log, f"  Backup: {backup}")
            rows = parse_csv_dicts(data, CONTRATOS_COLUNAS)
            _log(on_log, f"  {len(rows)} registro(s) no CSV")
            ins, ign, rem = importar_contratos(db, rows, ano)
            _log(on_log, f"  Importados: {ins} · ignorados: {ign} · substituídos: {rem}")
            resultado["datasets"].setdefault("contratos", {})[str(ano)] = {
                "csv": len(rows), "inseridos": ins, "ignorados": ign,
            }

    return resultado
