<?php

namespace App\Services\Fiscal;

use App\Models\FiscalHub;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente mínimo Focus NFe — autenticação e smoke-test.
 * Emissão NF fica para fase futura; este cliente serve cadastro/vínculo.
 *
 * Auth: HTTP Basic, usuário = token, senha vazia
 * @see https://doc.focusnfe.com.br/reference/autenticacao
 * @see https://doc.focusnfe.com.br/reference/ambiente
 */
class FocusNfeClient
{
    public function __construct(
        private readonly FiscalHubCrypto $crypto,
    ) {}

    /**
     * @return array{ok: bool, mensagem: string, ambiente: string}
     */
    public function testarConexao(FiscalHub $hub, string $ambiente): array
    {
        if ($hub->provedor !== 'focusnfe' && $hub->provedor !== 'generico') {
            return [
                'ok' => false,
                'mensagem' => 'Provedor sem cliente de teste implementado.',
                'ambiente' => $ambiente,
            ];
        }

        if (! $hub->temToken($ambiente)) {
            return [
                'ok' => false,
                'mensagem' => 'Token de '.$ambiente.' não cadastrado.',
                'ambiente' => $ambiente,
            ];
        }

        try {
            $baseUrl = $hub->baseUrlPara($ambiente);
            $token = $this->tokenPara($hub, $ambiente);
        } catch (RuntimeException $e) {
            return [
                'ok' => false,
                'mensagem' => $e->getMessage(),
                'ambiente' => $ambiente,
            ];
        }

        $timeout = (float) config('erp.fiscal_hub_http_timeout_sec', 20);
        $url = $baseUrl.'/v2/empresas';

        try {
            $response = Http::timeout($timeout)
                ->withBasicAuth($token, '')
                ->acceptJson()
                ->get($url);
        } catch (ConnectionException $e) {
            return [
                'ok' => false,
                'mensagem' => 'Falha de conexão com o hub: '.$e->getMessage(),
                'ambiente' => $ambiente,
            ];
        }

        if ($response->successful()) {
            return [
                'ok' => true,
                'mensagem' => 'Conexão OK ('.$ambiente.') — autenticação Focus aceita.',
                'ambiente' => $ambiente,
            ];
        }

        $status = $response->status();
        $body = $response->json();
        $msg = is_array($body)
            ? (string) ($body['mensagem'] ?? $body['message'] ?? $body['erro'] ?? json_encode($body, JSON_UNESCAPED_UNICODE))
            : mb_substr($response->body(), 0, 200);

        if ($status === 401 || $status === 403) {
            return [
                'ok' => false,
                'mensagem' => 'Token rejeitado (HTTP '.$status.') em '.$ambiente.'.',
                'ambiente' => $ambiente,
            ];
        }

        // Alguns tenants Focus retornam 404/422 em listagem sem empresa — auth já passou.
        if ($status >= 400 && $status < 500 && $status !== 401 && $status !== 403) {
            return [
                'ok' => true,
                'mensagem' => 'Autenticação OK em '.$ambiente.' (HTTP '.$status.' na listagem).',
                'ambiente' => $ambiente,
            ];
        }

        return [
            'ok' => false,
            'mensagem' => 'Hub respondeu HTTP '.$status.($msg !== '' ? ': '.$msg : ''),
            'ambiente' => $ambiente,
        ];
    }

    public function tokenPara(FiscalHub $hub, string $ambiente): string
    {
        $cipher = $ambiente === 'producao'
            ? (string) $hub->token_producao_criptografada
            : (string) $hub->token_homologacao_criptografada;

        return $this->crypto->descriptografar($cipher);
    }
}
