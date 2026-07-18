from app.config import Settings, get_settings
from app.core.exceptions import AIProviderError
from app.core.logging import get_logger
from app.integrations.ai.base import AIProvider
from app.integrations.ai.ollama_provider import OllamaProvider
from app.integrations.ai.openai_provider import OpenAIProvider

logger = get_logger(__name__)


class AIProviderFactory:
    """Factory Pattern — create AI provider from settings."""

    @staticmethod
    def create(settings: Settings | None = None) -> AIProvider:
        cfg = settings or get_settings()
        provider = cfg.ai_provider

        if provider == "openai":
            logger.info("ai_provider_selected", provider="openai", model=cfg.model_name)
            return OpenAIProvider(cfg)
        if provider == "ollama":
            logger.info("ai_provider_selected", provider="ollama", model=cfg.model_name)
            return OllamaProvider(cfg)

        raise AIProviderError(f"Unknown AI provider: {provider}")
