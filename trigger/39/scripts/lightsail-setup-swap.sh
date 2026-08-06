#!/usr/bin/env bash
# R1 — Swapfile de 2 GB no host Lightsail (1 GB RAM).
# Pré-requisito operacional do compose com mem_limits (~1 GB somados).
# Idempotente: não recria se /swapfile já existir e estiver ativo.
#
# Uso (como root no host Ubuntu):
#   sudo bash scripts/lightsail-setup-swap.sh
#
set -euo pipefail

SWAPFILE="${SWAPFILE:-/swapfile}"
SWAP_SIZE="${SWAP_SIZE:-2G}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute como root: sudo bash $0" >&2
  exit 1
fi

if swapon --show | grep -qF "$SWAPFILE"; then
  echo "Swap já ativo em $SWAPFILE — nada a fazer."
  swapon --show
  free -h
  exit 0
fi

if [[ -f "$SWAPFILE" ]]; then
  echo "Arquivo $SWAPFILE existe mas não está ativo — ativando..."
else
  echo "Criando swap $SWAP_SIZE em $SWAPFILE..."
  fallocate -l "$SWAP_SIZE" "$SWAPFILE" 2>/dev/null || dd if=/dev/zero of="$SWAPFILE" bs=1M count=2048 status=progress
  chmod 600 "$SWAPFILE"
  mkswap "$SWAPFILE"
fi

swapon "$SWAPFILE"

if ! grep -qF "$SWAPFILE" /etc/fstab; then
  echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
  echo "Entrada adicionada em /etc/fstab."
fi

# Preferir RAM; usar swap só sob pressão (padrão 60 em muitos Ubuntu).
sysctl -w vm.swappiness=10 >/dev/null
if ! grep -q '^vm.swappiness=' /etc/sysctl.conf 2>/dev/null; then
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

echo "OK — swap ativo:"
swapon --show
free -h
echo
echo "Lembrete: mem_limit do compose NÃO reserva RAM; o swap transforma OOM kill"
echo "(p.ex. do MySQL) em lentidão temporária. Ver docs/LIGHTSAIL_E_FUTURO.md."
