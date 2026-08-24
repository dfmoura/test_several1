#!/usr/bin/env bash
# Regressão mínima FLEXORC: multi-EMP + fatia comercial (ORC, onboarding, billing, implantação).
# Uso local: make ci-flexorc
# CI: ./scripts/ci-flexorc.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env)

FILTER='MultiEmpresaAceiteTest|EmpresaOnboardingTest|AlinharPrimeiroCadastroTest|PromoverContaCanonicaTest|LimparLivroContaTest|EmpresaAtivacaoTest|EmpresaCertificadoA1Test|ImplantacaoAceiteTest|OrcamentoTest|OrcamentoAprovacaoTest|OrcamentoCatalogoTest|FacasMapaTest|AdiantamentoOrcamentoTest|PainelTest|AsaasCheckoutBillingTest|MensalidadeAntecipadaTest|InterBillingMensalidadeTest|BillingCatalogoInstalacaoTest|ConsolePlataformaTest|SessaoAcessoTest|UsuarioCrudTest|ProspectRapidoTest'

run_in_docker() {
  if docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env ps --status running --format '{{.Service}}' 2>/dev/null | grep -qx app; then
    "${COMPOSE[@]}" exec -T app php vendor/bin/phpunit --filter "$FILTER" "$@"
  elif command -v php >/dev/null 2>&1 && [[ -f apps/api/vendor/bin/phpunit ]]; then
    (cd apps/api && php vendor/bin/phpunit --filter "$FILTER" "$@")
  else
    echo "FAIL: rode make up ou instale php-cli em apps/api"
    exit 1
  fi
}

echo "== FLEXORC CI (multi-EMP + fatia comercial) =="
run_in_docker
echo ""
echo "OK — suite comercial verde."
