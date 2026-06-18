import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_url: str = (
        "postgresql+psycopg2://weblicitacoes:weblicitacoes_secret@db:5432/weblicitacoes"
    )
    scraper_headless: bool = os.getenv("SCRAPER_HEADLESS", "false").lower() == "true"
    scraper_delay_sec: float = float(os.getenv("SCRAPER_DELAY_SEC", "2.0"))
    scraper_poll_interval_sec: float = float(os.getenv("SCRAPER_POLL_INTERVAL_SEC", "10"))
    scraper_nav_timeout_ms: int = int(os.getenv("SCRAPER_NAV_TIMEOUT_MS", "90000"))
    scraper_form_timeout_ms: int = int(os.getenv("SCRAPER_FORM_TIMEOUT_MS", "60000"))
    scraper_max_retries: int = int(os.getenv("SCRAPER_MAX_RETRIES", "3"))

    base_url: str = "https://weblicitacoes.uberlandia.mg.gov.br"
    consulta_url: str = (
        "https://weblicitacoes.uberlandia.mg.gov.br/weblicitacoes/f/n/licitacoescon"
        "?evento=y&descricaoEmpresaLicitacao=1&modoJanelaPlc=popup"
    )
    user_agent: str = (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    )


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

settings = Settings()
