<?php

namespace App\Services\Consulta;

use App\Models\ApiCache;
use App\Models\Empresa;
use App\Support\PadraoDecimal;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Distância de carro A→B via OSM (OpenRouteService se houver chave; senão roteamento OSM).
 * Tipo A — só evento humano. Proibido: router.project-osrm.org (demo).
 */
class OpenRouteServiceClient
{
    public const FONTE = 'openrouteservice';

    public const FONTE_OSM = 'osm_routing';

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
            $kmCached = $this->nullableKm($cached['distancia_km'] ?? null);
            $canon = null;
            if ($kmCached !== null) {
                try {
                    $canon = PadraoDecimal::parse($kmCached);
                } catch (\InvalidArgumentException) {
                    $canon = null;
                }
            }
            if ($canon !== null && bccomp($canon, '0', PadraoDecimal::SCALE_DISTANCE) !== 0) {
                return [
                    'distancia_km' => PadraoDecimal::roundHalfUp($canon, PadraoDecimal::SCALE_DISTANCE),
                    'fonte' => isset($cached['fonte']) ? (string) $cached['fonte'] : self::FONTE,
                    'cache_hit' => true,
                    'atribuicao' => self::ATRIBUICAO,
                    'erro' => null,
                ];
            }
        }

        $key = trim((string) config('erp.ors.key', ''));
        if ($key !== '') {
            $ors = $this->requestOpenRouteService($a, $b, $key, $empty);
            if ($ors['erro'] === null && $ors['distancia_km'] !== null) {
                $this->storeDriveCache($cacheKey, self::FONTE, $ors['distancia_km']);

                return $ors;
            }
            if (in_array($ors['erro'], ['cota', 'chave_invalida', 'provedor_proibido', 'sem_rota'], true)) {
                return $ors;
            }
        }

        return $this->requestOsmRouting($a, $b, $cacheKey, $empty);
    }

    /**
     * @param  array{lat: string, lng: string}  $a
     * @param  array{lat: string, lng: string}  $b
     * @param  array{distancia_km: string|null, fonte: string|null, cache_hit: bool, atribuicao: string, erro: string|null}  $empty
     * @return array{distancia_km: string|null, fonte: string|null, cache_hit: bool, atribuicao: string, erro: string|null}
     */
    private function requestOpenRouteService(array $a, array $b, string $key, array $empty): array
    {
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
        if ($km === null || bccomp($km, '0', PadraoDecimal::SCALE_DISTANCE) === 0) {
            $empty['erro'] = 'sem_rota';

            return $empty;
        }

        return [
            'distancia_km' => $km,
            'fonte' => self::FONTE,
            'cache_hit' => false,
            'atribuicao' => self::ATRIBUICAO,
            'erro' => null,
        ];
    }

    /**
     * Roteamento OSM (FOSSGIS) — plano free, Tipo A, cache. Não é o demo project-osrm.org.
     *
     * @param  array{lat: string, lng: string}  $a
     * @param  array{lat: string, lng: string}  $b
     * @param  array{distancia_km: string|null, fonte: string|null, cache_hit: bool, atribuicao: string, erro: string|null}  $empty
     * @return array{distancia_km: string|null, fonte: string|null, cache_hit: bool, atribuicao: string, erro: string|null}
     */
    private function requestOsmRouting(array $a, array $b, string $cacheKey, array $empty): array
    {
        $base = rtrim((string) config('erp.ors.osm_routing_base', 'https://routing.openstreetmap.de/routed-car'), '/');
        if ($base === '' || str_contains(strtolower($base), 'project-osrm.org')) {
            $empty['erro'] = 'provedor_proibido';

            return $empty;
        }

        $url = $base.'/route/v1/driving/'.$a['lng'].','.$a['lat'].';'.$b['lng'].','.$b['lat'];
        $timeout = (float) config('erp.ors.timeout_sec', 8);

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->withHeaders([
                    'User-Agent' => 'FLEXOERP/TRIGGER (https://www.triggerti.com)',
                ])
                ->get($url, [
                    'overview' => 'false',
                ]);
        } catch (ConnectionException) {
            return $empty;
        }

        $status = $response->status();
        if ($status === 429 || $status === 503) {
            $empty['erro'] = 'cota';

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
        if ($km === null || bccomp($km, '0', PadraoDecimal::SCALE_DISTANCE) === 0) {
            $empty['erro'] = 'sem_rota';

            return $empty;
        }

        $this->storeDriveCache($cacheKey, self::FONTE_OSM, $km);

        return [
            'distancia_km' => $km,
            'fonte' => self::FONTE_OSM,
            'cache_hit' => false,
            'atribuicao' => self::ATRIBUICAO,
            'erro' => null,
        ];
    }

    private function storeDriveCache(string $cacheKey, string $fonte, string $km): void
    {
        $ttlDays = max(1, (int) config('erp.ors.cache_ttl_days', 90));
        $this->storeCache($cacheKey, $fonte, [
            'distancia_km' => $km,
            'fonte' => $fonte,
        ], now()->addDays($ttlDays));
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
            if ($meters === null) {
                $meters = $payload['routes'][0]['distance'] ?? null;
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
