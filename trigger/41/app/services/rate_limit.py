from __future__ import annotations

import redis.asyncio as redis

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RateLimiter:
    """Redis token-bucket style limiter: max N hits per 60s window per key."""

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
            # Fail open in development, closed-ish with high allowance
            settings = get_settings()
            return not settings.is_production

    async def remaining(self, key: str, limit: int) -> int:
        redis_key = f"rl:{key}"
        try:
            val = await self._redis.get(redis_key)
            used = int(val) if val else 0
            return max(0, limit - used)
        except Exception:
            return limit
