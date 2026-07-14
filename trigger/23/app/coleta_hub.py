"""Ambiente unificado de coleta — orquestra as duas fontes oficiais.

Camada única de orquestração para:
  * ``compras``  → pipeline Compras.gov / PNCP (Lei 14.133)
  * ``powerbi``  → CSVs do painel Dados Abertos PMU (Power BI)

As duas fontes podem ser coletadas isoladamente ou em sequência, compartilhando
o mesmo log e o mesmo dicionário de status para acompanhamento em tempo real.

Inclui heartbeat e liberação de trava para jobs órfãos (ex.: enriquecimento
longo que parece “travado” após F5).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from app.compras.orquestrador import executar_pipeline
from app.config import (
    MODALIDADES_PNCP,
    POWERBI_DATASETS,
)
from app.database import SessionLocal
from app.powerbi_coletor import coletar as coletar_powerbi
from app.unidades_compradoras import obter_unidades_compradoras

FONTES_VALIDAS: tuple[str, ...] = ("compras", "powerbi")

# Coleta padrão = núcleo operacional (órgãos/UASG + contratações + resultados).
# Enriquecimento (10 fornecedor, 01/02 catálogo) só no modo completo — evita
# travar a UI por milhares de chamadas HTTP silenciosas.
FASES_COMPRAS_PADRAO: list[str] = ["07", "07-resultados", "05"]

# Sem heartbeat por este tempo → trava considerada órfã (liberável).
STALE_AFTER_SEC = 180

# Status compartilhado do job unificado (lido por GET /api/coleta/status).
status: dict[str, Any] = {
    "running": False,
    "fase": "idle",
    "fontes": [],
    "log": [],
    "resultado": None,
    "contadores": {},
    "iniciado_em": None,
    "atualizado_em": None,
    "stale": False,
}


def _agora_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_iso(val: str | None) -> datetime | None:
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except ValueError:
        return None


def heartbeat(msg: str | None = None) -> None:
    """Atualiza o carimbo de atividade (e opcionalmente acrescenta ao log)."""
    status["atualizado_em"] = _agora_iso()
    if msg is not None:
        logs = list(status.get("log") or [])
        logs.append(msg)
        status["log"] = logs


def is_stale(*, agora: datetime | None = None) -> bool:
    if not status.get("running"):
        return False
    ref = _parse_iso(status.get("atualizado_em") or status.get("iniciado_em"))
    if ref is None:
        return True
    now = agora or datetime.now(timezone.utc)
    if ref.tzinfo is None:
        ref = ref.replace(tzinfo=timezone.utc)
    return (now - ref).total_seconds() >= STALE_AFTER_SEC


def snapshot_status() -> dict[str, Any]:
    """Cópia do status com flag ``stale`` recalculada."""
    out = dict(status)
    out["stale"] = is_stale()
    return out


def liberar_trava(*, motivo: str = "Trava liberada manualmente") -> dict[str, Any]:
    """Libera job travado/órfão para permitir nova coleta."""
    estava = bool(status.get("running"))
    logs = list(status.get("log") or [])
    logs.append(f"⚠ {motivo}")
    status.update(
        running=False,
        fase="idle",
        log=logs,
        atualizado_em=_agora_iso(),
        stale=False,
        resultado={
            "ok": False,
            "erro": motivo,
            "fontes": (status.get("resultado") or {}).get("fontes")
            if isinstance(status.get("resultado"), dict)
            else {},
            "liberado": True,
        },
    )
    return {"liberado": True, "estava_em_andamento": estava, "status": snapshot_status()}


def normalizar_fontes(fontes: list[str] | None) -> list[str]:
    """Normaliza, valida e remove duplicatas preservando a ordem de execução."""
    if not fontes:
        raise ValueError("Selecione ao menos uma fonte")
    vistos: list[str] = []
    for bruto in fontes:
        f = (bruto or "").strip().lower()
        if f not in FONTES_VALIDAS:
            raise ValueError(f"Fonte inválida: {bruto}")
        if f not in vistos:
            vistos.append(f)
    return vistos


def preparar_status(fontes: list[str]) -> None:
    agora = _agora_iso()
    status.update(
        running=True,
        fase="iniciando",
        fontes=list(fontes),
        log=[],
        resultado=None,
        contadores={},
        iniciado_em=agora,
        atualizado_em=agora,
        stale=False,
    )


def _resolver_periodo(
    ano: int | None,
    data_inicial: date | None,
    data_final: date | None,
) -> tuple[date, date]:
    if data_inicial and data_final:
        return data_inicial, data_final
    if ano:
        return date(ano, 1, 1), date(ano, 12, 31)
    atual = datetime.now(timezone.utc).year
    return date(atual, 1, 1), date(atual, 12, 31)


def _validar_unidades(unidades: list[str] | None) -> None:
    cfg = obter_unidades_compradoras()
    for u in unidades or []:
        if u not in cfg:
            raise ValueError(f"Unidade inválida: {u}")


def _validar_modalidades(modalidades: list[int] | None) -> None:
    for m in modalidades or []:
        if m not in MODALIDADES_PNCP:
            raise ValueError(f"Modalidade inválida: {m}")


def executar_coleta_unificada(
    *,
    fontes: list[str],
    ano: int | None = None,
    data_inicial: date | None = None,
    data_final: date | None = None,
    unidades: list[str] | None = None,
    modalidades: list[int] | None = None,
    fases: list[str] | None = None,
    ano_pgc: int | None = None,
    datasets: list[str] | None = None,
    anos: list[int] | None = None,
) -> None:
    """Executa a coleta das fontes selecionadas, em sequência, com log único."""
    logs: list[str] = []
    resultado_fontes: dict[str, Any] = {}

    def on_log(msg: str) -> None:
        logs.append(msg)
        status["log"] = logs.copy()
        status["atualizado_em"] = _agora_iso()

    def on_fase(fase: str) -> None:
        status["fase"] = fase
        status["atualizado_em"] = _agora_iso()

    try:
        fontes = normalizar_fontes(fontes)
        _validar_unidades(unidades)
        _validar_modalidades(modalidades)
        di, df = _resolver_periodo(ano, data_inicial, data_final)

        for fonte in fontes:
            if fonte == "compras":
                on_fase("compras:iniciando")
                on_log(f"══ Compras.gov / PNCP · {di.isoformat()} → {df.isoformat()} ══")
                pipeline = executar_pipeline(
                    fases=fases or FASES_COMPRAS_PADRAO,
                    data_inicial=di,
                    data_final=df,
                    unidades=unidades,
                    modalidades=modalidades,
                    ano=ano,
                    ano_pgc=ano_pgc,
                    on_log=on_log,
                    on_fase=on_fase,
                )
                status["contadores"]["compras"] = pipeline.contadores
                resultado_fontes["compras"] = {"ok": True, **pipeline.contadores}

            elif fonte == "powerbi":
                on_fase("powerbi:iniciando")
                anos_pbi = anos or ([ano] if ano else [di.year])
                ds = datasets or list(POWERBI_DATASETS.keys())
                on_log(f"══ Power BI / Dados Abertos PMU · anos {anos_pbi} ══")
                db = SessionLocal()
                try:
                    r = coletar_powerbi(db, anos_pbi, ds, on_log=on_log)
                finally:
                    db.close()
                status["contadores"]["powerbi"] = r
                resultado_fontes["powerbi"] = {"ok": True, **r}

        status["resultado"] = {"ok": True, "fontes": resultado_fontes}
    except Exception as exc:  # noqa: BLE001 — reportado ao usuário no status
        on_log(f"Erro: {exc}")
        status["resultado"] = {
            "ok": False,
            "erro": str(exc),
            "fontes": resultado_fontes,
        }
    finally:
        status["running"] = False
        status["fase"] = "idle"
        status["atualizado_em"] = _agora_iso()
        status["stale"] = False
