#!/usr/bin/env python3
"""Gera o PDF Guia de Preenchimento do CSV de importação de parceiros."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    KeepTogether,
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
    ROOT / "docs" / "guia-importacao-parceiros.pdf",
    ROOT / "apps" / "web" / "public" / "docs" / "guia-importacao-parceiros.pdf",
]


def build_styles():
    base = getSampleStyleSheet()
    styles = {
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
            borderPadding=3,
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
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=MUTED,
            alignment=TA_CENTER,
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
    return styles


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

    table = Table(data, colWidths=[3.2 * cm, 1.5 * cm, 7.0 * cm, 5.8 * cm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
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
    canvas.drawString(1.5 * cm, A4[1] - 0.9 * cm, "ERP RLP · TRIGGER — Guia de importação de parceiros")
    canvas.drawRightString(A4[0] - 1.5 * cm, A4[1] - 0.9 * cm, f"Pág. {doc.page}")
    canvas.setStrokeColor(NAVY)
    canvas.setLineWidth(0.6)
    canvas.line(1.5 * cm, 1.2 * cm, A4[0] - 1.5 * cm, 1.2 * cm)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(
        A4[0] / 2,
        0.7 * cm,
        "Use exatamente os valores listados (maiúsculas). Separador preferencial: ponto e vírgula (;).",
    )
    canvas.restoreState()


def build_story(styles):
    story = []

    # Capa
    story.append(Spacer(1, 3.2 * cm))
    story.append(Paragraph("TRIGGER · ERP RLP", styles["cover_brand"]))
    story.append(Paragraph("Guia de preenchimento<br/>Importação de parceiros (CSV)", styles["cover_title"]))
    story.append(
        Paragraph(
            "Referência completa de cada coluna do modelo <b>parceiros_modelo.csv</b>, "
            "incluindo campos de escolha e booleanos.",
            styles["cover_sub"],
        )
    )
    story.append(Spacer(1, 0.6 * cm))
    tip = Table(
        [[Paragraph(
            "<b>Como usar:</b> baixe o modelo CSV → preencha CNPJ + papel (dados cadastrais "
            "vêm da API na simulação) → simule → confira a atualização CNPJ → confirme. "
            "Limite: 500 linhas. Codificação UTF-8. Separador preferencial: ponto e vírgula (;).",
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
    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph("Sumário", styles["h1"]))
    for item in [
        "1. Regras gerais do arquivo",
        "2. Atualização automática via API CNPJ",
        "3. Campos booleanos (sim/não)",
        "4. Identificação e papéis",
        "5. Situação e flags",
        "6. Dados fiscais manuais (escolhas)",
        "7. Contato complementar",
        "8. Crédito, pagamento e banco",
        "9. Fornecedor e colaborador",
        "10. Exemplos prontos",
        "11. Erros comuns",
    ]:
        story.append(Paragraph(item, styles["toc"]))

    story.append(PageBreak())

    # 1
    story.append(Paragraph("1. Regras gerais do arquivo", styles["h1"]))
    story.append(
        Paragraph(
            "A primeira linha do CSV deve conter os nomes das colunas exatamente como no modelo. "
            "O delimitador pode ser <b>;</b> (recomendado) ou <b>,</b>. Células vazias são ignoradas. "
            "A importação é <b>somente criação</b>: CNPJ/CPF ou código já existentes geram erro na linha "
            "e não alteram o cadastro.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>Obrigatórios mínimos por linha (PJ com CNPJ):</b> <font face='Courier'>cnpj_cpf</font> "
            "(14 dígitos) e ao menos um papel (coluna <font face='Courier'>papeis</font> ou "
            "<font face='Courier'>papel_*</font>). Na simulação, razão social, fantasia, endereço, "
            "telefone, e-mail e regime sugerido são atualizados pela API do CNPJ.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>PF / sem CNPJ:</b> informe <font face='Courier'>razao_social</font> manualmente "
            "(coluna presente no modelo, no final). Não há consulta automática de CPF.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "Permissões extras: dados bancários exigem <font face='Courier'>parceiro.bancario</font>; "
            "limite de crédito exige <font face='Courier'>credito.escrever</font>.",
            styles["body"],
        )
    )

    # 2 — CNPJ API
    story.append(Paragraph("2. Atualização automática via API CNPJ", styles["h1"]))
    story.append(
        Paragraph(
            "Durante a <b>simulação</b>, após validar o mapeamento do template, o sistema consulta a "
            "BrasilAPI para cada linha com CNPJ de 14 dígitos e <b>preenche apenas campos vazios</b>. "
            "Se você incluir no CSV um desses campos com valor, o valor do arquivo prevalece.",
            styles["body"],
        )
    )
    story.append(
        choice_box(
            styles,
            "Campos NÃO precisam estar no modelo (preenchidos pela API se vazios)",
            [
                "razao_social · nome_fantasia",
                "logradouro · numero · complemento · bairro · municipio · uf · cep · ibge",
                "telefone · email",
                "regime (sugerido: SIMPLES_NACIONAL / MEI) · regime_desde · area_incentivada",
            ],
        )
    )
    story.append(
        Paragraph(
            "A coluna <font face='Courier'>razao_social</font> permanece no modelo apenas para "
            "<b>PF</b> ou fallback quando a consulta falhar. Para PJ, deixe em branco e deixe a "
            "simulação atualizar.",
            styles["body"],
        )
    )

    # 3
    story.append(Paragraph("3. Campos booleanos (sim/não)", styles["h1"]))
    story.append(
        Paragraph(
            "Aceitos como <b>verdadeiro</b>: <font face='Courier'>1</font>, "
            "<font face='Courier'>true</font>, <font face='Courier'>sim</font>, "
            "<font face='Courier'>s</font>, <font face='Courier'>yes</font>, "
            "<font face='Courier'>y</font>, <font face='Courier'>x</font>. "
            "Aceitos como <b>falso</b>: <font face='Courier'>0</font>, "
            "<font face='Courier'>false</font>, <font face='Courier'>nao</font> / "
            "<font face='Courier'>não</font>, <font face='Courier'>n</font>, "
            "<font face='Courier'>no</font>.",
            styles["body"],
        )
    )
    story.append(
        choice_box(
            styles,
            "Colunas booleanas do modelo",
            [
                "papel_cliente · papel_fornecedor · papel_colaborador · papel_transportadora",
                "papel_banco · papel_entidade · papel_vendedor · papel_contador",
                "is_prospect · emite_documento_fiscal · consumidor_final",
            ],
        )
    )

    # 4
    story.append(Paragraph("4. Identificação e papéis", styles["h1"]))
    story.append(
        field_table(
            styles,
            [
                (
                    "codigo",
                    "Não",
                    "Código interno legível. Se vazio, o sistema gera automaticamente (ex.: PAR-00042).",
                    "Texto até 16 caracteres. Único por empresa.",
                ),
                (
                    "tipo_pessoa",
                    "Não",
                    "Natureza da pessoa. Com CNPJ a simulação assume PJ se vazio.",
                    "PJ | PF | ESTRANGEIRO",
                ),
                (
                    "cnpj_cpf",
                    "Sim*",
                    "Somente dígitos. CNPJ 14 → dispara atualização automática na simulação.",
                    "CNPJ 14 dígitos ou CPF 11 dígitos",
                ),
                (
                    "razao_social",
                    "PF / fallback",
                    "Obrigatório para PF. Para PJ, preenchido pela API se vazio.",
                    "Texto até 255 caracteres",
                ),
                (
                    "papeis",
                    "Sim*",
                    "Atalho: lista de papéis na mesma célula. Separadores: ; , | /",
                    "cliente;fornecedor;vendedor …",
                ),
                (
                    "papel_*",
                    "Sim*",
                    "Alternativa: marque cada papel em coluna própria (booleano).",
                    "sim / nao (ver seção 3)",
                ),
            ],
        )
    )
    story.append(Spacer(1, 0.35 * cm))
    story.append(
        choice_box(
            styles,
            "Valores aceitos em papeis (escreva em minúsculas)",
            [
                "cliente",
                "fornecedor",
                "colaborador",
                "transportadora",
                "banco",
                "entidade",
                "vendedor",
                "contador",
            ],
        )
    )
    story.append(
        Paragraph(
            "* É obrigatório haver ao menos um papel ativo — por <font face='Courier'>papeis</font> "
            "ou por qualquer <font face='Courier'>papel_*</font> = sim.",
            styles["body"],
        )
    )

    # 5
    story.append(Paragraph("5. Situação e flags", styles["h1"]))
    story.append(
        field_table(
            styles,
            [
                (
                    "situacao",
                    "Não",
                    "Estado operacional do cadastro. Padrão recomendado: ATIVO.",
                    "ATIVO | INATIVO | BLOQUEADO",
                ),
                (
                    "is_prospect",
                    "Não",
                    "Marca oportunidade comercial ainda não convertida em cliente pleno.",
                    "sim / nao",
                ),
                (
                    "emite_documento_fiscal",
                    "Não",
                    "Participa de NF-e. Desmarque (nao) para banco/entidade sem documento.",
                    "sim / nao",
                ),
            ],
        )
    )

    story.append(PageBreak())

    # 6
    story.append(Paragraph("6. Dados fiscais manuais (escolhas)", styles["h1"]))
    story.append(
        Paragraph(
            "IE, finalidade e indicadores fiscais <b>não</b> vêm da API CNPJ — preencha no CSV "
            "quando souber. O regime tributário sugerido (Simples/MEI) pode vir da consulta CNPJ "
            "se a coluna estiver vazia.",
            styles["body"],
        )
    )
    story.append(
        field_table(
            styles,
            [
                (
                    "ie",
                    "Não",
                    "Inscrição Estadual. Vazio = não contribuinte; texto ISENTO = isento; número = contribuinte.",
                    "Número | ISENTO | (vazio)",
                ),
                (
                    "im",
                    "Não",
                    "Inscrição municipal, quando houver.",
                    "Texto até 32",
                ),
                (
                    "suframa",
                    "Não",
                    "Código SUFRAMA (ZFM). Relevante para UF da Amazônia Ocidental / ALC.",
                    "Somente dígitos",
                ),
                (
                    "ind_ie_dest",
                    "Não",
                    "Indicador IE destinatário (NF-e). Use o número conforme a tabela abaixo.",
                    "1 | 2 | 9",
                ),
                (
                    "ie_status",
                    "Não",
                    "Status da IE perante consulta SINTEGRA/CCC.",
                    "NAO_VERIFICADA | OK | BAIXADA | NAO_HABILITADA | ISENTA",
                ),
                (
                    "consumidor_final",
                    "Não",
                    "indFinal = 1 na NF-e. Com finalidade USO_CONSUMO o sistema pode marcar automaticamente.",
                    "sim / nao",
                ),
                (
                    "finalidade",
                    "Não",
                    "Finalidade padrão do cliente (orienta CFOP de saída).",
                    "REVENDA | INDUSTRIALIZACAO | USO_CONSUMO",
                ),
            ],
        )
    )
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Tabela de escolha — ind_ie_dest", styles["h2"]))
    story.append(
        field_table(
            styles,
            [
                ("1", "—", "Contribuinte ICMS (com IE numérica).", "Usar com IE preenchida"),
                ("2", "—", "Contribuinte isento de inscrição.", "Combinar com ie = ISENTO"),
                ("9", "—", "Não contribuinte.", "IE vazia (padrão para PF/consumidor)"),
            ],
        )
    )
    story.append(Spacer(1, 0.35 * cm))
    story.append(
        choice_box(
            styles,
            "Lembretes de finalidade",
            [
                "REVENDA — mercadoria para revenda",
                "INDUSTRIALIZACAO — insumo / industrialização",
                "USO_CONSUMO — uso e consumo (tende a consumidor_final = sim)",
            ],
        )
    )

    # 7
    story.append(Paragraph("7. Contato complementar", styles["h1"]))
    story.append(
        Paragraph(
            "Telefone e e-mail principais vêm da API CNPJ quando vazios. Use as colunas abaixo "
            "para WhatsApp, e-mail de XML e contatos adicionais.",
            styles["body"],
        )
    )
    story.append(
        field_table(
            styles,
            [
                ("whatsapp", "Não", "WhatsApp comercial.", "Texto"),
                ("email_xml", "Não*", "E-mail para XML/DANFE. Recomendado para cliente no fluxo fiscal.", "e-mail válido"),
                ("contato_nome", "Não", "Nome do contato (gera 1 contato principal se informado).", "Texto"),
                ("contato_funcao", "Não", "Cargo/função do contato.", "Texto"),
                ("contato_telefone", "Não", "Telefone do contato.", "Texto"),
                ("contato_whatsapp", "Não", "WhatsApp do contato.", "Texto"),
                ("contato_email", "Não", "E-mail do contato.", "e-mail válido"),
            ],
        )
    )

    story.append(PageBreak())

    # 8
    story.append(Paragraph("8. Crédito, pagamento e banco", styles["h1"]))
    story.append(
        Paragraph(
            "Campos bancários geram uma conta principal automaticamente quando qualquer um deles "
            "estiver preenchido. Exigem permissão <font face='Courier'>parceiro.bancario</font>. "
            "Limite de crédito exige <font face='Courier'>credito.escrever</font>.",
            styles["body"],
        )
    )
    story.append(
        field_table(
            styles,
            [
                ("limite_credito", "Não", "Limite de crédito do cliente. Monetário final NUMERIC(15,2).", "Decimal até 2 casas (ex.: 15000.00 ou 15000,00)"),
                ("condicao_pagamento", "Não", "Condição acordada (texto livre).", "Ex.: 28 DDL, 30/60"),
                ("forma_pagamento", "Não", "Forma preferencial (texto livre).", "Ex.: Boleto, PIX"),
                ("banco_codigo", "Não", "Código COMPE do banco.", "Ex.: 001, 341"),
                ("banco_nome", "Não", "Nome do banco.", "Texto"),
                ("agencia", "Não", "Agência (com dígito se desejar).", "Texto até 16"),
                ("conta", "Não", "Número da conta.", "Texto até 32"),
                ("pix_chave", "Não", "Chave PIX (CPF, e-mail, telefone, EVP).", "Texto"),
                (
                    "tipo_conta",
                    "Não",
                    "Tipo da conta bancária. Se inválido/vazio com dados de banco → CORRENTE.",
                    "CORRENTE | POUPANCA | PAGAMENTO",
                ),
            ],
        )
    )

    # 9
    story.append(Paragraph("9. Fornecedor e colaborador", styles["h1"]))
    story.append(
        field_table(
            styles,
            [
                (
                    "tipo_fornecimento",
                    "Não",
                    "Classificação do fornecedor (quando papel_fornecedor).",
                    "MERCADORIA | SERVICO | UTILIDADE | TRIBUTO",
                ),
                (
                    "cfop_entrada_padrao",
                    "Não",
                    "CFOP padrão de entrada para o fornecedor.",
                    "Até 4 dígitos sugeridos (ex.: 1102)",
                ),
                ("vinculo", "Não", "Tipo de vínculo do colaborador (texto livre).", "Ex.: CLT, PJ"),
                ("cargo", "Não", "Cargo do colaborador.", "Texto"),
                ("departamento", "Não", "Departamento / área.", "Texto até 64"),
            ],
        )
    )

    # 10
    story.append(Paragraph("10. Exemplos prontos", styles["h1"]))
    story.append(Paragraph("Exemplo A — Cliente PJ (mínimo — API preenche o resto)", styles["h2"]))
    story.append(
        Paragraph(
            "<font face='Courier' size='8'>tipo_pessoa=PJ; cnpj_cpf=11222333000181; "
            "papeis=cliente; situacao=ATIVO; finalidade=REVENDA</font>",
            styles["body"],
        )
    )
    story.append(Paragraph("Exemplo B — Fornecedor com IE (papéis por coluna)", styles["h2"]))
    story.append(
        Paragraph(
            "<font face='Courier' size='8'>tipo_pessoa=PJ; cnpj_cpf=99888777000166; "
            "papel_fornecedor=sim; situacao=ATIVO; tipo_fornecimento=MERCADORIA; "
            "cfop_entrada_padrao=1102; ind_ie_dest=1; ie=123456789; ie_status=OK</font>",
            styles["body"],
        )
    )
    story.append(Paragraph("Exemplo C — Colaborador PF (sem API CNPJ)", styles["h2"]))
    story.append(
        Paragraph(
            "<font face='Courier' size='8'>tipo_pessoa=PF; cnpj_cpf=39053344705; "
            "razao_social=Maria Silva; papeis=colaborador; situacao=ATIVO; "
            "cargo=Analista Comercial; departamento=Comercial; vinculo=CLT</font>",
            styles["body"],
        )
    )
    story.append(Paragraph("Exemplo D — Cliente + vendedor (múltiplos papéis)", styles["h2"]))
    story.append(
        Paragraph(
            "<font face='Courier' size='8'>papeis=cliente;vendedor &nbsp;ou&nbsp; "
            "papel_cliente=sim e papel_vendedor=sim</font>",
            styles["body"],
        )
    )

    # 11
    story.append(Paragraph("11. Erros comuns", styles["h1"]))
    bullets = [
        "Esquecer papel → “Informe ao menos um papel para o parceiro.”",
        "PJ só com CNPJ inválido/inacessível e sem razao_social → informe razao_social ou corrija o CNPJ.",
        "Escrever valor de escolha com acento/espaço (ex.: Simples Nacional) → use SIMPLES_NACIONAL.",
        "CNPJ já cadastrado → a linha falha; a importação não atualiza registros existentes.",
        "codigo duplicado no arquivo ou na empresa → erro na linha.",
        "Importar limite_credito ou banco sem a permissão SoD correspondente → erro de permissão.",
        "Abrir o CSV no Excel e salvar alterando UTF-8/separador → preferir LibreOffice ou editar como texto.",
        "Deixar tipo_pessoa com valor fora de PJ/PF/ESTRANGEIRO → rejeição na validação.",
    ]
    story.append(
        ListFlowable(
            [ListItem(Paragraph(b, styles["body"]), leftIndent=8, value="•") for b in bullets],
            bulletType="bullet",
            start="•",
        )
    )
    story.append(Spacer(1, 0.5 * cm))
    story.append(
        Paragraph(
            "Fluxo recomendado: preencha CNPJ + papel (+ fiscal manual se souber) → simule e "
            "confira a coluna “API CNPJ” na tela → confirme. A simulação não grava nada; só a "
            "confirmação cria os parceiros.",
            styles["body"],
        )
    )

    return story


def main():
    styles = build_styles()
    for out in OUTPUTS:
        out.parent.mkdir(parents=True, exist_ok=True)
        doc = SimpleDocTemplate(
            str(out),
            pagesize=A4,
            leftMargin=1.5 * cm,
            rightMargin=1.5 * cm,
            topMargin=1.6 * cm,
            bottomMargin=1.6 * cm,
            title="Guia de importação de parceiros — ERP RLP",
            author="TRIGGER",
            subject="Preenchimento do CSV parceiros_modelo.csv",
        )
        doc.build(build_story(styles), onFirstPage=add_header_footer, onLaterPages=add_header_footer)
        print(f"Gerado: {out}")


if __name__ == "__main__":
    main()
