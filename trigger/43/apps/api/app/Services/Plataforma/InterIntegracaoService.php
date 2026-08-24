<?php

namespace App\Services\Plataforma;

use App\Models\BillingIntegracaoInter;
use App\Services\Audit\AuditLogger;
use App\Services\Banking\BankCrypto;
use App\Services\Banking\Inter\InterBillingClient;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/** Setup Inter (mensalidade) no console PLATAFORMA. */
final class InterIntegracaoService
{
    public function __construct(
        private readonly BankCrypto $crypto,
        private readonly InterBillingClient $client,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function apresentar(?BillingIntegracaoInter $row = null): array
    {
        $row ??= BillingIntegracaoInter::atual();
        // Mesmo padrão do ensaio ASAAS: webhook público via tunnel (ORCAMENTO_PUBLIC_BASE_URL),
        // APP_URL permanece localhost para o browser do operador.
        $publicBase = rtrim((string) config('erp.orcamento_public_base_url', config('app.url')), '/');

        return [
            'configurado' => $row !== null && $row->temCredenciais(),
            'ativo' => $row?->ativo ?? false,
            'operador' => $row?->operador,
            'ambiente' => $row?->ambiente ?? 'SANDBOX',
            'tem_client_id' => filled($row?->client_id_cipher),
            'tem_client_secret' => filled($row?->client_secret_cipher),
            'tem_certificado' => filled($row?->cert_pem_cipher),
            'tem_chave' => filled($row?->key_pem_cipher),
            'tem_webhook_secret' => filled($row?->webhook_secret_cipher),
            'billing_provider_atual' => strtolower(trim((string) config('erp.billing.provider', 'mock'))),
            'webhook_url' => $publicBase.'/api/v1/webhooks/bancarios/inter',
            'documentacao' => 'https://developers.inter.co/references/cobranca-bolepix',
            'front_base' => $publicBase,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function salvar(array $data, ?User $ator = null): array
    {
        $row = BillingIntegracaoInter::atual() ?? new BillingIntegracaoInter;

        if (array_key_exists('operador', $data)) {
            $op = preg_replace('/\D+/', '', (string) ($data['operador'] ?? '')) ?: null;
            $row->operador = $op;
        }
        if (! empty($data['ambiente'])) {
            $amb = strtoupper((string) $data['ambiente']);
            $row->ambiente = in_array($amb, ['SANDBOX', 'PROD'], true) ? $amb : 'SANDBOX';
        }
        if (array_key_exists('ativo', $data)) {
            $row->ativo = (bool) $data['ativo'];
        } else {
            $row->ativo = true;
        }

        if (! empty($data['client_id'])) {
            $row->client_id_cipher = $this->crypto->criptografar((string) $data['client_id']);
        }
        if (! empty($data['client_secret'])) {
            $row->client_secret_cipher = $this->crypto->criptografar((string) $data['client_secret']);
        }
        if (! empty($data['webhook_secret'])) {
            $row->webhook_secret_cipher = $this->crypto->criptografar((string) $data['webhook_secret']);
        }
        if (! empty($data['cert_pem'])) {
            $row->cert_pem_cipher = $this->crypto->criptografar($this->normalizarPem((string) $data['cert_pem']));
        }
        if (! empty($data['key_pem'])) {
            $row->key_pem_cipher = $this->crypto->criptografar($this->normalizarPem((string) $data['key_pem']));
        }

        $row->save();

        $this->audit->log('PLATAFORMA_INTER_INTEGRACAO', 'billing_integracao_inter', $row->id, null, [
            'ambiente' => $row->ambiente,
            'operador_mascara' => $row->operador ? '***'.substr((string) $row->operador, -4) : null,
            'tem_credenciais' => $row->temCredenciais(),
            'ator_id' => $ator?->id,
        ]);

        return $this->apresentar($row);
    }

    /**
     * @return array{ok: bool, mensagem: string}
     */
    public function testar(): array
    {
        try {
            $token = $this->client->oauthToken();
            $expires = (int) ($token['expires_in'] ?? 0);

            return [
                'ok' => true,
                'mensagem' => $expires > 0
                    ? 'Conexão OK. Token OAuth obtido (expira em '.$expires.'s).'
                    : 'Conexão OK. Token OAuth obtido.',
            ];
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'integracao' => $e->getMessage(),
            ]);
        }
    }

    private function normalizarPem(string $pem): string
    {
        $pem = str_replace(["\r\n", "\r"], "\n", trim($pem));
        if ($pem === '' || ! str_contains($pem, '-----BEGIN')) {
            throw ValidationException::withMessages([
                'certificado' => 'Arquivo PEM inválido (espere -----BEGIN … -----END).',
            ]);
        }

        return $pem;
    }
}
