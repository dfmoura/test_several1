"""Aplicação FastAPI — Observatório Social Brasil."""

from __future__ import annotations

import mimetypes
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

# Garantir MIME de WebP (alguns hosts Linux não registram .webp).
mimetypes.add_type("image/webp", ".webp")

from app.acompanhamento import router as acompanhamento_router
from app.alertas import router as alertas_router
from app.auth import router as auth_router
from app.auth.middleware import AuthMiddleware
from app.backlog import router as backlog_router
from app.coleta import router as coleta_router
from app.coleta.agendamento import iniciar_scheduler, parar_scheduler
from app.compras.router import router as compras_router
from app.config import APP_VERSION, BASE_DIR, assert_power_bi_proibido
from app.config_coleta import router as config_router
from app.consultas.router import router as consultas_router
from app.database import init_db
from app.enriquecimento import router as enriquecimento_router
from app.health import router as health_router
from app.mapa import router as mapa_router
from app.ops import router as ops_router
from app.org import router as org_router
from app.propostas_abertas import router as propostas_abertas_router
from app.territorial import router as territorial_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    assert_power_bi_proibido()
    init_db()
    iniciar_scheduler()
    yield
    parar_scheduler()


app = FastAPI(
    title="Observatório Social Brasil · Compras públicas",
    version=APP_VERSION,
    description=(
        "Plataforma multiunidade v1.0 — Fase 9 (estabilização; "
        "alertas e comparativos nativos; sem Power BI)."
    ),
    lifespan=lifespan,
)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
app.add_middleware(AuthMiddleware)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(org_router)
app.include_router(territorial_router)
app.include_router(config_router)
app.include_router(compras_router)
app.include_router(propostas_abertas_router)
app.include_router(acompanhamento_router)
app.include_router(coleta_router)
app.include_router(enriquecimento_router)
app.include_router(consultas_router)
app.include_router(mapa_router)
app.include_router(ops_router)
app.include_router(alertas_router)
app.include_router(backlog_router)

STATIC = BASE_DIR / "app" / "static"
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    ico = STATIC / "favicon.ico"
    if ico.is_file():
        return FileResponse(ico)
    return FileResponse(STATIC / "index.html")
