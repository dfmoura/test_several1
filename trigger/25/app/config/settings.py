from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "whatsapp-ai-agent"
    app_env: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8000

    webhook_secret: str = "change-me-webhook-secret"
    rate_limit_per_minute: int = 30

    ai_provider: Literal["openai", "ollama"] = "openai"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    ollama_base_url: str = "http://host.docker.internal:11434"
    model_name: str = "gpt-4o-mini"
    ai_max_tokens: int = 500
    ai_temperature: float = 0.7

    database_url: str = (
        "postgresql+asyncpg://agent:agent@localhost:5432/whatsapp_agent"
    )
    database_url_sync: str = (
        "postgresql://agent:agent@localhost:5432/whatsapp_agent"
    )

    redis_url: str = "redis://localhost:6379/0"
    redis_context_ttl: int = 86400

    evolution_url: str = "http://localhost:8080"
    evolution_key: str = "your-evolution-api-key"
    evolution_instance: str = "personal"
    evolution_webhook_path: str = "/webhook/evolution"

    owner_name: str = "Diego"
    owner_phone: str = "5511999999999"

    memory_max_messages: int = 20

    # Manual per-contact knowledge (relation/notes). Off = identical to previous behavior.
    contact_kb_enabled: bool = False

    # Simple local UI to manage contact profiles. Disable if the app is publicly exposed.
    admin_ui_enabled: bool = True

    @field_validator("ai_provider", mode="before")
    @classmethod
    def normalize_provider(cls, value: str) -> str:
        return str(value).strip().lower()

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
