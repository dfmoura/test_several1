from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from app.api.deps import get_webhook_service
from app.config import get_settings
from app.core.logging import get_logger
from app.core.rate_limit import rate_limiter
from app.core.security import extract_client_ip, validate_webhook_secret
from app.schemas.webhook import WebhookAck
from app.services.chat_service import ChatService
from app.services.webhook_service import WebhookService

logger = get_logger(__name__)

router = APIRouter()


async def _process_message(raw: dict[str, Any]) -> None:
    """Background processing with its own DB session."""
    from app.core.database import AsyncSessionLocal

    webhook_service = WebhookService()
    incoming = webhook_service.parse(raw)
    if incoming is None:
        return

    async with AsyncSessionLocal() as session:
        service = ChatService(session)
        try:
            await service.handle_incoming(incoming)
            await session.commit()
        except Exception:
            await session.rollback()
            logger.exception("webhook_processing_failed", phone=incoming.phone)
        finally:
            await service.close()


@router.post(
    "/webhook/evolution",
    response_model=WebhookAck,
    dependencies=[Depends(validate_webhook_secret)],
)
async def evolution_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    webhook_service: WebhookService = Depends(get_webhook_service),
) -> WebhookAck:
    settings = get_settings()
    client_ip = extract_client_ip(request)
    rate_limiter.check(f"webhook:{client_ip}", limit=settings.rate_limit_per_minute)

    raw = await request.json()
    incoming = webhook_service.parse(raw)

    if incoming is None:
        return WebhookAck(status="ignored", detail="Event not actionable")

    rate_limiter.check(
        f"phone:{incoming.phone}",
        limit=settings.rate_limit_per_minute,
    )

    # Ack fast; process async so Evolution does not timeout
    background_tasks.add_task(_process_message, raw)
    return WebhookAck(status="accepted")
