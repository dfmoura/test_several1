from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.logging import get_logger
from app.core.metrics import metrics_store
from app.integrations.ai.base import AIProvider
from app.integrations.ai.factory import AIProviderFactory
from app.integrations.evolution.client import EvolutionClient
from app.memory.context_memory import ContextMemory
from app.prompts.loader import PromptLoader, get_prompt_loader
from app.schemas.message import ChatMessage
from app.schemas.webhook import IncomingMessage
from app.services.conversation_service import ConversationService
from app.services.lead_service import LeadExtractor
from app.services.market_service import MarketService
from app.services.user_service import UserService
from app.utils.contact_profile import format_contact_profile, format_lead_context

logger = get_logger(__name__)


class ChatService:
    """Orchestrates memory → AI → persistence → WhatsApp reply."""

    def __init__(
        self,
        session: AsyncSession,
        *,
        ai: AIProvider | None = None,
        evolution: EvolutionClient | None = None,
        memory: ContextMemory | None = None,
        prompts: PromptLoader | None = None,
        market: MarketService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._session = session
        self._settings = settings or get_settings()
        self._users = UserService(session)
        self._conversations = ConversationService(session)
        self._ai = ai or AIProviderFactory.create(self._settings)
        self._evolution = evolution or EvolutionClient(self._settings)
        self._memory = memory or ContextMemory()
        self._prompts = prompts or get_prompt_loader()
        self._owns_ai = ai is None
        self._owns_evolution = evolution is None
        self._owns_market = market is None
        if market is not None:
            self._market: MarketService | None = market
        elif self._settings.market_enabled:
            self._market = MarketService(settings=self._settings)
        else:
            self._market = None

    async def handle_incoming(self, incoming: IncomingMessage) -> str | None:
        metrics_store.incr_received()
        logger.info(
            "message_received",
            phone=incoming.phone,
            name=incoming.name,
            chars=len(incoming.text),
        )

        if incoming.from_me:
            logger.debug("skip_from_me", phone=incoming.phone)
            return None

        text = (incoming.text or "").strip()
        if not text:
            logger.debug("skip_empty_message", phone=incoming.phone)
            return None

        user = await self._users.get_or_create(incoming.phone, incoming.name)
        conversation = await self._conversations.get_or_create_active(user.id)

        await self._conversations.add_message(
            conversation_id=conversation.id,
            role="user",
            content=text,
        )
        context = await self._memory.append_message(incoming.phone, "user", text)

        contact_profile = ""
        if self._settings.contact_kb_enabled:
            try:
                contact_profile = format_contact_profile(
                    relation=user.relation,
                    notes=user.notes,
                )
            except Exception:
                # Fail-open: never block a reply because of profile formatting.
                logger.exception(
                    "contact_profile_skipped",
                    phone=incoming.phone,
                )
                contact_profile = ""

        if self._settings.lead_capture_enabled:
            try:
                lead_block = format_lead_context(
                    segment=user.lead_segment,
                    system=user.lead_system,
                    need=user.lead_need,
                    next_step=user.lead_next_step,
                    status=user.lead_status,
                )
                if lead_block:
                    contact_profile = (
                        f"{contact_profile}\n\n{lead_block}".strip()
                        if contact_profile
                        else lead_block
                    )
            except Exception:
                logger.exception("lead_context_skipped", phone=incoming.phone)

        market_context = ""
        if self._market is not None:
            try:
                quotes = await self._market.quotes_for_text(text)
                market_context = self._market.format_for_prompt(quotes)
            except Exception:
                # Fail-open: market data is a bonus, never block a reply.
                logger.exception("market_context_skipped", phone=incoming.phone)
                market_context = ""

        system_prompt = self._prompts.build_system_prompt(
            owner_name=self._settings.owner_name,
            user_name=user.name or incoming.name,
            summary=context.summary,
            contact_profile=contact_profile,
            market_context=market_context,
        )

        history: list[ChatMessage] = list(context.messages)

        try:
            ai_result = await self._ai.generate(history, system_prompt=system_prompt)
            metrics_store.record_ai(
                latency_ms=ai_result.latency_ms,
                tokens=ai_result.total_tokens,
            )
        except Exception:
            metrics_store.record_ai(latency_ms=0, tokens=0, error=True)
            logger.exception("ai_generation_failed", phone=incoming.phone)
            raise

        reply = ai_result.content.strip()
        if not reply:
            reply = "Me dá um segundo que já te respondo."

        await self._conversations.add_message(
            conversation_id=conversation.id,
            role="assistant",
            content=reply,
        )
        await self._memory.append_message(incoming.phone, "assistant", reply)

        await self._evolution.send_text(incoming.phone, reply)
        metrics_store.incr_sent()

        logger.info(
            "reply_completed",
            phone=incoming.phone,
            latency_ms=ai_result.latency_ms,
            tokens=ai_result.total_tokens,
        )

        if self._settings.lead_capture_enabled:
            # Best-effort: runs after the reply is sent, never blocks it.
            try:
                await self._capture_lead(user.phone, history, reply)
            except Exception:
                logger.exception("lead_capture_skipped", phone=incoming.phone)

        return reply

    async def _capture_lead(
        self,
        phone: str,
        history: list[ChatMessage],
        reply: str,
    ) -> None:
        extractor = LeadExtractor(self._ai)
        info = await extractor.extract(
            history=history,
            reply=reply,
            owner_name=self._settings.owner_name,
        )
        if info is None or not info.eh_lead or not info.has_content():
            return

        await self._users.update_lead(
            phone,
            status=info.status,
            segment=info.segmento,
            system=info.sistema_atual,
            need=info.necessidade,
            next_step=info.proximo_passo,
        )
        logger.info("lead_captured", phone=phone, status=info.status or "n/a")

    async def close(self) -> None:
        if self._owns_ai:
            await self._ai.close()
        if self._owns_evolution:
            await self._evolution.close()
        if self._owns_market and self._market is not None:
            await self._market.close()
