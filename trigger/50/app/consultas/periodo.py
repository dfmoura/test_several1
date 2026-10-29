"""Período temporal dos indicadores — resolução única para API e UI.

Eixos oficiais:
- ``ano_*`` → campo PNCP ``Contratacao.ano`` (exercício da compra)
- ``quadrimestre`` / ``quadrimestre_atual`` / ``intervalo`` → publicação PNCP
  (com fallback seguro quando a data não é parseável)

Presets da UI: ano_atual | ano_anterior | quadrimestre | intervalo | tudo
"""

from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any


PERIODO_ANO_ATUAL = "ano_atual"
PERIODO_ANO_ANTERIOR = "ano_anterior"
PERIODO_QUADRIMESTRE = "quadrimestre"
PERIODO_QUADRIMESTRE_ATUAL = "quadrimestre_atual"
PERIODO_INTERVALO = "intervalo"
PERIODO_TUDO = "tudo"

PERIODOS_VALIDOS = frozenset(
    {
        PERIODO_ANO_ATUAL,
        PERIODO_ANO_ANTERIOR,
        PERIODO_QUADRIMESTRE,
        PERIODO_QUADRIMESTRE_ATUAL,
        PERIODO_INTERVALO,
        PERIODO_TUDO,
    }
)

# Quadrimestre civil (jan–abr / mai–ago / set–dez) — padrão operacional OSC.
_QUAD_MESES = {
    1: (1, 4, "Q1 (jan–abr)"),
    2: (5, 8, "Q2 (mai–ago)"),
    3: (9, 12, "Q3 (set–dez)"),
}


class PeriodoError(ValueError):
    """Parâmetros de período inválidos (HTTP 400)."""


@dataclass(frozen=True)
class PeriodoAplicado:
    modo: str
    rotulo: str
    data_inicio: date | None = None
    data_fim: date | None = None
    ano: int | None = None
    quadrimestre: int | None = None

    @property
    def ativo(self) -> bool:
        return self.modo != PERIODO_TUDO

    def to_dict(self) -> dict[str, Any]:
        return {
            "modo": self.modo,
            "rotulo": self.rotulo,
            "data_inicio": self.data_inicio.isoformat() if self.data_inicio else None,
            "data_fim": self.data_fim.isoformat() if self.data_fim else None,
            "ano": self.ano,
            "quadrimestre": self.quadrimestre,
        }


def periodo_tudo() -> PeriodoAplicado:
    return PeriodoAplicado(modo=PERIODO_TUDO, rotulo="Todo o histórico")


def _quadrimestre_de(hoje: date) -> int:
    return (hoje.month - 1) // 4 + 1


def _parse_iso_date(valor: str | None, *, campo: str) -> date:
    if not valor or not str(valor).strip():
        raise PeriodoError(f"{campo} obrigatório para intervalo.")
    texto = str(valor).strip()[:10]
    try:
        return date.fromisoformat(texto)
    except ValueError as exc:
        raise PeriodoError(f"{campo} inválido (use AAAA-MM-DD).") from exc


def _parse_ano(valor: int | str | None) -> int | None:
    if valor is None or valor == "":
        return None
    try:
        ano = int(valor)
    except (TypeError, ValueError) as exc:
        raise PeriodoError("ano inválido.") from exc
    if ano < 2000 or ano > 2100:
        raise PeriodoError("ano fora do intervalo permitido (2000–2100).")
    return ano


def _parse_quadrimestre(valor: int | str | None) -> int | None:
    if valor is None or valor == "":
        return None
    try:
        q = int(valor)
    except (TypeError, ValueError) as exc:
        raise PeriodoError("quadrimestre inválido (use 1, 2 ou 3).") from exc
    if q not in _QUAD_MESES:
        raise PeriodoError("quadrimestre inválido (use 1, 2 ou 3).")
    return q


def montar_quadrimestre(
    ano: int,
    q: int,
    *,
    modo: str = PERIODO_QUADRIMESTRE,
) -> PeriodoAplicado:
    """Monta período canônico de um quadrimestre civil."""
    if q not in _QUAD_MESES:
        raise PeriodoError("quadrimestre inválido (use 1, 2 ou 3).")
    m0, m1, rotulo_q = _QUAD_MESES[q]
    fim = date(ano, m1, monthrange(ano, m1)[1])
    return PeriodoAplicado(
        modo=modo,
        rotulo=f"{ano} · {rotulo_q}",
        data_inicio=date(ano, m0, 1),
        data_fim=fim,
        ano=ano,
        quadrimestre=q,
    )


def parse_data_publicacao(valor: str | None) -> date | None:
    """Converte data de publicação armazenada (BR ou ISO) em ``date``."""
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return None
    for fmt, n in (
        ("%Y-%m-%dT%H:%M:%S", 19),
        ("%Y-%m-%d %H:%M:%S", 19),
        ("%Y-%m-%d", 10),
    ):
        try:
            return datetime.strptime(texto[:n], fmt).date()
        except ValueError:
            continue
    for fmt, n in (("%d/%m/%Y %H:%M", 16), ("%d/%m/%Y", 10)):
        try:
            return datetime.strptime(texto[:n], fmt).date()
        except ValueError:
            continue
    return None


def resolver_periodo(
    periodo: str | None = None,
    data_inicio: str | None = None,
    data_fim: str | None = None,
    *,
    ano: int | str | None = None,
    quadrimestre: int | str | None = None,
    hoje: date | None = None,
) -> PeriodoAplicado:
    """Resolve query params → período canônico.

    Sem ``periodo`` e sem datas → ``tudo`` (compatível com callers internos).
    Com datas e sem ``periodo`` → trata como ``intervalo``.
    ``quadrimestre`` + ``ano``/``quadrimestre`` (1–3) escolhe Q explícito.
    ``quadrimestre_atual`` = atalho para o Q corrente.
    """
    ref = hoje or date.today()
    modo = (periodo or "").strip().lower() or None
    ano_q = _parse_ano(ano)
    q_num = _parse_quadrimestre(quadrimestre)

    if data_inicio or data_fim:
        if modo and modo not in (PERIODO_INTERVALO, PERIODO_TUDO):
            modo = PERIODO_INTERVALO
        elif not modo:
            modo = PERIODO_INTERVALO

    # Ano+Q sem preset → modo quadrimestre
    if modo is None and (ano_q is not None or q_num is not None):
        modo = PERIODO_QUADRIMESTRE

    if modo is None:
        return periodo_tudo()

    if modo not in PERIODOS_VALIDOS:
        raise PeriodoError(
            "periodo inválido. Use: ano_atual, ano_anterior, "
            "quadrimestre, quadrimestre_atual, intervalo, tudo."
        )

    if modo == PERIODO_TUDO:
        return periodo_tudo()

    if modo == PERIODO_ANO_ATUAL:
        y = ref.year
        return PeriodoAplicado(
            modo=modo,
            rotulo=f"Ano {y}",
            data_inicio=date(y, 1, 1),
            data_fim=date(y, 12, 31),
            ano=y,
        )

    if modo == PERIODO_ANO_ANTERIOR:
        y = ref.year - 1
        return PeriodoAplicado(
            modo=modo,
            rotulo=f"Ano {y}",
            data_inicio=date(y, 1, 1),
            data_fim=date(y, 12, 31),
            ano=y,
        )

    if modo == PERIODO_QUADRIMESTRE_ATUAL:
        return montar_quadrimestre(
            ref.year,
            _quadrimestre_de(ref),
            modo=PERIODO_QUADRIMESTRE_ATUAL,
        )

    if modo == PERIODO_QUADRIMESTRE:
        y = ano_q if ano_q is not None else ref.year
        q = q_num if q_num is not None else _quadrimestre_de(ref)
        return montar_quadrimestre(y, q, modo=PERIODO_QUADRIMESTRE)

    # intervalo
    ini = _parse_iso_date(data_inicio, campo="data_inicio")
    fim = _parse_iso_date(data_fim, campo="data_fim")
    if ini > fim:
        raise PeriodoError("data_inicio não pode ser posterior a data_fim.")
    rotulo = f"{ini.strftime('%d/%m/%Y')} – {fim.strftime('%d/%m/%Y')}"
    return PeriodoAplicado(
        modo=PERIODO_INTERVALO,
        rotulo=rotulo,
        data_inicio=ini,
        data_fim=fim,
    )


def contratacao_no_periodo(
    *,
    ano: int,
    data_publicacao_pncp: str | None,
    periodo: PeriodoAplicado,
) -> bool:
    """True se a contratação entra no período aplicado."""
    if not periodo.ativo:
        return True

    if periodo.modo in (PERIODO_ANO_ATUAL, PERIODO_ANO_ANTERIOR):
        return int(ano or 0) == int(periodo.ano or 0)

    # Quadrimestre / intervalo: eixo = publicação PNCP
    if periodo.data_inicio is None or periodo.data_fim is None:
        return True

    pub = parse_data_publicacao(data_publicacao_pncp)
    if pub is not None:
        return periodo.data_inicio <= pub <= periodo.data_fim

    a = int(ano or 0)
    if a <= 0:
        return False
    return (
        periodo.data_inicio <= date(a, 1, 1)
        and periodo.data_fim >= date(a, 12, 31)
    )
