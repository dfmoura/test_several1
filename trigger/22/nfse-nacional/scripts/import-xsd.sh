#!/bin/bash
# Importa XSDs oficiais do portal NFS-e (executar manualmente após download)
set -euo pipefail
DEST="$(dirname "$0")/../docs/gov/schemas"
mkdir -p "$DEST"
echo "Copie os XSDs do portal gov.br para: $DEST"
echo "https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual"
