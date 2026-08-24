#!/usr/bin/env bash
# Deixa o ZapVia 100% pronto para teste manual (multi-remetente + QR).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

blue() { printf '\033[1;34m%s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m%s\033[0m\n' "$*"; }
err() { printf '\033[1;31m%s\033[0m\n' "$*" >&2; }

blue "==> ZapVia · deixar pronto para teste"
echo "    $ROOT"

if ! command -v docker >/dev/null 2>&1; then
  err "Docker CLI não encontrado."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  err "Docker daemon parado."
  err "Abra o Docker Desktop (ou: sudo service docker start) e rode de novo:"
  err "  ./scripts/deixar-pronto.sh"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  ok "==> .env criado"
fi

# Garante flags do hub privado + QR (este projeto não é SaaS público).
touch .env
grep -q '^EVOLUTION_ENABLED=' .env || echo 'EVOLUTION_ENABLED=true' >> .env
grep -q '^BILLING_PROVIDER=' .env || echo 'BILLING_PROVIDER=sandbox' >> .env
# Força o modo operador privado (idempotente).
if grep -q '^DEPLOYMENT_MODE=' .env; then
  sed -i 's/^DEPLOYMENT_MODE=.*/DEPLOYMENT_MODE=private/' .env
else
  echo 'DEPLOYMENT_MODE=private' >> .env
fi
if grep -q '^REGISTRATION_MODE=' .env; then
  sed -i 's/^REGISTRATION_MODE=.*/REGISTRATION_MODE=bootstrap/' .env
else
  echo 'REGISTRATION_MODE=bootstrap' >> .env
fi
if grep -q '^BILLING_AUTO_ACTIVATE=' .env; then
  sed -i 's/^BILLING_AUTO_ACTIVATE=.*/BILLING_AUTO_ACTIVATE=true/' .env
else
  echo 'BILLING_AUTO_ACTIVATE=true' >> .env
fi

blue "==> Subindo stack (build + up)…"
docker compose up -d --build

blue "==> Aguardando Postgres…"
for _ in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U zapvia -d zapvia >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

blue "==> Banco evolution…"
docker compose exec -T postgres psql -U zapvia -d postgres -v ON_ERROR_STOP=0 \
  -c "SELECT 1 FROM pg_database WHERE datname='evolution'" | grep -q 1 \
  || docker compose exec -T postgres psql -U zapvia -d postgres -c "CREATE DATABASE evolution"

blue "==> Migrations…"
docker compose exec -T api alembic upgrade head >/dev/null 2>&1 \
  || docker compose run --rm api alembic upgrade head

blue "==> Health da API…"
ok_api=0
for _ in $(seq 1 90); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8144/health || true)"
  if [[ "$code" == "200" ]]; then
    ok_api=1
    break
  fi
  sleep 2
done

if [[ "$ok_api" != "1" ]]; then
  err "API não respondeu em http://localhost:8144/health"
  docker compose logs --tail=100 api >&2 || true
  exit 1
fi

echo
ok "============================================"
ok " Pronto — pode testar"
ok "============================================"
echo " Portal:   http://localhost:8144"
echo " OpenAPI:  http://localhost:8144/docs"
echo " Evolution http://localhost:8145"
echo
echo " Roteiro multi-remetente:"
echo "  1. Criar conta → pagar mensalidade (sandbox)"
echo "  2. WhatsApp Business → conectar 1º número (QR)"
echo "  3. Guardar a API key"
echo "  4. Adicionar remetente → 2º número → outra API key"
echo "  5. Em Como enviar, selecione o remetente e dispare"
echo "============================================"
docker compose ps
