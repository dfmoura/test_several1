import pytest

from app.memory.context_memory import ContextMemory
from app.memory.redis_client import RedisClient


@pytest.mark.asyncio
async def test_append_and_get_context(redis_client: RedisClient) -> None:
    memory = ContextMemory(redis_client=redis_client)
    phone = "5511999999999"

    await memory.append_message(phone, "user", "Oi")
    await memory.append_message(phone, "assistant", "E aí!")

    ctx = await memory.get_context(phone)
    assert len(ctx.messages) == 2
    assert ctx.messages[0].content == "Oi"
    assert ctx.messages[1].role == "assistant"


@pytest.mark.asyncio
async def test_summary_on_overflow(
    redis_client: RedisClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.memory.context_memory.get_settings",
        lambda: type(
            "S",
            (),
            {"memory_max_messages": 2, "redis_context_ttl": 86400},
        )(),
    )
    memory = ContextMemory(redis_client=redis_client)
    phone = "5511888888888"

    await memory.append_message(phone, "user", "msg1")
    await memory.append_message(phone, "assistant", "msg2")
    await memory.append_message(phone, "user", "msg3")

    ctx = await memory.get_context(phone)
    assert len(ctx.messages) == 2
    assert ctx.summary
    assert "msg1" in ctx.summary


@pytest.mark.asyncio
async def test_update_state_and_clear(redis_client: RedisClient) -> None:
    memory = ContextMemory(redis_client=redis_client)
    phone = "5511777777777"

    await memory.update_state(phone, {"waiting": True})
    ctx = await memory.get_context(phone)
    assert ctx.state["waiting"] is True

    await memory.clear(phone)
    ctx = await memory.get_context(phone)
    assert ctx.messages == []
    assert ctx.state == {}
