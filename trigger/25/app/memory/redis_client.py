import json
from typing import Any

import redis.asyncio as redis

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RedisClient:
    """Singleton Redis async client."""

    _instance: "RedisClient | None" = None
    _client: redis.Redis | None = None

    def __new__(cls) -> "RedisClient":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def connect(self) -> None:
        if self._client is not None:
            return
        settings = get_settings()
        self._client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        await self._client.ping()
        logger.info("redis_connected", url=settings.redis_url)

    async def disconnect(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None
            logger.info("redis_disconnected")

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            raise RuntimeError("Redis client not connected. Call connect() first.")
        return self._client

    async def get(self, key: str) -> str | None:
        return await self.client.get(key)

    async def set(self, key: str, value: str, ttl: int | None = None) -> None:
        await self.client.set(key, value, ex=ttl)

    async def get_json(self, key: str) -> Any | None:
        raw = await self.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set_json(self, key: str, value: Any, ttl: int | None = None) -> None:
        await self.set(key, json.dumps(value, ensure_ascii=False), ttl=ttl)

    async def delete(self, key: str) -> None:
        await self.client.delete(key)

    async def ping(self) -> bool:
        try:
            return bool(await self.client.ping())
        except Exception:
            return False


def get_redis() -> RedisClient:
    return RedisClient()
