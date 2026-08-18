<?php

namespace App\Services\Consulta;

use App\Models\ApiCache;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Consulta CEP (Tipo A — evento humano). Estudo 32 · APIS_FREE §3.2 / §6.3 / §7.6.
 *
 * ViaCEP permanece o contrato da NF-e (logradouro, IBGE). BrasilAPI CEP v1 e
 * OpenCEP só preenchem campo vazio ou substituem a primária se ela cair.
 * Geo (lat/lng) não entra aqui — BL-055 / getCepGeo.
 */
class CepLookupService
{
    public const FONTE_VIACEP = 'viacep';

    public const FONTE_BRASILAPI = 'brasilapi_cep';

    public const FONTE_OPENCEP = 'opencep';

    /**
     * @return array<string, mixed>
     */
    public function getCep(string $cep): array
    {
        $digits = preg_replace('/\D/', '', $cep) ?? '';

        if (strlen($digits) !== 8) {
            throw new \InvalidArgumentException('CEP deve conter 8 dígitos.');
        }

        $cacheKey = 'cep:'.$digits;
        $cached = $this->getCached($cacheKey);
        if ($cached !== null) {
            if ($this->isComplete($cached) || ($this->enrichmentDone($cached) && $this->isUsable($cached))) {
                return $this->publicPayload($cached);
            }

            $merged = $this->enrich($digits, $cached, $this->fontesOf($cached));
            $this->persist($cacheKey, $merged);

            if (! $this->isUsable($merged)) {
                $this->throwLookupFailure($merged);
            }

            return $this->publicPayload($merged);
        }

        $via = $this->fetchViaCep($digits);
        $base = $via['data'] ?? $this->emptyAddress($digits);
        $fontes = [];
        if ($via['data'] !== null) {
            $fontes[] = self::FONTE_VIACEP;
        }

        if ($this->isComplete($base)) {
            $merged = $this->withMeta($base, $fontes, enrichmentDone: false);
            $this->persist($cacheKey, $merged);

            return $this->publicPayload($merged);
        }

        try {
            $merged = $this->enrich($digits, $base, $fontes, $via);
        } catch (\Throwable) {
            if ($this->isUsable($base)) {
                $merged = $this->withMeta($base, $fontes, enrichmentDone: true);
                $this->persist($cacheKey, $merged);

                return $this->publicPayload($merged);
            }

            throw new \RuntimeException('Consulta CEP indisponível.', 502);
        }
        $this->persist($cacheKey, $merged);

        if (! $this->isUsable($merged)) {
            $this->throwLookupFailure($merged);
        }

        return $this->publicPayload($merged);
    }

    /**
     * @param  array<string, mixed>  $base
     * @param  list<string>  $fontes
     * @param  array{data: ?array<string, mixed>, not_found: bool, unavailable: bool}|null  $via
     * @return array<string, mixed>
     */
    private function enrich(string $digits, array $base, array $fontes, ?array $via = null): array
    {
        $retryViaCep = ($via['data'] ?? null) === null && (bool) ($via['unavailable'] ?? false);
        $fallbacks = $this->fetchFallbacks($digits, retryViaCep: $retryViaCep);
        $notFound = (bool) ($via['not_found'] ?? false);
        $unavailable = (bool) ($via['unavailable'] ?? false) && $via['data'] === null;

        $order = [];
        if (isset($fallbacks['viacep'])) {
            $order['viacep'] = self::FONTE_VIACEP;
        }
        $order['brasilapi'] = self::FONTE_BRASILAPI;
        $order['opencep'] = self::FONTE_OPENCEP;

        foreach ($order as $key => $fonte) {
            $row = $fallbacks[$key];
            $notFound = $notFound || $row['not_found'];
            $unavailable = $unavailable || $row['unavailable'];
            if ($row['data'] === null) {
                continue;
            }
            $before = $base;
            $base = $this->mergeAddress($base, $row['data']);
            if ($this->contributed($before, $base) && ! in_array($fonte, $fontes, true)) {
                $fontes[] = $fonte;
            }
        }

        $merged = $this->withMeta($base, $fontes, enrichmentDone: true);
        $merged['_not_found'] = $notFound && ! $this->isUsable($base);
        $merged['_unavailable'] = $unavailable && ! $notFound && ! $this->isUsable($base);

        return $merged;
    }

    /**
     * @param  array<string, mixed>  $merged
     */
    private function throwLookupFailure(array $merged): void
    {
        if (! empty($merged['_unavailable'])) {
            throw new \RuntimeException('Consulta CEP indisponível.', 502);
        }

        throw new \RuntimeException('CEP não encontrado.');
    }

    /**
     * ViaCEP — gratuita, sem chave. Estudo 32 §3.2.
     * GET https://viacep.com.br/ws/{cep}/json/
     *
     * @return array{data: ?array<string, mixed>, not_found: bool, unavailable: bool}
     */
    private function fetchViaCep(string $digits): array
    {
        $base = rtrim((string) config('erp.cep.viacep_base', 'https://viacep.com.br/ws'), '/');
        $timeout = (float) config('erp.cep.timeout_sec', 5);

        try {
            $response = $this->cepHttp($timeout)->get("{$base}/{$digits}/json/");
        } catch (ConnectionException) {
            return ['data' => null, 'not_found' => false, 'unavailable' => true];
        }

        if ($response->failed()) {
            return [
                'data' => null,
                'not_found' => $response->notFound(),
                'unavailable' => ! $response->notFound(),
            ];
        }

        $payload = $response->json();
        if (! is_array($payload) || $this->payloadSaysNotFound($payload)) {
            return ['data' => null, 'not_found' => true, 'unavailable' => false];
        }

        $data = $this->normalizeViaCep($payload, $digits);
        if (! $this->isUsable($data)) {
            return ['data' => $data, 'not_found' => false, 'unavailable' => false];
        }

        return ['data' => $data, 'not_found' => false, 'unavailable' => false];
    }

    /**
     * BrasilAPI + OpenCEP em paralelo. ViaCEP só entra de novo se a 1ª chamada caiu
     * (estudo 32 §7.6) — não duplica quando a primária já respondeu.
     *
     * URL canônica ViaCEP: https://viacep.com.br/ws/{cep}/json/
     *
     * @return array<string, array{data: ?array<string, mixed>, not_found: bool, unavailable: bool}>
     */
    private function fetchFallbacks(string $digits, bool $retryViaCep = false): array
    {
        $timeout = (float) config('erp.cep.timeout_sec', 5);
        $brasilBase = rtrim((string) config('erp.cep.brasilapi_base', 'https://brasilapi.com.br/api'), '/');
        $openBase = rtrim((string) config('erp.cep.opencep_base', 'https://opencep.com/v1'), '/');
        $viaBase = rtrim((string) config('erp.cep.viacep_base', 'https://viacep.com.br/ws'), '/');

        $responses = Http::pool(function (Pool $pool) use ($timeout, $digits, $brasilBase, $openBase, $viaBase, $retryViaCep) {
            $reqs = [
                $pool->as('brasilapi')
                    ->timeout($timeout)
                    ->acceptJson()
                    ->withHeaders($this->headers())
                    ->get("{$brasilBase}/cep/v1/{$digits}"),
                $pool->as('opencep')
                    ->timeout($timeout)
                    ->acceptJson()
                    ->withHeaders($this->headers())
                    ->get("{$openBase}/{$digits}"),
            ];
            if ($retryViaCep) {
                $reqs[] = $pool->as('viacep')
                    ->timeout($timeout)
                    ->acceptJson()
                    ->withHeaders($this->headers())
                    ->get("{$viaBase}/{$digits}/json/");
            }

            return $reqs;
        });

        $parsed = [
            'brasilapi' => $this->parseFallback($responses['brasilapi'] ?? null, 'brasilapi', $digits),
            'opencep' => $this->parseFallback($responses['opencep'] ?? null, 'opencep', $digits),
        ];
        if ($retryViaCep) {
            $parsed['viacep'] = $this->parseFallback($responses['viacep'] ?? null, 'viacep', $digits);
        }

        return $parsed;
    }

    /**
     * @return array{data: ?array<string, mixed>, not_found: bool, unavailable: bool}
     */
    private function parseFallback(mixed $response, string $provider, string $digits): array
    {
        if ($response instanceof ConnectionException || ! $response instanceof Response) {
            return ['data' => null, 'not_found' => false, 'unavailable' => true];
        }

        if ($response->failed()) {
            return [
                'data' => null,
                'not_found' => $response->notFound(),
                'unavailable' => ! $response->notFound(),
            ];
        }

        $payload = $response->json();
        if (! is_array($payload) || $this->payloadSaysNotFound($payload)) {
            return ['data' => null, 'not_found' => true, 'unavailable' => false];
        }

        $data = $provider === 'brasilapi'
            ? $this->normalizeBrasilApi($payload, $digits)
            : $this->normalizeViaCep($payload, $digits);

        return ['data' => $data, 'not_found' => false, 'unavailable' => false];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function payloadSaysNotFound(array $payload): bool
    {
        if (array_key_exists('erro', $payload) && $payload['erro']) {
            return true;
        }

        $ok = $payload['ok'] ?? null;
        if ($ok === false) {
            return true;
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function normalizeViaCep(array $payload, string $digits): array
    {
        $ibge = $this->digitsOrEmpty($payload['ibge'] ?? ($payload['city_ibge'] ?? null));

        return [
            'cep' => $this->formatCep($payload['cep'] ?? $digits),
            'logradouro' => $this->text($payload['logradouro'] ?? ($payload['street'] ?? '')),
            'complemento' => $this->text($payload['complemento'] ?? ''),
            'bairro' => $this->text($payload['bairro'] ?? ($payload['neighborhood'] ?? ($payload['district'] ?? ''))),
            'localidade' => $this->text($payload['localidade'] ?? ($payload['city'] ?? '')),
            'uf' => strtoupper($this->text($payload['uf'] ?? ($payload['state'] ?? ''))),
            'ibge' => $ibge,
            'gia' => $this->text($payload['gia'] ?? ''),
            'ddd' => $this->text($payload['ddd'] ?? ''),
            'siafi' => $this->text($payload['siafi'] ?? ''),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function normalizeBrasilApi(array $payload, string $digits): array
    {
        return [
            'cep' => $this->formatCep($payload['cep'] ?? $digits),
            'logradouro' => $this->text($payload['street'] ?? ($payload['logradouro'] ?? '')),
            'complemento' => '',
            'bairro' => $this->text($payload['neighborhood'] ?? ($payload['bairro'] ?? '')),
            'localidade' => $this->text($payload['city'] ?? ($payload['localidade'] ?? '')),
            'uf' => strtoupper($this->text($payload['state'] ?? ($payload['uf'] ?? ''))),
            'ibge' => $this->digitsOrEmpty($payload['ibge'] ?? ($payload['city_ibge'] ?? null)),
            'gia' => '',
            'ddd' => $this->text($payload['ddd'] ?? ''),
            'siafi' => '',
        ];
    }

    /**
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function mergeAddress(array $base, array $extra): array
    {
        foreach (['logradouro', 'complemento', 'bairro', 'localidade', 'uf', 'ibge', 'gia', 'ddd', 'siafi'] as $field) {
            if ($this->blank($base[$field] ?? null) && ! $this->blank($extra[$field] ?? null)) {
                $base[$field] = $extra[$field];
            }
        }

        if ($this->blank($base['cep'] ?? null) && ! $this->blank($extra['cep'] ?? null)) {
            $base['cep'] = $extra['cep'];
        }

        return $base;
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    private function contributed(array $before, array $after): bool
    {
        foreach (['logradouro', 'complemento', 'bairro', 'localidade', 'uf', 'ibge', 'gia', 'ddd', 'siafi'] as $field) {
            if ($this->blank($before[$field] ?? null) && ! $this->blank($after[$field] ?? null)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyAddress(string $digits): array
    {
        return [
            'cep' => $this->formatCep($digits),
            'logradouro' => '',
            'complemento' => '',
            'bairro' => '',
            'localidade' => '',
            'uf' => '',
            'ibge' => '',
            'gia' => '',
            'ddd' => '',
            'siafi' => '',
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<string>  $fontes
     * @return array<string, mixed>
     */
    private function withMeta(array $data, array $fontes, bool $enrichmentDone): array
    {
        $fontes = array_values(array_unique($fontes));
        $data['fonte'] = $fontes !== [] ? implode('+', $fontes) : self::FONTE_VIACEP;
        $data['fontes'] = $fontes;
        $data['enrichment_done'] = $enrichmentDone;

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function isComplete(array $data): bool
    {
        return $this->isUsable($data)
            && ! $this->blank($data['ibge'] ?? null)
            && ! $this->blank($data['logradouro'] ?? null)
            && ! $this->blank($data['bairro'] ?? null);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function isUsable(array $data): bool
    {
        return ! $this->blank($data['localidade'] ?? null) && ! $this->blank($data['uf'] ?? null);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function enrichmentDone(array $data): bool
    {
        return (bool) ($data['enrichment_done'] ?? false);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<string>
     */
    private function fontesOf(array $data): array
    {
        if (isset($data['fontes']) && is_array($data['fontes'])) {
            return array_values(array_filter($data['fontes'], fn ($f) => is_string($f) && $f !== ''));
        }

        $fonte = trim((string) ($data['fonte'] ?? ''));
        if ($fonte === '') {
            return [self::FONTE_VIACEP];
        }

        return array_values(array_filter(explode('+', $fonte)));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function publicPayload(array $data): array
    {
        $out = [];
        foreach ([
            'cep', 'logradouro', 'complemento', 'bairro', 'localidade', 'uf',
            'ibge', 'gia', 'ddd', 'siafi', 'fonte',
        ] as $key) {
            if (array_key_exists($key, $data)) {
                $out[$key] = $data[$key];
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function persist(string $cacheKey, array $payload): void
    {
        if (! $this->isUsable($payload)) {
            return;
        }

        $store = $payload;
        unset($store['_not_found'], $store['_unavailable']);
        $fonte = Str::limit((string) ($store['fonte'] ?? self::FONTE_VIACEP), 64, '');
        $ttl = max(1, (int) config('erp.cep.cache_ttl_days', 90));

        $this->storeCache($cacheKey, $fonte, $store, now()->addDays($ttl));
    }

    private function cepHttp(float $timeout): \Illuminate\Http\Client\PendingRequest
    {
        return Http::timeout($timeout)
            ->acceptJson()
            ->withHeaders($this->headers());
    }

    /**
     * @return array<string, string>
     */
    private function headers(): array
    {
        return [
            'User-Agent' => 'FLEXOERP/TRIGGER (https://www.triggerti.com)',
        ];
    }

    private function formatCep(mixed $cep): string
    {
        $digits = $this->digitsOrEmpty($cep);
        if (strlen($digits) !== 8) {
            return $digits;
        }

        return substr($digits, 0, 5).'-'.substr($digits, 5);
    }

    /**
     * APIs free devolvem string, número ou objeto (ex.: BrasilAPI ibge.city).
     * Nunca fazer (string) em array — quebra o cadastro.
     */
    private function text(mixed $value): string
    {
        return trim($this->scalarString($value));
    }

    private function digitsOrEmpty(mixed $value): string
    {
        if (is_array($value)) {
            $value = $value['city']
                ?? $value['municipio']
                ?? $value['ibge']
                ?? $value['code']
                ?? (array_is_list($value) ? ($value[0] ?? null) : null);
        }

        $digits = preg_replace('/\D/', '', $this->scalarString($value)) ?? '';

        return $digits;
    }

    private function scalarString(mixed $value): string
    {
        if ($value === null || is_bool($value) || is_array($value) || is_object($value)) {
            return '';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return is_string($value) ? $value : '';
    }

    private function blank(mixed $value): bool
    {
        return $this->text($value) === '';
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

        $payload = $row->payload;

        return is_array($payload) ? $payload : null;
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
