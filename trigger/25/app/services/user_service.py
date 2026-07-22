from datetime import datetime, timezone

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
        lead_status: str | None = None,
        lead_segment: str | None = None,
        lead_system: str | None = None,
        lead_need: str | None = None,
        lead_next_step: str | None = None,
    ) -> User:
        """Create or update durable manual facts for a contact. Never clears omitted fields."""
        normalized = normalize_phone(phone)
        if not normalized:
            raise NotFoundError("Invalid phone")

        user = await self._users.get_by_phone(normalized)
        if not user:
            user = await self._users.add(
                User(
                    phone=normalized,
                    name=name,
                    relation=relation,
                    notes=notes,
                    lead_status=(lead_status or None),
                    lead_segment=(lead_segment or None),
                    lead_system=(lead_system or None),
                    lead_need=(lead_need or None),
                    lead_next_step=(lead_next_step or None),
                )
            )
            return user

        if name is not None:
            user.name = name.strip() or None
        if relation is not None:
            user.relation = relation.strip() or None
        if notes is not None:
            user.notes = notes.strip() or None
        if lead_status is not None:
            user.lead_status = lead_status.strip() or None
        if lead_segment is not None:
            user.lead_segment = lead_segment.strip() or None
        if lead_system is not None:
            user.lead_system = lead_system.strip() or None
        if lead_need is not None:
            user.lead_need = lead_need.strip() or None
        if lead_next_step is not None:
            user.lead_next_step = lead_next_step.strip() or None

        await self._users.session.flush()
        await self._users.session.refresh(user)
        return user

    async def update_lead(
        self,
        phone: str,
        *,
        status: str = "",
        segment: str = "",
        system: str = "",
        need: str = "",
        next_step: str = "",
    ) -> User | None:
        """Merge auto-extracted lead data. Only non-empty values overwrite; never clears."""
        normalized = normalize_phone(phone)
        if not normalized:
            return None

        user = await self._users.get_by_phone(normalized)
        if not user:
            return None

        changed = False
        if status:
            user.lead_status = status
            changed = True
        if segment:
            user.lead_segment = segment[:120]
            changed = True
        if system:
            user.lead_system = system[:120]
            changed = True
        if need:
            user.lead_need = need[:500]
            changed = True
        if next_step:
            user.lead_next_step = next_step[:200]
            changed = True

        if not changed:
            return user

        user.lead_updated_at = datetime.now(timezone.utc)
        await self._users.session.flush()
        await self._users.session.refresh(user)
        return user
