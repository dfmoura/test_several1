"""Coleta CSV dos painéis Power BI — fonte Dados Abertos PMU."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Callable

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import POWERBI_DATASETS, POWERBI_DIR, POWERBI_PANEL_URL, POWERBI_PMU_BASE, USER_AGENT
from app.database import (
    POWERBI_CAMPOS_PRESERVADOS_SYNC,
    PowerBiContrato,
    PowerBiGestorFiscal,
    PowerBiLicitacao,
)
from app.powerbi_csv import (
    CONTRATOS_COLUNAS,
    GESTORES_COLUNAS,
    LICITACOES_COLUNAS,
    contrato_para_db,
    decode_csv_bytes,
    gestor_para_db,
    licitacao_para_db,
    parse_csv_dicts,
)

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


def _preservar_observador(row_db: Any, existente: Any | None) -> None:
    if not existente:
        return
    for campo in POWERBI_CAMPOS_PRESERVADOS_SYNC:
        if getattr(existente, campo, None) is not None:
            setattr(row_db, campo, getattr(existente, campo))


def _importar_licitacoes(
    db: Session,
    rows: list[dict[str, str]],
    fonte_ano: int,
    on_log: LogFn | None,
) -> tuple[int, int]:
    removidos = db.execute(
        delete(PowerBiLicitacao).where(PowerBiLicitacao.fonte_ano_coleta == fonte_ano)
    ).rowcount
    _log(on_log, f"  Substituídos {removidos} registro(s) anteriores do ano {fonte_ano}")

    inseridos = ignorados = duplicados = 0
    vistos: set[tuple] = set()
    for row in rows:
        try:
            payload = licitacao_para_db(row, fonte_ano)
        except ValueError:
            ignorados += 1
            continue

        chave = (
            payload["ano_processo"],
            payload["empresa"],
            payload["processo"],
            payload["modalidade"],
        )
        if chave in vistos:
            duplicados += 1
            continue
        vistos.add(chave)

        existente = db.scalar(
            select(PowerBiLicitacao).where(
                PowerBiLicitacao.ano_processo == payload["ano_processo"],
                PowerBiLicitacao.empresa == payload["empresa"],
                PowerBiLicitacao.processo == payload["processo"],
                PowerBiLicitacao.modalidade == payload["modalidade"],
            )
        )
        obj = PowerBiLicitacao(**payload)
        _preservar_observador(obj, existente)
        db.add(obj)
        inseridos += 1

    db.commit()
    if ignorados:
        _log(on_log, f"  {ignorados} linha(s) ignorada(s) (dados incompletos)")
    if duplicados:
        _log(on_log, f"  {duplicados} linha(s) duplicada(s) no CSV (ignoradas)")
    return inseridos, ignorados


def _importar_contratos(
    db: Session,
    rows: list[dict[str, str]],
    fonte_ano: int,
    on_log: LogFn | None,
) -> tuple[int, int]:
    removidos = db.execute(
        delete(PowerBiContrato).where(PowerBiContrato.fonte_ano_coleta == fonte_ano)
    ).rowcount
    _log(on_log, f"  Substituídos {removidos} registro(s) anteriores do ano {fonte_ano}")

    inseridos = ignorados = duplicados = 0
    vistos: set[tuple] = set()
    for row in rows:
        try:
            payload = contrato_para_db(row, fonte_ano)
        except ValueError:
            ignorados += 1
            continue

        chave = (
            payload["ano_contrato"],
            payload["empresa"],
            payload["nr_contrato"],
            payload["nr_aditivo"],
            payload["nr_parcela"],
            payload["processo"],
        )
        if chave in vistos:
            duplicados += 1
            continue
        vistos.add(chave)

        existente = db.scalar(
            select(PowerBiContrato).where(
                PowerBiContrato.ano_contrato == payload["ano_contrato"],
                PowerBiContrato.empresa == payload["empresa"],
                PowerBiContrato.nr_contrato == payload["nr_contrato"],
                PowerBiContrato.nr_aditivo == payload["nr_aditivo"],
                PowerBiContrato.nr_parcela == payload["nr_parcela"],
                PowerBiContrato.processo == payload["processo"],
            )
        )
        obj = PowerBiContrato(**payload)
        _preservar_observador(obj, existente)
        db.add(obj)
        inseridos += 1

    db.commit()
    if ignorados:
        _log(on_log, f"  {ignorados} linha(s) ignorada(s) (dados incompletos)")
    if duplicados:
        _log(on_log, f"  {duplicados} linha(s) duplicada(s) no CSV (ignoradas)")
    return inseridos, ignorados


def _chave_gestor(payload: dict[str, Any]) -> tuple:
    return (
        payload["ano_contrato"],
        payload["nr_contrato"],
        payload["ds_orgao"],
        payload["ds_papeis"],
        payload["nm_pessoa_papel"],
        payload["dt_inicio"],
        payload["fornecedor"],
    )


def _importar_gestores(
    db: Session,
    rows: list[dict[str, str]],
    on_log: LogFn | None,
) -> tuple[int, int]:
    preservados: dict[tuple, int | None] = {}
    for g in db.scalars(select(PowerBiGestorFiscal)).all():
        preservados[
            (
                g.ano_contrato,
                g.nr_contrato,
                g.ds_orgao,
                g.ds_papeis,
                g.nm_pessoa_papel,
                g.dt_inicio,
                g.fornecedor,
            )
        ] = g.observador_id

    removidos = db.execute(delete(PowerBiGestorFiscal)).rowcount
    _log(on_log, f"  Base de gestores/fiscais substituída ({removidos} registro(s) anteriores)")

    inseridos = ignorados = duplicados = 0
    vistos: set[tuple] = set()
    for row in rows:
        try:
            payload = gestor_para_db(row)
        except ValueError:
            ignorados += 1
            continue

        chave = _chave_gestor(payload)
        if chave in vistos:
            duplicados += 1
            continue
        vistos.add(chave)

        obj = PowerBiGestorFiscal(**payload)
        obs = preservados.get(chave)
        if obs:
            obj.observador_id = obs
        db.add(obj)
        inseridos += 1

    db.commit()
    if duplicados:
        _log(on_log, f"  {duplicados} linha(s) duplicada(s) no CSV (ignoradas)")
    if ignorados:
        _log(on_log, f"  {ignorados} linha(s) ignorada(s) (dados incompletos)")
    return inseridos, ignorados


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
        ins, ign = _importar_gestores(db, rows, on_log)
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
                    "csv": 0,
                    "inseridos": 0,
                    "ignorados": 0,
                    "vazio": True,
                }
                continue
            texto, enc = decode_csv_bytes(data)
            _log(on_log, f"  Encoding: {enc} · {len(data):,} bytes")
            backup = _salvar_backup("licitacoes", ano, data)
            if backup:
                _log(on_log, f"  Backup: {backup}")
            rows = parse_csv_dicts(data, LICITACOES_COLUNAS)
            _log(on_log, f"  {len(rows)} registro(s) no CSV")
            ins, ign = _importar_licitacoes(db, rows, ano, on_log)
            resultado["datasets"].setdefault("licitacoes", {})[str(ano)] = {
                "csv": len(rows),
                "inseridos": ins,
                "ignorados": ign,
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
                    "csv": 0,
                    "inseridos": 0,
                    "ignorados": 0,
                    "vazio": True,
                }
                continue
            texto, enc = decode_csv_bytes(data)
            _log(on_log, f"  Encoding: {enc} · {len(data):,} bytes")
            backup = _salvar_backup("contratos", ano, data)
            if backup:
                _log(on_log, f"  Backup: {backup}")
            rows = parse_csv_dicts(data, CONTRATOS_COLUNAS)
            _log(on_log, f"  {len(rows)} registro(s) no CSV")
            ins, ign = _importar_contratos(db, rows, ano, on_log)
            resultado["datasets"].setdefault("contratos", {})[str(ano)] = {
                "csv": len(rows),
                "inseridos": ins,
                "ignorados": ign,
            }

    return resultado
