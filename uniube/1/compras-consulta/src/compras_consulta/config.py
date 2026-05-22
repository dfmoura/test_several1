from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = PROJECT_ROOT / "output"
OPENAPI_PATH = DATA_DIR / "api-docs.json"

BASE_URL = "https://dadosabertos.compras.gov.br"
DEFAULT_TIMEOUT = 90.0
USER_AGENT = (
    "ComprasConsulta/2.0 (dados-abertos; +https://dadosabertos.compras.gov.br)"
)

# Rotas que exigem autenticação (não são dados abertos públicos)
AUTH_PATH_PREFIXES = ("/alice/", "/usuarios/")
