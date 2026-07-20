#!/usr/bin/env bash
# Alterna a home ativa (produção = ecossistema).
# Uso:
#   ./scripts/switch-home.sh ecosystem   # produção (padrão)
#   ./scripts/switch-home.sh portfolio   # rollback da home anterior
# index.ecosystem.html e index.portfolio.html ficam fora do publish (.assetsignore).
# Não altera landings de produto, consultoria nem CSS base (styles.css).
set -euo pipefail

BASE="$(cd "$(dirname "$0")/.." && pwd)"
SITE="${BASE}/site"
MODE="${1:-}"

usage() {
  echo "Uso: $0 ecosystem|portfolio" >&2
  echo "  ecosystem  → index.html = conceito ecossistema" >&2
  echo "  portfolio  → index.html = home anterior (produtos + consultoria)" >&2
  exit 1
}

[[ -n "$MODE" ]] || usage

case "$MODE" in
  ecosystem|eco)
    SRC="${SITE}/index.ecosystem.html"
    LABEL="ecossistema"
    ;;
  portfolio|legacy|old)
    SRC="${SITE}/index.portfolio.html"
    LABEL="portfolio (home anterior)"
    ;;
  *)
    usage
    ;;
esac

if [[ ! -f "$SRC" ]]; then
  echo "Erro: arquivo fonte não encontrado: $SRC" >&2
  exit 1
fi

cp "$SRC" "${SITE}/index.html"
echo "Home ativa: ${LABEL}"
echo "  Fonte:  ${SRC}"
echo "  Ativa:  ${SITE}/index.html"
echo "Preview:  ./serve-local.sh"
