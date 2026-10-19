#!/bin/bash
# Dois papéis de propósito: o superuser do container não é o papel da aplicação.
# osb_app não contorna RLS (a policy entra com as tabelas por filial).
# osb_migracao é dono do schema e só roda o Alembic.
set -euo pipefail

: "${APP_DB_PASSWORD:?APP_DB_PASSWORD ausente}"
: "${MIGRATION_DB_PASSWORD:?MIGRATION_DB_PASSWORD ausente}"
: "${POSTGRES_DB:?POSTGRES_DB ausente}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v app_password="$APP_DB_PASSWORD" \
  -v mig_password="$MIGRATION_DB_PASSWORD" \
  -v dbname="$POSTGRES_DB" <<'EOSQL'
CREATE ROLE osb_migracao LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
  PASSWORD :'mig_password';
CREATE ROLE osb_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE
  PASSWORD :'app_password';

GRANT CONNECT ON DATABASE :"dbname" TO osb_migracao, osb_app;
ALTER SCHEMA public OWNER TO osb_migracao;
GRANT USAGE ON SCHEMA public TO osb_app;

ALTER DEFAULT PRIVILEGES FOR ROLE osb_migracao IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO osb_app;
ALTER DEFAULT PRIVILEGES FOR ROLE osb_migracao IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO osb_app;
EOSQL
