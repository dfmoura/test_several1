import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "licitacoes.db"

APP_PORT = int(os.environ.get("APP_PORT", "8095"))

BASE_URL = "https://weblicitacoes.uberlandia.mg.gov.br"
CONSULTA_URL = (
    f"{BASE_URL}/weblicitacoes/f/n/licitacoescon"
    "?evento=y&descricaoEmpresaLicitacao=1&modoJanelaPlc=popup"
)

EMPRESAS: dict[str, str] = {
    "0": "Prefeitura Municipal de Uberlândia",
    "1": "DMAE",
    "2": "IPREMU",
    "3": "PRODAUB",
    "4": "FUTEL",
    "5": "FERUB",
    "6": "EMAM",
    "7": "FUNDASUS",
    "8": "Câmara Municipal",
    "9": "ARESAN",
}

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

DELAY_SEC = 2.0
HEADLESS = os.environ.get("HEADLESS", "false").lower() in ("1", "true", "yes")
DETALHE_SCRAPE = os.environ.get("DETALHE_SCRAPE", "false").lower() in ("1", "true", "yes")

# --- Compras.gov — API Dados Abertos (PNCP / Lei 14.133) ---
COMPRAS_PNCP_BASE_URL = "https://dadosabertos.compras.gov.br"
COMPRAS_PNCP_ENDPOINT = (
    f"{COMPRAS_PNCP_BASE_URL}/modulo-contratacoes/1_consultarContratacoes_PNCP_14133"
)
COMPRAS_PNCP_ITENS_ENDPOINT = (
    f"{COMPRAS_PNCP_BASE_URL}/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133"
)
COMPRAS_PNCP_ITENS_ID_ENDPOINT = (
    f"{COMPRAS_PNCP_BASE_URL}/modulo-contratacoes/2.1_consultarItensContratacoes_PNCP_14133_Id"
)
COMPRAS_PNCP_PAGE_SIZE = int(os.environ.get("COMPRAS_PNCP_PAGE_SIZE", "500"))
COMPRAS_PNCP_ITENS_PAGE_SIZE = int(os.environ.get("COMPRAS_PNCP_ITENS_PAGE_SIZE", "100"))
COMPRAS_PNCP_MAX_DIAS_PERIODO = 365
# Itens da contratação: consultas anuais costumam exceder 90s na API federal.
COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS = int(
    os.environ.get("COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS", "90")
)
COMPRAS_PNCP_HTTP_TIMEOUT_SEC = float(os.environ.get("COMPRAS_PNCP_HTTP_TIMEOUT_SEC", "180"))
COMPRAS_PNCP_MAX_RETRIES = int(os.environ.get("COMPRAS_PNCP_MAX_RETRIES", "3"))
COMPRAS_PNCP_REQUEST_DELAY_SEC = float(os.environ.get("COMPRAS_PNCP_DELAY_SEC", "0.35"))

# UASGs Uberlândia (base.txt)
UNIDADES_COMPRADORAS: dict[str, str] = {
    "926922": "PMU — Prefeitura Municipal",
    "926287": "DMAE",
    "926038": "FUTEL",
    "931351": "ARESAN",
    "930403": "FERUB",
    "929315": "EMAM",
    "929301": "IPREMU",
    "925010": "Câmara Municipal",
}

# --- Power BI / Dados Abertos PMU ---
POWERBI_DIR = DATA_DIR / "powerbi"
POWERBI_PMU_BASE = "https://dadosabertospmu.uberlandia.mg.gov.br"
POWERBI_PANEL_URL = (
    "https://app.powerbi.com/view?r=eyJrIjoiMzk4ZWFhYmYtMjdjMC00Yzk4LTkxNTAt"
    "NzM2MzM0YTAwYWE0IiwidCI6IjdmNWY0YjY0LTcwZDAtNDMwZi1iMDc2LWE0ODg2MmI4NjUxOCJ9"
)

POWERBI_DATASETS: dict[str, dict[str, str]] = {
    "licitacoes": {
        "nome": "Licitações",
        "endpoint": "/exportalicitacoes/{ano}",
        "csv_nome": "Licitacoes{ano}.csv",
    },
    "contratos": {
        "nome": "Contratos",
        "endpoint": "/exportacontratos/{ano}",
        "csv_nome": "Contratos{ano}.csv",
    },
    "gestores": {
        "nome": "Gestores e fiscais",
        "endpoint": "/retornagestorescontratos",
        "csv_nome": "GestoresContratos.csv",
    },
}

# codigoModalidade na API (1–12) — conforme base.txt / PNCP
MODALIDADES_PNCP: dict[int, str] = {
    1: "Leilão",
    2: "Diálogo Competitivo",
    3: "Concurso",
    4: "Concorrência - Eletrônica",
    5: "Concorrência - Presencial",
    6: "Pregão - Eletrônico",
    7: "Pregão - Presencial",
    8: "Dispensa de Licitação",
    9: "Inexigibilidade",
    10: "Manifestação de Interesse",
    11: "Pré-qualificação",
    12: "Credenciamento",
}
