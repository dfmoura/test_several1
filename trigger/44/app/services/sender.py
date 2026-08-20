from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.crypto import decrypt_secret, encrypt_secret
from app.core.ids import new_id, validate_phone_e164
from app.core.logging import get_logger
from app.core.security import generate_api_key
from app.domain.enums import ChannelKind, SenderStatus, WhatsAppProviderKind
from app.domain.exceptions import ForbiddenError, NotFoundError
from app.integrations.whatsapp.factory import build_whatsapp_provider
from app.models import Account, Sender
from app.queue.topology import QueuePublisher
from app.repositories import AuditRepository, SenderRepository
from app.services.billing import BillingService

logger = get_logger(__name__)


class SenderService:
    def __init__(
        self,
        session: AsyncSession,
        publisher: QueuePublisher | None = None,
    ):
        self.session = session
        self.senders = SenderRepository(session)
        self.audit = AuditRepository(session)
        self.publisher = publisher
        self.billing = BillingService(session)
        self.settings = get_settings()

    async def get_for_account(self, account_id: str) -> Sender | None:
        return await self.senders.get_primary_for_account(account_id)

    async def connect(
        self,
        account: Account,
        *,
        name: str,
        phone: str,
        business_confirmed: bool,
        phone_number_id: str | None,
        waba_id: str | None,
        access_token: str | None,
    ) -> tuple[Sender, str]:
        await self.billing.require_active(account.id)
        if not business_confirmed:
            raise ForbiddenError(
                "business_only",
                "Este produto opera somente com WhatsApp Business. Confirme que o número é Business.",
            )

        phone_n = validate_phone_e164(phone)
        provider_kind = self.settings.whatsapp_provider.lower()
        if provider_kind not in (
            WhatsAppProviderKind.SANDBOX.value,
            WhatsAppProviderKind.CLOUD.value,
        ):
            provider_kind = WhatsAppProviderKind.SANDBOX.value

        provider = build_whatsapp_provider(provider_kind)
        try:
            profile = await provider.verify_and_activate(
                phone_e164=phone_n,
                phone_number_id=phone_number_id,
                waba_id=waba_id,
                access_token=access_token,
            )
        finally:
            await provider.close()

        existing = await self.senders.get_primary_for_account(account.id)
        plaintext, key_hash, prefix = generate_api_key()
        encrypted = encrypt_secret(access_token) if access_token else None
        now = datetime.now(timezone.utc)

        if existing:
            existing.name = name.strip()
            existing.phone_e164 = profile.phone_e164
            existing.channel = ChannelKind.WHATSAPP_BUSINESS.value
            existing.provider = provider_kind
            existing.phone_number_id = profile.phone_number_id
            existing.waba_id = profile.waba_id
            if encrypted:
                existing.access_token_encrypted = encrypted
            existing.api_key_hash = key_hash
            existing.api_key_prefix = prefix
            existing.status = SenderStatus.ACTIVE.value
            existing.business_confirmed = True
            existing.last_healthy_at = now
            sender = existing
            await self.senders.save(sender)
        else:
            sender = Sender(
                id=new_id("snd"),
                account_id=account.id,
                name=name.strip(),
                phone_e164=profile.phone_e164,
                channel=ChannelKind.WHATSAPP_BUSINESS.value,
                provider=provider_kind,
                phone_number_id=profile.phone_number_id,
                waba_id=profile.waba_id,
                access_token_encrypted=encrypted,
                api_key_hash=key_hash,
                api_key_prefix=prefix,
                status=SenderStatus.ACTIVE.value,
                rate_limit_per_minute=self.settings.default_rate_limit_per_minute,
                business_confirmed=True,
                last_healthy_at=now,
            )
            await self.senders.create(sender)

        if self.publisher:
            await self.publisher.ensure_sender(sender.id)

        await self.audit.log(
            "sender_connect",
            account_id=account.id,
            sender_id=sender.id,
            detail={
                "provider": provider_kind,
                "phone_number_id": profile.phone_number_id,
            },
        )
        logger.info(
            "sender_connected",
            sender_id=sender.id,
            account_id=account.id,
            provider=provider_kind,
        )
        return sender, plaintext

    async def rotate_key(self, account: Account) -> tuple[Sender, str]:
        sender = await self.get_for_account(account.id)
        if not sender:
            raise NotFoundError("Nenhum WhatsApp Business cadastrado")
        plaintext, key_hash, prefix = generate_api_key()
        sender.api_key_hash = key_hash
        sender.api_key_prefix = prefix
        await self.senders.save(sender)
        await self.audit.log(
            "sender_rotate_key", account_id=account.id, sender_id=sender.id
        )
        return sender, plaintext

    async def pause(self, account: Account) -> Sender:
        sender = await self.get_for_account(account.id)
        if not sender:
            raise NotFoundError("Nenhum WhatsApp Business cadastrado")
        sender.status = SenderStatus.PAUSED.value
        await self.senders.save(sender)
        return sender

    async def resume(self, account: Account) -> Sender:
        sender = await self.get_for_account(account.id)
        if not sender:
            raise NotFoundError("Nenhum WhatsApp Business cadastrado")
        if sender.status == SenderStatus.REVOKED.value:
            raise ForbiddenError("revoked", "Remetente revogado")
        sender.status = SenderStatus.ACTIVE.value
        await self.senders.save(sender)
        return sender

    async def mark_credentials_invalid(self, sender: Sender) -> None:
        sender.status = SenderStatus.CREDENTIALS_INVALID.value
        await self.senders.save(sender)

    async def mark_healthy(self, sender: Sender) -> None:
        sender.last_healthy_at = datetime.now(timezone.utc)
        if sender.status == SenderStatus.CREDENTIALS_INVALID.value:
            sender.status = SenderStatus.ACTIVE.value
        await self.senders.save(sender)

    @staticmethod
    def decrypt_token(sender: Sender) -> str | None:
        if not sender.access_token_encrypted:
            return None
        return decrypt_secret(sender.access_token_encrypted)
