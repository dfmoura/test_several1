#!/usr/bin/env bash
# Backup lógico do Postgres (zapvia + evolution) para ./backups/.
# Rode no host de produção (cron diário recomendado).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml)
if [[ -f docker-compose.prod.yml ]] && grep -qE '^APP_ENV=production' .env 2>/dev/null; then
  COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$OUT_DIR"

echo "==> Dump zapvia → $OUT_DIR/zapvia_${STAMP}.sql.gz"
"${COMPOSE[@]}" exec -T postgres pg_dump -U zapvia -d zapvia --clean --if-exists \
  | gzip -c > "$OUT_DIR/zapvia_${STAMP}.sql.gz"

echo "==> Dump evolution → $OUT_DIR/evolution_${STAMP}.sql.gz"
"${COMPOSE[@]}" exec -T postgres pg_dump -U zapvia -d evolution --clean --if-exists \
  | gzip -c > "$OUT_DIR/evolution_${STAMP}.sql.gz"

# Mantém os últimos 14 dumps de cada base (evita disco cheio).
keep="${BACKUP_KEEP:-14}"
ls -1t "$OUT_DIR"/zapvia_*.sql.gz 2>/dev/null | tail -n +"$((keep + 1))" | xargs -r rm -f
ls -1t "$OUT_DIR"/evolution_*.sql.gz 2>/dev/null | tail -n +"$((keep + 1))" | xargs -r rm -f

echo "==> OK. Guarde também snapshots Lightsail do disco se possível."
ls -lh "$OUT_DIR"/zapvia_"${STAMP}".sql.gz "$OUT_DIR"/evolution_"${STAMP}".sql.gz
