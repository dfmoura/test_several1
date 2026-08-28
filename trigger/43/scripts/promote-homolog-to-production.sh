#!/usr/bin/env bash
# Checklist interativo da virada homolog → production.
# Não altera dados sozinho: só guia + opcionalmente gera .env.aws a partir do template.
#
# Uso (na máquina local ou no Lightsail):
#   ./scripts/promote-homolog-to-production.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Virada homolog → production (FLEXOERP / TRIGGER) ==="
echo
echo "Este script NÃO sobe containers nem migra dados automaticamente."
echo "Host oficial: https://flexoerp001.triggerti.com"
echo "Caminho: docs/DEPLOY_LOCAL_AWS.md · docs/ADR_HOST_INSTALACAO_FLEXOERP001.md"
echo

confirm() {
  local q="$1"
  read -r -p "$q [s/N] " a || true
  [[ "${a:-}" == "s" || "${a:-}" == "S" ]]
}

echo "Checklist obrigatório:"
confirm "1) Snapshot da instância Lightsail feito?" || { echo "Pare e tire snapshot."; exit 1; }
confirm "2) Dump MySQL guardado fora da instância?" || { echo "Pare e faça dump."; exit 1; }
confirm "3) APP_KEY preservada (A1/Focus cifrados) OU banco novo consciente?" || { echo "Defina a estratégia de chave — não regenere se já há A1."; exit 1; }
confirm "4) Senhas DB/admin trocadas (nada de TROCAR_* / Admin@123)?" || { echo "Edite senhas primeiro."; exit 1; }
confirm "5) Focus/IA apontando para PRODUÇÃO (não homolog) se for o caso?" || { echo "Confira hubs fiscais / provedores."; exit 1; }
confirm "6) TLS + URLs em https://flexoerp001.triggerti.com (não flexorc/tunnel)?" || { echo "Ajuste APP_URL / ORCAMENTO_PUBLIC_BASE_URL."; exit 1; }
confirm "7) MAIL_* + VIAZAP_* no .env.aws (envio proposta)?" || { echo "make export-envio-proposta e mescle."; exit 1; }

echo
if [[ -f .env.aws ]]; then
  cp -n .env.aws ".env.aws.homolog.bak.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
  echo "Backup do .env.aws atual criado (se ainda não existia bak)."
fi

if confirm "Copiar .env.aws.production.example → .env.aws agora (você edita senhas/KEY em seguida; NÃO perca APP_KEY atual)?"; then
  if [[ -f .env.aws ]]; then
    echo "AVISO: há .env.aws — faça backup e mescle APP_KEY/senhas/MAIL/VIAZAP manualmente."
    echo "Não sobrescreva às cegas se o banco já tem A1."
  else
    cp .env.aws.production.example .env.aws
    echo "Criado .env.aws — EDITE APP_KEY, senhas, MAIL_*, VIAZAP_* antes de up-aws."
  fi
fi

echo
echo "Próximos comandos:"
echo "  1. Editar .env.aws (PRESERVE APP_KEY; MAIL_*/VIAZAP_*; URLs flexoerp001)"
echo "  2. ./scripts/aws-ready-check.sh .env.aws"
echo "  3. make up-aws"
echo "  4. curl -sS https://flexoerp001.triggerti.com/api/v1/health"
echo "  5. Login + A1 apto + ORC link em flexoerp001 + smoke envio"
echo
echo "Virada concluída só depois do health + smoke OK."
