<?php

namespace App\Services\Consulta;

use App\Models\ApiCache;
use App\Support\PadraoDecimal;
use Illuminate\Http\Client\ConnectionException;
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
     * Geolocalização do CEP (BrasilAPI CEP v2 / OSM). Não substitui ViaCEP.
     *
     * Falha de rede/API não lança — devolve lat/lng vazios para o cadastro seguir.
     * CEP sem ponto (200 com coordinates vazias) é cacheado 90d; 4xx/5xx não.
     *
     * @return array{
     *     latitude: string|null,
     *     longitude: string|null,
     *     fonte: string|null,
     *     cache_hit: bool,
     *     sem_ponto: bool,
     *     erro: string|null
     * }
     */
    public function getCepGeo(string $cep): array
    {
        $digits = preg_replace('/\D/', '', $cep) ?? '';

        if (strlen($digits) !== 8) {
            throw new \InvalidArgumentException('CEP deve conter 8 dígitos.');
        }

        $cacheKey = 'cep_geo:'.$digits;
        $cached = $this->getCached($cacheKey);
        if ($cached !== null && array_key_exists('latitude', $cached)) {
            return [
                'latitude' => $this->nullableCoord($cached['latitude'] ?? null),
                'longitude' => $this->nullableCoord($cached['longitude'] ?? null),
                'fonte' => isset($cached['fonte']) ? (string) $cached['fonte'] : 'brasilapi_cep_v2',
                'cache_hit' => true,
                'sem_ponto' => (bool) ($cached['sem_ponto'] ?? false),
                'erro' => null,
            ];
        }

        $empty = [
            'latitude' => null,
            'longitude' => null,
            'fonte' => null,
            'cache_hit' => false,
            'sem_ponto' => false,
            'erro' => 'indisponivel',
        ];

        $base = rtrim((string) env('BRASILAPI_BASE', 'https://brasilapi.com.br/api'), '/');

        try {
            $response = Http::timeout(8)
                ->acceptJson()
                ->get("{$base}/cep/v2/{$digits}");
        } catch (ConnectionException) {
            return $empty;
        }

        if ($response->failed()) {
            return $empty;
        }

        $payload = is_array($response->json()) ? $response->json() : [];
        $coords = $this->extractCepCoordinates($payload);
        $semPonto = $coords['latitude'] === null || $coords['longitude'] === null;

        $normalized = [
            'latitude' => $coords['latitude'],
            'longitude' => $coords['longitude'],
            'fonte' => 'brasilapi_cep_v2',
            'service' => isset($payload['service']) ? (string) $payload['service'] : null,
            'sem_ponto' => $semPonto,
        ];

        $this->storeCache($cacheKey, 'brasilapi_cep_v2', $normalized, now()->addDays(90));

        return [
            'latitude' => $normalized['latitude'],
            'longitude' => $normalized['longitude'],
            'fonte' => 'brasilapi_cep_v2',
            'cache_hit' => false,
            'sem_ponto' => $semPonto,
            'erro' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{latitude: string|null, longitude: string|null}
     */
    private function extractCepCoordinates(array $payload): array
    {
        $location = $payload['location'] ?? null;
        $raw = is_array($location) ? ($location['coordinates'] ?? null) : null;

        $lat = null;
        $lng = null;

        if (is_array($raw)) {
            if (array_key_exists('latitude', $raw) || array_key_exists('longitude', $raw)) {
                $lat = $raw['latitude'] ?? null;
                $lng = $raw['longitude'] ?? null;
            } elseif (array_is_list($raw) && count($raw) >= 2) {
                $lng = $raw[0];
                $lat = $raw[1];
            }
        }

        return [
            'latitude' => $this->normalizeCoordinate($lat, 90),
            'longitude' => $this->normalizeCoordinate($lng, 180),
        ];
    }

    private function normalizeCoordinate(mixed $value, int $maxAbs): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value)) {
            $value = (string) $value;
        } elseif (is_float($value)) {
            $value = rtrim(rtrim(sprintf('%.8F', $value), '0'), '.');
        }

        try {
            $canonical = PadraoDecimal::parse($value);
        } catch (\InvalidArgumentException) {
            return null;
        }

        if ($canonical === null) {
            return null;
        }

        $rounded = PadraoDecimal::roundHalfUp($canonical, PadraoDecimal::SCALE_COORD);
        $max = (string) $maxAbs;
        $min = '-'.$max;

        if (bccomp($rounded, $max, PadraoDecimal::SCALE_COORD) > 0
            || bccomp($rounded, $min, PadraoDecimal::SCALE_COORD) < 0) {
            return null;
        }

        return $rounded;
    }

    private function nullableCoord(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_string($value) ? $value : (string) $value;
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
