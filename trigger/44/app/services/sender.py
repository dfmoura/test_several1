from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.crypto import decrypt_secret, encrypt_secret
from app.core.ids import new_id, normalize_phone, validate_phone_e164
from app.core.logging import get_logger
from app.core.security import generate_api_key
from app.domain.enums import ChannelKind, SenderStatus, WhatsAppProviderKind
from app.domain.exceptions import AppError, ForbiddenError, NotFoundError
from app.integrations.evolution import EvolutionClient
from app.integrations.whatsapp.factory import build_whatsapp_provider
from app.models import Account, Sender
from app.queue.topology import QueuePublisher
from app.repositories import AuditRepository, SenderRepository
from app.services.billing import BillingService

logger = get_logger(__name__)


def _normalize_label(label: str | None) -> str | None:
    if label is None:
        return None
    cleaned = " ".join(label.strip().split())
    return cleaned[:80] if cleaned else None


class SenderService:
    def __init__(
        self,
        session: AsyncSession,
        publisher: QueuePublisher | None = None,
        evolution: EvolutionClient | None = None,
    ):
        self.session = session
        self.senders = SenderRepository(session)
        self.audit = AuditRepository(session)
        self.publisher = publisher
        self.billing = BillingService(session)
        self.settings = get_settings()
        self._evolution = evolution
        self._owns_evolution = evolution is None

    def _evo(self) -> EvolutionClient:
        if self._evolution is None:
            self._evolution = EvolutionClient()
        return self._evolution

    async def close(self) -> None:
        if self._owns_evolution and self._evolution is not None:
            await self._evolution.close()
            self._evolution = None

    async def list_for_account(self, account_id: str) -> list[Sender]:
        return await self.senders.list_for_account(account_id)

    async def get_for_account(
        self, account_id: str, sender_id: str | None = None
    ) -> Sender | None:
        if sender_id:
            return await self.senders.get_for_account(account_id, sender_id)
        return await self.senders.get_primary_for_account(account_id)

    async def require_for_account(
        self, account_id: str, sender_id: str | None = None
    ) -> Sender:
        sender = await self.get_for_account(account_id, sender_id)
        if not sender:
            raise NotFoundError(
                "Remetente não encontrado"
                if sender_id
                else "Nenhum WhatsApp Business cadastrado"
            )
        return sender

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
        label: str | None = None,
        sender_id: str | None = None,
        as_new: bool = False,
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
            if phone_number_id and access_token:
                provider_kind = WhatsAppProviderKind.CLOUD.value
            else:
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

        existing: Sender | None = None
        if sender_id:
            existing = await self.senders.get_for_account(account.id, sender_id)
            if not existing:
                raise NotFoundError("Remetente não encontrado")
        else:
            by_phone = await self.senders.find_by_account_phone(
                account.id, profile.phone_e164
            )
            if by_phone:
                existing = by_phone
            elif not as_new:
                # Compat: single-sender accounts keep updating the primary
                # when there is only one and as_new was not requested.
                rows = await self.senders.list_for_account(account.id)
                if len(rows) == 1:
                    existing = rows[0]

        plaintext, key_hash, prefix = generate_api_key()
        encrypted = encrypt_secret(access_token) if access_token else None
        now = datetime.now(timezone.utc)
        label_n = _normalize_label(label)

        if existing:
            existing.name = name.strip()
            if label_n is not None:
                existing.label = label_n
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
                label=label_n,
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
                "as_new": as_new,
            },
        )
        logger.info(
            "sender_connected",
            sender_id=sender.id,
            account_id=account.id,
            provider=provider_kind,
        )
        return sender, plaintext

    async def pair(
        self,
        account: Account,
        *,
        name: str,
        business_confirmed: bool,
        label: str | None = None,
        sender_id: str | None = None,
        as_new: bool = False,
    ) -> tuple[Sender, str | None, str | None, str]:
        """Start or refresh QR pairing via Evolution (Baileys)."""
        await self.billing.require_active(account.id)
        if not self.settings.pairing_enabled:
            raise ForbiddenError(
                "pairing_disabled",
                "Pareamento por QR não está habilitado neste ambiente.",
            )
        if not business_confirmed:
            raise ForbiddenError(
                "business_only",
                "Este produto opera somente com WhatsApp Business. Confirme que o número é Business.",
            )

        api_key_once: str | None = None
        label_n = _normalize_label(label)
        existing: Sender | None = None

        if sender_id:
            existing = await self.senders.get_for_account(account.id, sender_id)
            if not existing:
                raise NotFoundError("Remetente não encontrado")
        elif not as_new:
            rows = await self.senders.list_for_account(account.id)
            if len(rows) == 1:
                existing = rows[0]
            elif len(rows) > 1:
                raise AppError(
                    "sender_required",
                    "Há vários remetentes. Informe sender_id ou use as_new=true para cadastrar outro.",
                    400,
                )

        if existing and existing.status == SenderStatus.REVOKED.value:
            raise ForbiddenError("revoked", "Remetente revogado")

        if existing:
            sender = existing
            sender.name = name.strip()
            if label_n is not None:
                sender.label = label_n
            sender.channel = ChannelKind.WHATSAPP_BUSINESS.value
            sender.provider = WhatsAppProviderKind.BAILEYS.value
            sender.business_confirmed = True
            if sender.status not in (
                SenderStatus.ACTIVE.value,
                SenderStatus.PAUSED.value,
            ):
                sender.status = SenderStatus.PENDING_PAIR.value
            if not sender.evolution_instance:
                sender.evolution_instance = sender.id.replace("-", "_")
                sender.phone_number_id = sender.evolution_instance
            await self.senders.save(sender)
        else:
            sender_id_new = new_id("snd")
            instance = sender_id_new.replace("-", "_")
            plaintext, key_hash, prefix = generate_api_key()
            api_key_once = plaintext
            sender = Sender(
                id=sender_id_new,
                account_id=account.id,
                name=name.strip(),
                label=label_n,
                phone_e164=None,
                channel=ChannelKind.WHATSAPP_BUSINESS.value,
                provider=WhatsAppProviderKind.BAILEYS.value,
                phone_number_id=instance,
                evolution_instance=instance,
                api_key_hash=key_hash,
                api_key_prefix=prefix,
                status=SenderStatus.PENDING_PAIR.value,
                rate_limit_per_minute=self.settings.default_rate_limit_per_minute,
                business_confirmed=True,
            )
            await self.senders.create(sender)

        if self.publisher:
            await self.publisher.ensure_sender(sender.id)

        evo = self._evo()
        assert sender.evolution_instance
        create_payload = await evo.create_instance(sender.evolution_instance)
        connect_payload = await evo.connect(sender.evolution_instance)
        qr = EvolutionClient.extract_qrcode(connect_payload)
        if not qr:
            qr = EvolutionClient.extract_qrcode(create_payload)

        await self.audit.log(
            "sender_pair",
            account_id=account.id,
            sender_id=sender.id,
            detail={
                "has_qr": bool(qr),
                "instance": sender.evolution_instance,
                "as_new": as_new,
            },
        )
        detail = (
            "Escaneie o QR no WhatsApp Business → Aparelhos conectados → Conectar um aparelho"
        )
        return sender, api_key_once, qr, detail

    async def rebind(
        self, account: Account, sender_id: str | None = None
    ) -> tuple[Sender, str | None, str]:
        await self.billing.require_active(account.id)
        if not self.settings.pairing_enabled:
            raise ForbiddenError(
                "pairing_disabled",
                "Pareamento por QR não está habilitado neste ambiente.",
            )
        sender = await self.require_for_account(account.id, sender_id)
        if sender.provider != WhatsAppProviderKind.BAILEYS.value:
            raise ForbiddenError(
                "not_baileys",
                "Rebind por QR só se aplica a remetentes conectados via QR.",
            )

        evo = self._evo()
        old_instance = sender.evolution_instance
        if old_instance:
            await evo.logout(old_instance)
            await evo.delete_instance(old_instance)

        new_instance = f"{sender.id.replace('-', '_')}_{new_id('rb')[-8:].lower()}"
        sender.evolution_instance = new_instance
        sender.phone_number_id = new_instance
        sender.phone_e164 = None
        sender.status = SenderStatus.PENDING_PAIR.value
        sender.provider = WhatsAppProviderKind.BAILEYS.value
        await self.senders.save(sender)

        create_payload = await evo.create_instance(new_instance)
        connect_payload = await evo.connect(new_instance)
        qr = EvolutionClient.extract_qrcode(connect_payload)
        if not qr:
            qr = EvolutionClient.extract_qrcode(create_payload)

        await self.audit.log(
            "sender_rebind",
            account_id=account.id,
            sender_id=sender.id,
            detail={"old_instance": old_instance, "new_instance": new_instance},
        )
        return (
            sender,
            qr,
            "Reconecte: escaneie o novo QR no WhatsApp Business → Aparelhos conectados",
        )

    async def pair_status(
        self, account: Account, sender_id: str | None = None
    ) -> Sender:
        """Return sender and sync Evolution connection state if still pending."""
        sender = await self.require_for_account(account.id, sender_id)

        if (
            sender.provider == WhatsAppProviderKind.BAILEYS.value
            and sender.evolution_instance
            and sender.status
            in (
                SenderStatus.PENDING_PAIR.value,
                SenderStatus.REBIND_REQUIRED.value,
            )
        ):
            evo = self._evo()
            payload = await evo.connection_state(sender.evolution_instance)
            state = EvolutionClient.extract_connection_state(payload)
            if state in ("open", "connected"):
                await self.handle_connection_update(
                    sender.evolution_instance, state, phone=None
                )
                sender = await self.require_for_account(account.id, sender.id)

        return sender

    async def handle_connection_update(
        self,
        instance: str,
        state: str,
        phone: str | None = None,
    ) -> None:
        sender = await self.senders.find_by_instance(instance)
        if not sender:
            logger.warning("connection_update_unknown_instance", instance=instance)
            return

        state_l = (state or "").lower()
        if state_l in ("open", "connected"):
            sender.status = SenderStatus.ACTIVE.value
            sender.last_connected_at = datetime.now(timezone.utc)
            sender.last_healthy_at = sender.last_connected_at
            sender.provider = WhatsAppProviderKind.BAILEYS.value
            if phone:
                digits = normalize_phone(phone)
                if digits:
                    try:
                        sender.phone_e164 = validate_phone_e164(digits)
                    except ValueError:
                        sender.phone_e164 = (
                            digits if len(digits) >= 10 else sender.phone_e164
                        )
            await self.senders.save(sender)
            logger.info(
                "sender_connected_via_qr",
                sender_id=sender.id,
                instance=instance,
                phone=sender.phone_e164,
            )
        elif state_l in ("close", "closed", "disconnected", "refused"):
            if sender.status == SenderStatus.ACTIVE.value:
                sender.status = SenderStatus.REBIND_REQUIRED.value
                await self.senders.save(sender)
            logger.warning(
                "sender_disconnected",
                sender_id=sender.id,
                instance=instance,
                state=state,
            )

    async def rotate_key(
        self, account: Account, sender_id: str | None = None
    ) -> tuple[Sender, str]:
        sender = await self.require_for_account(account.id, sender_id)
        plaintext, key_hash, prefix = generate_api_key()
        sender.api_key_hash = key_hash
        sender.api_key_prefix = prefix
        await self.senders.save(sender)
        await self.audit.log(
            "sender_rotate_key", account_id=account.id, sender_id=sender.id
        )
        return sender, plaintext

    async def pause(
        self, account: Account, sender_id: str | None = None
    ) -> Sender:
        sender = await self.require_for_account(account.id, sender_id)
        sender.status = SenderStatus.PAUSED.value
        await self.senders.save(sender)
        return sender

    async def resume(
        self, account: Account, sender_id: str | None = None
    ) -> Sender:
        sender = await self.require_for_account(account.id, sender_id)
        if sender.status == SenderStatus.REVOKED.value:
            raise ForbiddenError("revoked", "Remetente revogado")
        if sender.phone_e164 or sender.last_connected_at:
            sender.status = SenderStatus.ACTIVE.value
        else:
            sender.status = SenderStatus.PENDING_PAIR.value
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
