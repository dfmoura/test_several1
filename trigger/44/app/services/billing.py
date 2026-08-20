from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.ids import new_id
from app.domain.enums import OnboardingStep, SenderStatus, SubscriptionStatus
from app.domain.exceptions import ForbiddenError
from app.integrations.billing.sandbox import SandboxBillingProvider
from app.models import Account, Sender, Subscription
from app.repositories import AuditRepository, SubscriptionRepository
from app.schemas import ApiDocsOut, SenderOut, SubscriptionOut


class BillingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.subs = SubscriptionRepository(session)
        self.audit = AuditRepository(session)
        self.provider = SandboxBillingProvider()
        self.settings = get_settings()

    def is_active(self, sub: Subscription | None) -> bool:
        if not sub:
            return False
        if sub.status != SubscriptionStatus.ACTIVE.value:
            return False
        if sub.current_period_end and sub.current_period_end < datetime.now(timezone.utc):
            return False
        return True

    async def require_active(self, account_id: str) -> Subscription:
        sub = await self.subs.get_for_account(account_id)
        if not self.is_active(sub):
            raise ForbiddenError(
                "subscription_required",
                "Assine a mensalidade para cadastrar o WhatsApp Business e enviar mensagens",
            )
        assert sub is not None
        return sub

    def to_out(self, sub: Subscription | None) -> SubscriptionOut:
        if not sub:
            return SubscriptionOut(status=SubscriptionStatus.NONE.value)
        return SubscriptionOut(
            id=sub.id,
            status=sub.status
            if self.is_active(sub)
            else (
                SubscriptionStatus.PAST_DUE.value
                if sub.status == SubscriptionStatus.ACTIVE.value
                else sub.status
            ),
            plan_code=sub.plan_code,
            plan_name=self.settings.plan_name,
            price_label=self.settings.plan_price_brl,
            provider=sub.provider,
            current_period_end=sub.current_period_end,
        )

    async def checkout(self, account: Account) -> Subscription:
        sub = await self.subs.get_for_account(account.id)
        result = await self.provider.checkout(account.id)
        if sub:
            sub.status = result.status
            sub.provider = result.provider
            sub.external_id = result.external_id
            sub.current_period_end = result.period_end
            sub.plan_code = self.settings.plan_code
            await self.subs.save(sub)
        else:
            sub = Subscription(
                id=new_id("sub"),
                account_id=account.id,
                plan_code=self.settings.plan_code,
                status=result.status,
                provider=result.provider,
                external_id=result.external_id,
                current_period_end=result.period_end,
            )
            await self.subs.create(sub)
        await self.audit.log(
            "subscription_activate",
            account_id=account.id,
            detail={"provider": result.provider, "external_id": result.external_id},
        )
        return sub


def onboarding_step(sub_active: bool, sender: Sender | None) -> str:
    if not sub_active:
        return OnboardingStep.BILLING.value
    if not sender or sender.status != SenderStatus.ACTIVE.value:
        return OnboardingStep.CONNECT.value
    return OnboardingStep.READY.value


def build_api_docs(sender: Sender | None, api_key_hint: str | None = None) -> ApiDocsOut | None:
    if not sender:
        return None
    settings = get_settings()
    base = settings.public_base_url.rstrip("/")
    url = f"{base}/v1/messages"
    # Never splice api_key_prefix (it is truncated with "…") into the curl —
    # that produced copy-paste tokens like "zpv_live_6KGQRKG…SEU_TOKEN".
    key = api_key_hint or "COLE_A_API_KEY_COMPLETA"
    body = {
        "external_id": "pedido-1001",
        "to": "5534999999999",
        "type": "text",
        "body": "Seu pedido #1001 foi confirmado.",
    }
    curl = (
        f"curl -X POST {url} \\\n"
        f"  -H \"Authorization: Bearer {key}\" \\\n"
        f"  -H \"Content-Type: application/json\" \\\n"
        f"  -d '{{\n"
        f'    "external_id": "pedido-1001",\n'
        f'    "to": "5534999999999",\n'
        f'    "type": "text",\n'
        f'    "body": "Seu pedido #1001 foi confirmado."\n'
        f"  }}'"
    )
    notes = [
        "A API key identifica o WhatsApp Business já cadastrado. O destino vai no campo `to`.",
        "Somente WhatsApp Business. A autenticação da Cloud API é persistente (token), não sessão de QR.",
        "Resposta 202 = enfileirada. Consulte GET /v1/messages/by-external/{external_id}.",
        "external_id é idempotente por remetente: reenviar o mesmo id não duplica a mensagem.",
        "Na Cloud API, texto livre respeita a janela de 24h da Meta; o sandbox local não aplica essa regra.",
        "A key completa já começa com zpv_live_. Não prefixe de novo e não quebre a linha no header Authorization.",
    ]
    return ApiDocsOut(
        method="POST",
        url=url,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        body=body,
        curl=curl,
        notes=notes,
    )


def sender_out(sender: Sender) -> SenderOut:
    return SenderOut.model_validate(sender)
