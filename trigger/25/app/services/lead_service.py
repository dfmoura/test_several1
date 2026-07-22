"""Extract structured lead data from a conversation.

Runs a lightweight extraction pass with the configured AI provider and returns
a normalized :class:`LeadInfo`. Everything here is best-effort / fail-open: any
error returns ``None`` and never blocks the reply that was already sent.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from app.core.logging import get_logger
from app.integrations.ai.base import AIProvider
from app.schemas.message import ChatMessage

logger = get_logger(__name__)

VALID_STATUS = {"novo", "qualificando", "quente", "frio", "descartado"}

_EXTRACTION_SYSTEM = """Você é um analista comercial. Leia a conversa de WhatsApp entre um possível cliente e {owner_name} (da Trigger Data Intelligence, que cria sistemas e faz consultoria de ERP) e extraia os dados do lead.

Responda SOMENTE com um objeto JSON válido, sem texto antes ou depois, neste formato:
{{
  "eh_lead": true|false,
  "segmento": "área/negócio do contato, ex: condomínio, indústria, comércio",
  "sistema_atual": "ERP ou sistema que ele usa hoje, se citado",
  "necessidade": "a dor ou o que ele precisa resolver",
  "proximo_passo": "o que ficou combinado ou o próximo passo sugerido",
  "status": "novo|qualificando|quente|frio|descartado",
  "resumo": "1 frase resumindo o lead"
}}

Regras:
- "eh_lead" é false quando for contato pessoal, amigo, família ou assunto sem relação com negócio/sistemas. Nesse caso deixe os outros campos vazios.
- Use "" para qualquer campo que ainda não apareceu na conversa. Não invente.
- "quente" = demonstrou intenção clara ou pediu proposta/próximo passo. "frio" = pouco engajado. "qualificando" = ainda entendendo a necessidade. "novo" = mal começou.
- Escreva os valores em português, curtos."""


@dataclass
class LeadInfo:
    eh_lead: bool = False
    segmento: str = ""
    sistema_atual: str = ""
    necessidade: str = ""
    proximo_passo: str = ""
    status: str = ""
    resumo: str = ""

    def has_content(self) -> bool:
        return bool(
            self.segmento
            or self.sistema_atual
            or self.necessidade
            or self.proximo_passo
            or self.status
        )


class LeadExtractor:
    """Extract lead qualification data from a conversation, fail-open."""

    def __init__(self, ai: AIProvider) -> None:
        self._ai = ai

    async def extract(
        self,
        *,
        history: list[ChatMessage],
        reply: str,
        owner_name: str,
    ) -> LeadInfo | None:
        transcript = self._render(history, reply, owner_name)
        if not transcript.strip():
            return None

        system_prompt = _EXTRACTION_SYSTEM.format(owner_name=owner_name)
        messages = [
            ChatMessage(role="user", content=f"Conversa:\n{transcript}")
        ]

        try:
            result = await self._ai.generate(messages, system_prompt=system_prompt)
        except Exception:
            logger.exception("lead_extract_ai_failed")
            return None

        return self._parse(result.content)

    @staticmethod
    def _render(history: list[ChatMessage], reply: str, owner_name: str) -> str:
        lines: list[str] = []
        for message in history:
            if message.role == "user":
                lines.append(f"cliente: {message.content}")
            elif message.role == "assistant":
                lines.append(f"{owner_name}: {message.content}")
        reply_clean = (reply or "").strip()
        if reply_clean:
            lines.append(f"{owner_name}: {reply_clean}")
        return "\n".join(lines)

    @staticmethod
    def _parse(raw: str) -> LeadInfo | None:
        if not raw:
            return None

        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            logger.warning("lead_extract_no_json", raw=raw[:200])
            return None

        try:
            data = json.loads(match.group(0))
        except (json.JSONDecodeError, ValueError):
            logger.warning("lead_extract_bad_json", raw=match.group(0)[:200])
            return None

        if not isinstance(data, dict):
            return None

        status = str(data.get("status") or "").strip().lower()
        if status not in VALID_STATUS:
            status = ""

        return LeadInfo(
            eh_lead=bool(data.get("eh_lead")),
            segmento=str(data.get("segmento") or "").strip(),
            sistema_atual=str(data.get("sistema_atual") or "").strip(),
            necessidade=str(data.get("necessidade") or "").strip(),
            proximo_passo=str(data.get("proximo_passo") or "").strip(),
            status=status,
            resumo=str(data.get("resumo") or "").strip(),
        )
