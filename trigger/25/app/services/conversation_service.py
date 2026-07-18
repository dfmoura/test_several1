from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.message import Message
from app.repositories.conversation import ConversationRepository
from app.repositories.message import MessageRepository


class ConversationService:
    def __init__(self, session: AsyncSession) -> None:
        self._conversations = ConversationRepository(session)
        self._messages = MessageRepository(session)

    async def get_or_create_active(self, user_id: str) -> Conversation:
        return await self._conversations.get_or_create_active(user_id)

    async def add_message(
        self,
        *,
        conversation_id: str,
        role: str,
        content: str,
    ) -> Message:
        return await self._messages.create(
            conversation_id=conversation_id,
            role=role,
            content=content,
        )

    async def recent_messages(
        self,
        conversation_id: str,
        *,
        limit: int = 20,
    ) -> list[Message]:
        return await self._messages.list_recent(conversation_id, limit=limit)
