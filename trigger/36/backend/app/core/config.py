from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ERP RLP"
    environment: str = "HOMOLOGACAO"  # DEV | HOMOLOGACAO | PRODUCAO
    database_url: str = "postgresql+psycopg2://rlp:rlp_secret@localhost:5432/rlp_erp"
    auth_secret: str = "change-me-in-production-rlp-erp-32chars"
    access_token_expire_hours: int = 12
    admin_email: str = "admin@rlp.com.br"
    admin_password: str = "Admin@123"
    simular_integracoes: bool = True
    focus_nfe_token: str = ""
    cors_origins: str = "*"
    empresa_codigo: str = "EMP-00001"
    empresa_cnpj: str = "01423183000110"
    empresa_razao: str = "RLP ETIQUETAS AUTO ADESIVOS LTDA"


@lru_cache
def get_settings() -> Settings:
    return Settings()
