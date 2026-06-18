#!/usr/bin/env python3
"""Gera PDF do relatório inicial de contexto extensionista."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT = Path(__file__).parent / "relatorio_inicial_contexto.pdf"


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontSize=16,
            leading=20,
            alignment=TA_CENTER,
            spaceAfter=6,
            textColor=colors.HexColor("#1a365d"),
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontSize=11,
            leading=14,
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontSize=10,
            leading=13,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontSize=13,
            leading=16,
            spaceBefore=14,
            spaceAfter=8,
            textColor=colors.HexColor("#1a365d"),
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontSize=11,
            leading=14,
            spaceBefore=10,
            spaceAfter=6,
            textColor=colors.HexColor("#2c5282"),
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontSize=10,
            leading=13,
            leftIndent=14,
            bulletIndent=0,
            spaceAfter=3,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontSize=8.5,
            leading=11,
            alignment=TA_JUSTIFY,
            textColor=colors.grey,
        ),
    }
    return styles


def p(text, style):
    return Paragraph(text.replace("\n", "<br/>"), style)


def table(data, col_widths=None):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c5282")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.grey)
    canvas.drawString(2 * cm, 1.2 * cm, "UNIUBE — Sistemas de Informação — Diôgo Ferreira Moura — RA 1030125-2")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Página {doc.page}")
    canvas.restoreState()


def build_story(styles):
    s = styles
    story = []

    story.append(p("Relatório Inicial de Contexto", s["title"]))
    story.append(p("Trabalho Extensionista — Visão Preliminar da Organização Parceira", s["subtitle"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2c5282")))
    story.append(Spacer(1, 0.4 * cm))

    for line in [
        "<b>Universidade de Uberaba — UNIUBE</b>",
        "<b>Curso:</b> Sistemas de Informação",
        "<b>Aluno:</b> Diôgo Ferreira Moura",
        "<b>RA:</b> 1030125-2",
        "<b>Data:</b> 05 de junho de 2026",
    ]:
        story.append(p(line, s["meta"]))
    story.append(Spacer(1, 0.5 * cm))

    # 1
    story.append(p("1. Natureza deste documento", s["h1"]))
    story.append(
        p(
            "Este relatório registra, em estágio inicial, o que já foi compreendido sobre o contexto "
            "do trabalho extensionista vinculado ao curso de Sistemas de Informação. O objetivo aqui é "
            "consolidar informações, mapear atores, processos e fontes de dados — sem avançar para "
            "definição de entregas, soluções técnicas ou propostas de intervenção.",
            s["body"],
        )
    )
    story.append(
        p(
            "Há ainda muitos pontos a esclarecer junto à organização parceira, especialmente quanto à "
            "priorização de frentes de trabalho, volume de dados, ferramentas internas e expectativas "
            "concretas de contribuição acadêmica.",
            s["body"],
        )
    )

    # 2
    story.append(p("2. Enquadramento acadêmico", s["h1"]))
    story.append(
        p(
            "O trabalho extensionista na UNIUBE aproxima o estudante de uma organização da sociedade civil "
            "da região, permitindo conhecer sua realidade e contribuir em vertente relacionada ao curso. "
            "Para Sistemas de Informação, isso pode envolver coleta e tratamento de dados, automação, "
            "organização de informações, visualização, integração entre sistemas públicos e transparência — "
            "<b>nenhuma dessas possibilidades está definida como escopo</b>; são apenas referência de área.",
            s["body"],
        )
    )
    story.append(
        p(
            "A fase atual é de <b>imersão e entendimento</b>: conhecer a fundo como a organização atua "
            "antes de definir os próximos passos.",
            s["body"],
        )
    )

    # 3
    story.append(p("3. Organização parceira: OSB Uberlândia", s["h1"]))
    story.append(p("3.1 Identificação", s["h2"]))
    story.append(
        table(
            [
                ["Campo", "Informação"],
                ["Nome", "Observatório Social do Brasil — Uberlândia"],
                ["Site", "www.osbrasiluberlandia.org"],
                ["CNPJ", "23.497.346/0001-42"],
                ["CNAE principal", "94.99-5-00 — Atividades associativas"],
                ["CNAEs secundários", "94.30-8-00 e 94.93-6-00"],
                ["Natureza", "OSC, apartidária, sem fins lucrativos"],
                ["Endereço (acompanh.)", "Av. Vasconcelos Costa, 1500, Sala 3, Martins — CEP 38400-452"],
                ["Telefone", "(34) 3239-1529"],
            ],
            [4.5 * cm, 12 * cm],
        )
    )
    story.append(Spacer(1, 0.2 * cm))
    story.append(
        p(
            "O site institucional também indica Rua Padre Pio, 700 — Osvaldo Rezende. Vale confirmar "
            "qual endereço está em uso.",
            s["body"],
        )
    )

    story.append(p("3.2 Origem e rede nacional", s["h2"]))
    for item in [
        "Fundado em 2015 pela associação civil G7 (entidades representativas de Uberlândia, incluindo CDL).",
        "Integra o Sistema Observatório Social do Brasil (osbrasil.org.br), rede nacional com unidades em dezenas de municípios.",
        "Certificado Ouro no Programa OSB 100% Eficiente — edição 2025.",
    ]:
        story.append(p(f"• {item}", s["bullet"]))

    story.append(p("3.3 Missão, visão e valores", s["h2"]))
    story.append(
        p(
            "<b>Missão:</b> Despertar cidadania fiscal, tornando a sociedade proativa na vigilância social.<br/>"
            "<b>Visão:</b> Ser propulsor do controle social para aprimoramento da gestão pública.<br/>"
            "<b>Valores:</b> Apartidarismo, cidadania, justiça social, ética, técnica, proatividade, ação preventiva.",
            s["body"],
        )
    )

    story.append(p("3.4 Frentes da metodologia OSB", s["h2"]))
    for item in [
        "Monitoramento de licitações (da publicação do edital à entrega do serviço).",
        "Educação fiscal.",
        "Inserção de micro e pequenas empresas em licitações.",
        "Indicadores de gestão pública e prestação de contas quadrimestral.",
    ]:
        story.append(p(f"• {item}", s["bullet"]))

    story.append(p("3.5 Contatos identificados", s["h2"]))
    story.append(
        table(
            [
                ["Nome", "Telefone"],
                ["Marco Aurélio Freitas Santos", "(34) 9979-6169"],
                ["Lucas Pereira Cardoso", "(34) 99970-4604"],
            ],
            [8 * cm, 8.5 * cm],
        )
    )

    story.append(PageBreak())

    # 4
    story.append(p("4. Frentes de atuação em Uberlândia", s["h1"]))
    story.append(p("4.1 Licitações e contratos do município", s["h2"]))
    story.append(
        p(
            "Acompanhamento da Prefeitura Municipal de Uberlândia e de autarquias, fundações e empresas públicas vinculadas.",
            s["body"],
        )
    )
    story.append(p("4.2 Câmara Municipal", s["h2"]))
    story.append(
        p(
            "Monitoramento de vereadores: projetos apresentados, fiscalizações e presença em sessões legislativas.",
            s["body"],
        )
    )

    # 5
    story.append(p("5. Órgãos municipais no escopo de licitações", s["h1"]))
    orgaos = [
        ["Sigla", "Entidade", "CNPJ"],
        ["PMU", "Prefeitura de Uberlândia", "18.431.312/0001-15"],
        ["DMAE", "Depto. Municipal de Água e Esgoto", "25.769.548/0001-21"],
        ["FUTEL", "Fundação Uberlandense Turismo, Esporte e Lazer", "20.260.121/0001-80"],
        ["EMAM", "Empresa Municipal de Apoio e Manutenção", "20.721.999/0001-75"],
        ["PRODAUB", "Processamento de Dados de Uberlândia", "25.523.986/0001-05"],
        ["IPREMU", "Instituto de Previdência dos Servidores", "22.224.976/0001-80"],
        ["FERUB", "Fundação de Excelência Rural", "21.238.316/0001-96"],
        ["ARESAN", "Agência de Regulação de Saneamento Básico", "46.414.316/0001-20"],
    ]
    story.append(table(orgaos, [1.8 * cm, 8.5 * cm, 6.2 * cm]))

    story.append(Spacer(1, 0.3 * cm))
    story.append(p("Unidades compradoras no Compras.gov:", s["body"]))
    story.append(
        table(
            [
                ["Código", "Entidade"],
                ["926922", "Prefeitura de Uberlândia"],
                ["926287", "DMAE"],
                ["926038", "FUTEL"],
            ],
            [3 * cm, 13.5 * cm],
        )
    )

    # 6
    story.append(p("6. Operacional 1 — Acompanhamento de licitações", s["h1"]))
    etapas = [
        (
            "6.1 Coleta na fonte municipal",
            "Colaboradores acessam weblicitacoes.uberlandia.mg.gov.br. O Diário Oficial complementa com "
            "demonstrativos fiscais de contrato. O portal restringe acesso automatizado (HTTP 403), "
            "indicando uso via navegador.",
        ),
        (
            "6.2 Planilha Cronograma",
            "Informações extraídas alimentam planilha interna de registro e agenda. Estrutura de colunas "
            "e regras ainda não documentadas formalmente.",
        ),
        (
            "6.3 Acompanhamento detalhado",
            "A partir do Cronograma, gera-se controle analítico por processo (situação, objeto, valores).",
        ),
        (
            "6.4 Compras.gov",
            "Consulta paralela em cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras, "
            "filtrando por unidade compradora.",
        ),
        (
            "6.5 Análise e ações",
            "Análises contextuais contínuas; ações de controle social conforme cada caso.",
        ),
        (
            "6.6 Consolidação quadrimestral",
            "Apresentações à sociedade (ex.: 1º quadrimestre/2026 em 17/06/2026, 17h, via Teams).",
        ),
        (
            "6.7 Painéis Power BI",
            "Dois painéis públicos consolidam licitações, porém com atraso de atualização observado.",
        ),
    ]
    for title, text in etapas:
        story.append(p(title, s["h2"]))
        story.append(p(text, s["body"]))

    story.append(PageBreak())

    # 7
    story.append(p("7. Operacional 2 — Acompanhamento de vereadores", s["h1"]))
    story.append(
        table(
            [
                ["Dimensão", "O que se busca entender"],
                ["Redes sociais", "Publicações, posicionamentos, fiscalizações divulgadas"],
                ["Projetos", "Projetos de lei e requerimentos submetidos"],
                ["Fiscalizações", "Ações de fiscalização do executivo"],
                ["Presença", "Participação em sessões (listas de presença)"],
            ],
            [4 * cm, 12.5 * cm],
        )
    )
    story.append(Spacer(1, 0.2 * cm))
    story.append(
        p(
            "O Sistema OSB nacional mantém o projeto “Acompanhe Seu Vereador”. Não está confirmado se "
            "Uberlândia usa essa plataforma ou processos próprios.",
            s["body"],
        )
    )
    story.append(p("Lacunas: escopo de vereadores, redes monitoradas, frequência, ferramentas internas, integração com licitações.", s["body"]))

    # 8
    story.append(p("8. Fontes de dados e sistemas envolvidos", s["h1"]))
    for item in [
        "Weblicitações Uberlândia — licitações municipais.",
        "Compras.gov / ComprasNet — pregões, dispensas, inexigibilidades federais.",
        "Diário Oficial municipal — atos, editais, contratos.",
        "Portal da Transparência — possível fonte complementar (não mapeada em detalhe).",
        "Power BI — visualização agregada com defasagem observada.",
        "Redes sociais e site da Câmara — frente de vereadores.",
    ]:
        story.append(p(f"• {item}", s["bullet"]))

    # 9
    story.append(p("9. Exemplo do tipo de dado licitatório", s["h1"]))
    story.append(
        p(
            "Licitações de 2026 incluem ARESAN (certificados digitais, assessoria técnica — R$ 226.080,00), "
            "DMAE (pregões para materiais de obras, dispensas diversas), modalidades como Pregão Eletrônico, "
            "Compra Direta, Dispensa e Inexigibilidade, em situações “Em andamento” e “Concluído”. "
            "Isso ilustra a diversidade de órgãos e volumes que a organização acompanha manualmente.",
            s["body"],
        )
    )

    # 10
    story.append(p("10. Voluntariado e dinâmica organizacional", s["h1"]))
    for item in [
        "Movido por voluntários; manutenção de quadro ativo é desafio reconhecido.",
        "Voluntariado e doações (PIX: CNPJ da organização) via site.",
        "Parceria com CDL Uberlândia e Fundação CDL.",
        "Prestação de contas quadrimestral como ciclo institucional central.",
    ]:
        story.append(p(f"• {item}", s["bullet"]))

    # 11
    story.append(p("11. O que ainda precisa ser esclarecido", s["h1"]))
    perguntas = [
        "Qual frente tem maior demanda para contribuição acadêmica?",
        "Responsáveis por cada operacional e tempo dedicado.",
        "Estrutura das planilhas Cronograma e Acompanhamento.",
        "Volume médio de licitações acompanhadas.",
        "Critérios de inclusão de processos no acompanhamento.",
        "Ações concretas após cada análise.",
        "Relação entre planilhas internas e Power BI.",
        "Uso de APIs ou exportações automáticas.",
        "Detalhamento da frente de vereadores.",
        "Expectativas da organização quanto ao extensionista.",
        "Requisitos formais da UNIUBE.",
        "Endereço e canal oficial preferencial.",
    ]
    for i, q in enumerate(perguntas, 1):
        story.append(p(f"{i}. {q}", s["bullet"]))

    story.append(PageBreak())

    # 12
    story.append(p("12. Referências consultadas", s["h1"]))
    refs = [
        ("OSB Uberlândia", "https://www.osbrasiluberlandia.org/"),
        ("OSB Institucional", "https://www.osbrasiluberlandia.org/about-4"),
        ("Sistema OSB nacional", "https://www.osbrasil.org.br/"),
        ("Weblicitações", "https://weblicitacoes.uberlandia.mg.gov.br/"),
        ("Compras.gov", "https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras"),
        ("Prefeitura — DMAE", "https://www.uberlandia.mg.gov.br/prefeitura/orgaos-municipais/dmae/o-dmae/"),
        ("Prefeitura — ARESAN", "https://www.uberlandia.mg.gov.br/prefeitura/secretarias/aresan/atuacao-da-aresan/"),
        ("Estudo UFU sobre OSU", "https://repositorio.ufu.br/handle/123456789/21743"),
    ]
    story.append(table([["Recurso", "URL"]] + list(refs), [4.5 * cm, 12 * cm]))

    # 13
    story.append(p("13. Síntese do entendimento atual", s["h1"]))
    story.append(
        p(
            "O Observatório Social do Brasil — Uberlândia é organização civil consolidada na rede nacional "
            "de controle social, com foco em monitoramento de licitações/contratos municipais e, em segundo "
            "plano, acompanhamento de vereadores. O operacional é essencialmente manual: portais públicos, "
            "planilhas internas, análise contínua e consolidação quadrimestral. Painéis Power BI existem, "
            "mas com defasagem.",
            s["body"],
        )
    )
    story.append(
        p(
            "Para Sistemas de Informação, o cenário apresenta dados públicos, processos repetitivos e "
            "múltiplas fontes — mas <b>nenhuma linha de contribuição foi acordada</b>. O passo imediato "
            "é aprofundar o diálogo com a equipe da OSB antes de qualquer definição de escopo.",
            s["body"],
        )
    )

    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    story.append(
        p(
            "Documento de caráter preliminar. Sujeito a revisões conforme novas informações forem obtidas.",
            s["small"],
        )
    )

    return story


def main():
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Relatório Inicial de Contexto — Trabalho Extensionista",
        author="Diôgo Ferreira Moura",
    )
    doc.build(build_story(styles), onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"PDF gerado: {OUTPUT}")


if __name__ == "__main__":
    main()
