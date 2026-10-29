from __future__ import annotations

import json
import re
from typing import Protocol

import httpx

from app.sessions import Session, Turn

SYSTEM_BRIEF = (
    "Você ajuda o cliente da Trigger a formular uma demanda de software/dados. "
    "Entreviste com perguntas curtas: o que acontece hoje, onde trava, o que deve "
    "ficar pronto. Não peça senha, usuário, VPN nem acessos. Não invente valor, "
    "prazo contratual nem tipo de contrato. Tom direto, em português do Brasil. "
    "Quando o cliente pedir para finalizar ou houver informação suficiente, "
    "produza um texto pronto para o campo descrição da demanda."
)

MOCK_OPENING = (
    "Vamos formular a demanda juntos. Em uma ou duas frases: o que acontece hoje "
    "e onde trava no dia a dia?"
)

MOCK_FOLLOW = (
    "Entendi. O que a Trigger deve deixar pronto — o resultado que você quer "
    "ver funcionando quando a demanda terminar?"
)

MOCK_READY = (
    "Tenho o suficiente para montar o pedido. Quando quiser, use "
    "«Usar no formulário» para preencher a descrição. Se preferir, "
    "acrescente mais um detalhe antes."
)


class Engine(Protocol):
    def opening(self) -> str: ...

    def reply(self, session: Session, user_message: str) -> str: ...

    def finalize(self, session: Session) -> str: ...


class MockEngine:
    def opening(self) -> str:
        return MOCK_OPENING

    def reply(self, session: Session, user_message: str) -> str:
        session.turns.append(Turn("user", user_message))
        step = session.mock_step
        if step == 0:
            text = MOCK_FOLLOW
            session.mock_step = 1
        else:
            text = MOCK_READY
            session.mock_step = max(step, 2)
        session.turns.append(Turn("assistant", text))
        return text

    def finalize(self, session: Session) -> str:
        user_bits = [t.content.strip() for t in session.turns if t.role == "user" and t.content.strip()]
        if not user_bits:
            return (
                "Descrição da demanda\n"
                "O processo atual ainda depende de trabalho manual. "
                "A Trigger deve entregar a solução alinhada no pedido, sem retrabalho."
            )
        titulo = user_bits[0].splitlines()[0][:160]
        corpo = "\n\n".join(user_bits)
        return f"{titulo}\n\n{corpo}"[:5000]


class OpenAIEngine:
    def __init__(self, settings) -> None:
        self._settings = settings

    def opening(self) -> str:
        return MOCK_OPENING

    def reply(self, session: Session, user_message: str) -> str:
        session.turns.append(Turn("user", user_message))
        text = self._chat(session, finalize=False)
        session.turns.append(Turn("assistant", text))
        return text

    def finalize(self, session: Session) -> str:
        raw = self._chat(session, finalize=True)
        limite = int(getattr(self._settings, "max_descricao_chars", 5000) or 5000)
        return self._extract_descricao(raw)[:limite]

    def _chat(self, session: Session, *, finalize: bool) -> str:
        messages = [{"role": "system", "content": SYSTEM_BRIEF}]
        for turn in session.turns:
            messages.append({"role": turn.role, "content": turn.content})
        if finalize:
            messages.append(
                {
                    "role": "user",
                    "content": (
                        "Finalize agora. Responda só com JSON: "
                        '{"descricao":"..."} — texto pronto para o campo descrição, '
                        "máximo 5000 caracteres, sem senhas nem acessos."
                    ),
                }
            )
        if not self._settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY ausente")
        url = self._settings.openai_base_url.rstrip("/") + "/chat/completions"
        payload = {
            "model": self._settings.openai_model,
            "messages": messages,
            "temperature": 0.3,
        }
        with httpx.Client(timeout=45.0) as client:
            resp = client.post(
                url,
                headers={
                    "Authorization": f"Bearer {self._settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
        return str(data["choices"][0]["message"]["content"]).strip()

    def _extract_descricao(self, raw: str) -> str:
        raw = raw.strip()
        try:
            data = json.loads(raw)
            if isinstance(data, dict) and data.get("descricao"):
                return str(data["descricao"]).strip()
        except json.JSONDecodeError:
            pass
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            try:
                data = json.loads(match.group(0))
                if isinstance(data, dict) and data.get("descricao"):
                    return str(data["descricao"]).strip()
            except json.JSONDecodeError:
                pass
        return raw


def build_engine(settings, mode: str | None = None) -> Engine:
    resolved = (mode or getattr(settings, "llm_mode", "mock") or "mock").strip().lower()
    if resolved == "openai" and getattr(settings, "openai_api_key", ""):
        return OpenAIEngine(settings)
    return MockEngine()
