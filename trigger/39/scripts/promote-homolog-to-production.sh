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

echo "=== Virada homolog → production (ERP RLP / TRIGGER) ==="
echo
echo "Este script NÃO sobe containers nem migra dados automaticamente."
echo "Caminho canônico: docs/DEPLOY_LOCAL_AWS.md"
echo

confirm() {
  local q="$1"
  read -r -p "$q [s/N] " a || true
  [[ "${a:-}" == "s" || "${a:-}" == "S" ]]
}

echo "Checklist obrigatório:"
confirm "1) Snapshot da instância Lightsail feito?" || { echo "Pare e tire snapshot."; exit 1; }
confirm "2) Dump MySQL guardado fora da instância?" || { echo "Pare e faça dump."; exit 1; }
confirm "3) APP_KEY da homolog será reutilizada (dados cifrados) OU banco novo consciente?" || { echo "Defina a estratégia de chave."; exit 1; }
confirm "4) Senhas DB/admin trocadas (nada de TROCAR_* / Admin@123)?" || { echo "Edite senhas primeiro."; exit 1; }
confirm "5) Focus/IA apontando para PRODUÇÃO (não homolog) se for o caso?" || { echo "Confira hubs fiscais / provedores."; exit 1; }
confirm "6) Domínio TLS (443) e ORCAMENTO_PUBLIC_BASE_URL corretos?" || { echo "Ajuste URLs."; exit 1; }

echo
if [[ -f .env.aws ]]; then
  cp -n .env.aws ".env.aws.homolog.bak.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
  echo "Backup do .env.aws atual criado (se ainda não existia bak)."
fi

if confirm "Copiar .env.aws.production.example → .env.aws agora (você edita senhas/URL/KEY em seguida)?"; then
  cp .env.aws.production.example .env.aws
  echo "Criado .env.aws — EDITE APP_KEY, senhas e domínios antes de up-aws."
fi

echo
echo "Próximos comandos:"
echo "  1. Editar .env.aws (APP_KEY, senhas, URLs)"
echo "  2. ./scripts/aws-ready-check.sh .env.aws"
echo "  3. make up-aws"
echo "  4. curl -sS https://SEU_DOMINIO/api/v1/health   → stage=production, debug=false"
echo "  5. Login admin + smoke: OC → receber → TIT; ORC link público"
echo
echo "Virada concluída só depois do health + smoke OK."
