#!/bin/sh
# Prepara o diretório de dump e segue o entrypoint oficial do Postgres.
mkdir -p /var/backups/osb
chown postgres:postgres /var/backups/osb
chmod 700 /var/backups/osb
exec docker-entrypoint.sh "$@"
