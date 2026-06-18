#!/usr/bin/env bash
# Instala o painel como serviço systemd (sobe automaticamente ao ligar o PC).
# Execute: sudo bash scripts/install-panel-service.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"
SERVICE_NAME="triggerti-painel.service"
SERVICE_SRC="${SCRIPT_DIR}/triggerti-painel.service"
SERVICE_DEST="/etc/systemd/system/${SERVICE_NAME}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute com sudo:"
  echo "  sudo bash scripts/install-panel-service.sh"
  exit 1
fi

if ! systemctl is-enabled docker >/dev/null 2>&1; then
  systemctl enable docker
fi

cp "${SERVICE_SRC}" "${SERVICE_DEST}"
chmod 644 "${SERVICE_DEST}"

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl start "${SERVICE_NAME}"

echo ""
echo "Serviço instalado e iniciado."
systemctl --no-pager status "${SERVICE_NAME}" || true
echo ""
echo "Painel: http://localhost:8091"
echo "Após reiniciar o PC, o painel sobe sozinho."
