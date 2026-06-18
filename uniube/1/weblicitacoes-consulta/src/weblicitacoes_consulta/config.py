from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = PROJECT_ROOT / "output"
DB_PATH = DATA_DIR / "weblicitacoes.db"

BASE_URL = "https://weblicitacoes.uberlandia.mg.gov.br"
CONSULTA_URL = (
    f"{BASE_URL}/weblicitacoes/f/n/licitacoescon"
    "?evento=y&descricaoEmpresaLicitacao=1&modoJanelaPlc=popup"
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Akamai bloqueia headless em alguns ambientes; use False por padrão.
HEADLESS_DEFAULT = False
PAGE_SIZE = 100
REQUEST_DELAY_SEC = 1.5

EMPRESAS: dict[str, str] = {
    "0": "Prefeitura Municipal de Uberlandia",
    "1": "Departamento Municipal de Agua e Esgoto - DMAE",
    "2": "Instituto Previdência dos Servidores Públicos do Município de Uberlândia - IPREMU",
    "3": "Processamento de dados de Uberlandia - PRODAUB",
    "4": "Fundação Uberlandense de Esporte e Lazer - FUTEL",
    "5": "Fundação de Excelência Rural de Uberlândia - FERUB",
    "6": "Empresa Municipal de Apoio e Manutenção - EMAM",
    "7": "Fundação Saúde do Município de Uberlândia - FUNDASUS",
    "8": "CÂMARA MUNICIPAL DE UBERLANDIA",
    "9": "Agência de Regulação dos Serviços de Saneamento Básico de Uberlândia - ARESAN",
}

DATABASE_URL = f"sqlite:///{DB_PATH}"
