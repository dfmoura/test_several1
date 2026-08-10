from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "zap-outbound-gateway"
    app_env: str = "development"
    log_level: str = "INFO"
    host: str = "0.0.0.0"
    port: int = 8000

    admin_token: str = "change-me-admin-token-strong"
    webhook_secret: str = "change-me-webhook-secret"

    database_url: str = (
        "postgresql+asyncpg://zap:zap@localhost:5437/zap_gateway"
    )
    database_url_sync: str = "postgresql://zap:zap@localhost:5437/zap_gateway"

    redis_url: str = "redis://localhost:6381/0"
    rabbitmq_url: str = "amqp://zap:zap@localhost:5671/zap"

    evolution_url: str = "http://localhost:8142"
    evolution_key: str = "change-me-evolution-key-strong"

    default_rate_limit_per_minute: int = 20
    max_send_attempts: int = 5
    message_retention_days: int = 90
    worker_prefetch: int = 3

    # Retry backoff seconds per attempt index (1..5)
    retry_backoff_seconds: tuple[int, ...] = (15, 45, 120, 300, 900)

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def is_development(self) -> bool:
        return not self.is_production


@lru_cache
def get_settings() -> Settings:
    return Settings()
