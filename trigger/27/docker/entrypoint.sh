#!/bin/sh
set -e

echo "[entrypoint] Prisma db push (com retry)..."
cd /app/apps/web
i=0
# --accept-data-loss: ambiente local/compose; schema evolui (ex.: Cliente → Parceiro)
# e o seed recria os dados essenciais.
until npx prisma db push --skip-generate --accept-data-loss; do
  i=$((i + 1))
  if [ "$i" -gt 30 ]; then
    echo "[entrypoint] Falha ao conectar no banco"
    exit 1
  fi
  echo "[entrypoint] Aguardando DB... ($i)"
  sleep 2
done

echo "[entrypoint] Seed de catálogos..."
npx tsx prisma/seed.ts || echo "[entrypoint] Seed avisou/falhou — verificando se dados essenciais existem"

echo "[entrypoint] Next.js :${PORT:-3847}"
exec npx next start --hostname 0.0.0.0 --port "${PORT:-3847}"
