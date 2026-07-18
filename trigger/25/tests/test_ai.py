from unittest.mock import AsyncMock, MagicMock

import pytest

from app.config import Settings
from app.integrations.ai.base import AIResponse
from app.integrations.ai.factory import AIProviderFactory
from app.integrations.ai.ollama_provider import OllamaProvider
from app.integrations.ai.openai_provider import OpenAIProvider
from app.schemas.message import ChatMessage


def test_factory_openai(settings: Settings) -> None:
    settings.ai_provider = "openai"
    provider = AIProviderFactory.create(settings)
    assert isinstance(provider, OpenAIProvider)


def test_factory_ollama(settings: Settings) -> None:
    settings.ai_provider = "ollama"
    provider = AIProviderFactory.create(settings)
    assert isinstance(provider, OllamaProvider)


@pytest.mark.asyncio
async def test_openai_provider_generate(settings: Settings, monkeypatch: pytest.MonkeyPatch) -> None:
    provider = OpenAIProvider(settings)

    fake_usage = MagicMock(prompt_tokens=11, completion_tokens=7, total_tokens=18)
    fake_message = MagicMock(content="  Resposta curta.  ")
    fake_choice = MagicMock(message=fake_message)
    fake_response = MagicMock(
        choices=[fake_choice],
        usage=fake_usage,
        model="gpt-4o-mini",
        id="chatcmpl-1",
    )

    provider._client.chat.completions.create = AsyncMock(return_value=fake_response)

    result = await provider.generate(
        [ChatMessage(role="user", content="Oi")],
        system_prompt="Seja breve",
    )

    assert isinstance(result, AIResponse)
    assert result.content == "Resposta curta."
    assert result.total_tokens == 18
    assert result.latency_ms >= 0


@pytest.mark.asyncio
async def test_ollama_provider_generate(
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings.ai_provider = "ollama"
    settings.model_name = "llama3.2"
    provider = OllamaProvider(settings)

    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json = MagicMock(
        return_value={
            "model": "llama3.2",
            "message": {"content": "Tudo bem?"},
            "prompt_eval_count": 5,
            "eval_count": 3,
        }
    )
    provider._client.post = AsyncMock(return_value=fake_response)

    result = await provider.generate([ChatMessage(role="user", content="Oi")])
    assert result.content == "Tudo bem?"
    assert result.total_tokens == 8
