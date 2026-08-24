<?php

namespace App\Services\Banking\Inter;

use App\Models\BillingIntegracaoInter;
use App\Services\Banking\BankCrypto;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * HTTP OAuth + mTLS para API Cobrança (BolePix) do Inter.
 * https://developers.inter.co/references/cobranca-bolepix
 */
final class InterBillingClient
{
    public function __construct(private readonly BankCrypto $crypto) {}

    public function credenciais(): ?BillingIntegracaoInter
    {
        $row = BillingIntegracaoInter::atual();

        return $row !== null && $row->temCredenciais() ? $row : null;
    }

    public function habilitado(): bool
    {
        return $this->credenciais() !== null;
    }

    /**
     * @return array{access_token: string, expires_in?: int}
     */
    public function oauthToken(?BillingIntegracaoInter $cred = null): array
    {
        $cred ??= $this->credenciais();
        if ($cred === null) {
            throw new RuntimeException('Integração Inter não configurada no console da plataforma.');
        }

        $clientId = $this->crypto->descriptografar((string) $cred->client_id_cipher);
        $clientSecret = $this->crypto->descriptografar((string) $cred->client_secret_cipher);

        return $this->withMtls($cred, function (PendingRequest $http) use ($clientId, $clientSecret, $cred) {
            $response = $http
                ->asForm()
                ->timeout((float) config('erp.bank_http_timeout_sec', 30))
                ->post($this->baseUrl($cred).'/oauth/v2/token', [
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'grant_type' => 'client_credentials',
                    'scope' => 'boleto-cobranca.read boleto-cobranca.write',
                ]);

            if (! $response->successful()) {
                Log::warning('inter.billing.oauth.falha', ['status' => $response->status()]);
                throw new RuntimeException('Falha OAuth Inter (HTTP '.$response->status().').');
            }

            $token = (string) ($response->json('access_token') ?? '');
            if ($token === '') {
                throw new RuntimeException('Inter não retornou access_token.');
            }

            return [
                'access_token' => $token,
                'expires_in' => (int) ($response->json('expires_in') ?? 0),
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public function emitirCobranca(array $body, string $idempotencyKey): array
    {
        $cred = $this->exigirCredenciais();
        $token = $this->oauthToken($cred)['access_token'];

        return $this->withMtls($cred, function (PendingRequest $http) use ($cred, $token, $body, $idempotencyKey) {
            $req = $http
                ->withToken($token)
                ->withHeaders([
                    'x-idempotency-key' => $idempotencyKey,
                    'Content-Type' => 'application/json',
                ])
                ->timeout((float) config('erp.bank_http_timeout_sec', 30));

            $operador = trim((string) ($cred->operador ?? ''));
            if ($operador !== '') {
                $req = $req->withHeaders(['x-conta-corrente' => preg_replace('/\D+/', '', $operador) ?: $operador]);
            }

            $response = $req->post($this->baseUrl($cred).'/cobranca/v3/cobrancas', $body);

            if (! $response->successful()) {
                $json = $response->json();
                $detail = $this->resumoErroHttp(is_array($json) ? $json : null, $response->body());
                Log::warning('inter.billing.emitir.falha', [
                    'status' => $response->status(),
                    'detail' => $detail,
                    'seuNumero' => $body['seuNumero'] ?? null,
                    'valorNominal' => $body['valorNominal'] ?? null,
                    'dataVencimento' => $body['dataVencimento'] ?? null,
                    'violacoes' => is_array($json) ? ($json['violacoes'] ?? $json['violations'] ?? null) : null,
                ]);
                throw new RuntimeException(
                    'Inter recusou emissão de cobrança (HTTP '.$response->status()
                    .($detail !== '' ? ': '.$detail : '').').'
                );
            }

            return $response->json() ?? [];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function detalheCobranca(string $codigoSolicitacao): array
    {
        $cred = $this->exigirCredenciais();
        $token = $this->oauthToken($cred)['access_token'];

        return $this->withMtls($cred, function (PendingRequest $http) use ($cred, $token, $codigoSolicitacao) {
            $req = $http
                ->withToken($token)
                ->timeout((float) config('erp.bank_http_timeout_sec', 30));

            $operador = trim((string) ($cred->operador ?? ''));
            if ($operador !== '') {
                $req = $req->withHeaders(['x-conta-corrente' => preg_replace('/\D+/', '', $operador) ?: $operador]);
            }

            $response = $req->get($this->baseUrl($cred).'/cobranca/v3/cobrancas/'.$codigoSolicitacao);

            if (! $response->successful()) {
                return [];
            }

            return $response->json() ?? [];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function cancelarCobranca(string $codigoSolicitacao, string $motivo = 'SUBSTITUICAO'): array
    {
        $cred = $this->exigirCredenciais();
        $token = $this->oauthToken($cred)['access_token'];

        return $this->withMtls($cred, function (PendingRequest $http) use ($cred, $token, $codigoSolicitacao, $motivo) {
            $req = $http
                ->withToken($token)
                ->timeout((float) config('erp.bank_http_timeout_sec', 30));

            $operador = trim((string) ($cred->operador ?? ''));
            if ($operador !== '') {
                $req = $req->withHeaders(['x-conta-corrente' => preg_replace('/\D+/', '', $operador) ?: $operador]);
            }

            $response = $req->post(
                $this->baseUrl($cred).'/cobranca/v3/cobrancas/'.$codigoSolicitacao.'/cancelar',
                ['motivoCancelamento' => $motivo],
            );

            if (! $response->successful()) {
                Log::warning('inter.billing.cancelar.falha', [
                    'status' => $response->status(),
                    'ref' => $codigoSolicitacao,
                ]);
                // Já cancelada / paga: não bloqueia emissão de substituta.
                if (in_array($response->status(), [400, 404, 409, 422], true)) {
                    return $response->json() ?? [];
                }
                throw new RuntimeException('Inter recusou cancelamento (HTTP '.$response->status().').');
            }

            return $response->json() ?? [];
        });
    }

    public function webhookSecretConfere(?string $headerToken): bool
    {
        $cred = BillingIntegracaoInter::atual();
        if ($cred === null || ! filled($cred->webhook_secret_cipher)) {
            return true; // sem secret configurado = aceita (como ASAAS sem token)
        }

        $esperado = $this->crypto->descriptografar((string) $cred->webhook_secret_cipher);
        if ($esperado === '') {
            return true;
        }

        return is_string($headerToken) && hash_equals($esperado, $headerToken);
    }

    private function exigirCredenciais(): BillingIntegracaoInter
    {
        $cred = $this->credenciais();
        if ($cred === null) {
            throw new RuntimeException('Integração Inter não configurada no console da plataforma.');
        }

        return $cred;
    }

    private function baseUrl(BillingIntegracaoInter $cred): string
    {
        return strtoupper((string) $cred->ambiente) === 'PROD'
            ? 'https://cdpj.partners.bancointer.com.br'
            : 'https://cdpj-sandbox.partners.bancointer.com.br';
    }

    /**
     * @template T
     * @param  callable(PendingRequest): T  $fn
     * @return T
     */
    private function withMtls(BillingIntegracaoInter $cred, callable $fn): mixed
    {
        $certPem = $this->crypto->descriptografar((string) $cred->cert_pem_cipher);
        $keyPem = $this->crypto->descriptografar((string) $cred->key_pem_cipher);

        $dir = sys_get_temp_dir().'/flexorc-inter-'.bin2hex(random_bytes(8));
        if (! mkdir($dir, 0700, true) && ! is_dir($dir)) {
            throw new RuntimeException('Não foi possível criar diretório temporário para mTLS Inter.');
        }

        $certPath = $dir.'/cert.pem';
        $keyPath = $dir.'/key.pem';

        try {
            if (file_put_contents($certPath, $certPem) === false || file_put_contents($keyPath, $keyPem) === false) {
                throw new RuntimeException('Falha ao materializar certificado Inter.');
            }
            chmod($certPath, 0600);
            chmod($keyPath, 0600);

            $http = Http::withOptions([
                'verify' => true,
                'cert' => $certPath,
                'ssl_key' => $keyPath,
            ]);

            return $fn($http);
        } finally {
            @unlink($certPath);
            @unlink($keyPath);
            @rmdir($dir);
        }
    }

    /**
     * Preferir violações (campo + razão) — o Inter costuma devolver title genérico "Dados inválidos.".
     *
     * @param  array<string, mixed>|null  $json
     */
    private function resumoErroHttp(?array $json, string $rawBody): string
    {
        if (is_array($json)) {
            $violacoes = $json['violacoes'] ?? $json['violations'] ?? null;
            if (is_array($violacoes) && $violacoes !== []) {
                $partes = [];
                foreach (array_slice($violacoes, 0, 3) as $item) {
                    if (! is_array($item)) {
                        if (is_string($item) && trim($item) !== '') {
                            $partes[] = trim($item);
                        }

                        continue;
                    }
                    $razao = trim((string) ($item['razao'] ?? $item['mensagem'] ?? $item['message'] ?? ''));
                    $prop = trim((string) ($item['propriedade'] ?? $item['property'] ?? ''));
                    if ($razao !== '' && $prop !== '') {
                        $partes[] = $prop.': '.$razao;
                    } elseif ($razao !== '') {
                        $partes[] = $razao;
                    } elseif ($prop !== '') {
                        $partes[] = $prop;
                    }
                }
                if ($partes !== []) {
                    return mb_substr(implode(' · ', $partes), 0, 280);
                }
            }

            foreach (['detail', 'message', 'mensagem', 'error', 'title'] as $key) {
                $v = $json[$key] ?? null;
                if (is_string($v) && trim($v) !== '') {
                    return mb_substr(trim($v), 0, 240);
                }
            }
        }

        $raw = trim($rawBody);

        return $raw !== '' ? mb_substr($raw, 0, 240) : '';
    }
}
