"""Middleware de autenticação — protege /api/* no backend (não só a UI)."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app import database
from app.auth.service import PAPEL_ADMIN, obter_usuario_por_token
from app.config import AUTH_SESSION_COOKIE, auth_disabled

_PUBLIC_EXACT = frozenset(
    {
        "/api/health",
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/bootstrap",
        "/api/auth/bootstrap-status",
        "/api/ops/acesso-publico",
    }
)

# Prefixos admin — telas fora de Análise (consulta não acessa via API).
# Org/consultas/compras/propostas/auth/me ficam fora: ACL e visão filial.
_ADMIN_PREFIXES = (
    "/api/auth/usuarios",
    "/api/auth/limites",
    "/api/alertas",
    "/api/coleta",
    "/api/enriquecimento",
    "/api/backlog",
    "/api/config",
    "/api/territorial",
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
    return any(path == p or path.startswith(p + "/") for p in _ADMIN_PREFIXES)


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if auth_disabled():
            return await call_next(request)

        path = request.url.path

        if not path.startswith("/api/"):
            return await call_next(request)

        if _caminho_publico(path):
            return await call_next(request)

        token = request.cookies.get(AUTH_SESSION_COOKIE)
        db = database.SessionLocal()
        try:
            user = obter_usuario_por_token(db, token)
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

            # Janela operacional: só admin permanece com API; consulta é barrada.
            if user.papel != PAPEL_ADMIN:
                from app.ops.acesso import (
                    acesso_restrito_ativo,
                    mensagem_acesso_restrito,
                )

                if acesso_restrito_ativo(db):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": mensagem_acesso_restrito(db)},
                    )

            request.state.usuario = user
        finally:
            db.close()

        return await call_next(request)
