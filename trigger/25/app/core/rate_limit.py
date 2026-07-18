import time
from collections import defaultdict
from threading import Lock

from app.config import get_settings
from app.core.exceptions import RateLimitError
from app.core.logging import get_logger

logger = get_logger(__name__)


class InMemoryRateLimiter:
    """Simple sliding-window rate limiter (per process)."""

    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str, limit: int | None = None, window_seconds: int = 60) -> None:
        settings = get_settings()
        max_hits = limit if limit is not None else settings.rate_limit_per_minute
        now = time.monotonic()

        with self._lock:
            window = [t for t in self._hits[key] if now - t < window_seconds]
            if len(window) >= max_hits:
                logger.warning("rate_limit_exceeded", key=key, limit=max_hits)
                raise RateLimitError(f"Rate limit exceeded for {key}")
            window.append(now)
            self._hits[key] = window


rate_limiter = InMemoryRateLimiter()
