"""Configuração de ambiente — Fase 0 (casca operacional)."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Versão operacional (health / runbook). Manter alinhada ao FastAPI version.
APP_VERSION = os.environ.get("APP_VERSION", "1.0.0")
# Power BI é proibido — flag imutável (qualquer env ENABLE_POWER_BI=* é ignorada/rejeitada).
POWER_BI_ENABLED = False


def _carregar_dotenv() -> None:
    """Carrega .env local sem sobrescrever variáveis já exportadas (dev / Compose)."""
    path = BASE_DIR / ".env"
    if not path.is_file():
        return
    try:
        texto = path.read_text(encoding="utf-8")
    except OSError:
        return
    for linha in texto.splitlines():
        s = linha.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        chave, _, valor = s.partition("=")
        chave = chave.strip()
        if not chave or chave in os.environ:
            continue
        valor = valor.strip()
        if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in "\"'":
            valor = valor[1:-1]
        os.environ[chave] = valor


_carregar_dotenv()

# OBSERVATORIO_DB_PATH: testes/CI usam SQLite isolado (nunca o data/ de produção).
_DB_OVERRIDE = (os.environ.get("OBSERVATORIO_DB_PATH") or "").strip()
DB_PATH = Path(_DB_OVERRIDE) if _DB_OVERRIDE else (DATA_DIR / "observatorio.db")

APP_PORT = int(os.environ.get("APP_PORT", "8096"))

# --- Autenticação (sessão cookie + papéis) ---
MAX_ADMIN = int(os.environ.get("AUTH_MAX_ADMIN", "1"))
MAX_CONSULTA = int(os.environ.get("AUTH_MAX_CONSULTA", "5"))
AUTH_SESSION_COOKIE = os.environ.get("AUTH_SESSION_COOKIE", "osb_session")
AUTH_SESSION_DIAS = int(os.environ.get("AUTH_SESSION_DIAS", "7"))
AUTH_SESSION_IDLE_MINUTOS = int(os.environ.get("AUTH_SESSION_IDLE_MINUTOS", "30"))
AUTH_COOKIE_SECURE = (os.environ.get("AUTH_COOKIE_SECURE") or "auto").strip().lower()
AUTH_BOOTSTRAP_USERNAME = (os.environ.get("AUTH_BOOTSTRAP_USERNAME") or "").strip()
AUTH_BOOTSTRAP_PASSWORD = os.environ.get("AUTH_BOOTSTRAP_PASSWORD") or ""

# User-Agent padrão para APIs públicas.
USER_AGENT = (
    "ObservatorioSocialBrasil/0.2 (+https://www.triggerti.com; contato institucional)"
)

# --- Compras.gov — API Dados Abertos (PNCP / Lei 14.133) ---
COMPRAS_GOV_BASE_URL = os.environ.get(
    "COMPRAS_GOV_BASE_URL", "https://dadosabertos.compras.gov.br"
)
COMPRAS_UASG_ENDPOINT = os.environ.get(
    "COMPRAS_UASG_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-uasg/1_consultarUasg",
)
COMPRAS_ORGAO_ENDPOINT = os.environ.get(
    "COMPRAS_ORGAO_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-uasg/2_consultarOrgao",
)
COMPRAS_PNCP_ENDPOINT = os.environ.get(
    "COMPRAS_PNCP_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/1_consultarContratacoes_PNCP_14133",
)
COMPRAS_PNCP_ITENS_ENDPOINT = os.environ.get(
    "COMPRAS_PNCP_ITENS_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133",
)
COMPRAS_PNCP_ITENS_ID_ENDPOINT = os.environ.get(
    "COMPRAS_PNCP_ITENS_ID_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/2.1_consultarItensContratacoes_PNCP_14133_Id",
)
COMPRAS_RESULTADOS_ENDPOINT = os.environ.get(
    "COMPRAS_RESULTADOS_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133",
)
COMPRAS_PNCP_PAGE_SIZE = int(os.environ.get("COMPRAS_PNCP_PAGE_SIZE", "500"))
COMPRAS_PNCP_HTTP_TIMEOUT_SEC = float(os.environ.get("COMPRAS_PNCP_HTTP_TIMEOUT_SEC", "180"))
COMPRAS_PNCP_MAX_RETRIES = int(os.environ.get("COMPRAS_PNCP_MAX_RETRIES", "5"))
COMPRAS_PNCP_REQUEST_DELAY_SEC = float(os.environ.get("COMPRAS_PNCP_DELAY_SEC", "0.35"))
COMPRAS_PNCP_TIMEOUT_BACKOFF_BASE_SEC = float(
    os.environ.get("COMPRAS_PNCP_TIMEOUT_BACKOFF_BASE_SEC", "8")
)
COMPRAS_PNCP_TIMEOUT_BACKOFF_CAP_SEC = float(
    os.environ.get("COMPRAS_PNCP_TIMEOUT_BACKOFF_CAP_SEC", "90")
)

# codigoModalidade — domínio da API Dados Abertos (filtro de coleta 07).
MODALIDADES_COMPRAS: dict[int, str] = {
    3: "Concorrência - Eletrônica",
    5: "Pregão - Eletrônico",
    6: "Dispensa",
    7: "Inexigibilidade",
    12: "Leilão - Presencial",
}

# Scheduler in-process do motor de coleta (Fase 5). Off em testes / CI.
COLETA_SCHEDULER = os.environ.get("COLETA_SCHEDULER", "0").lower() in (
    "1",
    "true",
    "yes",
)
COLETA_SCHEDULER_POLL_SEC = float(os.environ.get("COLETA_SCHEDULER_POLL_SEC", "60"))

# --- CNPJ público (cadeia de fallback) ---
CNPJ_PUBLICO_BRASILAPI_URL = os.environ.get(
    "CNPJ_PUBLICO_BRASILAPI_URL", "https://brasilapi.com.br/api/cnpj/v1"
)
CNPJ_PUBLICO_MINHARECEITA_URL = os.environ.get(
    "CNPJ_PUBLICO_MINHARECEITA_URL", "https://minhareceita.org"
)
CNPJ_PUBLICO_CNPJA_URL = os.environ.get(
    "CNPJ_PUBLICO_CNPJA_URL", "https://open.cnpja.com/office"
)
CNPJ_PUBLICO_PUBLICA_URL = os.environ.get(
    "CNPJ_PUBLICO_PUBLICA_URL", "https://publica.cnpj.ws/cnpj"
)
CNPJ_PUBLICO_CACHE_DIAS = int(os.environ.get("CNPJ_PUBLICO_CACHE_DIAS", "30"))
CNPJ_PUBLICO_HTTP_TIMEOUT_SEC = float(
    os.environ.get("CNPJ_PUBLICO_HTTP_TIMEOUT_SEC", "25")
)
CNPJ_PUBLICO_LOTE_INTERVALO_SEC = float(
    os.environ.get("CNPJ_PUBLICO_LOTE_INTERVALO_SEC", "3")
)
CNPJ_PUBLICO_LOTE_BACKOFF_SEC = float(
    os.environ.get("CNPJ_PUBLICO_LOTE_BACKOFF_SEC", "30")
)
# Após coleta 07: fase 2 CNPJ (nunca altera situação da 07). 0 = desliga o hook.
# Cada lote processa até LIMIT itens; na madrugada repete com descanso até ATE_HORA.
CNPJ_PUBLICO_POS_COLETA_LIMIT = int(
    os.environ.get("CNPJ_PUBLICO_POS_COLETA_LIMIT", "300")
)
# Teto de tempo por lote (segundos). 0 = sem teto por lote.
CNPJ_PUBLICO_POS_COLETA_MAX_SEC = float(
    os.environ.get("CNPJ_PUBLICO_POS_COLETA_MAX_SEC", "900")
)
# Fim da janela multi-lote (America/Sao_Paulo). Ex.: 06:00.
CNPJ_PUBLICO_POS_COLETA_ATE_HORA = (
    os.environ.get("CNPJ_PUBLICO_POS_COLETA_ATE_HORA") or "06:00"
).strip() or "06:00"
# Descanso entre lotes na janela (segundos).
CNPJ_PUBLICO_POS_COLETA_DESCANSO_SEC = float(
    os.environ.get("CNPJ_PUBLICO_POS_COLETA_DESCANSO_SEC", "60")
)

# --- CEP público (cadeia de fallback) ---
CEP_PUBLICO_BRASILAPI_URL = os.environ.get(
    "CEP_PUBLICO_BRASILAPI_URL", "https://brasilapi.com.br/api/cep/v2"
)
CEP_PUBLICO_VIACEP_URL = os.environ.get(
    "CEP_PUBLICO_VIACEP_URL", "https://viacep.com.br/ws"
)
CEP_PUBLICO_AWESOMEAPI_URL = os.environ.get(
    "CEP_PUBLICO_AWESOMEAPI_URL", "https://cep.awesomeapi.com.br/json"
)
CEP_PUBLICO_OPENCEP_URL = os.environ.get(
    "CEP_PUBLICO_OPENCEP_URL", "https://opencep.com/v1"
)
CEP_PUBLICO_CACHE_DIAS = int(os.environ.get("CEP_PUBLICO_CACHE_DIAS", "90"))
CEP_PUBLICO_HTTP_TIMEOUT_SEC = float(
    os.environ.get("CEP_PUBLICO_HTTP_TIMEOUT_SEC", "15")
)
CEP_PUBLICO_LOTE_INTERVALO_SEC = float(
    os.environ.get("CEP_PUBLICO_LOTE_INTERVALO_SEC", "1")
)

# Basemap CARTO (Leaflet) — key gratuita; obrigatória nos tiles raster.
# Vai ao browser (query da URL do tile); restringir por domínio no painel CARTO.
CARTO_BASEMAP_API_KEY = (os.environ.get("CARTO_BASEMAP_API_KEY") or "").strip()


def auth_disabled() -> bool:
    """Desliga exigência de login (apenas testes / emergência). Lido em runtime."""
    return os.environ.get("AUTH_DISABLED", "").lower() in ("1", "true", "yes")


def cookie_secure_for_request(request_scheme: str) -> bool:
    """Define o flag Secure do cookie de sessão.

    - auto: True só quando o request é HTTPS (ex.: atrás do Caddy)
    - 1/true/yes: sempre Secure
    - 0/false/no: nunca Secure (dev HTTP)
    """
    if AUTH_COOKIE_SECURE in ("1", "true", "yes"):
        return True
    if AUTH_COOKIE_SECURE in ("0", "false", "no"):
        return False
    return (request_scheme or "").lower() == "https"


def assert_power_bi_proibido() -> None:
    """Recusa tentativas de ligar Power BI via ambiente (produto nativo)."""
    global POWER_BI_ENABLED
    POWER_BI_ENABLED = False
    suspeitas = (
        "ENABLE_POWER_BI",
        "POWER_BI_ENABLED",
        "POWERBI_ENABLED",
        "EMBED_POWER_BI",
        "PBI_EMBED",
    )
    for chave in suspeitas:
        val = (os.environ.get(chave) or "").strip().lower()
        if val in ("1", "true", "yes", "on"):
            raise RuntimeError(
                f"Power BI é proibido neste produto. Remova {chave} do ambiente."
            )
