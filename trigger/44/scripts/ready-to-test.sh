#!/usr/bin/env bash
# Sobe o ZapVia completo e espera ficar saudável para teste manual (QR incluso).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> ZapVia · preparação para teste"
echo "    dir: $ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERRO: Docker CLI não encontrado. Instale o Docker e tente de novo." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERRO: Docker daemon não está rodando." >&2
  echo "      Inicie o Docker Desktop (ou: sudo service docker start) e rode este script de novo." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "==> .env criado a partir de .env.example"
fi

# Garante flags de QR no .env (sem sobrescrever outros valores)
grep -q '^EVOLUTION_ENABLED=' .env || echo 'EVOLUTION_ENABLED=true' >> .env
grep -q '^EVOLUTION_URL=' .env || echo 'EVOLUTION_URL=http://localhost:8145' >> .env
grep -q '^EVOLUTION_KEY=' .env || echo 'EVOLUTION_KEY=change-me-evolution-key-strong' >> .env

echo "==> Subindo stack (build + up)…"
docker compose up -d --build

echo "==> Aguardando Postgres…"
for i in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U zapvia -d zapvia >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Garantindo banco evolution…"
docker compose exec -T postgres psql -U zapvia -d zapvia -v ON_ERROR_STOP=0 \
  -c "SELECT 1 FROM pg_database WHERE datname = 'evolution'" | grep -q 1 \
  || docker compose exec -T postgres psql -U zapvia -d postgres -c "CREATE DATABASE evolution"

echo "==> Aguardando API /health…"
ok=0
for i in $(seq 1 90); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8144/health || true)"
  if [[ "$code" == "200" ]]; then
    ok=1
    break
  fi
  sleep 2
done

if [[ "$ok" != "1" ]]; then
  echo "ERRO: API não respondeu em http://localhost:8144/health" >&2
  echo "      Logs:" >&2
  docker compose logs --tail=80 api >&2 || true
  exit 1
fi

echo
echo "============================================"
echo " Pronto para testar"
echo "============================================"
echo " Portal:     http://localhost:8144"
echo " OpenAPI:    http://localhost:8144/docs"
echo " Evolution:  http://localhost:8145"
echo
echo " Roteiro rápido:"
echo "  1. Criar conta"
echo "  2. Pagar mensalidade (sandbox)"
echo "  3. WhatsApp Business → Gerar QR"
echo "  4. Celular: WhatsApp Business → Aparelhos conectados → escanear"
echo "  5. Guardar a API key e enviar em Envios / API"
echo "============================================"

docker compose ps
