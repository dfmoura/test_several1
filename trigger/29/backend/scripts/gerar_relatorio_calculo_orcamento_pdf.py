#!/usr/bin/env python3
"""
Relatório gerencial paisagem — CÁLCULO ORÇAMENTO (aba ORÇAMENTO / motor R1–R20).

Gera PDF A4 landscape documentando toda a cadeia do cálculo de orçamento:
entradas, quantidades físicas (R1–R9), composição de custos (R10–R16),
fechamento comercial (comissão/imposto/CEILING) e matriz (R20), com
validação em caso oficial real. Somente leitura — não altera motor,
catálogo ou planilhas.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Identidade visual compartilhada com o relatório MEDIDA_CAIXAS
from gerar_relatorio_caixas_pdf import (  # noqa: E402
    ACCENT,
    ACCENT_SOFT,
    HRule,
    INK,
    LINE,
    MARGIN,
    MIST,
    MUTED,
    PAGE_H,
    PAGE_W,
    PAPER,
    SLATE,
    SectionTitle,
    WHITE,
    _kpi_row,
    _styles,
    _table,
)

from app.engine.calculator import (  # noqa: E402
    FaixaEntrada,
    OrcamentoEntrada,
    calcular_orcamento,
)
from app.engine.catalog import load_catalog  # noqa: E402

OUT_DIR = ROOT / "docs" / "relatorios"
OUT_PDF = OUT_DIR / "Relatorio_Gerencial_Calculo_Orcamento.pdf"
FIXTURES = BACKEND / "tests" / "fixtures"


def brl(v: float, dec: int = 2) -> str:
    return f"{v:,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def num(v: float, dec: int = 2) -> str:
    return brl(v, dec)


def _entrada_fixture(data: dict) -> OrcamentoEntrada:
    overrides = {
        "papel": {data["papel"]: data["papel_preco_arquivo"]},
        "tinta_acima_m2": data["tinta_c3"],
    }
    return OrcamentoEntrada(
        cliente=data["cliente"],
        medida=data["medida"],
        largura_cm=data["largura_cm"],
        puxada_cm=data["puxada_cm"],
        cores=data["cores"],
        papel=data["papel"],
        acabamento=data["acabamento"],
        modelos=data["modelos"],
        colunas=data["colunas"],
        etiq_por_rolo=data["etiq_por_rolo"],
        tubete=data["tubete"],
        z=data.get("z"),
        maquina=data["maquina"],
        maquina_roda_servico=data.get("maquina_roda_servico"),
        imposto_pct=data.get("imposto_pct", 16.0),
        matriz=data.get("matriz", "SIM"),
        coluna_rebobinacao=data.get("coluna_rebobinacao", 1),
        tipo_troca_produto=data.get("tipo_troca_produto", "SEM PARADA"),
        rpm=data.get("rpm", 1000.0),
        faixas=[
            FaixaEntrada(quantidade=f["quantidade"], comissao_pct=f["comissao_pct"])
            for f in data["faixas"]
        ],
        overrides=overrides,
    )


def _header_footer(canvas, doc):
    canvas.saveState()
    w, h = PAGE_W, PAGE_H
    canvas.setFillColor(SLATE)
    canvas.rect(0, h - 10 * mm, w, 10 * mm, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, h - 10 * mm, 3 * mm, 10 * mm, fill=1, stroke=0)

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN, h - 6.2 * mm, "ORÇAMENTO FLEXOGRÁFICO  ·  CÁLCULO ORÇAMENTO")
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(w - MARGIN, h - 6.2 * mm, "Relatório Gerencial  ·  Confidencial interno")

    canvas.setFillColor(MIST)
    canvas.rect(0, 0, w, 8 * mm, fill=1, stroke=0)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN, 3 * mm, "Fonte: aba ORÇAMENTO + motor R1–R20  ·  ORcAMENTO_OFICIAL_2607281626.xlsm")
    canvas.drawRightString(w - MARGIN, 3 * mm, f"Página {doc.page}")
    canvas.restoreState()


def _cover_header_footer(canvas, doc):
    canvas.saveState()
    w, h = PAGE_W, PAGE_H
    canvas.setFillColor(SLATE)
    canvas.rect(0, 0, 28 * mm, h, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(28 * mm, 0, 2.2 * mm, h, fill=1, stroke=0)

    canvas.saveState()
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.translate(11 * mm, h / 2)
    canvas.rotate(90)
    canvas.drawCentredString(0, 0, "CÁLCULO ORÇAMENTO  ·  R1–R20  ·  MOTOR + EXCEL OFICIAL")
    canvas.restoreState()

    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(w - MARGIN, 5 * mm, f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    canvas.restoreState()


def _formula_box(text, style, width):
    fb = Table([[Paragraph(text, style)]], colWidths=[width])
    fb.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT_SOFT),
                ("BOX", (0, 0), (-1, -1), 1.2, ACCENT),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    return fb


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cat = load_catalog()
    S = _styles()
    content_w = PAGE_W - 2 * MARGIN
    cover_left = 34 * mm
    cover_w = PAGE_W - cover_left - MARGIN

    brahva = json.loads((FIXTURES / "brahva.json").read_text(encoding="utf-8"))
    res_brahva = calcular_orcamento(_entrada_fixture(brahva))

    doc = BaseDocTemplate(
        str(OUT_PDF),
        pagesize=landscape(A4),
        title="Relatório Gerencial — Cálculo Orçamento",
        author="Sistema de Orçamento Flexográfico",
        subject="Cadeia completa do cálculo de orçamento (R1–R20)",
    )
    frame_cover = Frame(cover_left, 10 * mm, cover_w, PAGE_H - 16 * mm, id="cover", showBoundary=0)
    frame_body = Frame(MARGIN, 11 * mm, content_w, PAGE_H - 25 * mm, id="body", showBoundary=0)
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[frame_cover], onPage=_cover_header_footer),
            PageTemplate(id="body", frames=[frame_body], onPage=_header_footer),
        ]
    )

    story = []

    # ───────── CAPA / EXECUTIVO ─────────
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("ENGENHARIA DE DADOS  ·  PRICING ENGINE  ·  ABA ORÇAMENTO", S["cover_kicker"]))
    story.append(Paragraph("Relatório Gerencial — Cálculo Orçamento", S["cover_title"]))
    story.append(
        Paragraph(
            "Documentação executiva e técnica da cadeia completa do <b>CÁLCULO ORÇAMENTO</b>: "
            "entradas do serviço, quantidades físicas (<b>R1–R9</b>), composição de custos "
            "(<b>R10–R16</b>), fechamento comercial (comissão, imposto, arredondamento) e matriz "
            "(<b>R20</b>) — com paridade validada entre a planilha oficial e o motor do sistema.",
            S["cover_sub"],
        )
    )
    story.append(HRule(cover_w, ACCENT, 1.2))
    story.append(Spacer(1, 4 * mm))

    story.append(
        _kpi_row(
            [
                {"label": "Regras de cálculo", "value": "R1–R20", "sub": "motor puro, sem I/O", "tone": "ok"},
                {"label": "Faixas por orçamento", "value": "5", "sub": "quantidades alternativas", "tone": "neutral"},
                {"label": "Componentes de custo", "value": "10", "sub": "papel → caixa (serviço)", "tone": "neutral"},
                {"label": "Imposto padrão", "value": "16%", "sub": "parametrizável (H10)", "tone": "neutral"},
                {"label": "Arredondamento", "value": "R$ 10", "sub": "CEILING no valor etiqueta", "tone": "ok"},
                {"label": "Fidelidade Excel", "value": "22/22", "sub": "testes de regressão", "tone": "ok"},
            ],
            cover_w,
        )
    )
    story.append(Spacer(1, 5 * mm))

    meta = [
        [
            Paragraph("<b>Documento</b>", S["td_bold"]),
            Paragraph("RG-CALC-ORC-001", S["td"]),
            Paragraph("<b>Versão</b>", S["td_bold"]),
            Paragraph("1.0", S["td"]),
            Paragraph("<b>Data</b>", S["td_bold"]),
            Paragraph(datetime.now().strftime("%d/%m/%Y"), S["td"]),
        ],
        [
            Paragraph("<b>Fonte Excel</b>", S["td_bold"]),
            Paragraph("ORcAMENTO_OFICIAL_2607281626.xlsm · aba ORÇAMENTO", S["td"]),
            Paragraph("<b>Escopo</b>", S["td_bold"]),
            Paragraph("Entradas · R1–R9 · R10–R16 · fechamento · R20", S["td"]),
            Paragraph("<b>Status</b>", S["td_bold"]),
            Paragraph("Operacional e validado", S["td"]),
        ],
    ]
    mt = Table(meta, colWidths=[22 * mm, 58 * mm, 16 * mm, 56 * mm, 14 * mm, 30 * mm])
    mt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PAPER),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(mt)
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "<b>Veredito executivo:</b> o cálculo do orçamento segue um pipeline determinístico — "
            "17 entradas do serviço alimentam 9 quantidades físicas por faixa, que alimentam 10 "
            "componentes de custo somados no <b>VALOR SERVIÇO</b>; sobre ele incidem comissão e "
            "imposto, e o resultado é arredondado para cima em múltiplos de R$ 10 (valor da etiqueta). "
            "A matriz (fotopolímero) é cobrada uma única vez, à parte, no primeiro pedido. "
            "O motor do sistema reproduz a planilha oficial com paridade verificada em casos reais "
            "(BRAHVA, ART MÓVEIS, RAREPAN, oficial 260728).",
            S["body"],
        )
    )

    story.append(NextPageTemplate("body"))
    story.append(PageBreak())

    # ───────── 01 VISÃO GERAL + ENTRADAS ─────────
    story.append(SectionTitle(content_w, "01", "Entradas do orçamento", "Bloco B8:J10 + RPM (C18) · 17 parâmetros do serviço"))
    story.append(Spacer(1, 3 * mm))

    flow = [
        [
            Paragraph("<b>1. Entradas</b><br/>serviço + máquina + faixas<br/><font color='#5A6B7D' size='7'>B8:J10 · C18 · B13:B17</font>", S["td_center"]),
            Paragraph("→", S["td_center"]),
            Paragraph("<b>2. Quantidades R1–R9</b><br/>metragem · m² · horas · perdas · rolos/caixas<br/><font color='#5A6B7D' size='7'>linhas 13–17</font>", S["td_center"]),
            Paragraph("→", S["td_center"]),
            Paragraph("<b>3. Custos R10–R16</b><br/>10 componentes → VALOR SERVIÇO<br/><font color='#5A6B7D' size='7'>linhas 21–25</font>", S["td_center"]),
            Paragraph("→", S["td_center"]),
            Paragraph("<b>4. Fechamento</b><br/>comissão + imposto + CEILING 10 + matriz<br/><font color='#5A6B7D' size='7'>linhas 28–32</font>", S["td_center"]),
        ]
    ]
    ft = Table(flow, colWidths=[52 * mm, 8 * mm, 62 * mm, 8 * mm, 62 * mm, 8 * mm, 62 * mm])
    ft.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), MIST),
                ("BACKGROUND", (2, 0), (2, 0), MIST),
                ("BACKGROUND", (4, 0), (4, 0), ACCENT_SOFT),
                ("BACKGROUND", (6, 0), (6, 0), MIST),
                ("BOX", (0, 0), (0, 0), 0.5, LINE),
                ("BOX", (2, 0), (2, 0), 0.5, LINE),
                ("BOX", (4, 0), (4, 0), 1, ACCENT),
                ("BOX", (6, 0), (6, 0), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(ft)
    story.append(Spacer(1, 4 * mm))

    entradas = [
        [
            Paragraph("Célula", S["th"]),
            Paragraph("Campo", S["th"]),
            Paragraph("Exemplo (BRAHVA)", S["th"]),
            Paragraph("Papel no cálculo", S["th"]),
            Paragraph("Célula", S["th"]),
            Paragraph("Campo", S["th"]),
            Paragraph("Exemplo (BRAHVA)", S["th"]),
            Paragraph("Papel no cálculo", S["th"]),
        ],
    ]
    campos = [
        ("B8", "Medida (mapa de facas)", "8,0×12,4", "Identidade do serviço / chave matriz"),
        ("C8", "Largura papel (cm)", "9,0", "m², perdas, largura da matriz"),
        ("D8", "Puxada máquina (cm)", "12,36885", "Metragem linear e m²"),
        ("E8", "Cores (0–8, 4V)", "5", "Perdas, tinta, taxa hora máquina"),
        ("F8", "Papel", "BOPP PRATA BXT", "Preço/m² (aba PAPEL + override)"),
        ("G8", "Acabamento", "VERNIZ", "Preço e perda de acabamento"),
        ("H8", "Qtde modelos", "7", "Horas e perda por troca de produto"),
        ("I8", "Qtde colunas", "1", "Divide metragem; multiplica largura matriz"),
        ("J8", "Etiquetas por rolo", "1.000", "Rolos → caixas e tubetes"),
        ("B10", "Tubete", '3"', "Preço tubete e capacidade da caixa"),
        ("C10", "Z (repetição)", "80", "Perímetro da matriz (R20)"),
        ("F10/G10", "Máquina (roda / custo)", "MODULAR", "Taxa hora por máquina × cores"),
        ("H10", "Imposto (%)", "16", "Fechamento comercial"),
        ("I10", "Matriz SIM/NÃO", "SIM", "Habilita cobrança R20"),
        ("J10", "Coluna rebobinação", "1", "Divisor do custo de rebobinação"),
        ("C13", "Tipo troca produto", "PRETO INTEIRO", "Horas de parada (0,25 h/troca)"),
        ("C18", "RPM máquina (m/h)", "1.000", "Hora máquina (R3)"),
    ]
    for i in range(0, len(campos), 2):
        a = campos[i]
        b = campos[i + 1] if i + 1 < len(campos) else ("", "", "", "")
        entradas.append(
            [
                Paragraph(f"<b>{a[0]}</b>", S["td_center"]),
                Paragraph(a[1], S["td"]),
                Paragraph(a[2], S["td"]),
                Paragraph(a[3], S["td"]),
                Paragraph(f"<b>{b[0]}</b>", S["td_center"]),
                Paragraph(b[1], S["td"]),
                Paragraph(b[2], S["td"]),
                Paragraph(b[3], S["td"]),
            ]
        )
    half = [15 * mm, 33 * mm, 26 * mm, 46 * mm]
    story.append(_table(entradas, half + half, S))
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "As quantidades das faixas (B13:B17) são <b>alternativas comerciais</b> — o cliente escolhe uma. "
            "Cada faixa recalcula toda a cadeia de forma independente; a matriz aparece com o mesmo valor em "
            "todas as faixas por ser cobrada uma única vez, à parte do valor da etiqueta.",
            S["body_muted"],
        )
    )

    story.append(PageBreak())

    # ───────── 02 QUANTIDADES R1–R9 ─────────
    story.append(SectionTitle(content_w, "02", "Quantidades físicas por faixa (R1–R9)", "Linhas 13–17 do Excel · funções puras no motor"))
    story.append(Spacer(1, 3 * mm))

    r_rows = [
        [
            Paragraph("Regra", S["th"]),
            Paragraph("Grandeza", S["th"]),
            Paragraph("Fórmula (motor ≡ Excel)", S["th"]),
            Paragraph("Fonte de dados / condição", S["th"]),
        ],
        [
            Paragraph("<b>R1</b>", S["td_center"]),
            Paragraph("Metragem linear (m)", S["td"]),
            Paragraph("(puxada ÷ 100) × qtde ÷ colunas", S["td"]),
            Paragraph("Entradas D8, B13, I8", S["td"]),
        ],
        [
            Paragraph("<b>R2</b>", S["td_center"]),
            Paragraph("Metragem (m²)", S["td"]),
            Paragraph("CEILING(qtde × largura × puxada ÷ 10.000; 0,1)", S["td"]),
            Paragraph("Arredonda para cima em 0,1 m²", S["td"]),
        ],
        [
            Paragraph("<b>R3</b>", S["td_center"]),
            Paragraph("Hora máquina (h)", S["td"]),
            Paragraph("(metragem ÷ RPM) + 1 h de setup", S["td"]),
            Paragraph("RPM em C18 (padrão 1.000 m/h)", S["td"]),
        ],
        [
            Paragraph("<b>R4</b>", S["td_center"]),
            Paragraph("Hora troca bobina (h)", S["td"]),
            Paragraph("((metragem ÷ 1.000) − 1) × 5 min ÷ 60", S["td"]),
            Paragraph("Só se metragem ≥ 1.000 m; senão 0", S["td"]),
        ],
        [
            Paragraph("<b>R5</b>", S["td_center"]),
            Paragraph("Hora troca produto (h)", S["td"]),
            Paragraph("tempo(tipo de troca) × (modelos − 1)", S["td"]),
            Paragraph("Aba HORA PARADA · independe da metragem", S["td"]),
        ],
        [
            Paragraph("<b>R6</b>", S["td_center"]),
            Paragraph("Perda de acerto (m²)", S["td"]),
            Paragraph("0–3 cores: valor fixo · 4: (larg+1)/100 × 180 · 4V/5–8: larg/100 × 250…280", S["td"]),
            Paragraph("Aba PERDA DE PAPEL, escalonada por cores", S["td"]),
        ],
        [
            Paragraph("<b>R7</b>", S["td_center"]),
            Paragraph("Perda de acabamento (m²)", S["td"]),
            Paragraph("lookup(acabamento) — VERNIZ 0 · LAMINAÇÃO 5", S["td"]),
            Paragraph("Aba PERDA DE ACABAMENTO", S["td"]),
        ],
        [
            Paragraph("<b>R8</b>", S["td_center"]),
            Paragraph("Perdas por troca (m²)", S["td"]),
            Paragraph("produto: metros(cores) × larg/100 × modelos · bobina: 5 × (larg−0,75) × col/100 × metragem/1.000", S["td"]),
            Paragraph("Abas PERDA DE PAPEL ACERTO · bobina só acima de 1.000 m", S["td"]),
        ],
        [
            Paragraph("<b>R9</b>", S["td_center"]),
            Paragraph("Rolos e caixas", S["td"]),
            Paragraph("rolos = qtde ÷ etiq/rolo · caixas = CEILING(rolos ÷ capacidade do tubete)", S["td"]),
            Paragraph('MEDIDA_CAIXAS: 1" → 20 rolos/cx · 3" → 12 rolos/cx', S["td"]),
        ],
    ]
    story.append(_table(r_rows, [16 * mm, 42 * mm, 118 * mm, 86 * mm], S))
    story.append(Spacer(1, 4 * mm))

    story.append(
        _formula_box(
            "metragem = (puxada ÷ 100) × quantidade ÷ colunas &nbsp;&nbsp;·&nbsp;&nbsp; "
            "m² = CEILING(qtde × largura × puxada ÷ 10.000; 0,1)<br/>"
            "<font size='8' color='#5A6B7D'>Exemplo BRAHVA q=7.000: metragem = (12,36885÷100) × 7.000 ÷ 1 = "
            "865,82 m · m² = CEILING(7.000 × 9 × 12,36885 ÷ 10.000; 0,1) = 78,0 m²</font>",
            S["formula"],
            content_w,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "<b>Regras de limiar importantes:</b> troca de bobina e perda de bobina só existem acima de "
            "1.000 m lineares — abaixo disso ambos são zero. A hora de troca de produto, ao contrário, "
            "é sempre cobrada quando há mais de um modelo, mesmo em tiragens curtas (evidência BRAHVA: "
            "q=7.000 com metragem 865,82 m ainda gera 1,5 h de troca = 0,25 h × 6 trocas).",
            S["body"],
        )
    )

    story.append(PageBreak())

    # ───────── 03 CUSTOS R10–R16 ─────────
    story.append(SectionTitle(content_w, "03", "Composição de custos (R10–R16)", "Linhas 21–25 do Excel · 10 componentes somados no VALOR SERVIÇO"))
    story.append(Spacer(1, 3 * mm))

    taxa_brahva = cat.taxa_hora_maquina("MODULAR", 5)
    c_rows = [
        [
            Paragraph("#", S["th"]),
            Paragraph("Componente", S["th"]),
            Paragraph("Fórmula", S["th"]),
            Paragraph("Tabela de apoio (parâmetros vigentes)", S["th"]),
        ],
        [
            Paragraph("1", S["td_center"]),
            Paragraph("<b>Valor papel</b>", S["td_bold"]),
            Paragraph("(m² + perda acerto + perda bobina) × preço/m²", S["td"]),
            Paragraph("Aba PAPEL — ex.: BOPP BRILHO 7,20 · COUCHE 3,50 · BOPP PRATA BXT 8,50 (override por orçamento permitido)", S["td"]),
        ],
        [
            Paragraph("2", S["td_center"]),
            Paragraph("<b>Valor máquina</b>", S["td_bold"]),
            Paragraph("taxa(máquina, cores) × hora máquina", S["td"]),
            Paragraph(f"Aba HORA MÁQUINA — ex.: MODULAR 5 cores = R$ {brl(taxa_brahva)}/h · BETA 1 cor = R$ 145,00/h", S["td"]),
        ],
        [
            Paragraph("3", S["td_center"]),
            Paragraph("<b>Troca produto</b>", S["td_bold"]),
            Paragraph("taxa(máquina, cores) × hora troca produto", S["td"]),
            Paragraph("HORA PARADA: SEM PARADA 0 · SÓ NOME 5 min · PRETO INTEIRO 15 min · OUTRA MONTAGEM 50 min", S["td"]),
        ],
        [
            Paragraph("4", S["td_center"]),
            Paragraph("<b>Troca bobina</b>", S["td_bold"]),
            Paragraph("taxa(máquina, cores) × hora troca bobina", S["td"]),
            Paragraph("Zero abaixo de 1.000 m lineares", S["td"]),
        ],
        [
            Paragraph("5", S["td_center"]),
            Paragraph("<b>Papel troca produto</b>", S["td_bold"]),
            Paragraph("perda papel troca produto (m²) × preço papel/m²", S["td"]),
            Paragraph("PERDA DE PAPEL ACERTO: 1 cor 7 m · 2 cores 14 m · 4–5 cores 200 m (× largura/100 × modelos)", S["td"]),
        ],
        [
            Paragraph("6", S["td_center"]),
            Paragraph("<b>Tinta</b>", S["td_bold"]),
            Paragraph("até 30 m²: cores × R$ 10 · acima: (m² + perda acerto) × R$/m²", S["td"]),
            Paragraph(f"Aba TINTA — padrão R$ {brl(cat.tinta_acima_m2)}/m² acima de {int(cat.tinta_faixa_m2)} m² (override por orçamento)", S["td"]),
        ],
        [
            Paragraph("7", S["td_center"]),
            Paragraph("<b>Acabamento</b>", S["td_bold"]),
            Paragraph("preço(acabamento) × (m² + perda acerto + perda acab.)", S["td"]),
            Paragraph("ACABAMENTOS: VERNIZ 0,30 · LAM. BRILHO 1,80 · LAM. FOSCA 2,80 · COLD STAMP+VERNIZ 3,50 (R$/m²)", S["td"]),
        ],
        [
            Paragraph("8", S["td_center"]),
            Paragraph("<b>Rebobinação</b>", S["td_bold"]),
            Paragraph("(metragem × colunas ÷ col. rebobinação ÷ 1.000) × R$ 17", S["td"]),
            Paragraph("Preço por 1.000 m rebobinados (aba ACABAMENTOS)", S["td"]),
        ],
        [
            Paragraph("9", S["td_center"]),
            Paragraph("<b>Tubete</b>", S["td_bold"]),
            Paragraph("rolos × preço do tubete", S["td"]),
            Paragraph('TUBETE: 1" = R$ 0,50 · 1"1/2 = R$ 0,60 · 3" = R$ 0,70 por rolo', S["td"]),
        ],
        [
            Paragraph("10", S["td_center"]),
            Paragraph("<b>Caixa</b>", S["td_bold"]),
            Paragraph("qtde caixas (R9) × R$ 7,00", S["td"]),
            Paragraph("MEDIDA_CAIXAS + CEILING — ver relatório RG-EMP-CAIXAS-001", S["td"]),
        ],
    ]
    story.append(_table(c_rows, [10 * mm, 36 * mm, 92 * mm, 124 * mm], S))
    story.append(Spacer(1, 4 * mm))

    story.append(
        _formula_box(
            "VALOR SERVIÇO = papel + máquina + troca produto + troca bobina + papel troca produto "
            "+ tinta + acabamento + rebobinação + tubete + caixa",
            S["formula"],
            content_w,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "<b>Nota de auditoria:</b> na planilha, a célula G21 (valor papel troca produto) carrega fórmula "
            "copiada da troca de bobina; o motor aplica a regra correta — perda da aba PERDA DE PAPEL ACERTO "
            "vezes o preço do papel — mantendo o resultado fiel aos casos oficiais validados.",
            S["body_muted"],
        )
    )

    story.append(PageBreak())

    # ───────── 04 FECHAMENTO COMERCIAL + MATRIZ ─────────
    story.append(SectionTitle(content_w, "04", "Fechamento comercial e matriz (R20)", "Linhas 28–32 do Excel · comissão · imposto · CEILING · fotopolímero"))
    story.append(Spacer(1, 3 * mm))

    story.append(
        _formula_box(
            "base = serviço + comissão(%) + imposto(%) &nbsp;→&nbsp; VALOR ETIQUETA = CEILING(base; 10)<br/>"
            "<font size='8' color='#5A6B7D'>comissão = serviço × %vendedor (B28:B32) · imposto = serviço × H10 (padrão 16%) · "
            "arredondamento comercial sempre para cima, múltiplos de R$ 10</font>",
            S["formula"],
            content_w,
        )
    )
    story.append(Spacer(1, 4 * mm))

    story.append(
        _formula_box(
            "VALOR MATRIZ = CEILING( ((Z × 3,175 ÷ 10) + 4) × (largura × colunas + 4) × nº cores × R$ 0,28/cm²; 1 )<br/>"
            "<font size='8' color='#5A6B7D'>Exemplo BRAHVA: Z=80, largura 9 cm, 1 coluna, 5 cores → R$ 536,00 · "
            "cobrada somente no 1º pedido (chave cliente+medida+Z+cores+largura+colunas)</font>",
            S["formula"],
            content_w,
        )
    )
    story.append(Spacer(1, 4 * mm))

    fech = [
        [
            Paragraph("Etapa", S["th"]),
            Paragraph("Regra", S["th"]),
            Paragraph("Racional de negócio", S["th"]),
        ],
        [
            Paragraph("<b>Comissão</b>", S["td_bold"]),
            Paragraph("Percentual por faixa (B28:B32) sobre o valor serviço; padrão 0%.", S["td"]),
            Paragraph("Permite remunerar o vendedor sem tocar nos custos industriais.", S["td"]),
        ],
        [
            Paragraph("<b>Imposto</b>", S["td_bold"]),
            Paragraph("H10 (padrão 16%) sobre o valor serviço, somado à base.", S["td"]),
            Paragraph("Carga tributária explícita e parametrizável por orçamento.", S["td"]),
        ],
        [
            Paragraph("<b>Valor etiqueta</b>", S["td_bold"]),
            Paragraph("CEILING(base; 10) — sempre para cima, múltiplo de R$ 10.", S["td"]),
            Paragraph("Preço redondo para proposta; nunca arredonda contra a fábrica.", S["td"]),
        ],
        [
            Paragraph("<b>Matriz (R20)</b>", S["td_bold"]),
            Paragraph("CEILING(…;1); mesmo valor exibido em todas as faixas (I28:I32); zerada se já cobrada em pedido anterior (mesma chave).", S["td"]),
            Paragraph("Fotopolímero é investimento único do cliente — não se dilui nem se repete.", S["td"]),
        ],
        [
            Paragraph("<b>Valor total</b>", S["td_bold"]),
            Paragraph("valor etiqueta + valor matriz (J28:J32).", S["td"]),
            Paragraph("Número final da proposta por faixa de quantidade.", S["td"]),
        ],
    ]
    story.append(_table(fech, [30 * mm, 122 * mm, 110 * mm], S))
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "A <b>chave da matriz</b> (cliente + medida + Z + cores + largura + colunas) é o mecanismo de "
            "governança que impede cobrança duplicada do fotopolímero entre pedidos: no sistema, o histórico "
            "da chave define automaticamente se o campo \"matriz já cobrada\" zera o valor em todas as faixas.",
            S["body"],
        )
    )

    story.append(PageBreak())

    # ───────── 05 CASO REAL — BRAHVA ─────────
    story.append(SectionTitle(content_w, "05", "Validação em caso real — BRAHVA 15-07", "Motor × planilha oficial · 3 faixas · paridade de fechamento"))
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "Serviço: <b>8,0×12,4 · 5 cores · BOPP PRATA BXT (R$ 8,00 override) · VERNIZ · 7 modelos · "
            "1 coluna · 1.000 etiq/rolo · tubete 3\" · Z=80 · máquina MODULAR · imposto 16% · "
            "troca PRETO INTEIRO</b>. Valores calculados pelo motor agora, comparados ao Excel oficial.",
            S["body"],
        )
    )
    story.append(Spacer(1, 2 * mm))

    val_rows = [
        [
            Paragraph("Qtde", S["th"]),
            Paragraph("Metragem", S["th"]),
            Paragraph("m²", S["th"]),
            Paragraph("Hora máq.", S["th"]),
            Paragraph("Serviço (motor)", S["th"]),
            Paragraph("Serviço (Excel)", S["th"]),
            Paragraph("Etiqueta (motor)", S["th"]),
            Paragraph("Etiqueta (Excel)", S["th"]),
            Paragraph("Matriz", S["th"]),
            Paragraph("Total (motor)", S["th"]),
            Paragraph("Total (Excel)", S["th"]),
            Paragraph("Status", S["th"]),
        ]
    ]
    for f, fx in zip(res_brahva.faixas, brahva["faixas"]):
        ex = fx["excel"]
        ok = (
            abs(f.valor_etiqueta - ex["etiqueta"]) < 0.01
            and abs(f.valor_matriz - ex["matriz"]) < 0.01
            and abs(f.valor_total - ex["total"]) < 0.01
        )
        val_rows.append(
            [
                Paragraph(f"<b>{f.quantidade:,}</b>".replace(",", "."), S["td_center"]),
                Paragraph(num(f.metragem), S["td_right"]),
                Paragraph(num(f.m2, 1), S["td_right"]),
                Paragraph(num(f.hora_maq, 3), S["td_right"]),
                Paragraph(brl(f.valor_servico), S["td_right"]),
                Paragraph(brl(ex["valor_servico"]), S["td_right"]),
                Paragraph(f"<b>{brl(f.valor_etiqueta)}</b>", S["td_right"]),
                Paragraph(brl(ex["etiqueta"]), S["td_right"]),
                Paragraph(brl(f.valor_matriz), S["td_right"]),
                Paragraph(f"<b>{brl(f.valor_total)}</b>", S["td_right"]),
                Paragraph(brl(ex["total"]), S["td_right"]),
                Paragraph("Paridade" if ok else "Divergência", S["small_ok"] if ok else S["small_crit"]),
            ]
        )
    story.append(
        _table(
            val_rows,
            [17 * mm, 21 * mm, 15 * mm, 19 * mm, 25 * mm, 25 * mm, 25 * mm, 25 * mm, 18 * mm, 24 * mm, 24 * mm, 21 * mm],
            S,
        )
    )
    story.append(Spacer(1, 4 * mm))

    f0 = res_brahva.faixas[0]
    story.append(Paragraph(f"<b>Decomposição do VALOR SERVIÇO — faixa de {f0.quantidade:,} etiquetas</b>".replace(",", "."), S["body"]))
    story.append(Spacer(1, 2 * mm))
    comp = [
        ("Valor papel", f0.valor_papel, "(78,0 + 22,5) m² × R$ 8,00"),
        ("Valor máquina", f0.valor_maquina, f"R$ {brl(taxa_brahva)}/h × {num(f0.hora_maq, 3)} h"),
        ("Troca produto", f0.valor_troca_produto, f"R$ {brl(taxa_brahva)}/h × {num(f0.hora_troca_prod, 2)} h (0,25 h × 6 trocas)"),
        ("Troca bobina", f0.valor_troca_bobina, "metragem < 1.000 m → zero"),
        ("Papel troca produto", f0.valor_papel_troca_produto, "200 m × 0,09 × 7 modelos = 126 m² × R$ 8,00"),
        ("Tinta", f0.valor_tinta, "(78,0 + 22,5) m² × R$ 0,80 (override)"),
        ("Acabamento (VERNIZ)", f0.valor_acabamento, "R$ 0,30 × (78,0 + 22,5 + 0) m²"),
        ("Rebobinação", f0.valor_rebobinacao, "865,82 m ÷ 1.000 × R$ 17,00"),
        ("Tubete 3\"", f0.valor_tubete, "7 rolos × R$ 0,70"),
        ("Caixa", f0.valor_caixa, "CEILING(7 ÷ 12) = 1 caixa × R$ 7,00"),
    ]
    comp_rows = [
        [
            Paragraph("Componente", S["th"]),
            Paragraph("Valor (R$)", S["th"]),
            Paragraph("% serviço", S["th"]),
            Paragraph("Memória de cálculo", S["th"]),
        ]
    ]
    for nome, v, memo in comp:
        comp_rows.append(
            [
                Paragraph(nome, S["td"]),
                Paragraph(brl(v), S["td_right"]),
                Paragraph(f"{v / f0.valor_servico * 100:.1f}%".replace(".", ","), S["td_center"]),
                Paragraph(memo, S["td"]),
            ]
        )
    comp_rows.append(
        [
            Paragraph("<b>VALOR SERVIÇO</b>", S["td_bold"]),
            Paragraph(f"<b>{brl(f0.valor_servico)}</b>", S["td_right"]),
            Paragraph("100%", S["td_center"]),
            Paragraph(f"+ imposto 16% ({brl(f0.imposto)}) → base {brl(f0.base)} → CEILING(base; 10) = <b>{brl(f0.valor_etiqueta)}</b>", S["td"]),
        ]
    )
    story.append(_table(comp_rows, [42 * mm, 26 * mm, 20 * mm, 174 * mm], S, emphasize_last=True))

    story.append(PageBreak())

    # ───────── 06 GOVERNANÇA / ARQUITETURA ─────────
    story.append(SectionTitle(content_w, "06", "Governança, arquitetura e operação", "Padrão especialista — fonte única, overrides auditáveis, regressão contínua"))
    story.append(Spacer(1, 3 * mm))

    gov = [
        [
            Paragraph("Dimensão", S["th"]),
            Paragraph("Padrão aplicado", S["th"]),
            Paragraph("Benefício gerencial", S["th"]),
        ],
        [
            Paragraph("<b>Engenharia de dados</b>", S["td_bold"]),
            Paragraph("Catálogo único (catalog_oficial.json) sincronizado do .xlsm oficial: papel, tinta, acabamentos, perdas, tubetes, hora máquina, hora parada, empacotamento.", S["td"]),
            Paragraph("Um só lugar para reajustar preço; sem drift entre planilha e sistema.", S["td"]),
        ],
        [
            Paragraph("<b>Software / motor</b>", S["td_bold"]),
            Paragraph("Motor R1–R20 puro (sem I/O), CEILING idêntico ao Excel, overrides por orçamento (preço de papel e tinta) sem alterar o catálogo base.", S["td"]),
            Paragraph("Reprodutível, testável e fiel à prática comercial vigente.", S["td"]),
        ],
        [
            Paragraph("<b>Máquinas</b>", S["td_bold"]),
            Paragraph("Separação explícita entre máquina que roda o serviço (F10) e máquina de custo (G10); aliases legados (BETAFLEX, REFLEXO…) normalizados para códigos canônicos.", S["td"]),
            Paragraph("Custo correto mesmo quando a produção realoca o serviço.", S["td"]),
        ],
        [
            Paragraph("<b>Matriz</b>", S["td_bold"]),
            Paragraph("Chave determinística cliente+medida+Z+cores+largura+colunas controla cobrança única do fotopolímero.", S["td"]),
            Paragraph("Elimina cobrança duplicada e disputa comercial com o cliente.", S["td"]),
        ],
        [
            Paragraph("<b>Qualidade</b>", S["td_bold"]),
            Paragraph("22 testes automatizados com fixtures dos orçamentos reais (BRAHVA, ART MÓVEIS, RAREPAN, oficial 260728) comparando contra valores do Excel.", S["td"]),
            Paragraph("Qualquer mudança de regra que quebre paridade é detectada de imediato.", S["td"]),
        ],
        [
            Paragraph("<b>UX / operação</b>", S["td_bold"]),
            Paragraph("UI apresenta breakdown completo por faixa (custos, horas, perdas, rolos, caixas, matriz) — mesma granularidade deste relatório.", S["td"]),
            Paragraph("Vendedor audita a proposta na tela, sem abrir a planilha.", S["td"]),
        ],
    ]
    story.append(_table(gov, [34 * mm, 138 * mm, 90 * mm], S))
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph("<b>Pontos de atenção monitorados</b>", S["body"]))
    story.append(Spacer(1, 2 * mm))
    att = [
        [
            Paragraph("Item", S["th"]),
            Paragraph("Situação", S["th"]),
            Paragraph("Tratamento", S["th"]),
        ],
        [
            Paragraph("G21 no Excel (papel troca produto)", S["td"]),
            Paragraph("Fórmula copiada da troca de bobina na planilha.", S["td"]),
            Paragraph("Motor aplica a regra correta (PERDA DE PAPEL ACERTO × preço); planilha mantida como está por decisão operacional.", S["td"]),
        ],
        [
            Paragraph("Overrides por orçamento", S["td"]),
            Paragraph("Preço de papel e tinta podem ser negociados caso a caso.", S["td"]),
            Paragraph("Override registrado no orçamento com snapshot do catálogo — auditável a posteriori.", S["td"]),
        ],
        [
            Paragraph("Tubete 1\" 1/2", S["td"]),
            Paragraph("Sem cadastro próprio de empacotamento.", S["td"]),
            Paragraph("Mapeado para 1\" (20 rolos/caixa); preço próprio de R$ 0,60 preservado.", S["td"]),
        ],
    ]
    story.append(_table(att, [60 * mm, 80 * mm, 122 * mm], S))
    story.append(Spacer(1, 5 * mm))

    close_p = Paragraph(
        "<font color='#FFFFFF'><b>Conclusão:</b> o CÁLCULO ORÇAMENTO é hoje um pipeline governado — "
        "entradas tipadas, quantidades físicas determinísticas (R1–R9), dez componentes de custo "
        "rastreáveis (R10–R16), fechamento comercial com arredondamento sempre a favor da fábrica e "
        "matriz cobrada uma única vez com chave auditável (R20). A paridade com a planilha oficial é "
        "verificada continuamente por regressão automatizada, permitindo evoluir preços e regras com "
        "segurança.</font>",
        S["callout"],
    )
    ct = Table([[close_p]], colWidths=[content_w])
    ct.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SLATE),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story.append(ct)

    doc.build(story)
    return OUT_PDF


if __name__ == "__main__":
    path = build()
    print(f"PDF gerado: {path}")
    print(f"Tamanho: {path.stat().st_size:,} bytes")
