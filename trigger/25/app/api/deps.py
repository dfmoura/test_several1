from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.integrations.ai.base import AIProvider
from app.integrations.ai.factory import AIProviderFactory
from app.integrations.evolution.client import EvolutionClient
from app.memory.context_memory import ContextMemory
from app.services.chat_service import ChatService
from app.services.webhook_service import WebhookService


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


def get_webhook_service() -> WebhookService:
    return WebhookService()


def get_ai_provider() -> AIProvider:
    return AIProviderFactory.create()


def get_evolution_client() -> EvolutionClient:
    return EvolutionClient()


def get_context_memory() -> ContextMemory:
    return ContextMemory()


async def get_chat_service(
    session: AsyncSession = Depends(get_db),
) -> AsyncGenerator[ChatService, None]:
    service = ChatService(session)
    try:
        yield service
    finally:
        await service.close()
