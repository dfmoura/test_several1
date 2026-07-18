#!/bin/sh
set -e

echo "[entrypoint] Waiting for PostgreSQL..."
python - <<'PY'
import asyncio, os, sys, time

url = os.environ.get("DATABASE_URL_SYNC") or os.environ["DATABASE_URL"].replace("+asyncpg", "")

async def wait():
    import asyncpg
    for i in range(60):
        try:
            conn = await asyncpg.connect(url)
            await conn.close()
            print("[entrypoint] PostgreSQL is ready")
            return
        except Exception as e:
            print(f"[entrypoint] waiting ({i+1}/60): {e}")
            await asyncio.sleep(2)
    sys.exit(1)

asyncio.run(wait())
PY

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

echo "[entrypoint] Starting application..."
exec "$@"
