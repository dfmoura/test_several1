import time

import httpx

from app.config import Settings
from app.core.exceptions import AIProviderError
from app.core.logging import get_logger
from app.integrations.ai.base import AIResponse
from app.schemas.message import ChatMessage

logger = get_logger(__name__)


class OllamaProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.ollama_base_url.rstrip("/"),
            timeout=120.0,
        )

    async def generate(
        self,
        messages: list[ChatMessage],
        *,
        system_prompt: str | None = None,
    ) -> AIResponse:
        payload_messages: list[dict[str, str]] = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(
            {"role": m.role, "content": m.content} for m in messages
        )

        start = time.perf_counter()
        try:
            response = await self._client.post(
                "/api/chat",
                json={
                    "model": self._settings.model_name,
                    "messages": payload_messages,
                    "stream": False,
                    "options": {
                        "temperature": self._settings.ai_temperature,
                        "num_predict": self._settings.ai_max_tokens,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.error("ollama_error", error=str(exc))
            raise AIProviderError(f"Ollama request failed: {exc}") from exc

        latency_ms = (time.perf_counter() - start) * 1000
        content = (data.get("message") or {}).get("content", "").strip()
        prompt_tokens = int(data.get("prompt_eval_count") or 0)
        completion_tokens = int(data.get("eval_count") or 0)

        result = AIResponse(
            content=content,
            model=data.get("model", self._settings.model_name),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            latency_ms=round(latency_ms, 2),
            raw=data,
        )
        logger.info(
            "ai_response",
            provider="ollama",
            model=result.model,
            tokens=result.total_tokens,
            latency_ms=result.latency_ms,
        )
        return result

    async def close(self) -> None:
        await self._client.aclose()
