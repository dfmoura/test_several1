from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://b3carteira:b3carteira@db:5432/b3carteira"
    upload_dir: str = "/data/uploads"
    cotahist_cache_dir: str = "/data/cotahist"
    market_history_years: int = 5
    brapi_token: str = ""
    brapi_chunk_size: int = 10
    cors_origins: str = "http://localhost:4819,http://127.0.0.1:4819"


@lru_cache
def get_settings() -> Settings:
    return Settings()
