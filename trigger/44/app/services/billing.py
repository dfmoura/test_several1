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


def onboarding_step(
    sub_active: bool,
    sender: Sender | None = None,
    senders: list[Sender] | None = None,
) -> str:
    if not sub_active:
        return OnboardingStep.BILLING.value
    rows = senders if senders is not None else ([sender] if sender else [])
    if any(s.status == SenderStatus.ACTIVE.value for s in rows):
        return OnboardingStep.READY.value
    return OnboardingStep.CONNECT.value


def pick_sender_for_docs(
    senders: list[Sender], preferred_id: str | None = None
) -> Sender | None:
    if preferred_id:
        for s in senders:
            if s.id == preferred_id:
                return s
    active = [s for s in senders if s.status == SenderStatus.ACTIVE.value]
    if active:
        return active[0]
    return senders[0] if senders else None


def build_api_docs(sender: Sender | None, api_key_hint: str | None = None) -> ApiDocsOut | None:
    if not sender:
        return None
    settings = get_settings()
    base = settings.public_base_url.rstrip("/")
    url = f"{base}/v1/messages"
    # Never splice api_key_prefix (it is truncated with "…") into the curl —
    # that produced copy-paste tokens like "zpv_live_6KGQRKG…SEU_TOKEN".
    # Placeholder is an env-var name, not a token the user should hunt for.
    key = api_key_hint or "$ZAPVIA_API_KEY"
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
    label_bit = f" ({sender.label})" if getattr(sender, "label", None) else ""
    notes = [
        "A API key (zpv_live_…) autentica o seu sistema e amarra o envio a este remetente"
        f"{label_bit}. Não é senha da conta, não é sessão do painel, não é token da Meta "
        "e não é o prefixo truncado que o painel mostra.",
        "Cada número WhatsApp = um remetente = uma API key = uma fila `q.sender.{id}`. "
        "Nos seus sistemas, guarde a key no setup da entidade que envia (loja, cliente, unidade).",
        "O QR só conecta o remetente. A requisição traz destino (`to`) e texto (`body`); "
        "o Zap que envia já está no cadastro.",
        "Se não guardou a key na conexão, gere uma nova em Como enviar. O WhatsApp permanece "
        "conectado; a key anterior deixa de funcionar.",
        "Resposta 202 = enfileirada em `q.sender.{id}`. Consulte "
        "GET /v1/messages/by-external/{external_id} com o mesmo Bearer.",
        "external_id é idempotente por remetente: reenviar o mesmo id não duplica a mensagem.",
        "A key completa já começa com zpv_live_. Não prefixe de novo e não quebre o header "
        "Authorization no meio da linha.",
        "Na Cloud API, texto livre respeita a janela de 24h da Meta; sandbox/QR local não aplica "
        "essa regra.",
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
