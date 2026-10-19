from __future__ import annotations

import os

from pydantic import BaseModel

# codigoModalidade (domínio Compras.gov). Não é o catálogo PNCP 1–14.
MODALIDADES_COMPRAS: dict[int, str] = {
    3: "Concorrência - Eletrônica",
    5: "Pregão - Eletrônico",
    6: "Dispensa",
    7: "Inexigibilidade",
    12: "Leilão - Presencial",
}

FILIAL_MAX_ATIVOS = 5
FILIAL_MAX_GESTOR = 1
MASTER_MAX_ATIVOS = 8
MASTER_MAX_ADMIN = 2

PAPEIS_FILIAL = frozenset({"filial_gestor", "filial_analista"})
PAPEIS_MASTER = frozenset({"master_admin", "master_analista"})
PAPEIS = PAPEIS_FILIAL | PAPEIS_MASTER

# A API federal responde 403 sem o User-Agent que já passou em produção.
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

PAGINA_CONTRATACAO = 500
PAGINA_ITENS = 100
PAGINA_ITENS_MIN = 25
# A consulta de contratações recusa intervalo maior que um ano.
JANELA_CONTRATACAO_DIAS = 365
JANELA_ITENS_DIAS = 90
TIMEOUT_LEITURA_S = 180.0
RETRIES = 5
RETRIES_ITENS = 2
DELAY_S = 0.35
BACKOFF_BASE_S = 8.0
BACKOFF_TETO_S = 90.0

BASE_COMPRAS = "https://dadosabertos.compras.gov.br"
URL_UASG = f"{BASE_COMPRAS}/modulo-uasg/1_consultarUasg"
URL_ORGAO = f"{BASE_COMPRAS}/modulo-uasg/2_consultarOrgao"
URL_CONTRATACAO = (
    f"{BASE_COMPRAS}/modulo-contratacoes/1_consultarContratacoes_PNCP_14133"
)
URL_ITENS = (
    f"{BASE_COMPRAS}/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133"
)
URL_RESULTADOS = (
    f"{BASE_COMPRAS}/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133"
)
URL_CATALOGO_MATERIAL = f"{BASE_COMPRAS}/modulo-material/4_consultarItemMaterial"
URL_CATALOGO_SERVICO = f"{BASE_COMPRAS}/modulo-servico/6_consultarItemServico"
URL_CONTRATOS_PNCP = "https://pncp.gov.br/api/consulta/v1/contratos"
URL_ATAS_PNCP = "https://pncp.gov.br/api/consulta/v1/atas"

HOSTS_CNPJ = (
    "brasilapi.com.br",
    "minhareceita.org",
    "open.cnpja.com",
    "publica.cnpj.ws",
)
HOSTS_CEP = ("brasilapi.com.br", "viacep.com.br")
CACHE_CNPJ_DIAS = 30
TETO_CATALOGO_NOITE = 20

COOKIE = "osb_sessao"
CNPJ_UBERLANDIA = "23497346000142"
IBGE_UBERLANDIA = 3170206


class Settings(BaseModel):
    database_url: str
    app_port: int = 8097
    cookie_secure: str = "0"
    session_idle_minutos: int = 30
    session_dias: int = 7
    bootstrap_usuario: str = ""
    bootstrap_senha: str = ""
    faixa_c: bool = False
    faixa_d: bool = False
    janela_dias: int = 7
    teto_abertas: int = 40
    orcamento_chamadas: int = 300
    ano_inicial_carga: int = 2026
    agenda_hora: int = 2
    agenda_minuto: int = 10
    backup_hora: int = 5
    backup_minuto: int = 10


def _flag(nome: str) -> bool:
    return os.environ.get(nome, "0").strip().lower() in {"1", "true", "sim", "yes"}


def load_settings() -> Settings:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL ausente")
    if not url.startswith("postgresql+psycopg://"):
        raise RuntimeError("DATABASE_URL precisa usar postgresql+psycopg")
    return Settings(
        database_url=url,
        app_port=int(os.environ.get("APP_PORT", "8097")),
        cookie_secure=os.environ.get("AUTH_COOKIE_SECURE", "0").strip().lower(),
        session_idle_minutos=int(os.environ.get("AUTH_SESSION_IDLE_MINUTOS", "30")),
        session_dias=int(os.environ.get("AUTH_SESSION_DIAS", "7")),
        bootstrap_usuario=os.environ.get("BOOTSTRAP_USUARIO", "").strip().lower(),
        bootstrap_senha=os.environ.get("BOOTSTRAP_SENHA", ""),
        faixa_c=_flag("FAIXA_C_HABILITADA"),
        faixa_d=_flag("FAIXA_D_HABILITADA"),
    )


settings = load_settings()
