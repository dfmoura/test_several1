#!/usr/bin/env bash
# Corrige o Cloudflare Tunnel: flexorc → porta 8043 (instalação 43).
# Requer sudo (o serviço systemd usa /etc/cloudflared/config.yml).
#
# Uso: sudo bash scripts/fix-cloudflared-flexorc-8043.sh
#
set -euo pipefail

TARGET=8043
FILES=(/etc/cloudflared/config.yml)
if [[ -f "${HOME}/.cloudflared/config.yml" ]]; then
  FILES+=("${HOME}/.cloudflared/config.yml")
fi

for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "skip: $f ausente"
    continue
  fi
  if grep -q 'hostname: flexorc.triggerti.com' "$f"; then
    sed -i '/hostname: flexorc.triggerti.com/{n;s|service: http://localhost:[0-9]*|service: http://localhost:'"$TARGET"'|;}' "$f"
    echo "OK  $f → localhost:$TARGET"
    grep -A1 'hostname: flexorc.triggerti.com' "$f"
  else
    echo "WARN $f sem hostname flexorc.triggerti.com"
  fi
done

if systemctl is-enabled cloudflared >/dev/null 2>&1; then
  systemctl restart cloudflared
  sleep 2
  systemctl is-active cloudflared
  echo "OK  cloudflared reiniciado"
else
  echo "WARN cloudflared não está como serviço systemd — reinicie o túnel manualmente"
fi

echo
echo "Smoke: curl -sS https://flexorc.triggerti.com/api/v1/health"
curl -sfS -m 8 https://flexorc.triggerti.com/api/v1/health; echo
