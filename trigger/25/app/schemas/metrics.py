from pydantic import BaseModel


class MetricsResponse(BaseModel):
    messages_received: int
    messages_sent: int
    ai_requests: int
    ai_errors: int
    avg_ai_latency_ms: float
    total_tokens: int
