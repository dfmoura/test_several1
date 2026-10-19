#!/bin/sh
# pytest troca a URL para o Postgres efêmero (db_test).
# O volume de desenvolvimento não recebe migração nem teste.
set -eu

if [ "${1:-}" = "pytest" ]; then
  shift
  if [ -z "${TEST_DATABASE_URL:-}" ] || [ -z "${TEST_MIGRATION_DATABASE_URL:-}" ]; then
    echo "Teste exige TEST_DATABASE_URL e TEST_MIGRATION_DATABASE_URL." >&2
    exit 1
  fi
  case "${TEST_DATABASE_URL}" in
    *@db_test:*) ;;
    *)
      echo "TEST_DATABASE_URL precisa apontar para o host db_test." >&2
      exit 1
      ;;
  esac
  case "${TEST_MIGRATION_DATABASE_URL}" in
    *@db_test:*) ;;
    *)
      echo "TEST_MIGRATION_DATABASE_URL precisa apontar para o host db_test." >&2
      exit 1
      ;;
  esac
  export DATABASE_URL="${TEST_DATABASE_URL}"
  export MIGRATION_DATABASE_URL="${TEST_MIGRATION_DATABASE_URL}"
  exec pytest "$@"
fi

if [ "${1:-}" = "worker" ]; then
  exec python -m app.worker
fi

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${APP_PORT:-8097}"
