#!/usr/bin/env python3
"""Generate English version of Diogo Ferreira Moura's CV."""

from fpdf import FPDF


class CV(FPDF):
    FONT = "DejaVu"

    def header(self):
        pass

    def footer(self):
        pass

    def setup_fonts(self):
        self.add_font("DejaVu", "", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
        self.add_font("DejaVu", "B", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
        self.add_font("DejaVu", "I", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf")

    def section_title(self, title: str):
        self.set_font(self.FONT, "B", 11)
        self.set_text_color(30, 30, 30)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(180, 180, 180)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(2)

    def bullet(self, text: str):
        self.set_font(self.FONT, "", 10)
        self.set_text_color(50, 50, 50)
        indent = self.l_margin + 4
        width = self.w - self.r_margin - indent
        self.set_x(indent)
        self.multi_cell(width, 5, f"- {text}")


def build_pdf(output_path: str):
    pdf = CV()
    pdf.setup_fonts()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_margins(20, 18, 20)
    f = pdf.FONT

    # Name & title
    pdf.set_font(f, "B", 18)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 10, "DIOGO FERREIRA MOURA", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.set_font(f, "", 12)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 7, "Back-End Developer", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.set_font(f, "", 10)
    pdf.cell(
        0,
        6,
        "+55 (34) 9 9990.9660  |  diogomou@gmail.com  |  GitHub",
        new_x="LMARGIN",
        new_y="NEXT",
        align="C",
    )
    pdf.ln(6)

    # Education
    pdf.section_title("Education")
    pdf.set_font(f, "B", 10)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 5, "Information Systems – Uniube", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(f, "", 10)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 5, "Start: Nov/2022 - Expected completion: Nov/2026", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font(f, "B", 10)
    pdf.cell(0, 5, "Business Administration (Bachelor) – Esamc Uberlândia", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(f, "", 10)
    pdf.cell(0, 5, "2007", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Technical Skills
    pdf.section_title("Technical Skills")
    skills = [
        "Distributed tracing with Spring Sleuth, using TraceID for correlation between "
        "microservices and SpanID for exclusive APIs.",
        "Monitoring and log analysis via Splunk for problem identification and resolution.",
        "Circuit Breaker configuration for resilience in microservices.",
        "Integration and asynchronous message consumption with Apache Kafka.",
        "Performance optimization and memory management with GC tuning.",
    ]
    for skill in skills:
        pdf.bullet(skill)
    pdf.ln(2)
    pdf.set_font(f, "B", 10)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 5, "Database:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(f, "", 10)
    pdf.cell(0, 5, "Oracle Database (procedures, triggers, SQL, PL/SQL)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(f, "B", 10)
    pdf.cell(0, 5, "Development:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(f, "", 10)
    pdf.cell(0, 5, "Java/Spring, JavaScript, Python, Kotlin", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(f, "B", 10)
    pdf.cell(0, 5, "Cloud Computing:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(f, "", 10)
    pdf.cell(0, 5, "AWS (Cloud Practitioner)", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(f, "B", 10)
    pdf.cell(0, 5, "BI Tools:", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(f, "", 10)
    pdf.cell(0, 5, "Power BI, Quick.", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Certifications
    pdf.section_title("Certifications")
    pdf.set_font(f, "", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(
        0,
        5,
        "Oracle Academy: Foundations (2023), DP Database Programming with SQL Learner (2024)",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.cell(0, 5, "AWS Jumpstart: Cloud Practitioner (2024)", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Languages
    pdf.section_title("Languages")
    pdf.set_font(f, "", 10)
    pdf.cell(
        0,
        5,
        "Fluent English – International experience in London (Mar/2018)",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(4)

    # Professional Experience
    pdf.section_title("Professional Experience")

    jobs = [
        (
            "Trigger Data Intelligence – IT Analyst (Contractor)",
            "Oct/2023 – Present",
            [
                "Customization and development of features on Sankhya ERP",
                "Oracle development (procedures, triggers, SQL queries)",
                "Application development in Java, JavaScript, Python, and Kotlin",
            ],
        ),
        (
            "JC Rações – IT Analyst",
            "Feb/2023 – Oct/2023",
            [
                "Sankhya ERP customization and application development on Oracle Database",
                "Solution development in Java, JavaScript, Python, and Kotlin",
            ],
        ),
        (
            "Força Tarefa – Financial Supervisor",
            "Aug/2022 – Feb/2023",
            ["Sankhya ERP implementation"],
        ),
        (
            "Sodrugestvo (Aliança Agrícola do Cerrado) – Senior Treasury Analyst",
            "Jan/2021 – Jul/2021",
            ["Cash flow management and financial operations analysis"],
        ),
        (
            "VL Distillery & Import – Foreign Trade Analyst",
            "Mar/2019 – Jul/2020",
            ["Import process management and domestic market pricing"],
        ),
        (
            "Cargill Agrícola S.A. – Financial Assistant",
            "Sep/2016 – Oct/2018",
            ["Migration of foreign trade financial activities"],
        ),
        (
            "Censo – Pesquisa e Opinião – Self-Employed Entrepreneur",
            "Aug/2008 – Aug/2016",
            ["Market research and innovation studies (Prime Program Project)"],
        ),
    ]

    for title, period, bullets in jobs:
        pdf.set_font(f, "B", 10)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 5, title, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(f, "I", 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 5, period, new_x="LMARGIN", new_y="NEXT")
        for item in bullets:
            pdf.bullet(item)
        pdf.ln(2)

    # Other Experience
    pdf.section_title("Other Experience")
    others = [
        "Hewitt Associates: Financial Assistant (Jun/2006 – Jul/2008)",
        "Banco da Mulher: Credit Agent (Jan/2005 – Apr/2006)",
        "Cargill Agrícola S.A.: Office Assistant (Oct/2000 – Oct/2004)",
    ]
    for item in others:
        pdf.set_font(f, "", 10)
        pdf.set_text_color(50, 50, 50)
        pdf.cell(0, 5, item, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_font(f, "B", 10)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 5, "GitHub Portfolio", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.output(output_path)


if __name__ == "__main__":
    output = "/home/dfmoura/Documents/test_several1/trigger/16/novo_curriculum1-1_en.pdf"
    build_pdf(output)
    print(f"Generated: {output}")
