import time
from typing import Any

from openai import AsyncOpenAI

from app.config import Settings
from app.core.exceptions import AIProviderError
from app.core.logging import get_logger
from app.integrations.ai.base import AIResponse
from app.schemas.message import ChatMessage

logger = get_logger(__name__)


class OpenAIProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )

    async def generate(
        self,
        messages: list[ChatMessage],
        *,
        system_prompt: str | None = None,
    ) -> AIResponse:
        payload: list[dict[str, str]] = []
        if system_prompt:
            payload.append({"role": "system", "content": system_prompt})
        payload.extend({"role": m.role, "content": m.content} for m in messages)

        start = time.perf_counter()
        try:
            response = await self._client.chat.completions.create(
                model=self._settings.model_name,
                messages=payload,  # type: ignore[arg-type]
                max_tokens=self._settings.ai_max_tokens,
                temperature=self._settings.ai_temperature,
            )
        except Exception as exc:
            logger.error("openai_error", error=str(exc))
            raise AIProviderError(f"OpenAI request failed: {exc}") from exc

        latency_ms = (time.perf_counter() - start) * 1000
        choice = response.choices[0].message.content or ""
        usage = response.usage

        result = AIResponse(
            content=choice.strip(),
            model=response.model,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
            latency_ms=round(latency_ms, 2),
            raw={"id": response.id},
        )
        logger.info(
            "ai_response",
            provider="openai",
            model=result.model,
            tokens=result.total_tokens,
            latency_ms=result.latency_ms,
        )
        return result

    async def close(self) -> None:
        await self._client.close()
