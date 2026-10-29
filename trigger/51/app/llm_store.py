from __future__ import annotations

import base64
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from cryptography.fernet import Fernet, InvalidToken

from app.config import Settings


@dataclass
class LlmSnapshot:
    mode: str
    model: str
    base_url: str
    api_key: str
    updated_at: str | None

    @property
    def api_key_set(self) -> bool:
        return bool(self.api_key.strip())

    @property
    def api_key_hint(self) -> str:
        key = self.api_key.strip()
        if not key:
            return ""
        if len(key) <= 4:
            return "••••"
        return "…" + key[-4:]


class LlmStore:
    def __init__(self, path: Path, secret: str) -> None:
        self._path = path
        self._fernet = Fernet(self._fernet_key(secret))
        self._lock = Lock()

    @staticmethod
    def _fernet_key(secret: str) -> bytes:
        digest = hashlib.sha256((secret or "assistencia-local-dev").encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest)

    def defaults_from_settings(self, settings: Settings) -> LlmSnapshot:
        return LlmSnapshot(
            mode=(settings.llm_mode or "mock").strip().lower() or "mock",
            model=(settings.openai_model or "gpt-4o-mini").strip(),
            base_url=(settings.openai_base_url or "https://api.openai.com/v1").strip(),
            api_key=(settings.openai_api_key or "").strip(),
            updated_at=None,
        )

    def load(self, settings: Settings) -> LlmSnapshot:
        base = self.defaults_from_settings(settings)
        if not self._path.is_file():
            return base
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return base
        if not isinstance(raw, dict):
            return base
        mode = str(raw.get("mode") or base.mode).strip().lower()
        if mode not in {"mock", "openai"}:
            mode = "mock"
        model = str(raw.get("model") or base.model).strip() or base.model
        base_url = str(raw.get("base_url") or base.base_url).strip() or base.base_url
        api_key = base.api_key
        enc = raw.get("api_key_enc")
        if isinstance(enc, str) and enc.strip():
            try:
                api_key = self._fernet.decrypt(enc.encode("utf-8")).decode("utf-8")
            except (InvalidToken, ValueError):
                api_key = base.api_key
        updated = raw.get("updated_at")
        updated_at = str(updated) if isinstance(updated, str) and updated else None
        return LlmSnapshot(
            mode=mode,
            model=model,
            base_url=base_url,
            api_key=api_key.strip(),
            updated_at=updated_at,
        )

    def save(
        self,
        *,
        mode: str,
        model: str,
        base_url: str,
        api_key: str | None,
        previous: LlmSnapshot,
    ) -> LlmSnapshot:
        mode = mode.strip().lower()
        if mode not in {"mock", "openai"}:
            raise ValueError("Provedor inválido")
        model = model.strip() or previous.model
        base_url = base_url.strip() or previous.base_url
        if api_key is None or not api_key.strip():
            key = previous.api_key
        else:
            key = api_key.strip()
        updated_at = datetime.now(timezone.utc).isoformat()
        payload = {
            "mode": mode,
            "model": model,
            "base_url": base_url,
            "api_key_enc": self._fernet.encrypt(key.encode("utf-8")).decode("utf-8") if key else "",
            "updated_at": updated_at,
        }
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".tmp")
        with self._lock:
            tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            os.replace(tmp, self._path)
        return LlmSnapshot(
            mode=mode,
            model=model,
            base_url=base_url,
            api_key=key,
            updated_at=updated_at,
        )


def store_path() -> Path:
    return Path(os.environ.get("LLM_CONFIG_PATH", "/app/data/llm.json"))
