#!/usr/bin/env bash
# Alinha o tunnel Cloudflare do flexorc à porta desta instalação (8043).
# Causa clássica de HTTPS 502: /etc/cloudflared ainda aponta para 8039 (legado).
# Uso (com sudo no host do notebook):
#   sudo bash scripts/fix-cloudflared-flexorc-8043.sh
#
set -euo pipefail

CFG="${CLOUDFLARED_CONFIG:-/etc/cloudflared/config.yml}"

if [[ ! -f "$CFG" ]]; then
  echo "FAIL: $CFG não encontrado" >&2
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Rode com sudo: sudo bash $0" >&2
  exit 1
fi

cp -a "$CFG" "${CFG}.bak.$(date +%Y%m%d%H%M%S)"

# Só a linha de service imediatamente após flexorc.triggerti.com
python3 - <<'PY' "$CFG"
import sys
from pathlib import Path
path = Path(sys.argv[1])
lines = path.read_text().splitlines(keepends=True)
out = []
i = 0
changed = False
while i < len(lines):
    out.append(lines[i])
    if "hostname: flexorc.triggerti.com" in lines[i] and i + 1 < len(lines):
        nxt = lines[i + 1]
        if "localhost:8039" in nxt:
            lines[i + 1] = nxt.replace("localhost:8039", "localhost:8043")
            changed = True
        elif "localhost:8043" in nxt:
            pass
        i += 1
        out.append(lines[i])
    i += 1
path.write_text("".join(out))
print("changed" if changed else "already_8043_or_custom")
PY

systemctl restart cloudflared
sleep 2
systemctl is-active cloudflared
echo "Smoke:"
curl -sS -m 15 https://flexorc.triggerti.com/api/v1/health || true
echo
curl -sS -m 10 https://viazap.triggerti.com/health || true
echo
