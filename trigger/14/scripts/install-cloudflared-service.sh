#!/usr/bin/env bash
# Instala cloudflared como serviço systemd (roda ao ligar o PC).
# Execute: sudo bash scripts/install-cloudflared-service.sh

set -euo pipefail

TUNNEL_ID="8fd48cee-4cf5-49e0-a9ca-574ccea6ec67"
SRC_DIR="/home/dfmoura/.cloudflared"
DEST_DIR="/etc/cloudflared"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute com sudo:"
  echo "  sudo bash scripts/install-cloudflared-service.sh"
  exit 1
fi

mkdir -p "${DEST_DIR}"

cp "${SRC_DIR}/${TUNNEL_ID}.json" "${DEST_DIR}/"
chmod 600 "${DEST_DIR}/${TUNNEL_ID}.json"

cat > "${DEST_DIR}/config.yml" << EOF
tunnel: triggerti-painel
credentials-file: ${DEST_DIR}/${TUNNEL_ID}.json

ingress:
  - hostname: painel.triggerti.com
    service: http://localhost:8091
  - service: http_status:404
EOF

chmod 644 "${DEST_DIR}/config.yml"

cloudflared service install
systemctl enable cloudflared
systemctl restart cloudflared

echo ""
echo "Status do serviço:"
systemctl --no-pager status cloudflared
echo ""
echo "Teste (aguarde alguns segundos):"
echo "  curl https://painel.triggerti.com/api/config"
