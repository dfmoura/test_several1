from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security import validate_webhook_secret
from app.schemas.contact import ContactProfileOut, ContactProfileUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _to_out(user) -> ContactProfileOut:
    return ContactProfileOut(
        phone=user.phone,
        name=user.name,
        relation=user.relation,
        notes=user.notes,
        lead_status=user.lead_status,
        lead_segment=user.lead_segment,
        lead_system=user.lead_system,
        lead_need=user.lead_need,
        lead_next_step=user.lead_next_step,
        lead_updated_at=user.lead_updated_at,
    )


@router.get(
    "",
    response_model=list[ContactProfileOut],
    dependencies=[Depends(validate_webhook_secret)],
)
async def list_contact_profiles(
    session: AsyncSession = Depends(get_db),
) -> list[ContactProfileOut]:
    users = await UserService(session).list_contacts()
    return [_to_out(user) for user in users]


@router.get(
    "/{phone}",
    response_model=ContactProfileOut,
    dependencies=[Depends(validate_webhook_secret)],
)
async def get_contact_profile(
    phone: str,
    session: AsyncSession = Depends(get_db),
) -> ContactProfileOut:
    user = await UserService(session).get_by_phone(phone)
    return _to_out(user)


@router.put(
    "/{phone}",
    response_model=ContactProfileOut,
    dependencies=[Depends(validate_webhook_secret)],
)
async def upsert_contact_profile(
    phone: str,
    body: ContactProfileUpdate,
    session: AsyncSession = Depends(get_db),
) -> ContactProfileOut:
    user = await UserService(session).upsert_profile(
        phone,
        name=body.name,
        relation=body.relation,
        notes=body.notes,
        lead_status=body.lead_status,
        lead_segment=body.lead_segment,
        lead_system=body.lead_system,
        lead_need=body.lead_need,
        lead_next_step=body.lead_next_step,
    )
    return _to_out(user)
