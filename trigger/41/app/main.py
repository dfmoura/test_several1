from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import admin, health, messages, webhook
from app.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.core.middleware import RequestIdMiddleware
from app.domain.exceptions import AppError
from app.integrations.evolution import EvolutionClient
from app.queue.topology import QueuePublisher, connect_rabbitmq

logger = get_logger(__name__)


async def _connect_with_retry(label: str, factory, attempts: int = 30, delay: float = 2.0):
    last: Exception | None = None
    for i in range(1, attempts + 1):
        try:
            return await factory()
        except Exception as exc:  # noqa: BLE001 — startup resilience
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
    app.state.evolution = EvolutionClient()

    logger.info("api_started", app=settings.app_name, env=settings.app_env)
    try:
        yield
    finally:
        try:
            await app.state.evolution.close()
        except Exception:
            pass
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
    app = FastAPI(
        title="Zap Outbound Gateway",
        description=(
            "Multi-tenant WhatsApp outbound gateway. "
            "Authenticate with a Sender API key to enqueue messages."
        ),
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.is_development else [],
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
    app.include_router(messages.router)
    app.include_router(admin.router)
    app.include_router(webhook.router)

    return app


app = create_app()
