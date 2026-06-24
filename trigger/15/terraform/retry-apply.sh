#!/usr/bin/env bash
# Reaplica o Terraform em loop quando a Oracle retorna "Out of host capacity".
# Uso: ./retry-apply.sh [intervalo_segundos]
# Ctrl+C para parar.

set -euo pipefail

INTERVAL="${1:-300}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [[ ! -f terraform.tfvars ]]; then
  echo "Erro: crie terraform.tfvars antes (cp terraform.tfvars.example terraform.tfvars)"
  exit 1
fi

echo "Retry terraform apply a cada ${INTERVAL}s (5 min padrao)."
echo "Melhor horario: 03h-07h ou sab/dom de manha (Brasilia)."
echo ""

attempt=1
while true; do
  echo "=== Tentativa ${attempt} — $(date '+%Y-%m-%d %H:%M:%S %Z') ==="
  if terraform apply -auto-approve 2>&1 | tee "/tmp/terraform-apply-${attempt}.log"; then
    echo ""
    echo "SUCESSO."
    terraform output instance_public_ip
    echo ""
    echo "SSH:"
    terraform output -raw ssh_command
    echo ""
    exit 0
  fi

  if grep -qi "Out of host capacity\|OutOfHostCapacity\|out of capacity" "/tmp/terraform-apply-${attempt}.log"; then
    echo ""
    echo "Out of capacity — aguardando ${INTERVAL}s..."
    sleep "$INTERVAL"
    attempt=$((attempt + 1))
    continue
  fi

  echo ""
  echo "Erro diferente de capacity. Veja o log acima e corrija antes de tentar de novo."
  exit 1
done
