#!/bin/sh
# pg_dump como postgres: FORCE RLS esconderia linhas de osb_app.
# Se a coleta estiver em execução, adia 30 minutos uma única vez e registra.
set -eu
DEST=/var/backups/osb
mkdir -p "$DEST"
MARCA="$DEST/.adiamento"
REGISTRO="$DEST/registro.log"
ATIVA=$(psql -U postgres -d osb -tAc "SELECT count(*) FROM coleta_job WHERE status = 'executando'")
ADIOU=0
if [ "$ATIVA" != "0" ]; then
  agora=$(date +%s)
  if [ ! -f "$MARCA" ]; then
    printf '%s\n' "$agora" > "$MARCA"
    echo "Coleta em execução. Backup adiado 30 minutos."
    sleep 1800
  else
    quando=$(cat "$MARCA")
    falta=$((quando + 1800 - agora))
    if [ "$falta" -gt 0 ]; then
      echo "Coleta em execução. Faltam ${falta}s do adiamento."
      sleep "$falta"
    fi
  fi
  ADIOU=1
fi
rm -f "$MARCA"
ARQUIVO="$DEST/osb-$(date +%Y%m%d-%H%M%S).dump"
pg_dump -U postgres -d osb -Fc -f "$ARQUIVO"
if [ "$ADIOU" = "1" ]; then
  printf '%s backup executado depois de adiar 30 minutos %s\n' "$(date -Iseconds)" "$ARQUIVO" >> "$REGISTRO"
else
  printf '%s backup %s\n' "$(date -Iseconds)" "$ARQUIVO" >> "$REGISTRO"
fi
find "$DEST" -name 'osb-*.dump' -mtime +7 -delete
echo "$ARQUIVO"
