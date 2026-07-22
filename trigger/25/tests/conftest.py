from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import fakeredis.aioredis
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.deps import get_db
from app.config import Settings
from app.integrations.ai.base import AIResponse
from app.main import create_app
from app.memory.redis_client import RedisClient
from app.models.base import Base


@pytest.fixture
def settings() -> Settings:
    return Settings(
        app_env="test",
        debug=True,
        webhook_secret="test-secret",
        ai_provider="openai",
        openai_api_key="test-key",
        model_name="gpt-4o-mini",
        database_url="sqlite+aiosqlite:///:memory:",
        database_url_sync="sqlite:///:memory:",
        redis_url="redis://localhost:6379/15",
        evolution_url="http://evolution.test",
        evolution_key="test-evo-key",
        evolution_instance="test",
        owner_name="Diogo",
        rate_limit_per_minute=1000,
        contact_kb_enabled=False,
        lead_capture_enabled=False,
    )


@pytest_asyncio.fixture
async def db_session(settings: Settings) -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(settings.database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def redis_client() -> AsyncGenerator[RedisClient, None]:
    RedisClient._instance = None
    client = RedisClient()
    client._client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client._client.flushall()
    RedisClient._instance = None


@pytest.fixture
def mock_ai() -> AsyncMock:
    provider = AsyncMock()
    provider.generate = AsyncMock(
        return_value=AIResponse(
            content="Beleza, te retorno já!",
            model="test-model",
            prompt_tokens=10,
            completion_tokens=5,
            total_tokens=15,
            latency_ms=12.5,
        )
    )
    provider.close = AsyncMock()
    return provider


@pytest.fixture
def mock_evolution() -> AsyncMock:
    client = AsyncMock()
    client.send_text = AsyncMock(return_value={"status": "ok"})
    client.close = AsyncMock()
    return client


@pytest_asyncio.fixture
async def api_client(
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> AsyncGenerator[AsyncClient, None]:
    monkeypatch.setattr("app.config.settings.get_settings", lambda: settings)
    monkeypatch.setattr("app.config.get_settings", lambda: settings)
    monkeypatch.setattr("app.main.get_settings", lambda: settings)

    engine = create_async_engine(settings.database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    RedisClient._instance = None
    redis = RedisClient()
    redis._client = fakeredis.aioredis.FakeRedis(decode_responses=True)

    async def fake_connect() -> None:
        return None

    async def fake_disconnect() -> None:
        return None

    monkeypatch.setattr(redis, "connect", fake_connect)
    monkeypatch.setattr(redis, "disconnect", fake_disconnect)
    monkeypatch.setattr("app.main.get_redis", lambda: redis)
    monkeypatch.setattr("app.api.routes.health.get_redis", lambda: redis)

    app = create_app()
    app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    await engine.dispose()
    RedisClient._instance = None
