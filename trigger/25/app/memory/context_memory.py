from typing import Any

from app.config import get_settings
from app.core.logging import get_logger
from app.memory.redis_client import RedisClient, get_redis
from app.schemas.message import ChatMessage, ConversationContext

logger = get_logger(__name__)


class ContextMemory:
    """Redis-backed conversation context (messages, summary, state). TTL 24h."""

    def __init__(self, redis_client: RedisClient | None = None) -> None:
        self._redis = redis_client or get_redis()
        self._settings = get_settings()

    def _key(self, phone: str) -> str:
        return f"ctx:{phone}"

    async def get_context(self, phone: str) -> ConversationContext:
        data = await self._redis.get_json(self._key(phone))
        if not data:
            return ConversationContext()
        messages = [ChatMessage(**m) for m in data.get("messages", [])]
        return ConversationContext(
            messages=messages,
            summary=data.get("summary", ""),
            state=data.get("state", {}),
        )

    async def save_context(self, phone: str, context: ConversationContext) -> None:
        payload: dict[str, Any] = {
            "messages": [m.model_dump() for m in context.messages],
            "summary": context.summary,
            "state": context.state,
        }
        await self._redis.set_json(
            self._key(phone),
            payload,
            ttl=self._settings.redis_context_ttl,
        )
        logger.debug("context_saved", phone=phone, messages=len(context.messages))

    async def append_message(
        self,
        phone: str,
        role: str,
        content: str,
    ) -> ConversationContext:
        context = await self.get_context(phone)
        context.messages.append(ChatMessage(role=role, content=content))  # type: ignore[arg-type]
        max_msgs = self._settings.memory_max_messages
        if len(context.messages) > max_msgs:
            overflow = context.messages[:-max_msgs]
            snippet = " | ".join(f"{m.role}: {m.content[:80]}" for m in overflow)
            if context.summary:
                context.summary = f"{context.summary}\n{snippet}"
            else:
                context.summary = snippet
            context.messages = context.messages[-max_msgs:]
        await self.save_context(phone, context)
        return context

    async def update_summary(self, phone: str, summary: str) -> None:
        context = await self.get_context(phone)
        context.summary = summary
        await self.save_context(phone, context)

    async def update_state(self, phone: str, state: dict[str, Any]) -> None:
        context = await self.get_context(phone)
        context.state.update(state)
        await self.save_context(phone, context)

    async def clear(self, phone: str) -> None:
        await self._redis.delete(self._key(phone))
