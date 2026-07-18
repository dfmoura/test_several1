from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user import UserRepository


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self._users = UserRepository(session)

    async def get_or_create(self, phone: str, name: str | None = None) -> User:
        return await self._users.get_or_create(phone=phone, name=name)
