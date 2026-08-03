"""Catálogo de preços dinâmico + overrides por orçamento."""

from __future__ import annotations

import copy
import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DEFAULT_CATALOG = DATA_DIR / "catalog_oficial.json"

# Capacidade padrão (rolos/caixa) — alinhada à sheet CAIXAS nos trechos sãos
# e à nova sheet MEDIDA_CAIXAS. Corrige a tabela manual corrompida (3" > 312).
ROLOS_POR_CAIXA_DEFAULT = {
    '1"': 20,
    '3"': 12,
}
CAIXA_PADRAO_DEFAULT = {
    '1"': {"caixa_id": 2, "medida": "250x200x200"},
    '3"': {"caixa_id": 6, "medida": "500x300x300"},
}


def _norm(s: str) -> str:
    return " ".join(str(s).strip().split())


def _norm_tubete(tubete: str) -> str:
    t = _norm(tubete)
    if t in ('1" 1/2', '1"1/2'):
        return '1"'
    return t

def _load_cores_ml(raw: dict[str, Any]) -> dict[str, float]:
    out: dict[str, float] = {}
    for k, v in raw.items():
        key = str(k).strip().upper()
        if key != "4V":
            try:
                key = str(int(float(key)))
            except (TypeError, ValueError):
                key = str(k).strip()
        out[key] = float(v)
    return out


# Máquinas canônicas do sistema (F10 roda serviço + G10 custo detalhado).
# No Excel, HORA MÁQUINA agrupa BETA/160/250/ETIRAMA numa só tabela; aqui cada
# máquina aparece separada (mesmo preço-hora do grupo, escolha explícita).
MAQUINAS_CANONICAS = ["BETA", "160", "250", "ETIRAMA", "BATIDA", "MODULAR"]

# Nomes legados / mapa de facas → código canônico
MAQUINA_ALIASES_DEFAULT = {
    "BETA / 160  / 250 / ETIRAMA": "BETA",
    "BETA / 160 / 250 / ETIRAMA": "BETA",
    "BETAFLEX": "BETA",
    "REFLEXO": "160",
    "REFLEXO 160": "160",
    "REFLEXO 250": "250",
    "MODULAR SPX": "MODULAR",
}


@dataclass
class Catalogo:
    papel: dict[str, float] = field(default_factory=dict)
    tinta_faixa_m2: float = 30.0
    tinta_ate_30_por_cor: float = 10.0
    tinta_acima_m2: float = 0.4
    acabamentos: dict[str, float] = field(default_factory=dict)
    perda_acabamento: dict[str, float] = field(default_factory=dict)
    # Aba PERDA DE PAPEL ACERTO — metros lineares (col C) por nº de cores
    perda_papel_acerto_ml: dict[str, float] = field(default_factory=dict)
    perda_papel_0_3: dict[str, float] = field(default_factory=dict)
    perda_papel_f6: float = 180.0
    tubete: dict[str, float] = field(default_factory=dict)
    hora_parada_h: dict[str, float] = field(default_factory=dict)
    hora_maquina: dict[str, dict[str, float]] = field(default_factory=dict)
    # Lista canônica exibida na UI (G10) — detalhada, não o grupo Excel
    maquinas: list[str] = field(default_factory=lambda: list(MAQUINAS_CANONICAS))
    # Excel MÁQUINA!A2:A7 — F10 "MAQUINA RODA SERVIÇO" (operacional; ≠ G10 custo)
    maquinas_roda_servico: list[str] = field(
        default_factory=lambda: list(MAQUINAS_CANONICAS)
    )
    maquina_aliases: dict[str, str] = field(
        default_factory=lambda: dict(MAQUINA_ALIASES_DEFAULT)
    )
    matriz_cm2: float = 0.28
    preco_caixa: float = 7.0
    setup_horas: float = 1.0
    limite_metragem_bobina: float = 1000.0
    ceiling_etiqueta: float = 10.0
    # Lookup legado (tubete+rolos → qtde) — gerado a partir do empacotamento
    caixas: dict[str, int] = field(default_factory=dict)
    # Sheet MEDIDA_CAIXAS — medidas físicas + empacotamento por tubete
    medida_caixas: list[dict[str, Any]] = field(default_factory=list)
    caixa_empacotamento: dict[str, dict[str, Any]] = field(default_factory=dict)
    rebobinacao_nome: str = "REBOBINAÇÃO"

    def preco_papel(self, nome: str) -> float:
        return float(self._lookup(self.papel, nome))

    def preco_acabamento(self, nome: str) -> float:
        return float(self._lookup(self.acabamentos, nome))

    def perda_acab(self, nome: str) -> float:
        return float(self._lookup(self.perda_acabamento, nome))

    def perda_papel_acerto_metros(self, cores: Any) -> float:
        """Metros lineares da aba PERDA DE PAPEL ACERTO (col C). Cores 0 → 0."""
        if cores is None:
            return 0.0
        if isinstance(cores, str):
            k = cores.strip().upper()
        elif isinstance(cores, float) and cores == int(cores):
            k = str(int(cores))
        else:
            k = str(cores).strip()
        if k in ("0", "0.0", ""):
            return 0.0
        if k not in self.perda_papel_acerto_ml:
            raise KeyError(f"Cores sem PERDA DE PAPEL ACERTO: {cores!r}")
        return float(self.perda_papel_acerto_ml[k])

    def preco_tubete(self, tamanho: str) -> float:
        t = _norm(tamanho)
        if t in ('1" 1/2', "1\"1/2", "1.5\""):
            t = '1"'  # D5 — não existe; usar 1"
        return float(self._lookup(self.tubete, t))

    def hora_parada(self, tipo: str) -> float:
        if not tipo:
            return 0.0
        return float(self._lookup(self.hora_parada_h, tipo))

    def taxa_hora_maquina(self, maquina: str, cores: Any) -> float:
        bloco = self._lookup_maquina(maquina)
        key = str(cores).strip()
        if key not in bloco:
            # tentar int sem .0
            try:
                key = str(int(float(key)))
            except (TypeError, ValueError):
                pass
        if key not in bloco:
            raise KeyError(f"cores={cores!r} não encontrado em HORA MÁQUINA para {maquina!r}")
        return float(bloco[key])

    def empacotamento_tubete(self, tubete: str) -> dict[str, Any]:
        """Regra de caixa preferida + capacidade (rolos/caixa) por tubete."""
        t = _norm_tubete(tubete)
        emp = self.caixa_empacotamento.get(t) or self.caixa_empacotamento.get(_norm(tubete))
        if emp:
            return dict(emp)
        padrao = CAIXA_PADRAO_DEFAULT.get(t, {"caixa_id": None, "medida": None})
        return {
            "caixa_id": padrao.get("caixa_id"),
            "medida": padrao.get("medida"),
            "rolos_por_caixa": ROLOS_POR_CAIXA_DEFAULT.get(t, 12),
        }

    def rolos_por_caixa(self, tubete: str) -> int:
        emp = self.empacotamento_tubete(tubete)
        cap = int(emp.get("rolos_por_caixa") or ROLOS_POR_CAIXA_DEFAULT.get(_norm_tubete(tubete), 12))
        if cap <= 0:
            raise ValueError(f"rolos_por_caixa inválido para tubete {tubete!r}")
        return cap

    def medida_caixa_preferida(self, tubete: str) -> str | None:
        emp = self.empacotamento_tubete(tubete)
        med = emp.get("medida")
        return str(med) if med else None

    def qtde_caixas(self, tubete: str, rolos: float) -> int:
        """
        Qtde de caixas = CEILING(rolos / rolos_por_caixa).

        Fonte: MEDIDA_CAIXAS + empacotamento por tubete.
        Substitui o VLOOKUP opaco da sheet CAIXAS (tabela manual com trechos
        corrompidos). Mantém paridade nos volumes típicos dos orçamentos oficiais.
        """
        if rolos is None or float(rolos) <= 0:
            return 0
        cap = self.rolos_por_caixa(tubete)
        return int(math.ceil(float(rolos) / cap))

    def preco_rebobinacao(self) -> float:
        return float(self._lookup(self.acabamentos, self.rebobinacao_nome))

    def _lookup(self, table: dict[str, Any], nome: str) -> Any:
        n = _norm(nome)
        if n in table:
            return table[n]
        # match case-insensitive / trailing space
        for k, v in table.items():
            if _norm(k).upper() == n.upper():
                return v
        raise KeyError(f"Não encontrado no catálogo: {nome!r}")

    def normalizar_maquina(self, maquina: str) -> str:
        """Converte nome Excel/mapa/legado → código canônico (BETA, 160, …)."""
        n = _norm(maquina)
        if not n:
            raise KeyError("Máquina vazia")
        if n in self.hora_maquina:
            return n
        for k in self.hora_maquina:
            if _norm(k).upper() == n.upper():
                return k
        # aliases explícitos do catálogo
        for alias, canon in self.maquina_aliases.items():
            if _norm(alias).upper() == n.upper():
                return canon
        nu = n.upper()
        if nu in self.maquina_aliases:
            return self.maquina_aliases[nu]
        # fallbacks parciais (planilha antiga / digitação)
        if "MODULAR" in nu:
            return "MODULAR"
        if "BATIDA" in nu:
            return "BATIDA"
        if "ETIRAMA" in nu or nu == "ETI":
            return "ETIRAMA"
        if "BETAFLEX" in nu or nu == "BETA":
            return "BETA"
        if "250" in nu:
            return "250"
        if "160" in nu or nu == "REFLEXO":
            return "160"
        raise KeyError(f"Máquina não encontrada: {maquina!r}")

    def _lookup_maquina(self, maquina: str) -> dict[str, float]:
        key = self.normalizar_maquina(maquina)
        if key not in self.hora_maquina:
            raise KeyError(f"Máquina sem tabela HORA MÁQUINA: {maquina!r} → {key!r}")
        return self.hora_maquina[key]


def load_catalog(path: Path | None = None) -> Catalogo:
    p = path or DEFAULT_CATALOG
    raw = json.loads(p.read_text(encoding="utf-8"))
    tinta = raw["tinta"] if isinstance(raw.get("tinta"), dict) else {}
    perda_0_3 = {str(k): float(v) for k, v in raw.get("perda_papel_0_3", {}).items()}
    return Catalogo(
        papel={_norm(k): float(v) for k, v in raw["papel"].items()},
        tinta_faixa_m2=float(tinta.get("faixa_m2", raw.get("tinta_faixa_m2", 30))),
        tinta_ate_30_por_cor=float(tinta.get("valor_ate_30_por_cor", raw.get("tinta_ate_30_por_cor", 10))),
        tinta_acima_m2=float(tinta.get("valor_acima_m2", raw.get("tinta_acima_m2", 0.4))),
        acabamentos={_norm(k): float(v) for k, v in raw["acabamentos"].items()},
        perda_acabamento={_norm(k): float(v) for k, v in raw["perda_acabamento"].items()},
        perda_papel_acerto_ml=_load_cores_ml(raw.get("perda_papel_acerto_ml", {})),
        perda_papel_0_3=perda_0_3,
        perda_papel_f6=float(raw.get("perda_papel_f6", 180)),
        tubete={_norm(k): float(v) for k, v in raw["tubete"].items()},
        hora_parada_h={_norm(k): float(v) for k, v in raw.get("hora_parada_h", {}).items()},
        hora_maquina={
            _norm(m): {str(c): float(t) for c, t in rates.items()}
            for m, rates in raw["hora_maquina"].items()
        },
        maquinas=[
            str(x).strip()
            for x in raw.get("maquinas", raw.get("maquinas_roda_servico", MAQUINAS_CANONICAS))
        ],
        maquinas_roda_servico=[
            str(x).strip()
            for x in raw.get("maquinas_roda_servico", MAQUINAS_CANONICAS)
        ],
        maquina_aliases={
            _norm(k): str(v).strip()
            for k, v in {
                **MAQUINA_ALIASES_DEFAULT,
                **(raw.get("maquina_aliases") or {}),
                **(raw.get("maquina_origem_mapa") or {}),
            }.items()
        },
        matriz_cm2=float(raw.get("matriz_cm2", 0.28)),
        preco_caixa=float(raw.get("preco_caixa", 7)),
        setup_horas=float(raw.get("setup_horas", 1)),
        limite_metragem_bobina=float(raw.get("limite_metragem_bobina", 1000)),
        ceiling_etiqueta=float(raw.get("ceiling_etiqueta", 10)),
        caixas={str(k): int(v) for k, v in raw.get("caixas", {}).items()},
        medida_caixas=list(raw.get("medida_caixas") or []),
        caixa_empacotamento={
            _norm(k): dict(v) for k, v in (raw.get("caixa_empacotamento") or {}).items()
        },
    )


def apply_overrides(catalog: Catalogo, overrides: dict[str, Any] | None) -> Catalogo:
    """Retorna cópia com preços readequados para o orçamento (D4)."""
    cat = copy.deepcopy(catalog)
    if not overrides:
        return cat
    if "papel" in overrides and isinstance(overrides["papel"], dict):
        for k, v in overrides["papel"].items():
            if v is not None:
                cat.papel[_norm(k)] = float(v)
    if overrides.get("tinta_acima_m2") is not None:
        cat.tinta_acima_m2 = float(overrides["tinta_acima_m2"])
    if overrides.get("preco_caixa") is not None:
        cat.preco_caixa = float(overrides["preco_caixa"])
    if overrides.get("matriz_cm2") is not None:
        cat.matriz_cm2 = float(overrides["matriz_cm2"])
    if "acabamentos" in overrides and isinstance(overrides["acabamentos"], dict):
        for k, v in overrides["acabamentos"].items():
            if v is not None:
                cat.acabamentos[_norm(k)] = float(v)
    return cat
