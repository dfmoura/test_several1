<?php

namespace App\Services\Banking;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\EmpresaBankCredential;
use App\Models\Titulo;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Adapter Inter (sandbox/prod) — referência de estudo.
 * https://developers.inter.co/references/cobranca-bolepix
 *
 * Requer credenciais EMP + cert mTLS em paths fora do Git.
 * Sem credenciais configuradas, falha de forma explícita (usar Mock em local/CI).
 */
final class InterBankProvider implements BankProvider
{
    public function __construct(private readonly BankCrypto $crypto) {}

    public function nome(): string
    {
        return 'inter';
    }

    public function emitirCobranca(Empresa $empresa, Titulo $titulo, array $dados): CobrancaEmitidaDto
    {
        $cred = $this->credential($empresa);
        $token = $this->oauthToken($cred);

        $body = [
            'seuNumero' => (string) ($dados['seu_numero'] ?? $titulo->codigo),
            'valorNominal' => (float) $dados['valor'],
            'dataVencimento' => $dados['vencimento'],
            'numDiasAgenda' => 0,
            'pagador' => [
                'nome' => (string) ($dados['pagador_nome'] ?? 'Cliente'),
                'cpfCnpj' => preg_replace('/\D+/', '', (string) ($dados['pagador_documento'] ?? '')) ?: '00000000000',
                'tipoPessoa' => 'JURIDICA',
            ],
            'mensagem' => [
                'linha1' => mb_substr((string) ($dados['descricao'] ?? $titulo->codigo), 0, 78),
            ],
            'formasRecebimento' => ['BOLETO', 'PIX'],
        ];

        $base = $this->baseUrl($cred);
        $response = Http::withOptions($this->mtlsOptions($cred))
            ->withToken($token)
            ->withHeaders([
                'x-idempotency-key' => (string) $dados['idempotency_key'],
            ])
            ->timeout((float) config('erp.bank_http_timeout_sec', 30))
            ->post($base.'/cobranca/v3/cobrancas', $body);

        if (! $response->successful()) {
            Log::warning('inter.emitir_cobranca.falha', [
                'empresa_id' => $empresa->id,
                'status' => $response->status(),
            ]);
            throw new RuntimeException('Inter recusou emissão de cobrança (HTTP '.$response->status().').');
        }

        $json = $response->json() ?? [];
        $codigoSolicitacao = (string) ($json['codigoSolicitacao'] ?? $json['codigo_solicitacao'] ?? '');
        if ($codigoSolicitacao === '') {
            throw new RuntimeException('Inter não retornou codigoSolicitacao.');
        }

        // Detalhe com PIX (segunda chamada — layout Inter varia por versão).
        $detail = $this->fetchDetail($cred, $token, $codigoSolicitacao);

        return new CobrancaEmitidaDto(
            providerRef: $codigoSolicitacao,
            txid: isset($detail['pix']['txid']) ? (string) $detail['pix']['txid'] : (isset($detail['txid']) ? (string) $detail['txid'] : null),
            pixCopiaCola: isset($detail['pix']['pixCopiaECola'])
                ? (string) $detail['pix']['pixCopiaECola']
                : (isset($detail['pixCopiaECola']) ? (string) $detail['pixCopiaECola'] : null),
            pixQrBase64: isset($detail['pix']['qrCode'])
                ? (string) $detail['pix']['qrCode']
                : (isset($detail['qrCode']) ? (string) $detail['qrCode'] : null),
            linhaDigitavel: isset($detail['boleto']['linhaDigitavel'])
                ? (string) $detail['boleto']['linhaDigitavel']
                : null,
            pdfUrl: isset($detail['boleto']['pdf']) ? (string) $detail['boleto']['pdf'] : null,
            status: Cobranca::STATUS_REGISTRADA,
            raw: ['emissao' => $json, 'detail' => $detail],
        );
    }

    public function consultarCobranca(Empresa $empresa, string $providerRef): CobrancaEmitidaDto
    {
        $cred = $this->credential($empresa);
        $token = $this->oauthToken($cred);
        $detail = $this->fetchDetail($cred, $token, $providerRef);

        return new CobrancaEmitidaDto(
            providerRef: $providerRef,
            txid: isset($detail['pix']['txid']) ? (string) $detail['pix']['txid'] : null,
            pixCopiaCola: isset($detail['pix']['pixCopiaECola']) ? (string) $detail['pix']['pixCopiaECola'] : null,
            pixQrBase64: isset($detail['pix']['qrCode']) ? (string) $detail['pix']['qrCode'] : null,
            linhaDigitavel: isset($detail['boleto']['linhaDigitavel']) ? (string) $detail['boleto']['linhaDigitavel'] : null,
            pdfUrl: null,
            status: Cobranca::STATUS_REGISTRADA,
            raw: $detail,
        );
    }

    public function cancelarCobranca(Empresa $empresa, string $providerRef): CobrancaEmitidaDto
    {
        $cred = $this->credential($empresa);
        $token = $this->oauthToken($cred);
        $base = $this->baseUrl($cred);

        $response = Http::withOptions($this->mtlsOptions($cred))
            ->withToken($token)
            ->timeout((float) config('erp.bank_http_timeout_sec', 30))
            ->post($base.'/cobranca/v3/cobrancas/'.$providerRef.'/cancelar', [
                'motivoCancelamento' => 'SUBSTITUICAO',
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Inter recusou cancelamento (HTTP '.$response->status().').');
        }

        return new CobrancaEmitidaDto(
            providerRef: $providerRef,
            txid: null,
            pixCopiaCola: null,
            pixQrBase64: null,
            linhaDigitavel: null,
            pdfUrl: null,
            status: Cobranca::STATUS_CANCELADA,
            raw: $response->json(),
        );
    }

    public function parseWebhook(array $payload): array
    {
        $situacao = strtoupper((string) ($payload['situacao'] ?? $payload['status'] ?? ''));
        $status = match ($situacao) {
            'RECEBIDO', 'PAGO', 'MARCADO_RECEBIDO' => Cobranca::STATUS_PAGA,
            'CANCELADO' => Cobranca::STATUS_CANCELADA,
            default => $situacao !== '' ? $situacao : null,
        };

        return [
            'event_id' => isset($payload['codigoSolicitacao'])
                ? (string) $payload['codigoSolicitacao'].':'.($payload['horaSituacao'] ?? $payload['dataHoraSituacao'] ?? '')
                : null,
            'provider_ref' => isset($payload['codigoSolicitacao']) ? (string) $payload['codigoSolicitacao'] : null,
            'txid' => isset($payload['txid']) ? (string) $payload['txid'] : null,
            'status' => $status,
            'valor_pago' => isset($payload['valorTotalRecebido'])
                ? (string) $payload['valorTotalRecebido']
                : (isset($payload['valor']) ? (string) $payload['valor'] : null),
            'pago_em' => isset($payload['dataHoraSituacao'])
                ? substr((string) $payload['dataHoraSituacao'], 0, 10)
                : null,
        ];
    }

    private function credential(Empresa $empresa): EmpresaBankCredential
    {
        $cred = EmpresaBankCredential::query()
            ->where('empresa_id', $empresa->id)
            ->where('provider', 'inter')
            ->where('ativo', true)
            ->orderByDesc('id')
            ->first();

        if ($cred === null || ! $cred->client_id_cipher || ! $cred->client_secret_cipher) {
            throw new RuntimeException(
                'Credenciais Inter não configuradas para a empresa. Use BANK_PROVIDER=mock ou cadastre empresa_bank_credentials.'
            );
        }

        return $cred;
    }

    private function oauthToken(EmpresaBankCredential $cred): string
    {
        $clientId = $this->crypto->descriptografar((string) $cred->client_id_cipher);
        $clientSecret = $this->crypto->descriptografar((string) $cred->client_secret_cipher);
        $base = $this->baseUrl($cred);

        $response = Http::withOptions($this->mtlsOptions($cred))
            ->asForm()
            ->timeout((float) config('erp.bank_http_timeout_sec', 30))
            ->post($base.'/oauth/v2/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'grant_type' => 'client_credentials',
                'scope' => 'boleto-cobranca.read boleto-cobranca.write',
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Falha OAuth Inter (HTTP '.$response->status().').');
        }

        $token = (string) ($response->json('access_token') ?? '');
        if ($token === '') {
            throw new RuntimeException('Inter não retornou access_token.');
        }

        return $token;
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchDetail(EmpresaBankCredential $cred, string $token, string $codigoSolicitacao): array
    {
        $base = $this->baseUrl($cred);
        $response = Http::withOptions($this->mtlsOptions($cred))
            ->withToken($token)
            ->timeout((float) config('erp.bank_http_timeout_sec', 30))
            ->get($base.'/cobranca/v3/cobrancas/'.$codigoSolicitacao);

        if (! $response->successful()) {
            return [];
        }

        return $response->json() ?? [];
    }

    private function baseUrl(EmpresaBankCredential $cred): string
    {
        return strtoupper($cred->ambiente) === 'PROD'
            ? 'https://cdpj.partners.bancointer.com.br'
            : 'https://cdpj-sandbox.partners.bancointer.com.br';
    }

    /**
     * @return array<string, mixed>
     */
    private function mtlsOptions(EmpresaBankCredential $cred): array
    {
        $opts = ['verify' => true];
        if ($cred->cert_path && $cred->key_path && is_readable($cred->cert_path) && is_readable($cred->key_path)) {
            $opts['cert'] = $cred->cert_path;
            $opts['ssl_key'] = $cred->key_path;
        }

        return $opts;
    }
}
