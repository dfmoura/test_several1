from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.api.deps import get_db
from app.config import get_settings
from app.memory.redis_client import get_redis
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(session: AsyncSession = Depends(get_db)) -> HealthResponse:
    settings = get_settings()
    db_status = "ok"
    redis_status = "ok"

    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    try:
        redis = get_redis()
        if not await redis.ping():
            redis_status = "error"
    except Exception:
        redis_status = "error"

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    return HealthResponse(
        status=overall,
        app=settings.app_name,
        version=__version__,
        database=db_status,
        redis=redis_status,
        ai_provider=settings.ai_provider,
    )
