#!/usr/bin/env bash
# Prontidão NF-e SEFAZ-MG homolog (nuvem).
# Uso:
#   ./scripts/nfe-sefaz-mg-pronto.sh
#   SSH_KEY=… AWS_HOST=… ./scripts/nfe-sefaz-mg-pronto.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/Downloads/LightsailDefaultKey-sa-east-1.pem}"
AWS_HOST="${AWS_HOST:-ubuntu@54.20.102.133}"
EMP="${1:-EMP-00001}"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$AWS_HOST" bash -s <<REMOTE
set -euo pipefail
cd /home/ubuntu/flexoerp
COMPOSE='docker compose -f docker-compose.yml -f docker-compose.aws.yml --env-file .env.aws'
echo "=== env ==="
for k in ERP_STAGE NFE_DRIVER FISCAL_EMISSOR NFE_HTTP_TIMEOUT_SEC APP_DEBUG; do
  echo "\$k=\$(grep -E \"^\${k}=\" .env.aws | head -1 | cut -d= -f2- || true)"
done
echo
\$COMPOSE exec -T app php artisan nfe:serie status ${EMP}
echo
\$COMPOSE exec -T app php -r '
require "vendor/autoload.php";
\$app = require "bootstrap/app.php";
\$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
\$e = App\Models\Empresa::where("codigo", "${EMP}")->firstOrFail();
\$mat = app(App\Services\Cadastros\EmpresaCertificadoA1Materializer::class);
\$cert = \$mat->materializar(\$e);
try {
  \$u = "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4";
  \$inner = "<consStatServ xmlns=\\"http://www.portalfiscal.inf.br/nfe\\" versao=\\"4.00\\"><tpAmb>2</tpAmb><cUF>31</cUF><xServ>STATUS</xServ></consStatServ>";
  \$ns = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4";
  \$env = "<?xml version=\\"1.0\\" encoding=\\"utf-8\\"?><soap12:Envelope xmlns:soap12=\\"http://www.w3.org/2003/05/soap-envelope\\"><soap12:Body><nfeDadosMsg xmlns=\\"\$ns\\">".\$inner."</nfeDadosMsg></soap12:Body></soap12:Envelope>";
  \$ch = curl_init(\$u);
  curl_setopt_array(\$ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSLCERT => \$cert["path"],
    CURLOPT_SSLCERTPASSWD => \$cert["senha"],
    CURLOPT_SSLCERTTYPE => "P12",
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["Content-Type: application/soap+xml; charset=utf-8; action=\\"\$ns/nfeStatusServicoNF\\""],
    CURLOPT_POSTFIELDS => \$env,
  ]);
  \$body = curl_exec(\$ch);
  \$err = curl_error(\$ch);
  curl_close(\$ch);
  if (\$err) { fwrite(STDERR, "StatusServico ERR: \$err\\n"); exit(1); }
  preg_match("/<cStat>(\\d+)<\\/cStat>/", (string) \$body, \$m);
  \$c = \$m[1] ?? "";
  echo "StatusServico MG homolog cStat=\$c ".(\$c === "107" ? "OK" : "FALHA")."\\n";
  exit(\$c === "107" ? 0 : 1);
} finally {
  \$mat->liberar(\$cert);
}
'
REMOTE
