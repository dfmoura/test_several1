from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = PROJECT_ROOT / "output"
OPENAPI_PATH = DATA_DIR / "api-docs.json"

BASE_URL = "https://contratos.comprasnet.gov.br"
DEFAULT_TIMEOUT = 60.0
USER_AGENT = "ContratosConsulta/1.0 (consulta-publica; +https://contratos.comprasnet.gov.br/api/docs)"
