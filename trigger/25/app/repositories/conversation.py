from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    model = Conversation

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def get_latest_for_user(self, user_id: str) -> Conversation | None:
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create_for_user(self, user_id: str) -> Conversation:
        return await self.add(Conversation(user_id=user_id))

    async def get_or_create_active(self, user_id: str) -> Conversation:
        conversation = await self.get_latest_for_user(user_id)
        if conversation:
            return conversation
        return await self.create_for_user(user_id)
