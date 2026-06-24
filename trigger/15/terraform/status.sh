#!/usr/bin/env bash
# Mostra status do deploy e o comando SSH quando a VM existir.
# Uso: ./status.sh

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

tf_out() {
  terraform output -raw "$1" 2>/dev/null || true
}

echo "=== Status Terraform (trigger/15) ==="
echo ""

if ! command -v terraform >/dev/null; then
  echo "Erro: terraform nao encontrado no PATH."
  exit 1
fi

if ! terraform output ssh_command >/dev/null 2>&1; then
  [[ -x "$DIR/sync-outputs.sh" ]] && "$DIR/sync-outputs.sh" >/dev/null 2>&1 || true
fi

echo "Rede / config:"
echo "  AD:    $(tf_out availability_domain_used)"
echo "  Shape: $(tf_out shape_summary)"
echo "  VCN:   $(tf_out vcn_ocid)"
echo ""

ip="$(tf_out instance_public_ip)"
ssh="$(tf_out ssh_command)"

if [[ -n "$ip" && "$ip" != "null" ]]; then
  echo "VM CRIADA — IP: $ip"
  echo ""
  echo "$ssh"
  echo ""
  exit 0
fi

echo "VM AINDA NAO CRIADA."
echo "  Causa usual: Out of host capacity em sa-saopaulo-1 (Oracle Always Free ARM)."
echo "  Rede (VCN/subnet) ja existe; falta so a instancia licitacoes-app."
echo ""
if [[ -n "$ssh" ]]; then
  echo "  $(terraform output ssh_command 2>/dev/null | tr -d '"')"
  echo ""
fi
echo "Proximos passos:"
echo "  ./retry-apply.sh 300     # tenta a cada 5 min (melhor: 03h-07h)"
echo "  ps aux | grep retry-apply   # ver se ja esta rodando"
echo ""
if pgrep -f 'retry-apply\.sh' >/dev/null 2>&1; then
  echo "  retry-apply.sh: RODANDO"
else
  echo "  retry-apply.sh: parado"
fi
