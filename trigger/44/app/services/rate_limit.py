from __future__ import annotations

import redis.asyncio as redis

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RateLimiter:
    def __init__(self, redis_client: redis.Redis):
        self._redis = redis_client

    async def allow(self, key: str, limit: int, window_seconds: int = 60) -> bool:
        if limit <= 0:
            return False
        redis_key = f"rl:{key}"
        try:
            current = await self._redis.incr(redis_key)
            if current == 1:
                await self._redis.expire(redis_key, window_seconds)
            return current <= limit
        except Exception as exc:
            logger.warning("rate_limit_redis_error", error=str(exc))
            settings = get_settings()
            return not settings.is_production
