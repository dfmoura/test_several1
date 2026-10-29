"""Autenticação local: login por sessão, papéis e teto de contas."""

from app.auth.deps import get_current_user, require_admin, require_login
from app.auth.router import router

__all__ = [
    "router",
    "require_login",
    "require_admin",
    "get_current_user",
]
