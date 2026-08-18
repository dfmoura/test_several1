#!/usr/bin/env python3
"""Figuras do artigo RETII. Paleta sobria, 300 dpi."""
from pathlib import Path
import csv
from collections import Counter

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUT = Path("/home/dfmoura/Documents/test_several1/uniube/3/figuras")
OUT.mkdir(parents=True, exist_ok=True)
CSV = Path("/home/dfmoura/Documents/test_several1/trigger/23/data/powerbi/licitacoes_2025_latest.csv")

NAVY = "#1F4E79"
GRAY = "#5B5B5B"
FILL = "#E7EEF5"
FILL2 = "#F4F4F4"
LINE = "#2F2F2F"
ACCENT = "#8FAADC"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 9,
    "axes.edgecolor": LINE,
    "axes.labelcolor": LINE,
    "text.color": LINE,
    "figure.facecolor": "white",
    "savefig.dpi": 300,
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.12,
})


def _box(ax, x, y, w, h, text, fc=FILL, fs=8.2, weight="medium"):
    p = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.012,rounding_size=0.04",
        linewidth=1.05, edgecolor=NAVY, facecolor=fc,
    )
    ax.add_patch(p)
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=fs, color=NAVY, fontweight=weight, wrap=True)


def _arrow(ax, x1, y1, x2, y2):
    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle="-|>", color=NAVY, lw=1.15,
                        mutation_scale=11),
    )


def fig1_fluxo():
    fig, axes = plt.subplots(1, 2, figsize=(11.2, 4.6))
    etapas_antes = [
        (0.12, "Acesso manual aos\nportais (PMU / Comprasnet)"),
        (0.34, "Cópia para planilha\nCronograma"),
        (0.56, "Planilha de\nacompanhamento"),
        (0.78, "Análise caso a caso e\nrelatório quadrimestral"),
    ]
    etapas_depois = [
        (0.12, "Coleta nas APIs/CSVs\noficiais (agendada)"),
        (0.34, "Base local com\npreservação de campos"),
        (0.56, "Consulta, cruzamento\ne indicadores"),
        (0.78, "Leitura do observador\ne prestação de contas"),
    ]
    for ax, titulo, etapas, fc in (
        (axes[0], "Antes: rotina em planilha", etapas_antes, FILL2),
        (axes[1], "Depois: rotina apoiada pelo sistema", etapas_depois, FILL),
    ):
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis("off")
        ax.set_title(titulo, fontsize=10.5, color=NAVY, fontweight="bold", pad=8)
        ys = [0.78, 0.56, 0.34, 0.12]
        for (y_unused, txt), y in zip(etapas, ys):
            _box(ax, 0.14, y, 0.72, 0.16, txt, fc=fc, fs=8.0)
        for y1, y2 in zip(ys, ys[1:]):
            _arrow(ax, 0.50, y1, 0.50, y2 + 0.16)
    fig.savefig(OUT / "fig1_fluxo.png")
    plt.close()


def fig2_arquitetura():
    fig, ax = plt.subplots(figsize=(11.0, 5.4))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.2)
    ax.axis("off")

    _box(ax, 0.4, 4.7, 3.4, 1.05, "Compras.gov / PNCP\nAPI Dados Abertos (Lei 14.133)", fc="#D9E2F3", fs=8.4)
    _box(ax, 4.3, 4.7, 3.4, 1.05, "Dados Abertos PMU\nCSVs do painel Power BI", fc="#D9E2F3", fs=8.4)
    _box(ax, 8.2, 4.7, 3.4, 1.05, "Cadastros de apoio\nUASG, órgão, CNPJ, CATMAT", fc="#D9E2F3", fs=8.4)

    _box(ax, 3.15, 3.15, 5.7, 0.95, "Hub de coleta (orquestração, retries, lock)\nAgendamento noturno · madrugada", fc=FILL, fs=8.6, weight="bold")

    _box(ax, 3.55, 1.85, 4.9, 0.75, "SQLite  ·  data/licitacoes.db\ncampos manuais preservados na ressincronização", fc="#FFF2CC", fs=8.0)

    _box(ax, 0.35, 0.25, 2.15, 1.15, "Painel e\ncobertura", fs=8.0)
    _box(ax, 2.65, 0.25, 2.15, 1.15, "CNPJs\nvencedores", fs=8.0)
    _box(ax, 4.95, 0.25, 2.15, 1.15, "Mapa /\nlocalidade", fs=8.0)
    _box(ax, 7.25, 0.25, 2.15, 1.15, "Propostas e\npreço (IA)", fs=8.0)
    _box(ax, 9.55, 0.25, 2.15, 1.15, "Auth e Setup\n1 admin + 3 consulta", fs=7.8)

    _arrow(ax, 2.1, 4.7, 5.2, 4.10)
    _arrow(ax, 6.0, 4.7, 6.0, 4.10)
    _arrow(ax, 9.9, 4.7, 7.0, 4.10)
    _arrow(ax, 6.0, 3.15, 6.0, 2.60)
    _arrow(ax, 6.0, 1.85, 1.42, 1.40)
    _arrow(ax, 6.0, 1.85, 3.72, 1.40)
    _arrow(ax, 6.0, 1.85, 6.02, 1.40)
    _arrow(ax, 6.0, 1.85, 8.32, 1.40)
    _arrow(ax, 6.0, 1.85, 10.62, 1.40)

    ax.text(6.0, 6.05, "FastAPI + frontend estático + Docker (porta 8096 / HTTPS)",
            ha="center", va="center", fontsize=9.2, color=GRAY, style="italic")
    fig.savefig(OUT / "fig2_arquitetura.png")
    plt.close()


def fig3_modalidades():
    raw = CSV.read_text(encoding="latin-1")
    rows = list(csv.DictReader(raw.splitlines(), delimiter=";"))
    c = Counter((r.get("MODALIDADE") or "").strip() for r in rows)
    labels, vals = zip(*c.most_common())
    # rótulos um pouco mais curtos
    pretty = []
    for lab in labels:
        lab = lab.replace("LICITACAO CONCOR. PUBLICA", "Concorrência pública")
        lab = lab.replace("PROCESSO DE DISPENSA", "Processo de dispensa")
        lab = lab.replace("PREGÃO ELETRÔNICO", "Pregão eletrônico")
        lab = lab.replace("INEXIGIBILIDADE CREDENC.", "Inexigib. credenciamento")
        lab = lab.replace("DISPENSA CHAMADA PÚBLICA", "Dispensa chamada públ.")
        pretty.append(lab)

    fig, ax = plt.subplots(figsize=(8.6, 4.4))
    y = range(len(pretty) - 1, -1, -1)
    colors = [NAVY if i < 2 else ACCENT for i in range(len(pretty))]
    ax.barh(list(y), vals, color=colors, height=0.68, edgecolor="none")
    ax.set_yticks(list(y))
    ax.set_yticklabels(pretty)
    ax.set_xlabel("Quantidade de processos (ano 2025)")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for yi, v in zip(y, vals):
        ax.text(v + 8, yi, str(v), va="center", fontsize=8, color=GRAY)
    ax.set_xlim(0, max(vals) * 1.18)
    fig.savefig(OUT / "fig3_modalidades_2025.png")
    plt.close()


if __name__ == "__main__":
    fig1_fluxo()
    fig2_arquitetura()
    fig3_modalidades()
    print("figuras ok", list(OUT.glob("*.png")))
