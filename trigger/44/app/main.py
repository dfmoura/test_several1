from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

import redis.asyncio as redis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth, billing, health, me, messages, meta, senders, webhook
from app.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.core.middleware import RequestIdMiddleware
from app.domain.exceptions import AppError
from app.queue.topology import QueuePublisher, connect_rabbitmq

logger = get_logger(__name__)
PORTAL_DIR = Path(__file__).resolve().parent.parent / "portal"


async def _connect_with_retry(label: str, factory, attempts: int = 30, delay: float = 2.0):
    last: Exception | None = None
    for i in range(1, attempts + 1):
        try:
            return await factory()
        except Exception as exc:  # noqa: BLE001
            last = exc
            logger.warning(
                "startup_retry",
                dependency=label,
                attempt=i,
                error=str(exc),
            )
            await asyncio.sleep(delay)
    raise RuntimeError(f"Failed to connect to {label}: {last}") from last


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging(settings.log_level)

    async def redis_factory():
        client = redis.from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        return client

    app.state.redis = await _connect_with_retry("redis", redis_factory)
    app.state.rabbit_conn = await _connect_with_retry(
        "rabbitmq",
        lambda: connect_rabbitmq(settings.rabbitmq_url),
    )
    app.state.publisher = QueuePublisher(app.state.rabbit_conn)
    await app.state.publisher.connect()
    logger.info("api_started", app=settings.app_name, env=settings.app_env)
    if settings.is_production and settings.registration_mode_normalized == "open":
        logger.warning(
            "registration_open_in_production",
            hint="Use REGISTRATION_MODE=bootstrap or closed on a private host",
        )
    try:
        yield
    finally:
        try:
            await app.state.publisher.close()
        except Exception:
            pass
        try:
            await app.state.rabbit_conn.close()
        except Exception:
            pass
        try:
            await app.state.redis.aclose()
        except Exception:
            pass
        logger.info("api_stopped")


def create_app() -> FastAPI:
    settings = get_settings()
    docs_on = not settings.is_production
    app = FastAPI(
        title="ZapVia",
        description=(
            "API de envio WhatsApp Business. Conecte o número via QR (Baileys) "
            "ou Cloud API e envie com a API key do remetente."
        ),
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if docs_on else None,
        redoc_url="/redoc" if docs_on else None,
        openapi_url="/openapi.json" if docs_on else None,
    )

    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.code, "message": exc.message},
        )

    app.include_router(health.router)
    app.include_router(meta.router)
    app.include_router(auth.router)
    app.include_router(billing.router)
    app.include_router(senders.router)
    app.include_router(messages.router)
    app.include_router(me.router)
    app.include_router(webhook.router)

    if PORTAL_DIR.is_dir():
        app.mount("/static", StaticFiles(directory=PORTAL_DIR), name="static")

        @app.get("/", include_in_schema=False)
        async def portal_index() -> FileResponse:
            return FileResponse(PORTAL_DIR / "index.html")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def portal_spa(full_path: str) -> FileResponse:
            if full_path.startswith(("v1/", "docs", "redoc", "openapi", "health", "ready", "static/")):
                return JSONResponse({"code": "not_found", "message": "Not found"}, status_code=404)
            candidate = PORTAL_DIR / full_path
            if candidate.is_file():
                return FileResponse(candidate)
            return FileResponse(PORTAL_DIR / "index.html")

    return app


app = create_app()
