from threading import Lock


class MetricsStore:
    """In-process metrics for GET /metrics."""

    def __init__(self) -> None:
        self._lock = Lock()
        self.messages_received = 0
        self.messages_sent = 0
        self.ai_requests = 0
        self.ai_errors = 0
        self.total_ai_latency_ms = 0.0
        self.total_tokens = 0

    def incr_received(self) -> None:
        with self._lock:
            self.messages_received += 1

    def incr_sent(self) -> None:
        with self._lock:
            self.messages_sent += 1

    def record_ai(self, *, latency_ms: float, tokens: int, error: bool = False) -> None:
        with self._lock:
            self.ai_requests += 1
            self.total_ai_latency_ms += latency_ms
            self.total_tokens += tokens
            if error:
                self.ai_errors += 1

    @property
    def avg_ai_latency_ms(self) -> float:
        with self._lock:
            if self.ai_requests == 0:
                return 0.0
            return round(self.total_ai_latency_ms / self.ai_requests, 2)

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "messages_received": self.messages_received,
                "messages_sent": self.messages_sent,
                "ai_requests": self.ai_requests,
                "ai_errors": self.ai_errors,
                "avg_ai_latency_ms": (
                    round(self.total_ai_latency_ms / self.ai_requests, 2)
                    if self.ai_requests
                    else 0.0
                ),
                "total_tokens": self.total_tokens,
            }


metrics_store = MetricsStore()
