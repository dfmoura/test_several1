from __future__ import annotations

import secrets
import time
from dataclasses import dataclass, field
from threading import Lock


@dataclass
class Turn:
    role: str
    content: str


@dataclass
class Session:
    id: str
    created_at: float
    updated_at: float
    turns: list[Turn] = field(default_factory=list)
    mock_step: int = 0
    finalized: bool = False

    def touch(self) -> None:
        self.updated_at = time.time()


class SessionStore:
    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._ttl = ttl_seconds
        self._items: dict[str, Session] = {}
        self._lock = Lock()

    def create(self) -> Session:
        self._purge()
        sid = "asst_" + secrets.token_urlsafe(16)
        now = time.time()
        sess = Session(id=sid, created_at=now, updated_at=now)
        with self._lock:
            self._items[sid] = sess
        return sess

    def get(self, session_id: str) -> Session | None:
        self._purge()
        with self._lock:
            sess = self._items.get(session_id)
            if not sess:
                return None
            sess.touch()
            return sess

    def _purge(self) -> None:
        cutoff = time.time() - self._ttl
        with self._lock:
            dead = [k for k, v in self._items.items() if v.updated_at < cutoff]
            for k in dead:
                del self._items[k]
