import hmac
from typing import Annotated

from fastapi import Header, Request

from app.config import get_settings
from app.core.exceptions import WebhookValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)


def validate_webhook_secret(
    x_webhook_secret: Annotated[str | None, Header()] = None,
) -> None:
    """Validate optional webhook secret header when configured."""
    settings = get_settings()
    expected = settings.webhook_secret

    if not expected or expected == "change-me-webhook-secret":
        if settings.is_production:
            raise WebhookValidationError("WEBHOOK_SECRET must be set in production")
        return

    if not x_webhook_secret or not hmac.compare_digest(x_webhook_secret, expected):
        logger.warning("webhook_secret_invalid")
        raise WebhookValidationError("Invalid webhook secret")


def extract_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"
