from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def get_by_phone(self, phone: str) -> User | None:
        result = await self.session.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def get_or_create(self, phone: str, name: str | None = None) -> User:
        user = await self.get_by_phone(phone)
        if user:
            if name and user.name != name:
                user.name = name
                await self.session.flush()
            return user
        return await self.add(User(phone=phone, name=name))
