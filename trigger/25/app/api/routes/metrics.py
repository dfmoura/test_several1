from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest

from app.core.metrics import metrics_store
from app.schemas.metrics import MetricsResponse

router = APIRouter()

MESSAGES_RECEIVED = Counter(
    "whatsapp_agent_messages_received_total",
    "Total inbound messages processed",
)
MESSAGES_SENT = Counter(
    "whatsapp_agent_messages_sent_total",
    "Total outbound replies sent",
)
AI_REQUESTS = Counter(
    "whatsapp_agent_ai_requests_total",
    "Total AI generation requests",
)
AI_ERRORS = Counter(
    "whatsapp_agent_ai_errors_total",
    "Total AI generation errors",
)
AVG_LATENCY = Gauge(
    "whatsapp_agent_ai_avg_latency_ms",
    "Average AI latency in milliseconds",
)
TOTAL_TOKENS = Counter(
    "whatsapp_agent_tokens_total",
    "Total tokens consumed",
)


@router.get("/metrics", response_model=MetricsResponse)
async def metrics_json() -> MetricsResponse:
    snap = metrics_store.snapshot()
    return MetricsResponse(**snap)


@router.get("/metrics/prometheus", response_class=PlainTextResponse)
async def metrics_prometheus() -> PlainTextResponse:
    snap = metrics_store.snapshot()
    # Sync gauges/counters loosely for scrape (process-local)
    AVG_LATENCY.set(snap["avg_ai_latency_ms"])
    return PlainTextResponse(
        generate_latest().decode("utf-8"),
        media_type=CONTENT_TYPE_LATEST,
    )
