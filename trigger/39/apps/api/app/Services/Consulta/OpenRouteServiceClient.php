<?php

namespace App\Services\Consulta;

use App\Models\ApiCache;
use App\Models\Empresa;
use App\Support\PadraoDecimal;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Distância de carro A→B via OpenRouteService (OSM). Tipo A — só evento humano.
 *
 * Proibido: router.project-osrm.org (demo). Chave só no backend. Nunca no browser.
 */
class OpenRouteServiceClient
{
    public const FONTE = 'openrouteservice';

    public const FONTE_MESMO_PONTO = 'mesmo_ponto';

    public const ATRIBUICAO = 'OpenStreetMap';

    public const PROFILE = 'driving-car';

    /**
     * @return array{
     *     distancia_km: string|null,
     *     fonte: string|null,
     *     cache_hit: bool,
     *     atribuicao: string,
     *     erro: string|null
     * }
     */
    public function drivingCarKm(string $latA, string $lngA, string $latB, string $lngB): array
    {
        $empty = [
            'distancia_km' => null,
            'fonte' => null,
            'cache_hit' => false,
            'atribuicao' => self::ATRIBUICAO,
            'erro' => 'indisponivel',
        ];

        try {
            $a = $this->normalizePair($latA, $lngA);
            $b = $this->normalizePair($latB, $lngB);
        } catch (\InvalidArgumentException) {
            $empty['erro'] = 'sem_destino';

            return $empty;
        }

        if ($a['lat'] === $b['lat'] && $a['lng'] === $b['lng']) {
            return [
                'distancia_km' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_DISTANCE),
                'fonte' => self::FONTE_MESMO_PONTO,
                'cache_hit' => false,
                'atribuicao' => self::ATRIBUICAO,
                'erro' => null,
            ];
        }

        $cacheKey = 'ors_drive:'.$a['lat'].','.$a['lng'].':'.$b['lat'].','.$b['lng'];
        $cached = $this->getCached($cacheKey);
        if ($cached !== null && array_key_exists('distancia_km', $cached)) {
            return [
                'distancia_km' => $this->nullableKm($cached['distancia_km'] ?? null),
                'fonte' => isset($cached['fonte']) ? (string) $cached['fonte'] : self::FONTE,
                'cache_hit' => true,
                'atribuicao' => self::ATRIBUICAO,
                'erro' => null,
            ];
        }

        $key = trim((string) config('erp.ors.key', ''));
        if ($key === '') {
            $empty['erro'] = 'chave_ausente';

            return $empty;
        }

        $base = rtrim((string) config('erp.ors.base', 'https://api.openrouteservice.org'), '/');
        if ($base === '' || str_contains(strtolower($base), 'project-osrm.org')) {
            $empty['erro'] = 'provedor_proibido';

            return $empty;
        }

        $url = $base.'/v2/directions/'.self::PROFILE;
        $timeout = (float) config('erp.ors.timeout_sec', 8);

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders([
                    'Authorization' => $key,
                    'User-Agent' => 'FLEXOERP/TRIGGER (https://www.triggerti.com)',
                ])
                ->get($url, [
                    'start' => $a['lng'].','.$a['lat'],
                    'end' => $b['lng'].','.$b['lat'],
                ]);
        } catch (ConnectionException) {
            return $empty;
        }

        $status = $response->status();
        if ($status === 429 || $status === 503) {
            $empty['erro'] = 'cota';

            return $empty;
        }
        if ($status === 401 || $status === 403) {
            $empty['erro'] = 'chave_invalida';

            return $empty;
        }
        if ($status === 404) {
            $empty['erro'] = 'sem_rota';

            return $empty;
        }
        if ($response->failed()) {
            return $empty;
        }

        $payload = is_array($response->json()) ? $response->json() : [];
        $km = $this->extractKm($payload);
        if ($km === null) {
            $empty['erro'] = 'sem_rota';

            return $empty;
        }

        $normalized = [
            'distancia_km' => $km,
            'fonte' => self::FONTE,
        ];
        $ttlDays = max(1, (int) config('erp.ors.cache_ttl_days', 90));
        $this->storeCache($cacheKey, self::FONTE, $normalized, now()->addDays($ttlDays));

        return [
            'distancia_km' => $km,
            'fonte' => self::FONTE,
            'cache_hit' => false,
            'atribuicao' => self::ATRIBUICAO,
            'erro' => null,
        ];
    }

    public function empresaTemOrigem(Empresa $empresa): bool
    {
        $lat = $empresa->origem_latitude;
        $lng = $empresa->origem_longitude;

        return $lat !== null && $lat !== '' && $lng !== null && $lng !== '';
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function extractKm(array $payload): ?string
    {
        $meters = null;
        $features = $payload['features'] ?? null;
        if (is_array($features) && isset($features[0]) && is_array($features[0])) {
            $summary = $features[0]['properties']['summary'] ?? null;
            if (is_array($summary)) {
                $meters = $summary['distance'] ?? null;
            }
        }
        if ($meters === null && isset($payload['routes'][0]) && is_array($payload['routes'][0])) {
            $summary = $payload['routes'][0]['summary'] ?? null;
            if (is_array($summary)) {
                $meters = $summary['distance'] ?? null;
            }
        }

        $metersStr = $this->metersToCanonical($meters);
        if ($metersStr === null) {
            return null;
        }

        $km = bcdiv($metersStr, '1000', PadraoDecimal::SCALE_DISTANCE + 4);

        return PadraoDecimal::roundHalfUp($km, PadraoDecimal::SCALE_DISTANCE);
    }

    private function metersToCanonical(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value)) {
            $value = (string) $value;
        } elseif (is_float($value)) {
            $value = rtrim(rtrim(sprintf('%.4F', $value), '0'), '.');
        }

        try {
            $canonical = PadraoDecimal::parse($value);
        } catch (\InvalidArgumentException) {
            return null;
        }

        if ($canonical === null || bccomp($canonical, '0', 4) < 0) {
            return null;
        }

        return $canonical;
    }

    /**
     * @return array{lat: string, lng: string}
     */
    private function normalizePair(string $lat, string $lng): array
    {
        $latN = PadraoDecimal::parse($lat);
        $lngN = PadraoDecimal::parse($lng);
        if ($latN === null || $lngN === null) {
            throw new \InvalidArgumentException('Coordenada inválida.');
        }

        $latN = PadraoDecimal::roundHalfUp($latN, PadraoDecimal::SCALE_COORD);
        $lngN = PadraoDecimal::roundHalfUp($lngN, PadraoDecimal::SCALE_COORD);

        if (bccomp($latN, '90', PadraoDecimal::SCALE_COORD) > 0
            || bccomp($latN, '-90', PadraoDecimal::SCALE_COORD) < 0
            || bccomp($lngN, '180', PadraoDecimal::SCALE_COORD) > 0
            || bccomp($lngN, '-180', PadraoDecimal::SCALE_COORD) < 0) {
            throw new \InvalidArgumentException('Coordenada fora do intervalo WGS84.');
        }

        return ['lat' => $latN, 'lng' => $lngN];
    }

    private function nullableKm(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_string($value) ? $value : (string) $value;
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
