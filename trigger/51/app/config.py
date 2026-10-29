from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_key: str = "assistencia-local-dev"
    llm_mode: str = "mock"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    session_ttl_seconds: int = 3600
    max_message_chars: int = 4000
    max_descricao_chars: int = 5000


@lru_cache
def get_settings() -> Settings:
    return Settings()
