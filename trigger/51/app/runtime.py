from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.config import Settings, get_settings
from app.engine import Engine, MockEngine, OpenAIEngine, build_engine
from app.llm_store import LlmSnapshot, LlmStore, store_path
from app.sessions import SessionStore


@dataclass
class EngineSettings:
    """Compatível com OpenAIEngine (mesmos atributos que Settings)."""

    openai_api_key: str
    openai_base_url: str
    openai_model: str
    max_descricao_chars: int = 5000


class Runtime:
    def __init__(self) -> None:
        self.settings: Settings = get_settings()
        self.store = SessionStore(ttl_seconds=self.settings.session_ttl_seconds)
        self.llm_store = LlmStore(store_path(), self.settings.api_key)
        self.llm: LlmSnapshot = self.llm_store.load(self.settings)
        self.engine: Engine = self._build()

    def _build(self) -> Engine:
        return build_engine(self._engine_settings(), self.llm.mode)

    def _engine_settings(self) -> EngineSettings:
        return EngineSettings(
            openai_api_key=self.llm.api_key,
            openai_base_url=self.llm.base_url,
            openai_model=self.llm.model,
            max_descricao_chars=self.settings.max_descricao_chars,
        )

    def reload(self) -> LlmSnapshot:
        self.llm = self.llm_store.load(self.settings)
        self.engine = self._build()
        return self.llm

    def apply(
        self,
        *,
        mode: str,
        model: str,
        base_url: str,
        api_key: str | None,
    ) -> LlmSnapshot:
        self.llm = self.llm_store.save(
            mode=mode,
            model=model,
            base_url=base_url,
            api_key=api_key,
            previous=self.llm,
        )
        self.engine = self._build()
        return self.llm

    def public_llm(self) -> dict:
        return {
            "mode": self.llm.mode,
            "model": self.llm.model,
            "base_url": self.llm.base_url,
            "api_key_set": self.llm.api_key_set,
            "api_key_hint": self.llm.api_key_hint,
            "updated_at": self.llm.updated_at,
            "effective_mode": self.effective_mode(),
        }

    def effective_mode(self) -> str:
        if self.llm.mode == "openai" and self.llm.api_key_set:
            return "openai"
        return "mock"

    def test_llm(self) -> dict:
        mode = self.effective_mode()
        if mode == "mock":
            return {
                "ok": True,
                "mode": "mock",
                "detail": "Motor mock ativo. Conversas locais sem provedor externo.",
            }
        url = self.llm.base_url.rstrip("/") + "/chat/completions"
        payload = {
            "model": self.llm.model,
            "messages": [
                {
                    "role": "user",
                    "content": "Responda só com a palavra OK.",
                }
            ],
            "max_tokens": 8,
            "temperature": 0,
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {self.llm.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
            if resp.status_code >= 400:
                return {
                    "ok": False,
                    "mode": "openai",
                    "detail": f"Provedor recusou ({resp.status_code}). Confira token, modelo e URL.",
                }
        except httpx.HTTPError:
            return {
                "ok": False,
                "mode": "openai",
                "detail": "Não foi possível alcançar o provedor. Confira a URL e a rede.",
            }
        return {
            "ok": True,
            "mode": "openai",
            "detail": f"Conexão ok com o modelo {self.llm.model}.",
        }


runtime = Runtime()
