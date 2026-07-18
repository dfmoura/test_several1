import httpx

from app.config import Settings, get_settings
from app.core.exceptions import EvolutionAPIError
from app.core.logging import get_logger
from app.integrations.evolution.schemas import EvolutionSendResponse

logger = get_logger(__name__)


class EvolutionClient:
    """HTTP client for Evolution API (send text, instance helpers)."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client = httpx.AsyncClient(
            base_url=self._settings.evolution_url.rstrip("/"),
            headers={
                "apikey": self._settings.evolution_key,
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    @property
    def instance(self) -> str:
        return self._settings.evolution_instance

    async def send_text(self, number: str, text: str) -> EvolutionSendResponse:
        url = f"/message/sendText/{self.instance}"
        payload = {
            "number": number,
            "text": text,
        }
        try:
            response = await self._client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPStatusError as exc:
            body = exc.response.text
            logger.error(
                "evolution_send_failed",
                status=exc.response.status_code,
                body=body,
                number=number,
            )
            raise EvolutionAPIError(
                f"Evolution sendText failed: {exc.response.status_code}",
                details={"body": body},
            ) from exc
        except Exception as exc:
            logger.error("evolution_send_error", error=str(exc), number=number)
            raise EvolutionAPIError(f"Evolution request failed: {exc}") from exc

        logger.info("response_sent", number=number, chars=len(text))
        return EvolutionSendResponse.model_validate(data)

    async def get_connection_state(self) -> dict:
        url = f"/instance/connectionState/{self.instance}"
        response = await self._client.get(url)
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        await self._client.aclose()
