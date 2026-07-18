from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.memory.context_memory import ContextMemory
from app.memory.redis_client import RedisClient
from app.prompts.loader import PromptLoader
from app.schemas.webhook import IncomingMessage
from app.services.chat_service import ChatService
from app.services.user_service import UserService
from app.services.webhook_service import WebhookService


@pytest.mark.asyncio
async def test_user_service_get_or_create(db_session: AsyncSession) -> None:
    service = UserService(db_session)
    user = await service.get_or_create("5511999999999", "Maria")
    assert user.phone == "5511999999999"
    assert user.name == "Maria"

    same = await service.get_or_create("5511999999999", "Maria Silva")
    assert same.id == user.id
    assert same.name == "Maria Silva"


@pytest.mark.asyncio
async def test_chat_service_handle_incoming(
    db_session: AsyncSession,
    redis_client: RedisClient,
    mock_ai: AsyncMock,
    mock_evolution: AsyncMock,
    settings: Settings,
) -> None:
    memory = ContextMemory(redis_client=redis_client)
    service = ChatService(
        db_session,
        ai=mock_ai,
        evolution=mock_evolution,
        memory=memory,
        prompts=PromptLoader(),
        settings=settings,
    )

    incoming = IncomingMessage(
        phone="5511999999999",
        name="Maria",
        text="Oi!",
    )
    reply = await service.handle_incoming(incoming)

    assert reply == "Beleza, te retorno já!"
    mock_ai.generate.assert_awaited_once()
    mock_evolution.send_text.assert_awaited_once_with(
        "5511999999999",
        "Beleza, te retorno já!",
    )

    ctx = await memory.get_context("5511999999999")
    assert len(ctx.messages) == 2
    assert ctx.messages[0].role == "user"
    assert ctx.messages[1].role == "assistant"


@pytest.mark.asyncio
async def test_chat_service_skips_from_me(
    db_session: AsyncSession,
    mock_ai: AsyncMock,
    mock_evolution: AsyncMock,
    settings: Settings,
    redis_client: RedisClient,
) -> None:
    service = ChatService(
        db_session,
        ai=mock_ai,
        evolution=mock_evolution,
        memory=ContextMemory(redis_client=redis_client),
        settings=settings,
    )
    result = await service.handle_incoming(
        IncomingMessage(phone="5511", name="Eu", text="teste", from_me=True)
    )
    assert result is None
    mock_ai.generate.assert_not_called()


def test_webhook_service_integration_with_chat_parse() -> None:
    parsed = WebhookService().parse(
        {
            "event": "messages.upsert",
            "data": {
                "key": {
                    "remoteJid": "5511222333444@s.whatsapp.net",
                    "fromMe": False,
                    "id": "1",
                },
                "pushName": "Ana",
                "message": {"conversation": "Horário?"},
            },
        }
    )
    assert parsed is not None
    assert parsed.phone == "5511222333444"
