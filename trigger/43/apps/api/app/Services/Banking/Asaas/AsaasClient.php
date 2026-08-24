<?php

namespace App\Services\Banking\Asaas;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente HTTP ASAAS (sandbox/prod). Sem chave = não chama rede.
 * Docs: https://docs.asaas.com
 */
final class AsaasClient
{
    public function habilitado(): bool
    {
        return $this->apiKey() !== '';
    }

    public function baseUrl(): string
    {
        $custom = trim((string) config('erp.asaas.base_url', ''));
        if ($custom !== '') {
            return rtrim($custom, '/');
        }

        $env = strtolower((string) config('erp.asaas.env', 'sandbox'));

        return $env === 'production'
            ? 'https://api.asaas.com/v3'
            : 'https://api-sandbox.asaas.com/v3';
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public function post(string $path, array $body, ?string $idempotencyKey = null): array
    {
        $headers = [];
        if ($idempotencyKey) {
            $headers['Idempotency-Key'] = $idempotencyKey;
        }

        return $this->decode(
            $this->http()->withHeaders($headers)->post($this->url($path), $body),
            $path,
        );
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public function put(string $path, array $body, ?string $idempotencyKey = null): array
    {
        $headers = [];
        if ($idempotencyKey) {
            $headers['Idempotency-Key'] = $idempotencyKey;
        }

        return $this->decode(
            $this->http()->withHeaders($headers)->put($this->url($path), $body),
            $path,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function get(string $path): array
    {
        return $this->decode($this->http()->get($this->url($path)), $path);
    }

    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        $key = $this->apiKey();
        if ($key === '') {
            throw new RuntimeException('ASAAS_API_KEY não configurada.');
        }

        return Http::withHeaders([
            'access_token' => $key,
            'accept' => 'application/json',
            'content-type' => 'application/json',
            'User-Agent' => 'FLEXORC/43',
        ])->timeout((float) config('erp.asaas.http_timeout_sec', 20));
    }

    private function url(string $path): string
    {
        return $this->baseUrl().'/'.ltrim($path, '/');
    }

    private function apiKey(): string
    {
        return trim((string) config('erp.asaas.api_key', ''));
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(Response $response, string $path): array
    {
        if (! $response->successful()) {
            throw new RuntimeException(
                'ASAAS recusou '.$path.' (HTTP '.$response->status().'): '.$this->mensagemErro($response),
            );
        }

        $json = $response->json();

        return is_array($json) ? $json : [];
    }

    private function mensagemErro(Response $response): string
    {
        $json = $response->json();
        $erros = is_array($json) ? ($json['errors'] ?? null) : null;
        if (is_array($erros) && $erros !== []) {
            $partes = [];
            foreach ($erros as $erro) {
                if (! is_array($erro)) {
                    continue;
                }
                $code = (string) ($erro['code'] ?? '');
                $desc = (string) ($erro['description'] ?? '');
                $partes[] = trim($code.': '.$desc, ': ');
            }
            if ($partes !== []) {
                return implode(' | ', $partes);
            }
        }

        $raw = trim((string) $response->body());

        return $raw !== '' ? mb_substr($raw, 0, 300) : 'sem detalhe';
    }
}
