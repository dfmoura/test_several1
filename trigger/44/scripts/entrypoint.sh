#!/bin/sh
set -e

echo "[entrypoint] Waiting for PostgreSQL..."
python - <<'PY'
import asyncio, os, sys

raw = os.environ.get("DATABASE_URL_SYNC") or os.environ.get("DATABASE_URL", "")
url = raw.replace("postgresql+asyncpg://", "postgresql://")
if not url:
    print("[entrypoint] DATABASE_URL / DATABASE_URL_SYNC not set", file=sys.stderr)
    sys.exit(1)

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

echo "[entrypoint] Verifying application import..."
python - <<'PY'
import sys
try:
    import aio_pika  # noqa: F401
    import app.main  # noqa: F401
    print("[entrypoint] import ok")
except Exception as exc:
    print(f"[entrypoint] import FAILED: {exc!r}", file=sys.stderr)
    raise
PY

echo "[entrypoint] Running Alembic migrations..."
python - <<'PY'
import time, subprocess, sys
last = 1
for i in range(1, 8):
    last = subprocess.call([sys.executable, "-m", "alembic", "upgrade", "head"])
    if last == 0:
        print("[entrypoint] migrations ok")
        sys.exit(0)
    print(f"[entrypoint] migration retry {i}/7 (exit {last})")
    time.sleep(2)
sys.exit(last)
PY

echo "[entrypoint] Starting application: $*"
exec "$@"
