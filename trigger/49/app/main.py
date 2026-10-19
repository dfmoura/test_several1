from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.config import COOKIE
from app.contas import garantir_bootstrap, principal_por_token
from app.db import SessionLocal
from app.health import router as health_router
from app.rotas import router as api_router

_STATIC = Path(__file__).resolve().parent / "static"
_PUBLICOS = {"/api/health"}


class SessaoMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if not path.startswith("/api/") or path in _PUBLICOS:
            return await call_next(request)
        if path == "/api/sessao" and request.method == "POST":
            return await call_next(request)
        db = SessionLocal()
        try:
            principal = principal_por_token(db, request.cookies.get(COOKIE))
        finally:
            db.close()
        if principal is None:
            return JSONResponse(status_code=401, content={"detail": "Autenticação necessária."})
        request.state.principal = principal
        return await call_next(request)


@asynccontextmanager
async def _vida(app: FastAPI):
    db = SessionLocal()
    try:
        garantir_bootstrap(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Observatório Social Brasil — PNCP",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=_vida,
)
app.add_middleware(SessaoMiddleware)
app.include_router(health_router)
app.include_router(api_router)
app.mount("/static", StaticFiles(directory=_STATIC), name="static")


@app.get("/")
def raiz():
    return FileResponse(_STATIC / "index.html", media_type="text/html; charset=utf-8")
