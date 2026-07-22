from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.integrations.ai.base import AIResponse
from app.memory.context_memory import ContextMemory
from app.memory.redis_client import RedisClient
from app.prompts.loader import PromptLoader
from app.schemas.message import ChatMessage
from app.schemas.webhook import IncomingMessage
from app.services.chat_service import ChatService
from app.services.lead_service import LeadExtractor
from app.services.user_service import UserService


def test_lead_parse_extracts_json_from_noise() -> None:
    raw = (
        "claro! aqui vai:\n"
        '{"eh_lead": true, "segmento": "condomínio", "sistema_atual": "planilha", '
        '"necessidade": "controlar cobrança", "proximo_passo": "enviar exemplo", '
        '"status": "quente", "resumo": "sindico quer app"}\n'
        "espero ter ajudado"
    )
    info = LeadExtractor._parse(raw)
    assert info is not None
    assert info.eh_lead is True
    assert info.segmento == "condomínio"
    assert info.status == "quente"
    assert info.has_content() is True


def test_lead_parse_invalid_status_becomes_empty() -> None:
    info = LeadExtractor._parse('{"eh_lead": true, "status": "urgentíssimo"}')
    assert info is not None
    assert info.status == ""


def test_lead_parse_no_json_returns_none() -> None:
    assert LeadExtractor._parse("sem json aqui") is None


@pytest.mark.asyncio
async def test_lead_extractor_calls_provider() -> None:
    ai = AsyncMock()
    ai.generate = AsyncMock(
        return_value=AIResponse(
            content='{"eh_lead": true, "segmento": "indústria", "status": "novo"}',
            model="test",
        )
    )
    extractor = LeadExtractor(ai)
    info = await extractor.extract(
        history=[ChatMessage(role="user", content="uso Sankhya na fábrica")],
        reply="massa, me conta mais",
        owner_name="Diogo",
    )
    assert info is not None
    assert info.segmento == "indústria"
    ai.generate.assert_awaited_once()


@pytest.mark.asyncio
async def test_user_service_update_lead_merges_without_clearing(
    db_session: AsyncSession,
) -> None:
    service = UserService(db_session)
    await service.get_or_create("5511999999999", "Maria")

    await service.update_lead(
        "5511999999999", segment="condomínio", need="cobrança", status="qualificando"
    )
    # Second pass: only next_step provided; must not wipe previous fields.
    updated = await service.update_lead("5511999999999", next_step="agendar call")

    assert updated is not None
    assert updated.lead_segment == "condomínio"
    assert updated.lead_need == "cobrança"
    assert updated.lead_status == "qualificando"
    assert updated.lead_next_step == "agendar call"
    assert updated.lead_updated_at is not None


@pytest.mark.asyncio
async def test_chat_service_captures_lead_when_enabled(
    db_session: AsyncSession,
    redis_client: RedisClient,
    mock_evolution: AsyncMock,
    settings: Settings,
) -> None:
    settings.lead_capture_enabled = True

    ai = AsyncMock()
    ai.generate = AsyncMock(
        side_effect=[
            AIResponse(content="opa, tudo bom? me conta o que você usa aí", model="t"),
            AIResponse(
                content='{"eh_lead": true, "segmento": "comércio", '
                '"sistema_atual": "Sankhya", "necessidade": "dashboard de vendas", '
                '"proximo_passo": "", "status": "qualificando"}',
                model="t",
            ),
        ]
    )
    ai.close = AsyncMock()

    service = ChatService(
        db_session,
        ai=ai,
        evolution=mock_evolution,
        memory=ContextMemory(redis_client=redis_client),
        prompts=PromptLoader(),
        settings=settings,
    )

    reply = await service.handle_incoming(
        IncomingMessage(phone="5511888888888", name="Joao", text="vi o site de vocês")
    )

    assert reply == "opa, tudo bom? me conta o que você usa aí"
    assert ai.generate.await_count == 2

    user = await UserService(db_session).get_by_phone("5511888888888")
    assert user.lead_segment == "comércio"
    assert user.lead_system == "Sankhya"
    assert user.lead_status == "qualificando"
