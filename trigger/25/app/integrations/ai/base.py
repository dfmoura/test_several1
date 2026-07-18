from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from app.schemas.message import ChatMessage


@dataclass
class AIResponse:
    content: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0
    raw: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class AIProvider(Protocol):
    """Abstract AI provider interface."""

    async def generate(
        self,
        messages: list[ChatMessage],
        *,
        system_prompt: str | None = None,
    ) -> AIResponse: ...

    async def close(self) -> None: ...
