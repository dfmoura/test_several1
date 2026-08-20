from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "zapvia"
    app_env: str = "development"
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8000
    public_base_url: str = "http://localhost:8144"

    jwt_secret: str = "change-me-jwt-secret-use-64-random-chars"
    jwt_ttl_hours: int = 168
    app_encryption_key: str = "change-me-fernet-key-32b-urlsafe"
    admin_token: str = "change-me-admin-token-strong"
    webhook_secret: str = "change-me-webhook-secret"

    billing_provider: str = "sandbox"
    plan_code: str = "zapvia_pro"
    plan_name: str = "ZapVia Pro"
    plan_price_cents: int = 9700
    plan_currency: str = "BRL"
    plan_interval_days: int = 30

    whatsapp_provider: str = "sandbox"
    whatsapp_graph_version: str = "v21.0"
    whatsapp_graph_base_url: str = "https://graph.facebook.com"

    database_url: str = "postgresql+asyncpg://zapvia:zapvia@localhost:5444/zapvia"
    database_url_sync: str = "postgresql://zapvia:zapvia@localhost:5444/zapvia"
    redis_url: str = "redis://localhost:6384/0"
    rabbitmq_url: str = "amqp://zapvia:zapvia@localhost:5674/zapvia"

    default_rate_limit_per_minute: int = 30
    max_send_attempts: int = 5
    message_retention_days: int = 90
    worker_prefetch: int = 3
    retry_backoff_seconds: tuple[int, ...] = (15, 45, 120, 300, 900)
    credential_health_interval_seconds: int = 300

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def is_development(self) -> bool:
        return not self.is_production

    @property
    def plan_price_brl(self) -> str:
        reais = self.plan_price_cents / 100
        return f"R$ {reais:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
