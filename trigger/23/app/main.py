"""Aplicação FastAPI — composição de routers (sem regra de domínio aqui)."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app import agendamento
from app.analise_preco import router as analise_preco_router
from app.auth import router as auth_router
from app.auth.middleware import AuthMiddleware
from app.coleta_api import router as coleta_router
from app.compras.api import router as compras_router
from app.config import BASE_DIR
from app.consulta_processo import router as consulta_processo_router
from app.dashboard_gerencial import router as dashboard_router
from app.database import init_db
from app.distribuicao_localidade import router as distribuicao_localidade_router
from app.health import router as health_router
from app.ia_provedores import router as ia_provedores_router
from app.modalidades_vinculo import router as modalidades_router
from app.observadores import router as observadores_router
from app.orgaos_vinculo import router as orgaos_router
from app.powerbi import router as powerbi_router
from app.propostas_abertas import router as propostas_abertas_router
from app.sistema import router as sistema_router

init_db()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    agendamento.iniciar_scheduler()
    yield
    agendamento.parar_scheduler()


app = FastAPI(
    title="Observatório de Licitações · Compras.gov + Power BI",
    version="2.0.0",
    lifespan=lifespan,
)
# Caddy / proxy: confia em X-Forwarded-Proto/For para scheme HTTPS e cookies Secure.
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
app.add_middleware(AuthMiddleware)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(sistema_router)
app.include_router(agendamento.router)
app.include_router(ia_provedores_router)
app.include_router(coleta_router)
app.include_router(observadores_router)
app.include_router(compras_router)
app.include_router(dashboard_router)
app.include_router(distribuicao_localidade_router)
app.include_router(consulta_processo_router)
app.include_router(propostas_abertas_router)
app.include_router(analise_preco_router)
app.include_router(orgaos_router)
app.include_router(modalidades_router)
app.include_router(powerbi_router)

STATIC = BASE_DIR / "app" / "static"
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse(STATIC / "favicon.ico")
