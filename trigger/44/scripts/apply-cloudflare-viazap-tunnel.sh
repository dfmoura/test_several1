#!/usr/bin/env bash
# Acrescenta viazap.triggerti.com → localhost:8144 no tunnel triggerti-painel.
# Não altera painel nem flexorc. Idempotente. Requer root (sudo).
set -euo pipefail

CFG=/etc/cloudflared/config.yml
SERVICE=cloudflared
HOSTNAME=viazap.triggerti.com
ORIGIN=http://localhost:8144
TUNNEL_UUID=8fd48cee-4cf5-49e0-a9ca-574ccea6ec67

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi

if [[ ! -f "$CFG" ]]; then
  echo "ERRO: não achei $CFG" >&2
  exit 1
fi

if ! grep -q 'tunnel: triggerti-painel' "$CFG"; then
  echo "ERRO: $CFG não é o tunnel triggerti-painel — abortando sem mudanças." >&2
  exit 1
fi

BAK="${CFG}.bak.$(date +%Y%m%d-%H%M%S)"
cp -a "$CFG" "$BAK"
echo "Backup: $BAK"

if grep -q "hostname: ${HOSTNAME}" "$CFG"; then
  echo "Já existe ingress para ${HOSTNAME} — só validando/reiniciando."
else
  # Insere a rota imediatamente antes do catch-all http_status:404
  python3 - "$CFG" "$HOSTNAME" "$ORIGIN" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
hostname = sys.argv[2]
origin = sys.argv[3]
text = path.read_text()
needle = "  - service: http_status:404\n"
block = (
    f"  - hostname: {hostname}\n"
    f"    service: {origin}\n"
)
if needle not in text:
    sys.exit(f"ERRO: catch-all http_status:404 não encontrado em {path}")
if f"hostname: {hostname}" in text:
    sys.exit(0)
path.write_text(text.replace(needle, block + needle, 1))
print(f"Inserido: {hostname} → {origin}")
PY
fi

echo
echo "=== $CFG ==="
cat "$CFG"
echo

echo "=== validate ==="
cloudflared --config "$CFG" tunnel ingress validate

echo "=== health local (:8144) ==="
if ! curl -fsS -m 5 http://127.0.0.1:8144/health; then
  echo
  echo "AVISO: ZapVia não respondeu em 127.0.0.1:8144 — tunnel ok, site externo falha até o container subir." >&2
else
  echo
fi

echo "=== restart ${SERVICE} ==="
systemctl restart "$SERVICE"
sleep 2
systemctl is-active "$SERVICE"
systemctl --no-pager -l status "$SERVICE" | head -20

echo
echo "=== regras de ingress ==="
cloudflared --config "$CFG" tunnel ingress rule "https://${HOSTNAME}"
cloudflared --config "$CFG" tunnel ingress rule https://flexorc.triggerti.com
cloudflared --config "$CFG" tunnel ingress rule https://painel.triggerti.com

echo
echo "=== DNS (faça no painel se ainda não existir) ==="
echo "Type: CNAME"
echo "Name: viazap"
echo "Target: ${TUNNEL_UUID}.cfargotunnel.com"
echo "Proxy: Proxied"
echo
echo "Teste: https://${HOSTNAME}"
echo "OK — painel/flexorc preservados; viazap → ${ORIGIN}"
