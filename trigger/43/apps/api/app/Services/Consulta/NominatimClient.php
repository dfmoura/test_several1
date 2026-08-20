<?php

namespace App\Services\Consulta;

use App\Models\ApiCache;
use App\Support\PadraoDecimal;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Ponto B do parceiro: geocodifica o endereço (rua), não o centroide do CEP.
 * Nominatim OSM · Tipo A · cache · User-Agent obrigatório.
 */
class NominatimClient
{
    public const FONTE = 'nominatim';

    public const ATRIBUICAO = 'OpenStreetMap';

    /**
     * @return array{
     *     latitude: string|null,
     *     longitude: string|null,
     *     fonte: string|null,
     *     cache_hit: bool,
     *     sem_ponto: bool,
     *     erro: string|null
     * }
     */
    public function searchEndereco(
        string $logradouro,
        string $numero,
        string $municipio,
        string $uf,
    ): array {
        $empty = [
            'latitude' => null,
            'longitude' => null,
            'fonte' => null,
            'cache_hit' => false,
            'sem_ponto' => false,
            'erro' => 'sem_destino',
        ];

        $logradouro = trim($logradouro);
        $municipio = trim($municipio);
        $uf = strtoupper(trim($uf));
        $numero = trim($numero);

        if ($logradouro === '' || $municipio === '' || strlen($uf) !== 2) {
            return $empty;
        }

        $street = $numero !== '' ? $numero.' '.$logradouro : $logradouro;
        $cacheKey = 'nominatim:'.$uf.':'.mb_strtolower($municipio).':'.mb_strtolower($street);
        $cached = $this->getCached($cacheKey);
        if ($cached !== null && array_key_exists('latitude', $cached)) {
            return [
                'latitude' => $this->nullableCoord($cached['latitude'] ?? null),
                'longitude' => $this->nullableCoord($cached['longitude'] ?? null),
                'fonte' => self::FONTE,
                'cache_hit' => true,
                'sem_ponto' => (bool) ($cached['sem_ponto'] ?? false),
                'erro' => null,
            ];
        }

        $base = rtrim((string) config('erp.nominatim.base', 'https://nominatim.openstreetmap.org'), '/');
        $timeout = (float) config('erp.nominatim.timeout_sec', 8);

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders([
                    'User-Agent' => 'FLEXOERP/TRIGGER (https://www.triggerti.com)',
                ])
                ->get($base.'/search', [
                    'format' => 'json',
                    'limit' => 1,
                    'countrycodes' => 'br',
                    'street' => $street,
                    'city' => $municipio,
                    'state' => $uf,
                    'addressdetails' => 0,
                ]);
        } catch (ConnectionException) {
            $empty['erro'] = 'indisponivel';

            return $empty;
        }

        if ($response->failed()) {
            $empty['erro'] = $response->status() === 429 ? 'cota' : 'indisponivel';

            return $empty;
        }

        $payload = $response->json();
        $row = is_array($payload) && isset($payload[0]) && is_array($payload[0]) ? $payload[0] : null;
        $lat = $this->normalizeCoordinate($row['lat'] ?? null, 90);
        $lng = $this->normalizeCoordinate($row['lon'] ?? null, 180);
        $semPonto = $lat === null || $lng === null;

        $normalized = [
            'latitude' => $lat,
            'longitude' => $lng,
            'fonte' => self::FONTE,
            'sem_ponto' => $semPonto,
        ];
        $this->storeCache($cacheKey, self::FONTE, $normalized, now()->addDays(90));

        return [
            'latitude' => $lat,
            'longitude' => $lng,
            'fonte' => self::FONTE,
            'cache_hit' => false,
            'sem_ponto' => $semPonto,
            'erro' => $semPonto ? 'sem_ponto' : null,
        ];
    }

    private function nullableCoord(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_string($value) ? $value : (string) $value;
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
        if (bccomp($rounded, $max, PadraoDecimal::SCALE_COORD) > 0
            || bccomp($rounded, '-'.$max, PadraoDecimal::SCALE_COORD) < 0) {
            return null;
        }

        return $rounded;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getCached(string $chave): ?array
    {
        $row = ApiCache::query()->where('chave', $chave)->first();
        if ($row === null || ! $row->isValid()) {
            return null;
        }

        return is_array($row->payload) ? $row->payload : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
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
