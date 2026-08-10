from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.ids import new_id
from app.core.logging import get_logger
from app.domain.enums import SenderStatus
from app.domain.exceptions import NotFoundError
from app.integrations.evolution import EvolutionClient
from app.models import Sender
from app.queue.topology import QueuePublisher
from app.repositories import AuditRepository, SenderRepository
from app.services.auth import SenderAuthService

logger = get_logger(__name__)


class PairingService:
    def __init__(
        self,
        session: AsyncSession,
        evolution: EvolutionClient,
        publisher: QueuePublisher | None = None,
    ):
        self.session = session
        self.repo = SenderRepository(session)
        self.audit = AuditRepository(session)
        self.evolution = evolution
        self.publisher = publisher
        self.settings = get_settings()

    async def create_sender(
        self, name: str, rate_limit: int | None = None
    ) -> tuple[Sender, str]:
        plaintext, key_hash, display_prefix = SenderAuthService.mint_key()
        sender_id = new_id("snd")
        # Evolution instance names: alphanumeric + underscore
        instance = sender_id.replace("-", "_")

        sender = Sender(
            id=sender_id,
            name=name.strip(),
            evolution_instance=instance,
            api_key_hash=key_hash,
            api_key_prefix=display_prefix,
            status=SenderStatus.PENDING_PAIR.value,
            rate_limit_per_minute=rate_limit
            or self.settings.default_rate_limit_per_minute,
        )
        await self.repo.create(sender)

        if self.publisher:
            await self.publisher.ensure_sender(sender.id)

        await self.audit.log(
            "sender_create",
            sender_id=sender.id,
            detail={"name": name, "instance": instance},
        )
        logger.info("sender_created", sender_id=sender.id, name=name)
        return sender, plaintext

    async def get_sender(self, sender_id: str) -> Sender:
        sender = await self.repo.get(sender_id)
        if not sender:
            raise NotFoundError(f"Sender {sender_id} not found")
        return sender

    async def list_senders(self) -> list[Sender]:
        return await self.repo.list_all()

    async def pair(self, sender_id: str) -> dict:
        sender = await self.get_sender(sender_id)
        if sender.status == SenderStatus.REVOKED.value:
            raise NotFoundError("Sender revoked")

        await self.evolution.create_instance(sender.evolution_instance)
        connect_payload = await self.evolution.connect(sender.evolution_instance)
        qr = EvolutionClient.extract_qrcode(connect_payload)

        # Also check create response nested qrcode
        if not qr:
            create_payload = await self.evolution.create_instance(
                sender.evolution_instance
            )
            qr = EvolutionClient.extract_qrcode(create_payload)

        if sender.status not in (
            SenderStatus.ACTIVE.value,
            SenderStatus.PAUSED.value,
        ):
            sender.status = SenderStatus.PENDING_PAIR.value
            await self.repo.save(sender)

        await self.audit.log(
            "sender_pair",
            sender_id=sender.id,
            detail={"has_qr": bool(qr)},
        )
        return {
            "sender_id": sender.id,
            "status": sender.status,
            "qrcode_base64": qr,
            "instance": sender.evolution_instance,
            "detail": "Scan QR with WhatsApp → Aparelhos conectados",
        }

    async def rebind(self, sender_id: str) -> dict:
        sender = await self.get_sender(sender_id)
        sender.status = SenderStatus.REBIND_REQUIRED.value
        await self.repo.save(sender)

        old_instance = sender.evolution_instance
        await self.evolution.logout(old_instance)
        await self.evolution.delete_instance(old_instance)

        # Rotate instance name so Evolution starts clean
        new_instance = f"{sender.id.replace('-', '_')}_{ulid_suffix()}"
        sender.evolution_instance = new_instance
        sender.phone_e164 = None
        sender.status = SenderStatus.PENDING_PAIR.value
        await self.repo.save(sender)

        await self.evolution.create_instance(new_instance)
        connect_payload = await self.evolution.connect(new_instance)
        qr = EvolutionClient.extract_qrcode(connect_payload)

        await self.audit.log(
            "sender_rebind",
            sender_id=sender.id,
            detail={"old_instance": old_instance, "new_instance": new_instance},
        )
        return {
            "sender_id": sender.id,
            "status": sender.status,
            "qrcode_base64": qr,
            "instance": new_instance,
            "detail": "Rebind: scan QR on the new device, then resume if paused",
        }

    async def pause(self, sender_id: str) -> Sender:
        sender = await self.get_sender(sender_id)
        sender.status = SenderStatus.PAUSED.value
        await self.repo.save(sender)
        await self.audit.log("sender_pause", sender_id=sender.id)
        return sender

    async def resume(self, sender_id: str) -> Sender:
        sender = await self.get_sender(sender_id)
        # Only resume to active if previously connected
        if sender.phone_e164 or sender.last_connected_at:
            sender.status = SenderStatus.ACTIVE.value
        else:
            sender.status = SenderStatus.PENDING_PAIR.value
        await self.repo.save(sender)
        await self.audit.log(
            "sender_resume",
            sender_id=sender.id,
            detail={"status": sender.status},
        )
        return sender

    async def rotate_key(self, sender_id: str) -> tuple[Sender, str]:
        sender = await self.get_sender(sender_id)
        plaintext, key_hash, display_prefix = SenderAuthService.mint_key()
        sender.api_key_hash = key_hash
        sender.api_key_prefix = display_prefix
        await self.repo.save(sender)
        await self.audit.log("sender_rotate_key", sender_id=sender.id)
        return sender, plaintext

    async def handle_connection_update(
        self, instance: str, state: str, phone: str | None = None
    ) -> None:
        sender = await self.repo.find_by_instance(instance)
        if not sender:
            logger.warning("connection_update_unknown_instance", instance=instance)
            return

        state_l = (state or "").lower()
        if state_l in ("open", "connected"):
            sender.status = SenderStatus.ACTIVE.value
            sender.last_connected_at = datetime.now(timezone.utc)
            if phone:
                sender.phone_e164 = phone
            await self.repo.save(sender)
            logger.info(
                "sender_connected",
                sender_id=sender.id,
                instance=instance,
            )
        elif state_l in ("close", "closed", "disconnected", "refused"):
            if sender.status == SenderStatus.ACTIVE.value:
                sender.status = SenderStatus.REBIND_REQUIRED.value
                await self.repo.save(sender)
            logger.warning(
                "sender_disconnected",
                sender_id=sender.id,
                instance=instance,
                state=state,
            )


def ulid_suffix() -> str:
    from app.core.ids import new_id

    return new_id("rb")[-8:].lower()
