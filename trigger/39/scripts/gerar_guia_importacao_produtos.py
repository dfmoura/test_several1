#!/usr/bin/env python3
"""Gera o PDF Guia de Preenchimento do CSV de importação de produtos."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#1a3568")
GREEN = colors.HexColor("#7cb518")
LIGHT = colors.HexColor("#f4f7fb")
BORDER = colors.HexColor("#d0d7e2")
TEXT = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#5b6472")

ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = [
    ROOT / "docs" / "guia-importacao-produtos.pdf",
    ROOT / "apps" / "web" / "public" / "docs" / "guia-importacao-produtos.pdf",
]


def build_styles():
    base = getSampleStyleSheet()
    return {
        "cover_brand": ParagraphStyle(
            "cover_brand",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=GREEN,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=NAVY,
            alignment=TA_CENTER,
            leading=28,
            spaceAfter=10,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            textColor=MUTED,
            alignment=TA_CENTER,
            leading=15,
            spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=NAVY,
            spaceBefore=12,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=NAVY,
            spaceBefore=10,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=TEXT,
            leading=12.5,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "tip": ParagraphStyle(
            "tip",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=TEXT,
            leading=11.5,
            leftIndent=4,
            rightIndent=4,
        ),
        "th": ParagraphStyle(
            "th",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=colors.white,
            leading=10,
        ),
        "td": ParagraphStyle(
            "td",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.8,
            textColor=TEXT,
            leading=10.2,
        ),
        "td_code": ParagraphStyle(
            "td_code",
            parent=base["Normal"],
            fontName="Courier-Bold",
            fontSize=7.4,
            textColor=NAVY,
            leading=10,
        ),
        "choice": ParagraphStyle(
            "choice",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=7.4,
            textColor=TEXT,
            leading=10,
        ),
        "toc": ParagraphStyle(
            "toc",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            textColor=TEXT,
            leading=16,
            leftIndent=8,
        ),
    }


def field_table(styles, rows: list[tuple[str, str, str, str]]):
    data = [[
        Paragraph("Campo", styles["th"]),
        Paragraph("Obrig.?", styles["th"]),
        Paragraph("Como preencher", styles["th"]),
        Paragraph("Valores / formato", styles["th"]),
    ]]
    for campo, obr, como, valores in rows:
        data.append([
            Paragraph(campo, styles["td_code"]),
            Paragraph(obr, styles["td"]),
            Paragraph(como, styles["td"]),
            Paragraph(valores, styles["choice"]),
        ])

    table = Table(data, colWidths=[3.4 * cm, 1.5 * cm, 6.8 * cm, 5.8 * cm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def choice_box(styles, title: str, items: list[str]):
    lines = "<br/>".join(f"• <font face='Courier'><b>{i}</b></font>" for i in items)
    inner = Table(
        [[Paragraph(f"<b>{title}</b>", styles["td"])], [Paragraph(lines, styles["td"])]],
        colWidths=[17.5 * cm],
    )
    inner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 1, GREEN),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return inner


def add_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(GREEN)
    canvas.setLineWidth(2)
    canvas.line(1.5 * cm, A4[1] - 1.1 * cm, A4[0] - 1.5 * cm, A4[1] - 1.1 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(1.5 * cm, A4[1] - 0.9 * cm, "ERP RLP · TRIGGER — Guia de importação de produtos")
    canvas.drawRightString(A4[0] - 1.5 * cm, A4[1] - 0.9 * cm, f"Pág. {doc.page}")
    canvas.setStrokeColor(NAVY)
    canvas.setLineWidth(0.6)
    canvas.line(1.5 * cm, 1.2 * cm, A4[0] - 1.5 * cm, 1.2 * cm)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(
        A4[0] / 2,
        0.7 * cm,
        "Cadastro mestre Fase 1 — sem saldo de estoque. Separador preferencial: ponto e vírgula (;).",
    )
    canvas.restoreState()


def build_story(styles):
    story = []

    story.append(Spacer(1, 3.0 * cm))
    story.append(Paragraph("TRIGGER · ERP RLP", styles["cover_brand"]))
    story.append(Paragraph("Guia de preenchimento<br/>Importação de produtos (CSV)", styles["cover_title"]))
    story.append(
        Paragraph(
            "Referência de cada coluna do modelo <b>produtos_modelo.csv</b>, "
            "alinhada ao domínio fiscal + SKU dimensional (estudo trigger/32).",
            styles["cover_sub"],
        )
    )
    story.append(Spacer(1, 0.5 * cm))
    tip = Table(
        [[Paragraph(
            "<b>Como usar:</b> baixe o modelo CSV → preencha família, grupo e descrição fiscal "
            "(dimensões se o grupo exigir) → simule (defaults do grupo são aplicados) → confirme. "
            "Limite: 500 linhas. UTF-8. Separador: ponto e vírgula (;). "
            "<b>Insert-only:</b> código já existente gera erro na linha — não atualiza.",
            styles["tip"],
        )]],
        colWidths=[14 * cm],
    )
    tip.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 1.2, GREEN),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(tip)
    story.append(Spacer(1, 1.0 * cm))
    story.append(Paragraph("Sumário", styles["h1"]))
    for item in [
        "1. Regras gerais e o que NÃO importar nesta fase",
        "2. Defaults automáticos do grupo canônico",
        "3. Famílias e grupos oficiais",
        "4. Identificação e descrições",
        "5. Unidades, conversão e preço",
        "6. Campos fiscais (override)",
        "7. Atributos dimensionais (bobina)",
        "8. Exemplos prontos",
        "9. Erros comuns",
    ]:
        story.append(Paragraph(item, styles["toc"]))

    story.append(PageBreak())

    # 1
    story.append(Paragraph("1. Regras gerais e o que NÃO importar nesta fase", styles["h1"]))
    story.append(
        Paragraph(
            "A primeira linha do CSV deve conter os nomes das colunas do modelo. "
            "O delimitador pode ser <b>;</b> (recomendado) ou <b>,</b>. Células vazias são ignoradas. "
            "A importação é <b>somente criação</b> do cadastro mestre: não grava saldo de estoque, "
            "histórico de NF-e, movimento nem preço dinâmico de orçamento.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Obrigatórios mínimos por linha:</b> <font face='Courier'>familia</font>, "
            "<font face='Courier'>grupo</font> (código canônico) e "
            "<font face='Courier'>descricao_fiscal</font>. "
            "Grupos com bobina (papel, BOPP, tecido…) exigem também "
            "<font face='Courier'>largura_mm</font> e <font face='Courier'>comprimento_m</font>.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Regra de ouro do domínio:</b> não criar milhares de etiquetas sob medida como "
            "produto eterno. PA fica em famílias fiscais genéricas (ex.: PA-ETQ); customização "
            "mora no orçamento/pedido. REV-RIB usa o mesmo código na compra e na venda.",
            styles["body"],
        )
    )
    story.append(
        choice_box(
            styles,
            "Fora do escopo desta carga (fases seguintes)",
            [
                "Saldo / inventário de abertura (movimento separado)",
                "Histórico XML de compra/venda",
                "De-para fornecedor cProd (após parceiros + produtos)",
                "Catálogo de opções de orçamento (acabamento, faca…)",
                "custo_medio (calculado por movimentação — bloqueado no CSV)",
            ],
        )
    )

    # 2
    story.append(Paragraph("2. Defaults automáticos do grupo canônico", styles["h1"]))
    story.append(
        Paragraph(
            "Durante a <b>simulação</b>, o sistema resolve o grupo (ex.: MP-PAP) e "
            "<b>preenche apenas campos vazios</b> com os padrões do catálogo. "
            "Valores digitados no CSV prevalecem. Defaults do grupo não exigem permissão fiscal.",
            styles["body"],
        )
    )
    story.append(
        choice_box(
            styles,
            "Campos preenchidos pelo grupo se vazios",
            [
                "tipo_item_sped · ncm · unidade_comercial · unidade_interna",
                "cfop_entrada_padrao · cfop_saida_padrao",
                "atributos.grupo_estoque (GG da máscara de bobina)",
                "fator_conversao quando o par for MIL↔UN (1 MIL = 1000 UN)",
            ],
        )
    )
    story.append(
        Paragraph(
            "Se o grupo tiver NCM ainda não confirmado empiricamente (ex.: MP-TEC), a simulação "
            "emite <b>aviso</b> — não bloqueia — para validar na NF do fornecedor.",
            styles["body"],
        )
    )

    # 3
    story.append(Paragraph("3. Famílias e grupos oficiais", styles["h1"]))
    story.append(
        choice_box(
            styles,
            "Famílias (coluna familia)",
            [
                "MP — matéria-prima",
                "EMB — embalagem",
                "REV — revenda (compra e venda no mesmo SKU)",
                "PA — produto acabado / família fiscal",
                "SVC — serviço",
                "FAC — faca/matriz (não é SKU de venda recorrente)",
            ],
        )
    )
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        choice_box(
            styles,
            "Grupos canônicos (coluna grupo) — devem combinar com a família",
            [
                "MP-PAP · MP-FLM · MP-TEC · MP-LAM · MP-CLD · MP-TIN · MP-ADF · MP-RET",
                "EMB-TUB · EMB-CX",
                "REV-RIB",
                "PA-ETQ · PA-BOB",
                "SVC · FAC",
            ],
        )
    )

    story.append(PageBreak())

    # 4
    story.append(Paragraph("4. Identificação e descrições", styles["h1"]))
    story.append(
        field_table(
            styles,
            [
                (
                    "codigo",
                    "Não",
                    "Código de negócio legível. Se vazio, o sistema gera (ex.: MP-PAP-001). "
                    "Após uso em documentos, trate como imutável. Nunca reutilize código de item inativo.",
                    "Até 32 caracteres. Único por empresa (inclui soft-deleted).",
                ),
                (
                    "familia",
                    "Sim",
                    "Camada fiscal do item. Define SPED e natureza compra/venda.",
                    "MP | EMB | REV | PA | SVC | FAC",
                ),
                (
                    "grupo",
                    "Sim",
                    "Prefixo canônico do catálogo. Deve pertencer à família informada.",
                    "Ex.: MP-PAP, PA-ETQ, REV-RIB",
                ),
                (
                    "descricao_fiscal",
                    "Sim",
                    "Texto curto e estável para NF-e / SPED. Evite marca ou apelido de estoque.",
                    "Até 255 caracteres",
                ),
                (
                    "descricao_comercial",
                    "Não",
                    "Texto mais rico para tela/orçamento. Em PA pode usar placeholders "
                    "({material}, {medida}…) — a especificação da arte fica no pedido.",
                    "Até 255 caracteres",
                ),
                (
                    "situacao",
                    "Não",
                    "Ciclo de vida. Preferir INATIVO a excluir.",
                    "ATIVO (padrão) | INATIVO",
                ),
            ],
        )
    )

    # 5
    story.append(Paragraph("5. Unidades, conversão e preço", styles["h1"]))
    story.append(
        field_table(
            styles,
            [
                (
                    "unidade_comercial",
                    "Não*",
                    "Unidade da NF do fornecedor/cliente. Se vazia, vem do grupo.",
                    "RL · M · M2 · KG · G · UN · MIL · L · CX",
                ),
                (
                    "unidade_interna",
                    "Não*",
                    "Unidade de estoque/OP. Se vazia, vem do grupo.",
                    "Mesma lista oficial",
                ),
                (
                    "fator_conversao",
                    "Cond.",
                    "Obrigatório e &gt; 0 se comercial ≠ interna (ex.: MP-PAP: KG→M2). "
                    "Não inventar: calcule com gramatura/densidade do domínio.",
                    "Número decimal — fator: até 10 casas (PADRAO_DECIMAL)",
                ),
                (
                    "preco_tabela",
                    "Não",
                    "Lista para REV. Para PA genérico o preço vem do orçamento — deixe vazio. "
                    "Preço unitário: NUMERIC(19,6).",
                    "Número decimal — até 6 casas",
                ),
                (
                    "estoque_minimo",
                    "Não",
                    "Política de reposição (não é saldo). Quantidade: NUMERIC(15,4).",
                    "Número decimal — até 4 casas",
                ),
                (
                    "lead_time_dias",
                    "Não",
                    "Prazo médio de ressuprimento em dias.",
                    "Inteiro",
                ),
                (
                    "gtin",
                    "Não",
                    "EAN/GTIN ou a literal SEM GTIN.",
                    "Dígitos ou SEM GTIN",
                ),
            ],
        )
    )

    # 6
    story.append(Paragraph("6. Campos fiscais (override)", styles["h1"]))
    story.append(
        Paragraph(
            "Só preencha se precisar <b>diferir</b> do padrão do grupo. "
            "Override exige permissão <font face='Courier'>produto.fiscal</font>. "
            "Origem da mercadoria deve espelhar o XML do fornecedor — nunca forçar 0.",
            styles["body"],
        )
    )
    story.append(
        field_table(
            styles,
            [
                (
                    "ncm",
                    "Não*",
                    "8 dígitos. Se vazio e o grupo tiver padrão, aplica-se o padrão.",
                    "48114190",
                ),
                (
                    "cest",
                    "Não",
                    "Hoje o catálogo corrente não usa ST — normalmente vazio.",
                    "Até 16 caracteres",
                ),
                (
                    "origem",
                    "Não",
                    "Origem ICMS da mercadoria (0–8).",
                    "0 a 8",
                ),
                (
                    "tipo_item_sped",
                    "Não*",
                    "00 REV · 01 MP · 02 EMB · 04 PA · 09 SVC (default do grupo).",
                    "2 dígitos",
                ),
                (
                    "cfop_entrada_padrao",
                    "Não*",
                    "Ex.: 1101/2101 industrialização; 1102/2102 revenda.",
                    "4 dígitos",
                ),
                (
                    "cfop_saida_padrao",
                    "Não*",
                    "Ex.: 5101/6101 PA; 5102/6102 REV.",
                    "4 dígitos",
                ),
                (
                    "csosn",
                    "Não",
                    "Simples Nacional — tipicamente 102 (ou 101).",
                    "Ex.: 102",
                ),
                (
                    "cst_icms / cst_pis / cst_cofins",
                    "Não",
                    "Preparação Lucro Real; opcional na carga Simples.",
                    "Até 8 caracteres cada",
                ),
            ],
        )
    )

    story.append(PageBreak())

    # 7
    story.append(Paragraph("7. Atributos dimensionais (bobina)", styles["h1"]))
    story.append(
        Paragraph(
            "Colunas planas no CSV; o sistema grava em JSON <font face='Courier'>atributos</font>. "
            "Grupos com <b>exige dimensão</b> bloqueiam linha sem L×C — sem default silencioso.",
            styles["body"],
        )
    )
    story.append(
        field_table(
            styles,
            [
                (
                    "largura_mm",
                    "Cond.",
                    "Largura da bobina/rolo em milímetros. Obrigatório se o grupo exigir dimensão. "
                    "NUMERIC(9,2).",
                    "Decimal até 2 casas &gt; 0 (ex.: 330 ou 330,50)",
                ),
                (
                    "comprimento_m",
                    "Cond.",
                    "Comprimento em metros. Obrigatório com largura nos grupos dimensionais. "
                    "NUMERIC(9,2).",
                    "Decimal até 2 casas &gt; 0 (ex.: 1000)",
                ),
                (
                    "gramatura_g_m2",
                    "Rec.",
                    "Gramatura total — necessária para conversões KG↔M2 em papéis/filmes. "
                    "NUMERIC(9,2).",
                    "Decimal até 2 casas (ex.: 80 ou 80,25)",
                ),
                (
                    "fornecedor_sigla",
                    "Não",
                    "Sigla FFF da máscara dimensional (não confundir com grupo fiscal).",
                    "Ex.: FAS · COL",
                ),
                (
                    "grupo_estoque",
                    "Não*",
                    "GG da máscara (10 couchê, 20 BOPP, 60 ribbon…). Default do grupo se vazio.",
                    "10–90",
                ),
            ],
        )
    )
    story.append(
        choice_box(
            styles,
            "Grupos que exigem largura_mm + comprimento_m",
            [
                "MP-PAP · MP-FLM · MP-TEC · MP-LAM · MP-CLD · MP-ADF · MP-RET",
                "PA-BOB (quando dimensional)",
                "Não exigem: MP-TIN · EMB-* · REV-RIB · PA-ETQ · SVC · FAC",
            ],
        )
    )

    # 8
    story.append(Paragraph("8. Exemplos prontos", styles["h1"]))
    story.append(Paragraph("Bobina de papel (defaults fiscais do grupo):", styles["h2"]))
    story.append(
        Paragraph(
            "<font face='Courier'>familia;grupo;descricao_fiscal;descricao_comercial;"
            "fator_conversao;largura_mm;comprimento_m;gramatura_g_m2;fornecedor_sigla</font><br/>"
            "<font face='Courier'>MP;MP-PAP;PAPEL COUCHE AUTOADESIVO;Couché brilho 80g;"
            "12.5;330;1000;80;FAS</font>",
            styles["body"],
        )
    )
    story.append(Paragraph("Família fiscal de etiqueta (sem dimensão):", styles["h2"]))
    story.append(
        Paragraph(
            "<font face='Courier'>familia;grupo;descricao_fiscal;descricao_comercial</font><br/>"
            "<font face='Courier'>PA;PA-ETQ;ETIQUETA BOPP;Família BOPP — especificação no orçamento</font>",
            styles["body"],
        )
    )
    story.append(Paragraph("Ribbon de revenda (mesmo SKU compra/venda):", styles["h2"]))
    story.append(
        Paragraph(
            "<font face='Courier'>familia;grupo;descricao_fiscal;preco_tabela</font><br/>"
            "<font face='Courier'>REV;REV-RIB;RIBBON CERA 110x74;45.90</font>",
            styles["body"],
        )
    )

    # 9
    story.append(Paragraph("9. Erros comuns", styles["h1"]))
    bullets = [
        "Grupo incompatível com a família (ex.: PA-ETQ com familia=MP).",
        "Código duplicado no arquivo ou já cadastrado (insert-only).",
        "Grupo dimensional sem largura_mm / comprimento_m.",
        "unidade_comercial ≠ unidade_interna sem fator_conversao &gt; 0.",
        "NCM com pontuação ou diferente de 8 dígitos.",
        "Override fiscal no CSV sem permissão produto.fiscal.",
        "Tentar importar custo_medio ou saldo — não fazem parte do modelo.",
        "Criar um PA por arte/medida do cliente — personalização é do pedido.",
    ]
    story.append(
        ListFlowable(
            [ListItem(Paragraph(b, styles["body"]), leftIndent=8, value="•") for b in bullets],
            bulletType="bullet",
            start="•",
        )
    )
    story.append(Spacer(1, 0.4 * cm))
    story.append(
        Paragraph(
            "Fluxo na tela: <b>Produtos → Importar CSV</b> · Baixar modelo · Baixar este guia · "
            "Simular · Confirmar apenas linhas OK.",
            styles["body"],
        )
    )

    return story


def main():
    styles = build_styles()

    for out in OUTPUTS:
        out.parent.mkdir(parents=True, exist_ok=True)
        # ReportLab consome os flowables — reconstruir o story a cada saída.
        story = build_story(styles)
        doc = SimpleDocTemplate(
            str(out),
            pagesize=A4,
            leftMargin=1.5 * cm,
            rightMargin=1.5 * cm,
            topMargin=1.5 * cm,
            bottomMargin=1.6 * cm,
            title="Guia de importação de produtos — ERP RLP",
            author="TRIGGER · ERP RLP",
        )
        doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
        print(f"OK → {out}")


if __name__ == "__main__":
    main()
