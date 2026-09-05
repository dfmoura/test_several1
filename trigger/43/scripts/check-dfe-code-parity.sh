#!/usr/bin/env bash
# Paridade de código DF-e: notebook (fonte) × Lightsail (runtime).
# Não altera arquivos — só compara MD5. Não toca .env / banco / APP_KEY.
#
# Uso:
#   SSH_KEY=~/Downloads/LightsailDefaultKey-sa-east-1.pem \
#   AWS_HOST=ubuntu@54.20.102.133 \
#   AWS_APP_DIR=/home/ubuntu/flexoerp \
#   ./scripts/check-dfe-code-parity.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SSH_KEY="${SSH_KEY:-$HOME/Downloads/LightsailDefaultKey-sa-east-1.pem}"
AWS_HOST="${AWS_HOST:-ubuntu@54.20.102.133}"
AWS_APP_DIR="${AWS_APP_DIR:-/home/ubuntu/flexoerp}"

# Domínio DF-e + cofre A1 (código). Não inclui dfe:amostra-local (só notebook).
# Segredo/runtime (A1 cifrado, APP_KEY, ERP_STAGE) NÃO entram aqui — vivem só na nuvem.
FILES=(
  apps/api/app/Services/Fiscal/Dfe/SefazNfeDistribuicaoClient.php
  apps/api/app/Services/Fiscal/Dfe/DfeDistribuicaoClient.php
  apps/api/app/Services/Fiscal/Dfe/DfeDistribuicaoResultado.php
  apps/api/app/Services/Fiscal/Dfe/DfeDocZip.php
  apps/api/app/Services/Fiscal/Dfe/FakeDfeDistribuicaoClient.php
  apps/api/app/Services/Compras/DfeSyncService.php
  apps/api/app/Services/Compras/DfeCaixaService.php
  apps/api/app/Services/Compras/DfeAmarrarService.php
  apps/api/app/Services/Compras/DfeXmlCompletoService.php
  apps/api/app/Jobs/SyncDfeEmpresaJob.php
  apps/api/app/Jobs/BuscarXmlDfeDocumentoJob.php
  apps/api/app/Console/Commands/SyncDfeDeltaCommand.php
  apps/api/app/Models/DfeDocumento.php
  apps/api/app/Models/DfeSyncEstado.php
  apps/api/app/Http/Controllers/Api/V1/DfeCaixaController.php
  apps/api/app/Http/Controllers/Api/V1/EmpresaCertificadoA1Controller.php
  apps/api/app/Services/Cadastros/EmpresaCertificadoA1Service.php
  apps/api/app/Services/Cadastros/EmpresaCertificadoA1Materializer.php
  apps/api/routes/api.php
  apps/api/config/erp.php
  apps/web/src/pages/ComprasNfeDestinadasPage.tsx
  apps/web/src/lib/api.ts
  apps/api/tests/Feature/DfeAmarrarXmlTest.php
  apps/api/tests/Feature/DfeCaixaTest.php
  apps/api/tests/Feature/DfeSyncTest.php
  apps/api/tests/Unit/DfeSoapEnvelopeTest.php
)

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH_KEY não encontrado: $SSH_KEY" >&2
  exit 2
fi

echo "=== Paridade DF-e (local = verdade) ==="
echo "local: $ROOT"
echo "aws:   $AWS_HOST:$AWS_APP_DIR"
echo

mismatch=0
for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "FALTA LOCAL  $f"
    mismatch=1
    continue
  fi
  local_md5="$(md5sum "$f" | awk '{print $1}')"
  remote_md5="$(ssh -o ConnectTimeout=20 -o BatchMode=yes -i "$SSH_KEY" "$AWS_HOST" \
    "md5sum '$AWS_APP_DIR/$f' 2>/dev/null | awk '{print \$1}'" || true)"
  if [[ -z "$remote_md5" ]]; then
    echo "FALTA AWS    $f"
    mismatch=1
    continue
  fi
  if [[ "$local_md5" == "$remote_md5" ]]; then
    echo "OK  $local_md5  $f"
  else
    echo "DIFF local=$local_md5 aws=$remote_md5  $f"
    mismatch=1
  fi
done

echo
if [[ "$mismatch" -eq 0 ]]; then
  echo "RESULTADO: paridade OK (código DF-e alinhado)."
  exit 0
fi

echo "RESULTADO: divergência. Fonte da verdade = git/local."
echo "Corrigir: commit local → deploy/rsync do mesmo artefato → rodar este script de novo."
echo "Proibido: sobrescrever .env.aws / APP_KEY / banco neste alinhamento."
exit 1
