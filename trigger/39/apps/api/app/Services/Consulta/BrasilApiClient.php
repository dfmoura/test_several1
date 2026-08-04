<?php

namespace App\Services\Consulta;

use App\Models\ApiCache;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class BrasilApiClient
{
    public function getCnpj(string $cnpj): array
    {
        $digits = preg_replace('/\D/', '', $cnpj) ?? '';

        if (strlen($digits) !== 14) {
            throw new \InvalidArgumentException('CNPJ deve conter 14 dígitos.');
        }

        $cacheKey = 'cnpj:'.$digits;
        $cached = $this->getCached($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $base = rtrim((string) env('BRASILAPI_BASE', 'https://brasilapi.com.br/api'), '/');
        $response = Http::timeout(8)
            ->acceptJson()
            ->get("{$base}/cnpj/v1/{$digits}");

        if ($response->failed()) {
            throw new RequestException($response);
        }

        $payload = is_array($response->json()) ? $response->json() : [];
        $normalized = $this->normalizeCnpjPayload($payload);
        $this->storeCache($cacheKey, 'brasilapi_cnpj', $normalized, now()->addDays(30));

        return $normalized;
    }

    public function getCep(string $cep): array
    {
        $digits = preg_replace('/\D/', '', $cep) ?? '';

        if (strlen($digits) !== 8) {
            throw new \InvalidArgumentException('CEP deve conter 8 dígitos.');
        }

        $cacheKey = 'cep:'.$digits;
        $cached = $this->getCached($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $viaCepBase = rtrim((string) env('VIACEP_BASE', 'https://viacep.com.br/ws'), '/');
        $response = Http::timeout(8)
            ->acceptJson()
            ->get("{$viaCepBase}/{$digits}/json/");

        if ($response->failed()) {
            throw new RequestException($response);
        }

        $payload = $response->json();
        if (isset($payload['erro']) && $payload['erro'] === true) {
            throw new \RuntimeException('CEP não encontrado.');
        }

        $this->storeCache($cacheKey, 'viacep', $payload, now()->addDays(90));

        return $payload;
    }

    /**
     * Lista bancos brasileiros (BrasilAPI /banks/v1).
     *
     * @return list<array{code: string|null, name: string, fullName: string|null, ispb: string|null}>
     */
    public function getBanks(): array
    {
        $cacheKey = 'banks:all';
        $cached = $this->getCached($cacheKey);
        if ($cached !== null) {
            return array_values($cached['items'] ?? $cached);
        }

        $base = rtrim((string) env('BRASILAPI_BASE', 'https://brasilapi.com.br/api'), '/');
        $response = Http::timeout(12)
            ->acceptJson()
            ->get("{$base}/banks/v1");

        if ($response->failed()) {
            throw new RequestException($response);
        }

        $payload = is_array($response->json()) ? $response->json() : [];
        $normalized = $this->normalizeBanksPayload($payload);
        $this->storeCache($cacheKey, 'brasilapi_banks', ['items' => $normalized], now()->addDays(7));

        return $normalized;
    }

    /**
     * @param  list<mixed>  $payload
     * @return list<array{code: string|null, name: string, fullName: string|null, ispb: string|null}>
     */
    private function normalizeBanksPayload(array $payload): array
    {
        $items = [];

        foreach ($payload as $row) {
            if (! is_array($row)) {
                continue;
            }

            $code = $row['code'] ?? null;
            $name = trim((string) ($row['name'] ?? $row['fullName'] ?? ''));
            if ($name === '' && $code === null) {
                continue;
            }

            $items[] = [
                'code' => $code !== null && $code !== '' ? str_pad((string) $code, 3, '0', STR_PAD_LEFT) : null,
                'name' => $name !== '' ? $name : (string) $code,
                'fullName' => isset($row['fullName']) ? (string) $row['fullName'] : null,
                'ispb' => isset($row['ispb']) ? (string) $row['ispb'] : null,
            ];
        }

        usort($items, function (array $a, array $b) {
            $ca = $a['code'] ?? '999';
            $cb = $b['code'] ?? '999';

            return [$ca === null ? '999' : $ca, $a['name']] <=> [$cb === null ? '999' : $cb, $b['name']];
        });

        return $items;
    }

    /**
     * Acrescenta aliases úteis ao ERP sem remover o payload original da BrasilAPI.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function normalizeCnpjPayload(array $payload): array
    {
        $cnae = isset($payload['cnae_fiscal'])
            ? str_pad((string) $payload['cnae_fiscal'], 7, '0', STR_PAD_LEFT)
            : null;

        $cep = isset($payload['cep'])
            ? preg_replace('/\D/', '', (string) $payload['cep'])
            : null;

        $ibge = isset($payload['codigo_municipio_ibge'])
            ? (string) $payload['codigo_municipio_ibge']
            : null;

        $regime = null;
        if (($payload['opcao_pelo_simples'] ?? false) === true) {
            $regime = 'SIMPLES_NACIONAL';
        } elseif (($payload['opcao_pelo_mei'] ?? false) === true) {
            $regime = 'MEI';
        }

        $telefone = $payload['ddd_telefone_1'] ?? null;
        if (is_string($telefone)) {
            $telefone = preg_replace('/\D/', '', $telefone) ?: null;
        }

        return array_merge($payload, [
            'cnae' => $cnae,
            'cnae_descricao' => $payload['cnae_fiscal_descricao'] ?? null,
            'ibge' => $ibge,
            'cep' => $cep,
            'regime_sugerido' => $regime,
            'telefone' => $telefone,
            'situacao_rfb' => $payload['descricao_situacao_cadastral'] ?? null,
        ]);
    }

    private function getCached(string $chave): ?array
    {
        $row = ApiCache::query()->where('chave', $chave)->first();
        if ($row === null || ! $row->isValid()) {
            return null;
        }

        $payload = $row->payload;
        if (! is_array($payload)) {
            return null;
        }

        // Cache antigo sem aliases — normaliza na leitura.
        if (! array_key_exists('regime_sugerido', $payload) && array_key_exists('cnpj', $payload)) {
            return $this->normalizeCnpjPayload($payload);
        }

        return $payload;
    }

    private function storeCache(string $chave, string $fonte, array $payload, \DateTimeInterface $expiresAt): void
    {
        ApiCache::query()->updateOrCreate(
            ['chave' => Str::limit($chave, 190, '')],
            [
                'fonte' => $fonte,
                'payload' => $payload,
                'expires_at' => $expiresAt,
            ]
        );
    }
}
