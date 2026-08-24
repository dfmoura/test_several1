#!/usr/bin/env bash
# Ponte temporária: tunnel flexorc ainda aponta a :8039 → encaminha para :8043 (instalação 43).
# Preferível corrigir o cloudflared: sudo bash scripts/fix-cloudflared-flexorc-8043.sh
#
# Uso: ./scripts/flexorc-proxy-8039.sh          # sobe em background
#      ./scripts/flexorc-proxy-8039.sh --stop
#
set -euo pipefail
PIDFILE=/tmp/flexorc-8039-proxy.pid
LOG=/tmp/flexorc-8039-proxy.log

stop() {
  if [[ -f "$PIDFILE" ]]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    rm -f "$PIDFILE"
  fi
  fuser -k 8039/tcp 2>/dev/null || true
  echo "proxy 8039 parado"
}

if [[ "${1:-}" == "--stop" ]]; then
  stop
  exit 0
fi

if curl -sfS -m 2 http://127.0.0.1:8039/api/v1/health >/dev/null 2>&1; then
  echo "OK  já responde em :8039"
  exit 0
fi

if ! curl -sfS -m 2 http://127.0.0.1:8043/api/v1/health >/dev/null 2>&1; then
  echo "FAIL stack :8043 fora — make up"
  exit 1
fi

stop >/dev/null 2>&1 || true

nohup python3 - <<'PY' >"$LOG" 2>&1 &
import socket, threading, select
LISTEN, TARGET = ("127.0.0.1", 8039), ("127.0.0.1", 8043)

def pipe(a, b):
    try:
        while True:
            r, _, _ = select.select([a], [], [], 120)
            if not r:
                break
            data = a.recv(65536)
            if not data:
                break
            b.sendall(data)
    except Exception:
        pass
    finally:
        for s in (a, b):
            try:
                s.close()
            except Exception:
                pass

srv = socket.socket()
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(LISTEN)
srv.listen(50)
print("listening", LISTEN, "->", TARGET, flush=True)
while True:
    client, _ = srv.accept()
    upstream = socket.create_connection(TARGET)
    threading.Thread(target=pipe, args=(client, upstream), daemon=True).start()
    threading.Thread(target=pipe, args=(upstream, client), daemon=True).start()
PY
echo $! >"$PIDFILE"
sleep 1
curl -sfS -m 3 http://127.0.0.1:8039/api/v1/health >/dev/null
echo "OK  proxy 8039→8043 (pid $(cat "$PIDFILE"))"
echo "    definitivo: sudo bash scripts/fix-cloudflared-flexorc-8043.sh"
