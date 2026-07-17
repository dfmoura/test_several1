import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
# LICITACOES_DB_PATH: permite testes/CI usarem SQLite isolado (nunca o data/ de produção).
_DB_OVERRIDE = (os.environ.get("LICITACOES_DB_PATH") or "").strip()
DB_PATH = Path(_DB_OVERRIDE) if _DB_OVERRIDE else (DATA_DIR / "licitacoes.db")

APP_PORT = int(os.environ.get("APP_PORT", "8096"))

# --- Autenticação (sessão cookie + papéis) ---
# Limites rígidos de contas — alterar aqui se a ONG precisar expandir.
MAX_ADMIN = int(os.environ.get("AUTH_MAX_ADMIN", "1"))
MAX_CONSULTA = int(os.environ.get("AUTH_MAX_CONSULTA", "3"))
AUTH_SESSION_COOKIE = os.environ.get("AUTH_SESSION_COOKIE", "osb_session")
AUTH_SESSION_DIAS = int(os.environ.get("AUTH_SESSION_DIAS", "7"))
# Seed opcional do 1º admin (só se a tabela usuários estiver vazia).
AUTH_BOOTSTRAP_USERNAME = (os.environ.get("AUTH_BOOTSTRAP_USERNAME") or "").strip()
AUTH_BOOTSTRAP_PASSWORD = os.environ.get("AUTH_BOOTSTRAP_PASSWORD") or ""


def auth_disabled() -> bool:
    """Desliga exigência de login (apenas testes / emergência). Lido em runtime."""
    return os.environ.get("AUTH_DISABLED", "").lower() in ("1", "true", "yes")


# User-Agent usado nas requisições HTTP às APIs oficiais (Compras.gov e Power BI PMU).
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# Intervalo base (segundos) entre requisições sequenciais às APIs de dados abertos.
DELAY_SEC = 2.0

# --- Compras.gov — API Dados Abertos (PNCP / Lei 14.133) ---
COMPRAS_GOV_BASE_URL = os.environ.get(
    "COMPRAS_GOV_BASE_URL", "https://dadosabertos.compras.gov.br"
)
COMPRAS_PNCP_BASE_URL = COMPRAS_GOV_BASE_URL
COMPRAS_PNCP_ENDPOINT = (
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/1_consultarContratacoes_PNCP_14133"
)
COMPRAS_PNCP_ID_ENDPOINT = (
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/1.1_consultarContratacoes_PNCP_14133_Id"
)
COMPRAS_PNCP_ITENS_ENDPOINT = (
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133"
)
COMPRAS_PNCP_ITENS_ID_ENDPOINT = (
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/2.1_consultarItensContratacoes_PNCP_14133_Id"
)
COMPRAS_RESULTADOS_ENDPOINT = os.environ.get(
    "COMPRAS_RESULTADOS_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133",
)
COMPRAS_RESULTADOS_ID_ENDPOINT = (
    f"{COMPRAS_GOV_BASE_URL}/modulo-contratacoes/3.1_consultarResultadoItensContratacoes_PNCP_14133_Id"
)
COMPRAS_UASG_ENDPOINT = os.environ.get(
    "COMPRAS_UASG_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-uasg/1_consultarUasg",
)
COMPRAS_ORGAO_ENDPOINT = os.environ.get(
    "COMPRAS_ORGAO_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-uasg/2_consultarOrgao",
)
COMPRAS_FORNECEDOR_ENDPOINT = os.environ.get(
    "COMPRAS_FORNECEDOR_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-fornecedor/1_consultarFornecedor",
)
COMPRAS_PGC_DETALHE_ENDPOINT = os.environ.get(
    "COMPRAS_PGC_DETALHE_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-pgc/1_consultarPgcDetalhe",
)
COMPRAS_PGC_AGREGACAO_ENDPOINT = (
    f"{COMPRAS_GOV_BASE_URL}/modulo-pgc/3_consultarPgcAgregacao"
)
COMPRAS_PRECO_MATERIAL_ENDPOINT = os.environ.get(
    "COMPRAS_PRECO_MATERIAL_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-pesquisa-preco/1_consultarMaterial",
)
COMPRAS_PRECO_SERVICO_ENDPOINT = os.environ.get(
    "COMPRAS_PRECO_SERVICO_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-pesquisa-preco/3_consultarServico",
)
COMPRAS_CATALOGO_MATERIAL_ENDPOINT = os.environ.get(
    "COMPRAS_CATALOGO_MATERIAL_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-material/4_consultarItemMaterial",
)
COMPRAS_CATALOGO_SERVICO_ENDPOINT = os.environ.get(
    "COMPRAS_CATALOGO_SERVICO_ENDPOINT",
    f"{COMPRAS_GOV_BASE_URL}/modulo-servico/6_consultarItemServico",
)
COMPRAS_IBGE_MUNICIPIO = int(os.environ.get("COMPRAS_IBGE_MUNICIPIO", "3170206"))
COMPRAS_UF_FILTRO = os.environ.get("COMPRAS_UF_FILTRO", "MG")
# CNPJs dos órgãos (PMU etc.). Preferir só dígitos — a API rejeita/mascara
# pontuação em cnpjCpfOrgao. Aceitamos formatado no env e normalizamos no coletor.
COMPRAS_ORGAOS_CNPJ = [
    c.strip()
    for c in os.environ.get(
        "COMPRAS_ORGAOS_CNPJ",
        "18431312000115",
    ).split(",")
    if c.strip()
]
COMPRAS_ENRICH_FORNECEDOR = os.environ.get("COMPRAS_ENRICH_FORNECEDOR", "true").lower() in (
    "1",
    "true",
    "yes",
)
COMPRAS_ENRICH_CATALOGO = os.environ.get("COMPRAS_ENRICH_CATALOGO", "true").lower() in (
    "1",
    "true",
    "yes",
)
COMPRAS_COLETAR_PGC = os.environ.get("COMPRAS_COLETAR_PGC", "false").lower() in (
    "1",
    "true",
    "yes",
)
COMPRAS_COLETAR_PRECO = os.environ.get("COMPRAS_COLETAR_PRECO", "false").lower() in (
    "1",
    "true",
    "yes",
)
COMPRAS_PNCP_MAX_DIAS_PERIODO_RESULTADOS = int(
    os.environ.get("COMPRAS_PNCP_MAX_DIAS_PERIODO_RESULTADOS", "90")
)
COMPRAS_PNCP_PAGE_SIZE = int(os.environ.get("COMPRAS_PNCP_PAGE_SIZE", "500"))
COMPRAS_PNCP_ITENS_PAGE_SIZE = int(os.environ.get("COMPRAS_PNCP_ITENS_PAGE_SIZE", "100"))
COMPRAS_PNCP_MAX_DIAS_PERIODO = 365
# Itens da contratação: consultas anuais costumam exceder 90s na API federal.
COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS = int(
    os.environ.get("COMPRAS_PNCP_MAX_DIAS_PERIODO_ITENS", "90")
)
COMPRAS_PNCP_HTTP_TIMEOUT_SEC = float(os.environ.get("COMPRAS_PNCP_HTTP_TIMEOUT_SEC", "180"))
# Retries amplos: catálogo CATMAT/CATSER na APIM federal costuma responder 429.
COMPRAS_PNCP_MAX_RETRIES = int(os.environ.get("COMPRAS_PNCP_MAX_RETRIES", "5"))
COMPRAS_PNCP_REQUEST_DELAY_SEC = float(os.environ.get("COMPRAS_PNCP_DELAY_SEC", "0.35"))

# CNPJ público (QSA sob demanda) — cadeia de fallbacks gratuitos.
# Ordem: BrasilAPI → Minha Receita → CNPJá Open → Pública CNPJ.ws
CNPJ_PUBLICO_BRASILAPI_URL = os.environ.get(
    "CNPJ_PUBLICO_BRASILAPI_URL",
    "https://brasilapi.com.br/api/cnpj/v1",
)
CNPJ_PUBLICO_MINHARECEITA_URL = os.environ.get(
    "CNPJ_PUBLICO_MINHARECEITA_URL",
    "https://minhareceita.org",
)
CNPJ_PUBLICO_CNPJA_URL = os.environ.get(
    "CNPJ_PUBLICO_CNPJA_URL",
    "https://open.cnpja.com/office",
)
CNPJ_PUBLICO_PUBLICA_URL = os.environ.get(
    "CNPJ_PUBLICO_PUBLICA_URL",
    "https://publica.cnpj.ws/cnpj",
)
CNPJ_PUBLICO_CACHE_DIAS = int(os.environ.get("CNPJ_PUBLICO_CACHE_DIAS", "30"))
CNPJ_PUBLICO_HTTP_TIMEOUT_SEC = float(os.environ.get("CNPJ_PUBLICO_HTTP_TIMEOUT_SEC", "25"))
# Cadência do lote de pendentes (segundos entre consultas à API pública).
CNPJ_PUBLICO_LOTE_INTERVALO_SEC = float(os.environ.get("CNPJ_PUBLICO_LOTE_INTERVALO_SEC", "3"))
# Pausa extra ao detectar bloqueio / falha transitória (429 / 502 / 503).
CNPJ_PUBLICO_LOTE_BACKOFF_SEC = float(os.environ.get("CNPJ_PUBLICO_LOTE_BACKOFF_SEC", "30"))
UBERLANDIA_IBGE = COMPRAS_IBGE_MUNICIPIO
UBERLANDIA_NOME = "UBERLANDIA"

# UASGs padrão (seed do Setup). Fonte da verdade após o 1º boot:
# tabela sistema_unidades_compradoras (editável em Setup).
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

# --- Provedores de IA (Setup · tokens com rotação) ---
# Segredo Fernet para criptografar API keys em repouso.
# Se vazio, o app gera e persiste em data/.ia_fernet_key (não versionar).
IA_TOKEN_SECRET = (os.environ.get("IA_TOKEN_SECRET") or "").strip()
IA_HTTP_TIMEOUT_SEC = float(os.environ.get("IA_HTTP_TIMEOUT_SEC", "45"))
IA_MAX_TENTATIVAS_POR_PROVEDOR = int(os.environ.get("IA_MAX_TENTATIVAS_POR_PROVEDOR", "1"))
# Fallback opcional (só se nenhum provedor estiver cadastrado no Setup).
IA_FALLBACK_API_KEY = (os.environ.get("IA_FALLBACK_API_KEY") or "").strip()
IA_FALLBACK_PROVIDER = (os.environ.get("IA_FALLBACK_PROVIDER") or "openai").strip()
IA_FALLBACK_MODEL = (os.environ.get("IA_FALLBACK_MODEL") or "").strip()
IA_FALLBACK_BASE_URL = (os.environ.get("IA_FALLBACK_BASE_URL") or "").strip()

# modalidadeIdPncp (1–14) — domínio oficial PNCP
MODALIDADES_PNCP: dict[int, str] = {
    1: "Leilão - Eletrônico",
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
    13: "Leilão - Presencial",
    14: "Inaplicabilidade da Licitação",
}
