from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.user import User
from app.repositories.user import UserRepository
from app.utils.phone import normalize_phone


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self._users = UserRepository(session)

    async def get_or_create(self, phone: str, name: str | None = None) -> User:
        return await self._users.get_or_create(phone=phone, name=name)

    async def get_by_phone(self, phone: str) -> User:
        normalized = normalize_phone(phone)
        user = await self._users.get_by_phone(normalized)
        if not user:
            raise NotFoundError(f"Contact not found: {normalized}")
        return user

    async def list_contacts(self, *, limit: int = 100) -> list[User]:
        return await self._users.list_ordered(limit=limit)

    async def upsert_profile(
        self,
        phone: str,
        *,
        name: str | None = None,
        relation: str | None = None,
        notes: str | None = None,
    ) -> User:
        """Create or update durable manual facts for a contact. Never clears omitted fields."""
        normalized = normalize_phone(phone)
        if not normalized:
            raise NotFoundError("Invalid phone")

        user = await self._users.get_by_phone(normalized)
        if not user:
            return await self._users.add(
                User(
                    phone=normalized,
                    name=name,
                    relation=relation,
                    notes=notes,
                )
            )

        if name is not None:
            user.name = name.strip() or None
        if relation is not None:
            user.relation = relation.strip() or None
        if notes is not None:
            user.notes = notes.strip() or None

        await self._users.session.flush()
        await self._users.session.refresh(user)
        return user
