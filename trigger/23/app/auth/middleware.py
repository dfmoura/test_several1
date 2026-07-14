"""Middleware de autenticação — protege /api/* no backend (não só a UI)."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.auth.service import PAPEL_ADMIN, obter_usuario_por_token
from app.config import AUTH_SESSION_COOKIE, auth_disabled
from app.database import SessionLocal

# Endpoints públicos (sem sessão).
_PUBLIC_EXACT = frozenset(
    {
        "/api/health",
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/bootstrap",
        "/api/auth/bootstrap-status",
    }
)

# Prefixos que exigem papel admin (além do login).
_ADMIN_PREFIXES = (
    "/api/sistema",
    "/api/coleta",
    "/api/compras/coletar",
    "/api/compras/vencedores-cnpj",
    "/api/powerbi/coletar",
)


def _caminho_publico(path: str) -> bool:
    if path in _PUBLIC_EXACT:
        return True
    if path.startswith("/static/"):
        return True
    if path in ("/", "/favicon.ico", "/docs", "/openapi.json", "/redoc"):
        return True
    return False


def _exige_admin(path: str) -> bool:
    return any(path == p or path.startswith(p + "/") or path.startswith(p) for p in _ADMIN_PREFIXES)


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if auth_disabled():
            return await call_next(request)

        path = request.url.path

        # Logout e me precisam de sessão, mas tratamos nas rotas;
        # middleware exige login para qualquer /api/* não público.
        if not path.startswith("/api/"):
            return await call_next(request)

        if _caminho_publico(path):
            return await call_next(request)

        token = request.cookies.get(AUTH_SESSION_COOKIE)
        db = SessionLocal()
        try:
            user = obter_usuario_por_token(db, token)
        finally:
            db.close()

        if user is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "Autenticação necessária."},
            )

        if _exige_admin(path) and user.papel != PAPEL_ADMIN:
            return JSONResponse(
                status_code=403,
                content={"detail": "Acesso restrito a administradores."},
            )

        request.state.usuario = user
        return await call_next(request)
