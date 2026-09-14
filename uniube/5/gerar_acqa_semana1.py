#!/usr/bin/env python3
"""ACQA Semana 1: Windows x Linux (gerenciamento, seguranca e migracao)."""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path("/home/dfmoura/Documents/test_several1/uniube/5")
OUT_PDF = ROOT / "ACQA_Semana1_Windows_Linux_Diogo_Ferreira_Moura.pdf"

NAVY = colors.HexColor("#1F4E79")
GRAY = colors.HexColor("#4A4A4A")


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_inst": ParagraphStyle(
            "CoverInst", parent=base["Normal"], fontName="Times-Bold",
            fontSize=13, leading=17, alignment=TA_CENTER, textColor=NAVY, spaceAfter=2,
        ),
        "cover_sub": ParagraphStyle(
            "CoverSub", parent=base["Normal"], fontName="Times-Roman",
            fontSize=12, leading=16, alignment=TA_CENTER, spaceAfter=2,
        ),
        "cover_comp": ParagraphStyle(
            "CoverComp", parent=base["Normal"], fontName="Times-Italic",
            fontSize=11, leading=15, alignment=TA_CENTER, textColor=GRAY, spaceAfter=4,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle", parent=base["Normal"], fontName="Times-Bold",
            fontSize=16, leading=22, alignment=TA_CENTER, textColor=NAVY, spaceAfter=8,
        ),
        "cover_author": ParagraphStyle(
            "CoverAuthor", parent=base["Normal"], fontName="Times-Roman",
            fontSize=12, leading=16, alignment=TA_CENTER, spaceAfter=2,
        ),
        "h1": ParagraphStyle(
            "H1", parent=base["Heading1"], fontName="Times-Bold",
            fontSize=13, leading=17, spaceBefore=14, spaceAfter=8, textColor=NAVY,
        ),
        "h2": ParagraphStyle(
            "H2", parent=base["Heading2"], fontName="Times-Bold",
            fontSize=12, leading=16, spaceBefore=10, spaceAfter=6,
            textColor=colors.HexColor("#2c5282"),
        ),
        "body": ParagraphStyle(
            "Body", parent=base["Normal"], fontName="Times-Roman",
            fontSize=12, leading=18, alignment=TA_JUSTIFY, firstLineIndent=1.25 * cm, spaceAfter=8,
        ),
        "quote": ParagraphStyle(
            "Quote", parent=base["Normal"], fontName="Times-Italic",
            fontSize=11, leading=16, alignment=TA_JUSTIFY,
            leftIndent=1.2 * cm, rightIndent=0.8 * cm, spaceBefore=4, spaceAfter=4,
        ),
        "quote_src": ParagraphStyle(
            "QuoteSrc", parent=base["Normal"], fontName="Times-Roman",
            fontSize=10, leading=13, alignment=TA_RIGHT, leftIndent=1.2 * cm,
            spaceAfter=10, textColor=GRAY,
        ),
        "caption": ParagraphStyle(
            "Caption", parent=base["Normal"], fontName="Times-Bold",
            fontSize=10, leading=13, alignment=TA_CENTER, spaceBefore=6, spaceAfter=2,
        ),
        "fonte": ParagraphStyle(
            "Fonte", parent=base["Normal"], fontName="Times-Roman",
            fontSize=9, leading=12, alignment=TA_CENTER, spaceAfter=10, textColor=GRAY,
        ),
        "ref": ParagraphStyle(
            "Ref", parent=base["Normal"], fontName="Times-Roman",
            fontSize=11, leading=15, alignment=TA_JUSTIFY,
            leftIndent=1.25 * cm, firstLineIndent=-1.25 * cm, spaceAfter=8,
        ),
        "cell": ParagraphStyle(
            "Cell", parent=base["Normal"], fontName="Times-Roman",
            fontSize=9, leading=12, alignment=TA_LEFT,
        ),
        "cell_c": ParagraphStyle(
            "CellC", parent=base["Normal"], fontName="Times-Roman",
            fontSize=9, leading=12, alignment=TA_LEFT,
        ),
        "cell_h": ParagraphStyle(
            "CellH", parent=base["Normal"], fontName="Times-Bold",
            fontSize=9, leading=12, alignment=TA_CENTER, textColor=colors.white,
        ),
        "meta": ParagraphStyle(
            "Meta", parent=base["Normal"], fontName="Times-Roman",
            fontSize=11, leading=15, alignment=TA_LEFT, spaceAfter=3,
        ),
    }


def P(text, style):
    return Paragraph(text, style)


def abnt_table(headers, rows, col_widths, s):
    head = [P(h, s["cell_h"]) for h in headers]
    body = []
    for row in rows:
        line = []
        for i, val in enumerate(row):
            st = s["cell"] if i == 0 else s["cell_c"]
            line.append(P(str(val), st))
        body.append(line)
    t = Table([head] + body, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f7fb")]),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def later_pages(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(NAVY)
    canvas.setLineWidth(0.6)
    canvas.line(3 * cm, A4[1] - 1.8 * cm, A4[0] - 2 * cm, A4[1] - 1.8 * cm)
    canvas.setFont("Times-Italic", 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(
        3 * cm, A4[1] - 1.65 * cm,
        "UNIUBE  ACQA 1  Administracao de SO de Redes II",
    )
    canvas.line(3 * cm, 1.8 * cm, A4[0] - 2 * cm, 1.8 * cm)
    canvas.setFont("Times-Roman", 8)
    canvas.drawString(3 * cm, 1.45 * cm, "Diogo Ferreira Moura  RA 1030125-2")
    canvas.drawRightString(A4[0] - 2 * cm, 1.45 * cm, f"{doc.page}")
    canvas.restoreState()


def first_page(canvas, doc):
    canvas.saveState()
    canvas.restoreState()


QUADRO = [
    [
        "Interface de administra&ccedil;&atilde;o",
        "Server Manager, MMC, PowerShell e consoles gr&aacute;ficas (ADUC, Gerenciador de Disco).",
        "Linha de comando (shell), arquivos em /etc e SSH. Tela gr&aacute;fica s&oacute; se instalar.",
    ],
    [
        "Contas e diret&oacute;rio",
        "Usu&aacute;rios locais ou dom&iacute;nio Active Directory, com pol&iacute;ticas de grupo (GPO).",
        "Arquivos /etc/passwd e /etc/group. D&aacute; para ligar no AD com Samba, SSSD ou LDAP.",
    ],
    [
        "Permiss&otilde;es de arquivo",
        "ACL do NTFS (v&aacute;rios usu&aacute;rios/grupos, heran&ccedil;a, permiss&otilde;es de compartilhamento SMB).",
        "Modelo POSIX (rwx para dono, grupo e outros); ACL estendida (setfacl) quando necess&aacute;rio.",
    ],
    [
        "Instala&ccedil;&atilde;o de software",
        "Assistentes .msi/.exe, Adicionar fun&ccedil;&otilde;es e recursos, Windows Update e reposit&oacute;rios Microsoft.",
        "Gerenciadores de pacotes (apt, dnf, yum, zypper) e reposit&oacute;rios da distribui&ccedil;&atilde;o.",
    ],
    [
        "Atualiza&ccedil;&atilde;o e patch",
        "Windows Update ou WSUS, em geral no ciclo mensal da Microsoft.",
        "apt, dnf ou yum, no dia que o administrador combinou.",
    ],
    [
        "Modelo de privil&eacute;gio",
        "Administrador e UAC; servi&ccedil;os com contas espec&iacute;ficas.",
        "root e sudo. Usu&aacute;rio comum no dia a dia.",
    ],
    [
        "Superf&iacute;cie de ataque",
        "Mais alvo de malware por ter mais m&aacute;quina no escrit&oacute;rio. Defender e GPO ajudam.",
        "Menos v&iacute;rus de desktop. Quebra mais por SSH aberto, Samba mal fechado ou painel velho.",
    ],
    [
        "Custo de licen&ccedil;a",
        "Licen&ccedil;a do servidor e, na pr&aacute;tica, CAL por usu&aacute;rio ou m&aacute;quina.",
        "Distribui&ccedil;&atilde;o livre sem custo de SO. O gasto vai para treinamento e suporte.",
    ],
]


REFS = [
    "FERREIRA, L. <i>Administra&ccedil;&atilde;o de Servidores Microsoft</i>. S&atilde;o Paulo: Brasport, [s.d.].",
    "LEDUR, Cleverson Lopes. <i>Sistemas Operacionais: funcionamento e aplica&ccedil;&otilde;es</i>. "
    "Material did&aacute;tico da disciplina Administra&ccedil;&atilde;o de Sistemas Operacionais de Redes II. "
    "Uberl&acirc;ndia: Universidade de Uberaba, [s.d.].",
    "MICROSOFT. <i>Windows Server</i>. Documenta&ccedil;&atilde;o oficial. Dispon&iacute;vel em: "
    "https://learn.microsoft.com/pt-br/windows-server/. Acesso em: 13 set. 2026.",
    "SAMBA TEAM. <i>Samba documentation: File sharing and permissions</i>. Dispon&iacute;vel em: "
    "https://www.samba.org/samba/docs/. Acesso em: 13 set. 2026.",
    "SILBERSCHATZ, A.; GALVIN, P. B.; GAGNE, G. <i>Sistemas Operacionais</i>. 9. ed. "
    "S&atilde;o Paulo: Pearson, [s.d.]. Cap. 2 (estrutura dos sistemas operacionais).",
    "TANENBAUM, Andrew S.; BOS, Herbert. <i>Sistemas Operacionais Modernos</i>. 4. ed. "
    "S&atilde;o Paulo: Pearson, 2016.",
]


def build_pdf() -> None:
    s = styles()
    story = []

    story.append(Spacer(1, 1.6 * cm))
    story.append(P("UNIVERSIDADE DE UBERABA", s["cover_inst"]))
    story.append(P("UNIUBE", s["cover_sub"]))
    story.append(Spacer(1, 0.25 * cm))
    story.append(P("Curso de Sistemas de Informa&ccedil;&atilde;o", s["cover_sub"]))
    story.append(P("Polo Uberl&acirc;ndia", s["cover_sub"]))
    story.append(Spacer(1, 2.0 * cm))
    story.append(P("Avalia&ccedil;&atilde;o Continuada: Quest&atilde;o Aberta (ACQA)", s["cover_comp"]))
    story.append(Spacer(1, 0.35 * cm))
    story.append(P(
        "Diferen&ccedil;as de gerenciamento e seguran&ccedil;a entre Windows e Linux "
        "e impactos da migra&ccedil;&atilde;o de um servidor de arquivos",
        s["cover_title"],
    ))
    story.append(P(
        "949018 - Administra&ccedil;&atilde;o de Sistemas Operacionais de Redes II",
        s["cover_comp"],
    ))
    story.append(Spacer(1, 2.2 * cm))
    story.append(P("Di&ocirc;go Ferreira Moura", s["cover_author"]))
    story.append(P("RA 1030125-2", s["cover_author"]))
    story.append(Spacer(1, 3.0 * cm))
    story.append(P("Uberl&acirc;ndia / MG", s["cover_author"]))
    story.append(P("Setembro de 2026", s["cover_author"]))
    story.append(PageBreak())

    story.append(P("1 IDENTIFICA&Ccedil;&Atilde;O DA ATIVIDADE", s["h1"]))
    story.append(P(
        "<b>Institui&ccedil;&atilde;o:</b> Universidade de Uberaba (UNIUBE), Faculdade Uniube",
        s["meta"],
    ))
    story.append(P("<b>Curso:</b> Sistemas de Informa&ccedil;&atilde;o", s["meta"]))
    story.append(P(
        "<b>Disciplina:</b> 949018 - Administra&ccedil;&atilde;o de Sistemas Operacionais de Redes II",
        s["meta"],
    ))
    story.append(P(
        "<b>Atividade:</b> ACQA 1, Avalia&ccedil;&atilde;o Continuada Quest&atilde;o Aberta (20 pontos)",
        s["meta"],
    ))
    story.append(P("<b>Per&iacute;odo:</b> 08/08/2026 a 19/09/2026", s["meta"]))
    story.append(P(
        "<b>Aluno:</b> Di&ocirc;go Ferreira Moura &nbsp;&nbsp; <b>RA:</b> 1030125-2",
        s["meta"],
    ))
    story.append(P("<b>Polo:</b> Uberl&acirc;ndia", s["meta"]))

    story.append(P("2 ENUNCIADO", s["h1"]))
    story.append(P(
        "A escolha entre Windows e Linux em servidores e ambientes corporativos depende de "
        "fatores como custo, seguran&ccedil;a, gerenciamento e facilidade de uso. Ambas as "
        "plataformas apresentam vantagens e limita&ccedil;&otilde;es.",
        s["quote"],
    ))
    story.append(P(
        "Com base no estudo comparativo apresentado por Cleverson Lopes Ledur (Semana 03), "
        "discorra sobre as diferen&ccedil;as de gerenciamento e seguran&ccedil;a entre os "
        "sistemas operacionais Windows e Linux. Analise o impacto dessas diferen&ccedil;as "
        "na manuten&ccedil;&atilde;o e opera&ccedil;&atilde;o de redes corporativas. Depois "
        "disso, responda como uma pequena empresa optou por migrar seu servidor de arquivos "
        "de Windows para Linux. Quais mudan&ccedil;as pr&aacute;ticas no gerenciamento de "
        "permiss&otilde;es e na instala&ccedil;&atilde;o de aplicativos o administrador encontrar&aacute;?",
        s["quote"],
    ))
    story.append(P(
        "LEDUR, Cleverson Lopes. Sistemas Operacionais: funcionamento e aplica&ccedil;&otilde;es.",
        s["quote_src"],
    ))

    story.append(P("3 DESENVOLVIMENTO", s["h1"]))
    story.append(P("3.1 Introdu&ccedil;&atilde;o", s["h2"]))
    story.append(P(
        "Quando a empresa escolhe Windows ou Linux para servidor, a tela &eacute; o que "
        "menos importa. Muda o jeito de criar usu&aacute;rio, de aplicar corre&ccedil;&atilde;o, "
        "de soltar pasta na rede e de reagir quando alguma coisa quebra. O Ledur, no "
        "comparativo da Semana 03, mostra isso com clareza: os dois sistemas fazem o "
        "trabalho de SO (processo, mem&oacute;ria, dispositivo e arquivo), mas o "
        "administrador n&atilde;o opera os dois do mesmo jeito. Silberschatz, Galvin e "
        "Gagne tratam a estrutura do sistema como aquilo que define o que o operador "
        "enxerga. Eu parti dessa leitura e do que a disciplina j&aacute; mostrou de "
        "Windows Server para responder a pergunta: diferen&ccedil;a de gerenciamento e "
        "de seguran&ccedil;a, o efeito disso numa rede de empresa e, no caso pedido, o "
        "que muda de verdade quando o servidor de arquivo sai do Windows e vai para o Linux.",
        s["body"],
    ))

    story.append(P("3.2 Diferen&ccedil;as de gerenciamento", s["h2"]))
    story.append(P(
        "No Windows Server a maior parte do dia a dia ainda passa por tela. Server Manager, "
        "console MMC, Active Directory Users and Computers. O PowerShell entrou forte, mas "
        "muita gente ainda resolve pasta pela aba Seguran&ccedil;a do Explorer, com heran&ccedil;a "
        "e compartilhamento. Se a rede tem dom&iacute;nio, usu&aacute;rio, grupo e GPO ficam "
        "no AD. Isso ajuda quem j&aacute; trabalha com Windows no escrit&oacute;rio. O outro "
        "lado &eacute; que a opera&ccedil;&atilde;o fica presa em papel de servidor, assistente "
        "de instala&ccedil;&atilde;o e Windows Update ou WSUS.",
        s["body"],
    ))
    story.append(P(
        "Linux &eacute; outro ritmo. Quase tudo mora em arquivo de texto em /etc. Usu&aacute;rio "
        "e grupo est&atilde;o em /etc/passwd, /etc/shadow e /etc/group. Servi&ccedil;o sobe "
        "com systemctl. O acesso remoto normal &eacute; SSH, n&atilde;o &aacute;rea gr&aacute;fica. "
        "Custa mais no come&ccedil;o porque precisa ler log e n&atilde;o tem bot&atilde;o para "
        "tudo. A vantagem que eu vejo &eacute; repetir a mesma m&aacute;quina com script, sem "
        "ficar clicado de novo em cada assistente. O Ledur trata isso como diferen&ccedil;a "
        "de funcionamento: no Unix quase tudo &eacute; arquivo e a permiss&atilde;o aparece "
        "na cara. No Windows muita decis&atilde;o fica escondida no assistente.",
        s["body"],
    ))
    story.append(P(
        "Licen&ccedil;a tamb&eacute;m pesa. Windows Server cobra o sistema e, na pr&aacute;tica, "
        "CAL. Linux de distribui&ccedil;&atilde;o livre n&atilde;o cobra o SO. O dinheiro vai "
        "para treinamento, suporte e tempo de teste. Em empresa pequena isso aparece na hora. "
        "Menos clique e mais servi&ccedil;o que o administrador precisa saber que est&aacute; "
        "ligado.",
        s["body"],
    ))

    story.append(P("3.3 Diferen&ccedil;as de seguran&ccedil;a", s["h2"]))
    story.append(P(
        "A seguran&ccedil;a come&ccedil;a na pasta, mas a regra n&atilde;o &eacute; igual. "
        "NTFS usa ACL. Uma pasta pode ter v&aacute;rias entradas para usu&aacute;rio e grupo: "
        "Leitura, Grava&ccedil;&atilde;o, Modificar, Controle total. Tem heran&ccedil;a. No "
        "compartilhamento SMB ainda tem um segundo corte. Vale o mais restritivo entre NTFS "
        "e share. O UAC segura a conta de administrador no dia a dia. No dom&iacute;nio, "
        "senha, bloqueio e Kerberos entram por GPO. Defender e o firewall do Windows fecham "
        "o pacote nativo.",
        s["body"],
    ))
    story.append(P(
        "Linux cl&aacute;ssico &eacute; POSIX. Dono, grupo e outros. rwx. chmod, chown, chgrp. "
        "&Eacute; mais simples. Tamb&eacute;m &eacute; mais limitado quando a empresa quer "
        "uma exce&ccedil;&atilde;o pontual, um usu&aacute;rio de fora do grupo com leitura "
        "numa pasta. A&iacute; entra setfacl e getfacl. Quem manda de verdade &eacute; o "
        "root. O caminho certo &eacute; usu&aacute;rio comum e sudo, com registro do comando. "
        "Tem ainda SELinux ou AppArmor, firewalld ou nftables, e update pelo reposit&oacute;rio. "
        "C&oacute;digo aberto n&atilde;o deixa o Linux seguro sozinho. S&oacute; deixa olhar "
        "o que est&aacute; rodando. Continua precisando de patch, de servi&ccedil;o desligado "
        "e de senha decente.",
        s["body"],
    ))
    story.append(P(
        "Windows leva mais malware e ransomware porque tem mais m&aacute;quina no "
        "escrit&oacute;rio. Linux de servidor quebra mais por SSH com senha fraca, Samba "
        "aberto ou painel web velho do que por v&iacute;rus de desktop. Os dois quebram se "
        "a equipe relaxar. A diferen&ccedil;a que o comparativo do Ledur aponta &eacute; o "
        "modelo de permiss&atilde;o e o jeito de aplicar corre&ccedil;&atilde;o, n&atilde;o "
        "um selo de invenc&iacute;vel.",
        s["body"],
    ))

    story.append(P(
        "3.4 Impacto na manuten&ccedil;&atilde;o e na opera&ccedil;&atilde;o de redes corporativas",
        s["h2"],
    ))
    story.append(P(
        "Na rede da empresa isso muda rotina e conta. Rede Windows ganha AD: um logon, GPO "
        "mapeando unidade e impressora, servidor de arquivo nativo em SMB. A equipe j&aacute; "
        "conhece. A licen&ccedil;a cresce com o n&uacute;mero de gente. Se o patch ou o backup "
        "falha, cai autentica&ccedil;&atilde;o e arquivo junto.",
        s["body"],
    ))
    story.append(P(
        "Servidor Linux sai mais barato de licen&ccedil;a e encaixa bem em virtualiza&ccedil;&atilde;o. "
        "O problema &eacute; o escrit&oacute;rio continuar Windows. A&iacute; precisa Samba. "
        "Se existir dom&iacute;nio, winbind ou SSSD para n&atilde;o criar senha duplicada. "
        "N&atilde;o tem aquele clique de &quot;pr&oacute;ximo, pr&oacute;ximo, concluir&quot; "
        "resolvendo a configura&ccedil;&atilde;o. Backup e atualiza&ccedil;&atilde;o ficam na "
        "m&atilde;o de quem administra.",
        s["body"],
    ))
    story.append(P(
        "O que mais pesa na manuten&ccedil;&atilde;o &eacute; a equipe. Pasta Everyone com "
        "Controle total no Windows &eacute; t&atilde;o ruim quanto SSH aberto com root por "
        "senha no Linux. Ledur e Silberschatz, lidos com o que a disciplina mostrou de "
        "Windows Server, deixam isso claro: muda a ferramenta. N&atilde;o muda a obriga&ccedil;&atilde;o "
        "de menor privil&eacute;gio, de log e de c&oacute;pia de seguran&ccedil;a. Empresa "
        "pequena olha o Linux para gastar menos. Olha o Windows para n&atilde;o brigar com "
        "o resto da rede Microsoft. Depende de quanta gente tem e do que j&aacute; est&aacute; "
        "instalado.",
        s["body"],
    ))

    story.append(P(
        "Quadro 1. Comparativo operacional Windows x Linux em servidor",
        s["caption"],
    ))
    story.append(abnt_table(
        ["Aspecto", "Windows Server", "Linux"],
        QUADRO,
        [3.6 * cm, 6.2 * cm, 6.2 * cm],
        s,
    ))
    story.append(P(
        "Fonte: elabora&ccedil;&atilde;o pr&oacute;pria a partir de Ledur; Silberschatz, "
        "Galvin e Gagne; e documenta&ccedil;&atilde;o Microsoft e Samba (2026).",
        s["fonte"],
    ))

    story.append(P(
        "3.5 Caso pr&aacute;tico: migra&ccedil;&atilde;o do servidor de arquivos de Windows para Linux",
        s["h2"],
    ))
    story.append(P(
        "Pego o exemplo da quest&atilde;o. Empresa pequena, servidor de arquivo no Windows "
        "h&aacute; anos. Pasta por setor: Administrativo, Financeiro, Comercial e uma pasta "
        "comum. As m&aacute;quinas dos usu&aacute;rios continuam Windows. A dire&ccedil;&atilde;o "
        "foi para Linux por causa da licen&ccedil;a e para aproveitar o hardware que j&aacute; "
        "tinha. Pode ser Debian, Ubuntu Server ou Rocky Linux. O recado para o usu&aacute;rio "
        "n&atilde;o muda: mapear a unidade e abrir o arquivo. O que muda &eacute; o trabalho "
        "de quem administra.",
        s["body"],
    ))

    story.append(P(
        "3.5.1 Mudan&ccedil;as pr&aacute;ticas no gerenciamento de permiss&otilde;es",
        s["h2"],
    ))
    story.append(P(
        "No Windows era tela. Criava G_Financeiro, G_Comercial, jogava o usu&aacute;rio no "
        "grupo pelo AD ou pelo Gerenciamento do Computador e na pasta punha NTFS: setor com "
        "Modificar, TI com Controle total. Quando a subpasta pedia regra diferente, "
        "desligava heran&ccedil;a. No share, Todos com Alterar e o NTFS segurava o resto.",
        s["body"],
    ))
    story.append(P(
        "No Linux a cabe&ccedil;a tem que ir para dono, grupo e modo. Pasta do financeiro "
        "com grupo financeiro, modo 2770. Dono e grupo gravam, o resto n&atilde;o entra. O "
        "bit SGID faz arquivo novo nascer no grupo da pasta. Os comandos s&atilde;o useradd, "
        "groupadd, usermod -aG, chown e chmod. setfacl s&oacute; quando a regra foge do "
        "grupo. A aba Seguran&ccedil;a do Explorer some no servidor. Se um analista do "
        "comercial precisa ler o financeiro, &eacute; ACL POSIX, n&atilde;o aquela ACE extra "
        "do NTFS.",
        s["body"],
    ))
    story.append(P(
        "Cliente Windows n&atilde;o fala POSIX nativo em SMB. Tem que instalar Samba e "
        "escrever o share em /etc/samba/smb.conf: path, valid users, write list, force group. "
        "Conta local com tdbsam ou winbind se quiser manter o login do dom&iacute;nio. Na "
        "pr&aacute;tica a pessoa sai de duas telas (share e NTFS) e passa a cuidar de Unix "
        "e Samba juntos. O erro que eu j&aacute; vi em migra&ccedil;&atilde;o &eacute; copiar "
        "o arquivo e esquecer dono e grupo. Ou o umask gera 644 e o setor inteiro perde "
        "grava&ccedil;&atilde;o.",
        s["body"],
    ))

    story.append(P(
        "3.5.2 Mudan&ccedil;as pr&aacute;ticas na instala&ccedil;&atilde;o de aplicativos",
        s["h2"],
    ))
    story.append(P(
        "No Windows a instala&ccedil;&atilde;o &eacute; assistente. Adicionar fun&ccedil;&otilde;es "
        "e recursos, um msi, Windows Update, servi&ccedil;o no services.msc. Backup de "
        "terceiro tamb&eacute;m chega com instalador. Clica, aceita, &agrave;s vezes reinicia.",
        s["body"],
    ))
    story.append(P(
        "No Linux &eacute; pacote. Debian ou Ubuntu: apt update e apt install samba "
        "samba-common-bin acl. Red Hat: dnf install samba samba-client acl. Depois &eacute; "
        "editar arquivo e dar systemctl enable --now smbd. Depend&ecirc;ncia vem do "
        "reposit&oacute;rio. Programa que s&oacute; existe em exe precisa de outro: rsync ou "
        "restic no backup, CUPS se tiver impressora, e cuidado com SSH. Update deixa de ser "
        "o clique do Windows Update. Vira janela combinada de apt upgrade ou dnf upgrade, "
        "olhando o que vai mudar.",
        s["body"],
    ))
    story.append(P(
        "Na empresa pequena o al&iacute;vio da licen&ccedil;a s&oacute; aparece depois que a "
        "equipe aprende o ritmo. No come&ccedil;o gasta tempo. Precisa anotar grupo, share "
        "e backup, porque a tela n&atilde;o cobra pend&ecirc;ncia. Se ningu&eacute;m documenta, "
        "a troca sai barata na licen&ccedil;a e cara no susto.",
        s["body"],
    ))

    story.append(P("4 CONCLUS&Atilde;O", s["h1"]))
    story.append(P(
        "Windows e Linux fazem o papel de sistema operacional. A diferen&ccedil;a est&aacute; "
        "em como se administra e como se fecha o acesso. Windows puxa console, AD, NTFS e o "
        "ciclo da Microsoft. Linux puxa shell, arquivo em /etc, POSIX e pacote da "
        "distribui&ccedil;&atilde;o. Na rede isso mexe em custo, em como a esta&ccedil;&atilde;o "
        "se conecta e em quem a empresa precisa ter na equipe. Backup e controle de pasta "
        "continuam obrigat&oacute;rios nos dois.",
        s["body"],
    ))
    story.append(P(
        "Na migra&ccedil;&atilde;o do servidor de arquivo, duas coisas mudam de verdade. "
        "Permiss&atilde;o: sai a ACL da tela do NTFS e entra chmod, chown, grupo Unix e "
        "Samba para o Windows do escrit&oacute;rio. Instala&ccedil;&atilde;o: sai o msi e o "
        "Server Manager e entra apt ou dnf, arquivo em /etc e systemctl. Se o administrador "
        "mapear grupo, testar o share e combinar o dia do patch antes de virar a chave, a "
        "troca faz sentido. &Eacute; o que o Ledur cobra: escolhe o sistema pelo uso, n&atilde;o "
        "pelo h&aacute;bito.",
        s["body"],
    ))

    story.append(P("REFER&Ecirc;NCIAS", s["h1"]))
    for r in REFS:
        story.append(P(r, s["ref"]))

    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        leftMargin=3.0 * cm,
        rightMargin=2.0 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        title="ACQA 1 - Windows e Linux: gerenciamento, seguranca e migracao",
        author="Diogo Ferreira Moura",
        subject="UNIUBE 949018 Administracao de Sistemas Operacionais de Redes II",
    )
    doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)
    print(f"PDF gerado: {OUT_PDF}")


if __name__ == "__main__":
    build_pdf()
