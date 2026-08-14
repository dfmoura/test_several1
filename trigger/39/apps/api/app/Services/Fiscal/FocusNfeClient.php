<?php

namespace App\Services\Fiscal;

use App\Models\FiscalHub;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente Focus NFe — autenticação, smoke-test e emissão NF-e / NFS-e Nacional.
 *
 * Auth: HTTP Basic, usuário = token, senha vazia.
 * Numeração fiscal vem da resposta Focus — este cliente não inventa chave/número.
 *
 * @see https://doc.focusnfe.com.br/reference/autenticacao
 * @see https://doc.focusnfe.com.br/reference/nfe
 * @see https://doc.focusnfe.com.br/reference/nfse-nacional
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

        try {
            $response = $this->http($token)->get($baseUrl.'/v2/empresas');
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
        $msg = $this->mensagemCorpo($response->json(), $response->body());

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

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function emitirNfe(FiscalHub $hub, string $ambiente, string $ref, array $payload): array
    {
        return $this->enviar($hub, $ambiente, 'POST', '/v2/nfe?ref='.rawurlencode($ref), $payload);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function emitirNfse(FiscalHub $hub, string $ambiente, string $ref, array $payload): array
    {
        return $this->enviar($hub, $ambiente, 'POST', '/v2/nfsen?ref='.rawurlencode($ref), $payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function consultarNfe(FiscalHub $hub, string $ambiente, string $ref): array
    {
        return $this->enviar($hub, $ambiente, 'GET', '/v2/nfe/'.rawurlencode($ref), null);
    }

    /**
     * @return array<string, mixed>
     */
    public function consultarNfse(FiscalHub $hub, string $ambiente, string $ref): array
    {
        return $this->enviar($hub, $ambiente, 'GET', '/v2/nfsen/'.rawurlencode($ref), null);
    }

    public function tokenPara(FiscalHub $hub, string $ambiente): string
    {
        $cipher = $ambiente === 'producao'
            ? (string) $hub->token_producao_criptografada
            : (string) $hub->token_homologacao_criptografada;

        return $this->crypto->descriptografar($cipher);
    }

    /**
     * @param  array<string, mixed>|null  $payload
     * @return array{
     *   ok: bool,
     *   status_focus: string,
     *   http_status: int,
     *   chave: ?string,
     *   numero: ?string,
     *   serie: ?string,
     *   protocolo: ?string,
     *   mensagem: string,
     *   body: array<string, mixed>
     * }
     */
    private function enviar(FiscalHub $hub, string $ambiente, string $method, string $path, ?array $payload): array
    {
        $baseUrl = $hub->baseUrlPara($ambiente);
        $token = $this->tokenPara($hub, $ambiente);
        $url = $baseUrl.$path;
        $timeout = (float) config('erp.fiscal_hub_emit_timeout_sec', 40);

        try {
            $pending = $this->http($token, $timeout);
            $response = strtoupper($method) === 'GET'
                ? $pending->get($url)
                : $pending->post($url, $payload ?? []);
        } catch (ConnectionException $e) {
            return $this->resultado(false, 'erro_autorizacao', 0, [
                'mensagem' => 'Falha de conexão com o hub: '.$e->getMessage(),
            ]);
        }

        $body = $response->json();
        $body = is_array($body) ? $body : ['raw' => mb_substr($response->body(), 0, 400)];
        $http = $response->status();
        $focusStatus = strtolower((string) ($body['status'] ?? ''));
        $msg = $this->mensagemCorpo($body, $response->body());

        if ($http === 401 || $http === 403) {
            return $this->resultado(false, 'erro_autorizacao', $http, array_merge($body, [
                'mensagem' => $msg !== '' ? $msg : 'Token rejeitado (HTTP '.$http.').',
            ]));
        }

        if ($focusStatus === '') {
            if ($http === 202) {
                $focusStatus = 'processando_autorizacao';
            } elseif ($http >= 200 && $http < 300) {
                $focusStatus = 'autorizado';
            } else {
                $focusStatus = 'erro_autorizacao';
            }
        }

        $ok = in_array($focusStatus, ['autorizado', 'processando_autorizacao'], true)
            && $http >= 200 && $http < 300;

        return $this->resultado($ok, $focusStatus, $http, $body, $msg);
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    private function resultado(bool $ok, string $statusFocus, int $http, array $body, string $msg = ''): array
    {
        if ($msg === '') {
            $msg = $this->mensagemCorpo($body, '');
        }

        $numero = $body['numero'] ?? $body['numero_dps'] ?? $body['numero_nfse'] ?? null;
        $serie = $body['serie'] ?? $body['serie_dps'] ?? null;

        return [
            'ok' => $ok,
            'status_focus' => $statusFocus,
            'http_status' => $http,
            'chave' => isset($body['chave']) ? (string) $body['chave'] : null,
            'numero' => $numero !== null && $numero !== '' ? (string) $numero : null,
            'serie' => $serie !== null && $serie !== '' ? (string) $serie : null,
            'protocolo' => isset($body['protocolo']) ? (string) $body['protocolo'] : null,
            'mensagem' => $msg,
            'body' => $body,
        ];
    }

    private function http(string $token, ?float $timeout = null): \Illuminate\Http\Client\PendingRequest
    {
        $timeout ??= (float) config('erp.fiscal_hub_http_timeout_sec', 20);

        return Http::timeout($timeout)
            ->withBasicAuth($token, '')
            ->acceptJson()
            ->asJson();
    }

    /**
     * @param  mixed  $body
     */
    private function mensagemCorpo(mixed $body, string $raw): string
    {
        if (is_array($body)) {
            $msg = $body['mensagem'] ?? $body['message'] ?? $body['erro'] ?? $body['codigo'] ?? null;
            if (is_string($msg) && $msg !== '') {
                return mb_substr($msg, 0, 400);
            }
            if (isset($body['erros']) && is_array($body['erros'])) {
                $parts = [];
                foreach ($body['erros'] as $e) {
                    if (is_string($e)) {
                        $parts[] = $e;
                    } elseif (is_array($e)) {
                        $parts[] = (string) ($e['mensagem'] ?? $e['message'] ?? json_encode($e, JSON_UNESCAPED_UNICODE));
                    }
                }
                if ($parts !== []) {
                    return mb_substr(implode('; ', $parts), 0, 400);
                }
            }
        }

        return mb_substr($raw, 0, 200);
    }
}
