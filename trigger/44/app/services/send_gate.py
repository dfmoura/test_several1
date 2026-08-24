from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import ChannelKind, SenderStatus
from app.domain.exceptions import ForbiddenError
from app.models import Sender
from app.repositories import SubscriptionRepository
from app.services.billing import BillingService


class SenderGate:
    """Única regra de prontidão para enviar: assinatura + Zap cadastrado ativo.

    API (API key) e portal (sessão) passam por aqui antes de enfileirar.
    O worker ainda revalida o remetente na hora do disparo.
    """

    def __init__(
        self,
        session: AsyncSession | None = None,
        billing: BillingService | None = None,
        subs: SubscriptionRepository | None = None,
    ):
        if billing is None:
            if session is None:
                raise ValueError("SenderGate requires session or billing")
            billing = BillingService(session)
        self.billing = billing
        self.subs = subs or getattr(billing, "subs", None)

    async def require_ready(self, sender: Sender | None) -> Sender:
        if sender is None:
            raise ForbiddenError(
                "not_ready",
                "Conecte o WhatsApp Business antes de enviar.",
            )
        sub = None
        if self.subs is not None:
            sub = await self.subs.get_for_account(sender.account_id)
        if not self.billing.is_active(sub):
            raise ForbiddenError(
                "subscription_inactive",
                "Mensalidade inativa. Regularize no painel para continuar enviando.",
            )
        self.assert_sendable(sender)
        return sender

    @staticmethod
    def assert_sendable(sender: Sender) -> None:
        if sender.status == SenderStatus.PAUSED.value:
            raise ForbiddenError("sender_paused", "Remetente pausado")
        if sender.status == SenderStatus.CREDENTIALS_INVALID.value:
            raise ForbiddenError(
                "credentials_invalid",
                "Credencial Cloud API inválida. Atualize o token no painel — a API key permanece a mesma.",
            )
        if sender.status == SenderStatus.PENDING.value:
            raise ForbiddenError(
                "not_connected",
                "WhatsApp Business ainda não foi conectado",
            )
        if sender.status == SenderStatus.PENDING_PAIR.value:
            raise ForbiddenError(
                "not_paired",
                "Escaneie o QR Code no painel para ativar os envios",
            )
        if sender.status == SenderStatus.REBIND_REQUIRED.value:
            raise ForbiddenError(
                "rebind_required",
                "Sessão desconectada. Gere um novo QR no painel (Reconectar).",
            )
        if sender.status != SenderStatus.ACTIVE.value:
            raise ForbiddenError(
                "sender_inactive",
                f"Remetente com status {sender.status}",
            )
        if sender.channel != ChannelKind.WHATSAPP_BUSINESS.value:
            raise ForbiddenError(
                "business_only",
                "Somente WhatsApp Business é suportado",
            )
