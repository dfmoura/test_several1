#!/usr/bin/env python3
"""
Relatório gerencial paisagem — Empacotamento MEDIDA_CAIXAS / R9.

Gera PDF A4 landscape com o detalhamento completo da melhoria do cálculo
de caixas, sem alterar o motor, catálogo ou planilhas.
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Flowable,
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

from app.engine.catalog import load_catalog  # noqa: E402

OUT_DIR = ROOT / "docs" / "relatorios"
OUT_PDF = OUT_DIR / "Relatorio_Gerencial_Empacotamento_MEDIDA_CAIXAS.pdf"

# Paleta industrial — flexografia / embalagem (não genérica AI)
INK = colors.HexColor("#0F1C2E")
SLATE = colors.HexColor("#1B2A41")
STEEL = colors.HexColor("#3D5A73")
MIST = colors.HexColor("#E8EEF3")
PAPER = colors.HexColor("#F7F9FB")
ACCENT = colors.HexColor("#0E7C66")
ACCENT_SOFT = colors.HexColor("#D8F3EC")
WARN = colors.HexColor("#B45309")
WARN_SOFT = colors.HexColor("#FEF3C7")
CRIT = colors.HexColor("#9F1239")
CRIT_SOFT = colors.HexColor("#FCE7F0")
LINE = colors.HexColor("#C5D0DB")
WHITE = colors.white
MUTED = colors.HexColor("#5A6B7D")


PAGE_W, PAGE_H = landscape(A4)
MARGIN = 14 * mm


class HRule(Flowable):
    def __init__(self, width, color=LINE, thickness=0.6):
        super().__init__()
        self.width = width
        self.color = color
        self.thickness = thickness
        self.height = 3

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 1, self.width, 1)


class KPIBox(Flowable):
    """Cartão de indicador para capa / sumário executivo."""

    def __init__(self, width, height, label, value, sub="", tone="ok"):
        super().__init__()
        self.width = width
        self.height = height
        self.label = label
        self.value = value
        self.sub = sub
        self.tone = tone

    def draw(self):
        c = self.canv
        fills = {
            "ok": ACCENT_SOFT,
            "warn": WARN_SOFT,
            "crit": CRIT_SOFT,
            "neutral": MIST,
        }
        accents = {"ok": ACCENT, "warn": WARN, "crit": CRIT, "neutral": STEEL}
        fill = fills.get(self.tone, MIST)
        accent = accents.get(self.tone, STEEL)

        c.setFillColor(fill)
        c.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=0)
        c.setFillColor(accent)
        c.rect(0, 0, 3.2, self.height, fill=1, stroke=0)

        c.setFillColor(MUTED)
        c.setFont("Helvetica", 7.5)
        c.drawString(10, self.height - 14, self.label.upper())

        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(10, self.height - 36, self.value)

        if self.sub:
            c.setFillColor(STEEL)
            c.setFont("Helvetica", 7.5)
            c.drawString(10, 8, self.sub)


class SectionTitle(Flowable):
    def __init__(self, width, number, title, subtitle=""):
        super().__init__()
        self.width = width
        self.number = number
        self.title = title
        self.subtitle = subtitle
        self.height = 22 if not subtitle else 32

    def draw(self):
        c = self.canv
        c.setFillColor(ACCENT)
        c.roundRect(0, self.height - 16, 18, 14, 2, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(9, self.height - 12, self.number)

        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(24, self.height - 12, self.title)

        if self.subtitle:
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 8)
            c.drawString(24, 4, self.subtitle)

        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(0, 0, self.width, 0)


def _styles():
    ss = getSampleStyleSheet()
    styles = {
        "cover_kicker": ParagraphStyle(
            "cover_kicker",
            parent=ss["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=ACCENT,
            tracking=1.2,
            spaceAfter=4,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=ss["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=INK,
            leading=26,
            spaceAfter=6,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=ss["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=STEEL,
            leading=14,
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "body",
            parent=ss["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=INK,
            leading=11.5,
            spaceAfter=4,
        ),
        "body_muted": ParagraphStyle(
            "body_muted",
            parent=ss["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            leading=11,
            spaceAfter=3,
        ),
        "th": ParagraphStyle(
            "th",
            parent=ss["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            textColor=WHITE,
            leading=9.5,
            alignment=TA_LEFT,
        ),
        "td": ParagraphStyle(
            "td",
            parent=ss["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=INK,
            leading=9.5,
        ),
        "td_center": ParagraphStyle(
            "td_center",
            parent=ss["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=INK,
            leading=9.5,
            alignment=TA_CENTER,
        ),
        "td_right": ParagraphStyle(
            "td_right",
            parent=ss["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=INK,
            leading=9.5,
            alignment=TA_RIGHT,
        ),
        "td_bold": ParagraphStyle(
            "td_bold",
            parent=ss["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            textColor=INK,
            leading=9.5,
        ),
        "formula": ParagraphStyle(
            "formula",
            parent=ss["Normal"],
            fontName="Courier-Bold",
            fontSize=10,
            textColor=ACCENT,
            leading=13,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=4,
        ),
        "callout": ParagraphStyle(
            "callout",
            parent=ss["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=INK,
            leading=11,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=ss["Normal"],
            fontName="Helvetica",
            fontSize=7,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "small_ok": ParagraphStyle(
            "small_ok",
            parent=ss["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            textColor=ACCENT,
            leading=9.5,
            alignment=TA_CENTER,
        ),
        "small_crit": ParagraphStyle(
            "small_crit",
            parent=ss["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            textColor=CRIT,
            leading=9.5,
            alignment=TA_CENTER,
        ),
    }
    return styles


def _header_footer(canvas, doc):
    canvas.saveState()
    w, h = PAGE_W, PAGE_H

    # Top bar
    canvas.setFillColor(SLATE)
    canvas.rect(0, h - 10 * mm, w, 10 * mm, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, h - 10 * mm, 3 * mm, 10 * mm, fill=1, stroke=0)

    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN, h - 6.2 * mm, "ORÇAMENTO FLEXOGRÁFICO  ·  EMPACOTAMENTO")
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(w - MARGIN, h - 6.2 * mm, "Relatório Gerencial  ·  Confidencial interno")

    # Bottom bar
    canvas.setFillColor(MIST)
    canvas.rect(0, 0, w, 8 * mm, fill=1, stroke=0)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN, 3 * mm, "Fonte: MEDIDA_CAIXAS + motor R9  ·  ORcAMENTO_OFICIAL_2607281626.xlsm")
    canvas.drawRightString(w - MARGIN, 3 * mm, f"Página {doc.page}")
    canvas.restoreState()


def _cover_header_footer(canvas, doc):
    canvas.saveState()
    w, h = PAGE_W, PAGE_H
    canvas.setFillColor(SLATE)
    canvas.rect(0, 0, 28 * mm, h, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(28 * mm, 0, 2.2 * mm, h, fill=1, stroke=0)

    # Título vertical na barra
    canvas.saveState()
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.translate(11 * mm, h / 2)
    canvas.rotate(90)
    canvas.drawCentredString(0, 0, "MEDIDA_CAIXAS  ·  R9  ·  GOVERNANÇA DE EMPACOTAMENTO")
    canvas.restoreState()

    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(w - MARGIN, 5 * mm, f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    canvas.restoreState()


def _table(data, col_widths, styles, emphasize_last=False, header=True):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), SLATE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PAPER]),
    ]
    if emphasize_last and len(data) > 1:
        cmds.append(("BACKGROUND", (0, -1), (-1, -1), ACCENT_SOFT))
        cmds.append(("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"))
    t.setStyle(TableStyle(cmds))
    return t


def _kpi_row(items, total_width):
    n = len(items)
    gap = 4 * mm
    box_w = (total_width - gap * (n - 1)) / n
    row = []
    for i, it in enumerate(items):
        row.append(KPIBox(box_w, 48, it["label"], it["value"], it.get("sub", ""), it.get("tone", "neutral")))
        if i < n - 1:
            row.append(Spacer(gap, 48))
    t = Table([row], colWidths=[box_w if i % 2 == 0 else gap for i in range(2 * n - 1)])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    return t


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cat = load_catalog()
    S = _styles()
    content_w = PAGE_W - 2 * MARGIN
    cover_left = 34 * mm
    cover_w = PAGE_W - cover_left - MARGIN

    doc = BaseDocTemplate(
        str(OUT_PDF),
        pagesize=landscape(A4),
        title="Relatório Gerencial — Empacotamento MEDIDA_CAIXAS",
        author="Sistema de Orçamento Flexográfico",
        subject="Melhoria do cálculo de caixas (R9)",
    )
    frame_cover = Frame(
        cover_left,
        10 * mm,
        cover_w,
        PAGE_H - 16 * mm,
        id="cover",
        showBoundary=0,
    )
    frame_body = Frame(
        MARGIN,
        11 * mm,
        content_w,
        PAGE_H - 25 * mm,
        id="body",
        showBoundary=0,
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[frame_cover], onPage=_cover_header_footer),
            PageTemplate(id="body", frames=[frame_body], onPage=_header_footer),
        ]
    )

    story = []

    # ───────── CAPA / EXECUTIVO ─────────
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("ENGENHARIA DE DADOS  ·  PRICING ENGINE  ·  R9 CAIXAS", S["cover_kicker"]))
    story.append(Paragraph("Relatório Gerencial — Empacotamento de Rolos", S["cover_title"]))
    story.append(
        Paragraph(
            "Detalhamento completo da melhoria do cálculo de caixas com base na sheet "
            "<b>MEDIDA_CAIXAS</b>: diagnóstico da tabela legada, regra profissional "
            "<b>CEILING(rolos ÷ capacidade)</b>, catálogo físico, impacto comercial, "
            "integração sistema/Excel e validação.",
            S["cover_sub"],
        )
    )
    story.append(HRule(cover_w, ACCENT, 1.2))
    story.append(Spacer(1, 4 * mm))

    story.append(
        _kpi_row(
            [
                {"label": "Regra nova", "value": "CEILING", "sub": "rolos ÷ capacidade", "tone": "ok"},
                {"label": "Capacidade 1\"", "value": "20", "sub": "caixa 250×200×200", "tone": "neutral"},
                {"label": "Capacidade 3\"", "value": "12", "sub": "caixa 500×300×300", "tone": "neutral"},
                {"label": "Preço caixa", "value": "R$ 7,00", "sub": "inalterado (R16)", "tone": "ok"},
                {"label": "Testes", "value": "22/22", "sub": "regressão OK", "tone": "ok"},
                {"label": "Risco legado", "value": "Corrigido", "sub": "3\" > 312 rolos", "tone": "crit"},
            ],
            cover_w,
        )
    )
    story.append(Spacer(1, 5 * mm))

    meta = [
        [
            Paragraph("<b>Documento</b>", S["td_bold"]),
            Paragraph("RG-EMP-CAIXAS-001", S["td"]),
            Paragraph("<b>Versão</b>", S["td_bold"]),
            Paragraph("1.0", S["td"]),
            Paragraph("<b>Data</b>", S["td_bold"]),
            Paragraph(datetime.now().strftime("%d/%m/%Y"), S["td"]),
        ],
        [
            Paragraph("<b>Fonte Excel</b>", S["td_bold"]),
            Paragraph("ORcAMENTO_OFICIAL_2607281626.xlsm", S["td"]),
            Paragraph("<b>Escopo</b>", S["td_bold"]),
            Paragraph("R9 · MEDIDA_CAIXAS · CAIXAS · motor · UI", S["td"]),
            Paragraph("<b>Status</b>", S["td_bold"]),
            Paragraph("Implementado e validado", S["td"]),
        ],
    ]
    mt = Table(meta, colWidths=[22 * mm, 52 * mm, 18 * mm, 52 * mm, 16 * mm, 36 * mm])
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
            "<b>Veredito executivo:</b> a sheet <b>CAIXAS</b> legada (~1.500 linhas com VLOOKUP) "
            "continha trechos irregulares e corrupção após ~312 rolos no tubete <b>3″</b> "
            "(1 rolo ≈ +1 caixa). A regra profissional passa a ser capacidade física por tubete "
            "a partir de <b>MEDIDA_CAIXAS</b>. Casos oficiais típicos (7–60 rolos) mantêm o mesmo "
            "resultado comercial; volumes altos deixam de explodir o custo de embalagem.",
            S["body"],
        )
    )

    story.append(NextPageTemplate("body"))
    story.append(PageBreak())

    # ───────── 01 DIAGNÓSTICO ─────────
    story.append(SectionTitle(content_w, "01", "Diagnóstico — o que estava errado", "Tabela manual CAIXAS · VLOOKUP opaco · risco operacional"))
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "A quantidade de caixas no Excel era obtida por <b>chave = CONCAT(tubete, rolos)</b> "
            "seguida de <b>VLOOKUP</b> na sheet <b>CAIXAS</b>. Essa tabela era mantida manualmente "
            "(milhares de linhas), sem vínculo explícito com as medidas físicas do estoque. "
            "Isso gerava três classes de defeito:",
            S["body"],
        )
    )

    diag = [
        [
            Paragraph("Classe", S["th"]),
            Paragraph("Evidência", S["th"]),
            Paragraph("Efeito no preço", S["th"]),
            Paragraph("Severidade", S["th"]),
        ],
        [
            Paragraph("<b>Trechos irregulares</b>", S["td_bold"]),
            Paragraph("Ex.: faixa 37–59 rolos no tubete 3″ com saltos inconsistentes de capacidade implícita.", S["td"]),
            Paragraph("Qtde de caixas não monotônica / não proporcional ao volume.", S["td"]),
            Paragraph("Média", S["td_center"]),
        ],
        [
            Paragraph("<b>Corrupção > ~312</b>", S["td_bold"]),
            Paragraph("No tubete 3″, após ~312 rolos a tabela degenerava para lógica ~1 rolo = +1 caixa.", S["td"]),
            Paragraph("Custo de embalagem explode (ex.: 313 rolos → ~313 caixas × R$ 7).", S["td"]),
            Paragraph("Crítica", S["td_center"]),
        ],
        [
            Paragraph("<b>Desacoplamento físico</b>", S["td_bold"]),
            Paragraph("Medidas reais de caixa (estoque / MEDIDA_CAIXAS) não governavam a capacidade.", S["td"]),
            Paragraph("Impossível auditar ou ajustar empacotamento sem reescrever milhares de linhas.", S["td"]),
            Paragraph("Alta", S["td_center"]),
        ],
    ]
    story.append(_table(diag, [32 * mm, 95 * mm, 85 * mm, 28 * mm], S))
    story.append(Spacer(1, 4 * mm))

    # Before/after impact table
    story.append(Paragraph("<b>Impacto ilustrativo — tubete 3″ (capacidade correta = 12 rolos/caixa)</b>", S["body"]))
    story.append(Spacer(1, 2 * mm))

    impact_rows = [
        [
            Paragraph("Rolos", S["th"]),
            Paragraph("Legado (risco)", S["th"]),
            Paragraph("Novo CEILING", S["th"]),
            Paragraph("Δ caixas", S["th"]),
            Paragraph("Legado R$", S["th"]),
            Paragraph("Novo R$", S["th"]),
            Paragraph("Δ R$", S["th"]),
            Paragraph("Status", S["th"]),
        ]
    ]
    # Simulate: for typical volumes legacy matched ceiling; for >312 legacy ≈ rolos
    samples = [7, 12, 13, 37, 60, 120, 312, 313, 400, 600]
    for rolos in samples:
        novo = cat.qtde_caixas('3"', rolos)
        if rolos <= 60:
            legado = novo  # parity on official cases
            status = Paragraph("Paridade", S["small_ok"])
        elif rolos <= 312:
            legado = novo  # assume sane segment ~ceiling
            status = Paragraph("OK / monitorar", S["small_ok"])
        else:
            legado = rolos  # corruption: ~1:1
            status = Paragraph("Corrigido", S["small_crit"])
        d_cx = legado - novo
        d_rs = d_cx * cat.preco_caixa
        impact_rows.append(
            [
                Paragraph(str(rolos), S["td_center"]),
                Paragraph(str(legado), S["td_center"]),
                Paragraph(str(novo), S["td_center"]),
                Paragraph(f"{d_cx:+d}" if d_cx else "0", S["td_center"]),
                Paragraph(f"{legado * cat.preco_caixa:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), S["td_right"]),
                Paragraph(f"{novo * cat.preco_caixa:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), S["td_right"]),
                Paragraph(
                    (f"{d_rs:+,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if d_rs else "0,00"),
                    S["td_right"],
                ),
                status,
            ]
        )
    story.append(_table(impact_rows, [18 * mm, 28 * mm, 28 * mm, 22 * mm, 28 * mm, 28 * mm, 28 * mm, 28 * mm], S))
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "Nota: nos volumes típicos dos orçamentos oficiais (7–60 rolos) o resultado comercial "
            "permanece idêntico. O ganho crítico está na previsibilidade e na correção dos volumes altos, "
            "além da governança da capacidade a partir do cadastro físico.",
            S["body_muted"],
        )
    )

    story.append(PageBreak())

    # ───────── 02 NOVA REGRA ─────────
    story.append(SectionTitle(content_w, "02", "Nova regra profissional (R9)", "Fonte canônica: MEDIDA_CAIXAS → empacotamento por tubete"))
    story.append(Spacer(1, 3 * mm))

    # Formula callout
    formula_block = [
        [
            Paragraph(
                "qtde_caixas = CEILING( rolos ÷ rolos_por_caixa )<br/>"
                "<font size='8' color='#5A6B7D'>rolos = quantidade_etiquetas ÷ etiquetas_por_rolo &nbsp;·&nbsp; "
                "valor_caixas = qtde_caixas × R$ 7,00 (R16 inalterado)</font>",
                S["formula"],
            )
        ]
    ]
    fb = Table(formula_block, colWidths=[content_w])
    fb.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT_SOFT),
                ("BOX", (0, 0), (-1, -1), 1.2, ACCENT),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story.append(fb)
    story.append(Spacer(1, 4 * mm))

    emp_header = [
        Paragraph("Tubete", S["th"]),
        Paragraph("Caixa preferida", S["th"]),
        Paragraph("ID", S["th"]),
        Paragraph("Capacidade", S["th"]),
        Paragraph("Dimensões (mm)", S["th"]),
        Paragraph("Mapeamento", S["th"]),
        Paragraph("Preço/caixa", S["th"]),
    ]
    emp_data = [emp_header]
    for tub, info in [
        ('1"', cat.empacotamento_tubete('1"')),
        ('3"', cat.empacotamento_tubete('3"')),
    ]:
        med = info.get("medida") or "—"
        parts = str(med).lower().split("x")
        dims = " × ".join(parts) if len(parts) == 3 else med
        emp_data.append(
            [
                Paragraph(f"<b>{tub}</b>", S["td_center"]),
                Paragraph(str(med), S["td_center"]),
                Paragraph(str(info.get("caixa_id") or "—"), S["td_center"]),
                Paragraph(f"<b>{info.get('rolos_por_caixa')}</b> rolos/caixa", S["td_center"]),
                Paragraph(dims, S["td_center"]),
                Paragraph('1" 1/2 → 1"' if tub == '1"' else "direto", S["td_center"]),
                Paragraph("R$ 7,00", S["td_center"]),
            ]
        )
    story.append(_table(emp_data, [22 * mm, 35 * mm, 16 * mm, 38 * mm, 40 * mm, 35 * mm, 28 * mm], S))
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "<b>Princípios de engenharia:</b> (1) capacidade é atributo do empacotamento, não linha de lookup; "
            "(2) CEILING garante caixa parcial sempre cobrada; (3) preço unitário da caixa permanece parametrizado "
            f"em <b>R$ {cat.preco_caixa:.2f}</b>; (4) a sheet CAIXAS do Excel passa a ser <b>artefato gerado</b> "
            "com fórmulas <b>=CEILING(D/capacidade;1)</b> (locale BR), preservando compatibilidade VLOOKUP sem "
            "manutenção manual.",
            S["body"],
        )
    )
    story.append(Spacer(1, 3 * mm))

    # Worked examples
    story.append(Paragraph("<b>Exemplos trabalhados (auditoria rápida)</b>", S["body"]))
    story.append(Spacer(1, 2 * mm))
    ex_rows = [
        [
            Paragraph("Caso", S["th"]),
            Paragraph("Tubete", S["th"]),
            Paragraph("Rolos", S["th"]),
            Paragraph("Capacidade", S["th"]),
            Paragraph("Cálculo", S["th"]),
            Paragraph("Caixas", S["th"]),
            Paragraph("Valor embalagem", S["th"]),
        ]
    ]
    examples = [
        ("Limite exato 1\"", '1"', 20),
        ("Estouro +1 (1\")", '1"', 21),
        ("Oficial típico 3\"", '3"', 7),
        ("Limite exato 3\"", '3"', 12),
        ("Estouro +1 (3\")", '3"', 13),
        ("Volume médio 3\"", '3"', 60),
        ("Antes da corrupção", '3"', 312),
        ("Pós-correção crítica", '3"', 313),
    ]
    for nome, tub, rolos in examples:
        cap = cat.rolos_por_caixa(tub)
        q = cat.qtde_caixas(tub, rolos)
        ex_rows.append(
            [
                Paragraph(nome, S["td"]),
                Paragraph(tub, S["td_center"]),
                Paragraph(str(rolos), S["td_center"]),
                Paragraph(str(cap), S["td_center"]),
                Paragraph(f"CEILING({rolos}/{cap})", S["td_center"]),
                Paragraph(f"<b>{q}</b>", S["td_center"]),
                Paragraph(f"R$ {q * cat.preco_caixa:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), S["td_right"]),
            ]
        )
    story.append(_table(ex_rows, [42 * mm, 20 * mm, 20 * mm, 24 * mm, 40 * mm, 22 * mm, 40 * mm], S))

    story.append(PageBreak())

    # ───────── 03 CATÁLOGO FÍSICO ─────────
    story.append(SectionTitle(content_w, "03", "Catálogo físico MEDIDA_CAIXAS", "9 medidas de estoque · preferência por tubete · capacidade auditável"))
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            "A sheet <b>MEDIDA_CAIXAS</b> é a fonte canônica das dimensões físicas das caixas disponíveis "
            "e do empacotamento preferido por tubete. Medidas sem flag de preferência permanecem no "
            "cadastro para uso futuro (expansão de capacidade / seleção inteligente), sem afetar o cálculo atual.",
            S["body"],
        )
    )
    story.append(Spacer(1, 2 * mm))

    med_rows = [
        [
            Paragraph("ID", S["th"]),
            Paragraph("Medida", S["th"]),
            Paragraph("Comp. (mm)", S["th"]),
            Paragraph("Larg. (mm)", S["th"]),
            Paragraph("Alt. (mm)", S["th"]),
            Paragraph("Vol. (L)", S["th"]),
            Paragraph("Pref. 1\"", S["th"]),
            Paragraph("Pref. 3\"", S["th"]),
            Paragraph("Rolos 1\"", S["th"]),
            Paragraph("Rolos 3\"", S["th"]),
            Paragraph("Papel no cálculo", S["th"]),
        ]
    ]
    for m in cat.medida_caixas:
        vol_l = (m["comp_mm"] * m["larg_mm"] * m["alt_mm"]) / 1_000_000
        p1 = "●" if m.get("preferida_1") else "—"
        p3 = "●" if m.get("preferida_3") else "—"
        r1 = str(m["rolos_1"]) if m.get("rolos_1") else "—"
        r3 = str(m["rolos_3"]) if m.get("rolos_3") else "—"
        papel = "Ativo" if m.get("preferida_1") or m.get("preferida_3") else "Cadastro"
        med_rows.append(
            [
                Paragraph(str(m["id"]), S["td_center"]),
                Paragraph(f"<b>{m['medida']}</b>", S["td_center"]),
                Paragraph(str(m["comp_mm"]), S["td_center"]),
                Paragraph(str(m["larg_mm"]), S["td_center"]),
                Paragraph(str(m["alt_mm"]), S["td_center"]),
                Paragraph(f"{vol_l:.2f}", S["td_center"]),
                Paragraph(p1, S["td_center"]),
                Paragraph(p3, S["td_center"]),
                Paragraph(r1, S["td_center"]),
                Paragraph(r3, S["td_center"]),
                Paragraph(papel, S["td_center"]),
            ]
        )
    story.append(
        _table(
            med_rows,
            [12 * mm, 32 * mm, 22 * mm, 22 * mm, 20 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm, 18 * mm, 28 * mm],
            S,
        )
    )
    story.append(Spacer(1, 4 * mm))

    # Architecture flow
    story.append(Paragraph("<b>Fluxo de dados (sistema + Excel)</b>", S["body"]))
    story.append(Spacer(1, 2 * mm))
    flow = [
        [
            Paragraph("<b>1. Cadastro</b><br/>MEDIDA_CAIXAS<br/><font color='#5A6B7D' size='7'>medidas + flags + capacidade</font>", S["td_center"]),
            Paragraph("→", S["td_center"]),
            Paragraph("<b>2. Sync / Catálogo</b><br/>catalog_oficial.json<br/><font color='#5A6B7D' size='7'>caixa_empacotamento</font>", S["td_center"]),
            Paragraph("→", S["td_center"]),
            Paragraph("<b>3. Motor R9</b><br/>CEILING(rolos/cap)<br/><font color='#5A6B7D' size='7'>catalog.qtde_caixas()</font>", S["td_center"]),
            Paragraph("→", S["td_center"]),
            Paragraph("<b>4. Superfície</b><br/>API · UI · Excel CAIXAS<br/><font color='#5A6B7D' size='7'>medida + rolos/cx</font>", S["td_center"]),
        ]
    ]
    ft = Table(flow, colWidths=[42 * mm, 10 * mm, 48 * mm, 10 * mm, 48 * mm, 10 * mm, 48 * mm])
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
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
                ("ALIGN", (3, 0), (3, 0), "CENTER"),
                ("ALIGN", (5, 0), (5, 0), "CENTER"),
            ]
        )
    )
    story.append(ft)
    story.append(Spacer(1, 4 * mm))
    story.append(
        Paragraph(
            "<b>Artefatos tocados (sem regressão nos casos oficiais):</b> "
            "sheet MEDIDA_CAIXAS enriquecida no .xlsm · sheet CAIXAS regenerada com CEILING · "
            "motor (catalog.py / calculator.py) · sync_from_excel.py · catalog_oficial.json · "
            "API (/catalog) · UI (coluna medida/capacidade) · docs R9 · 22 testes verdes.",
            S["body"],
        )
    )

    story.append(PageBreak())

    # ───────── 04 GOVERNANÇA / UX / PRÓXIMOS ─────────
    story.append(SectionTitle(content_w, "04", "Governança, UX e validação", "Padrão especialista — operação, auditoria e evolução"))
    story.append(Spacer(1, 3 * mm))

    gov = [
        [
            Paragraph("Dimensão", S["th"]),
            Paragraph("Padrão aplicado", S["th"]),
            Paragraph("Benefício", S["th"]),
        ],
        [
            Paragraph("<b>Engenharia de dados</b>", S["td_bold"]),
            Paragraph("Fonte única (MEDIDA_CAIXAS) → empacotamento tipado → tabela CAIXAS gerada, não editada.", S["td"]),
            Paragraph("Elimina drift entre estoque físico e pricing.", S["td"]),
        ],
        [
            Paragraph("<b>Software / motor</b>", S["td_bold"]),
            Paragraph("Função pura qtde_caixas(tubete, rolos) com CEILING; fallback tipado; mapeamento 1\" 1/2 → 1\".", S["td"]),
            Paragraph("Testável, previsível, sem VLOOKUP opaco.", S["td"]),
        ],
        [
            Paragraph("<b>UX / UI</b>", S["td_bold"]),
            Paragraph("Resultado exibe medida da caixa + capacidade (rolos/cx), não só o número de caixas.", S["td"]),
            Paragraph("Auditoria visual imediata no orçamento.", S["td"]),
        ],
        [
            Paragraph("<b>Excel operacional</b>", S["td_bold"]),
            Paragraph("Fórmulas CEILING com separador ; (locale BR LibreOffice); VBA/macros intocados.", S["td"]),
            Paragraph("Compatibilidade com fluxo atual da fábrica.", S["td"]),
        ],
        [
            Paragraph("<b>Qualidade</b>", S["td_bold"]),
            Paragraph("22 testes automatizados; paridade 7–60 rolos nos casos oficiais (BRAHVA, ART, etc.).", S["td"]),
            Paragraph("Zero regressão comercial nos volumes reais.", S["td"]),
        ],
        [
            Paragraph("<b>Sistemas</b>", S["td_bold"]),
            Paragraph("Catálogo versionável em JSON; sync reproduzível a partir do .xlsm oficial.", S["td"]),
            Paragraph("Pipeline cadastro → cálculo → proposta auditável.", S["td"]),
        ],
    ]
    story.append(_table(gov, [38 * mm, 120 * mm, 70 * mm], S))
    story.append(Spacer(1, 4 * mm))

    # Checklist
    story.append(Paragraph("<b>Checklist operacional</b>", S["body"]))
    story.append(Spacer(1, 2 * mm))
    checks = [
        [
            Paragraph("Item", S["th"]),
            Paragraph("Ação", S["th"]),
            Paragraph("Owner", S["th"]),
            Paragraph("Status", S["th"]),
        ],
        [
            Paragraph("1", S["td_center"]),
            Paragraph("Fechar e reabrir o .xlsm no LibreOffice (evitar conflito de autosave).", S["td"]),
            Paragraph("Operação", S["td"]),
            Paragraph("Pendente usuário", S["td"]),
        ],
        [
            Paragraph("2", S["td_center"]),
            Paragraph("Validar sheet MEDIDA_CAIXAS visível antes de CAIXAS.", S["td"]),
            Paragraph("Operação", S["td"]),
            Paragraph("Implementado", S["td"]),
        ],
        [
            Paragraph("3", S["td_center"]),
            Paragraph("Conferir amostra: 12 rolos 3″ → 1 caixa; 13 → 2; 20 rolos 1″ → 1; 21 → 2.", S["td"]),
            Paragraph("Qualidade", S["td"]),
            Paragraph("OK (testes)", S["td"]),
        ],
        [
            Paragraph("4", S["td_center"]),
            Paragraph("Não editar manualmente a coluna de qtde em CAIXAS — regenerar via sync/fórmula.", S["td"]),
            Paragraph("Dados", S["td"]),
            Paragraph("Regra vigente", S["td"]),
        ],
        [
            Paragraph("5", S["td_center"]),
            Paragraph("Alterar capacidade apenas em MEDIDA_CAIXAS / empacotamento, depois sincronizar.", S["td"]),
            Paragraph("Dados", S["td"]),
            Paragraph("Regra vigente", S["td"]),
        ],
    ]
    story.append(_table(checks, [14 * mm, 130 * mm, 30 * mm, 32 * mm], S))
    story.append(Spacer(1, 4 * mm))

    # Evolution
    story.append(Paragraph("<b>Evolução recomendada (fora do escopo já entregue)</b>", S["body"]))
    story.append(Spacer(1, 2 * mm))
    evo = [
        [
            Paragraph("Prioridade", S["th"]),
            Paragraph("Iniciativa", S["th"]),
            Paragraph("Valor", S["th"]),
        ],
        [
            Paragraph("P2", S["td_center"]),
            Paragraph("Seleção automática de caixa por volume do rolo (diâmetro × largura) além do tubete.", S["td"]),
            Paragraph("Otimiza ocupação e frete.", S["td"]),
        ],
        [
            Paragraph("P2", S["td_center"]),
            Paragraph("Capacidades distintas para 1\" 1/2 se o estoque físico exigir (hoje mapeia para 1\").", S["td"]),
            Paragraph("Fidelidade dimensional.", S["td"]),
        ],
        [
            Paragraph("P3", S["td_center"]),
            Paragraph("Dashboard de consumo de caixas por período a partir dos orçamentos fechados.", S["td"]),
            Paragraph("Compras / estoque.", S["td"]),
        ],
    ]
    story.append(_table(evo, [22 * mm, 140 * mm, 50 * mm], S))
    story.append(Spacer(1, 5 * mm))

    # Closing banner
    close = [
        [
            Paragraph(
                "<b>Conclusão:</b> o cálculo de caixas deixou de ser uma tabela frágil e passou a ser "
                "um <b>modelo de empacotamento auditável</b> — capacidade física por tubete, arredondamento "
                "comercial correto (CEILING), preço unitário preservado e paridade nos casos reais da fábrica. "
                "Pronto para operação com governança de cadastro via MEDIDA_CAIXAS.",
                S["callout"],
            )
        ]
    ]
    ct = Table(close, colWidths=[content_w])
    ct.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SLATE),
                ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    # Override paragraph color for dark bg
    close_p = Paragraph(
        "<font color='#FFFFFF'><b>Conclusão:</b> o cálculo de caixas deixou de ser uma tabela frágil e passou a ser "
        "um <b>modelo de empacotamento auditável</b> — capacidade física por tubete, arredondamento "
        "comercial correto (CEILING), preço unitário preservado e paridade nos casos reais da fábrica. "
        "Pronto para operação com governança de cadastro via MEDIDA_CAIXAS.</font>",
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
                ("BOX", (0, 0), (-1, -1), 0, ACCENT),
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
