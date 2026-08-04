<?php

namespace App\Services\Consulta;

use App\Models\ApiCache;
use App\Models\FiscalCest;
use App\Models\FiscalNcm;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class FiscalCatalogService
{
    /**
     * Busca NCM no catálogo local (prioritário) e completa via BrasilAPI quando necessário.
     *
     * @return list<array{codigo: string, descricao: string, fonte: string, destaque?: bool}>
     */
    public function searchNcm(?string $query, int $limit = 20): array
    {
        $q = $this->normalizeQuery($query);
        $limit = max(1, min($limit, 40));

        $local = $this->searchLocalNcm($q, $limit);

        if ($q === '' || count($local) >= 8 || strlen($q) < 3) {
            return array_slice($local, 0, $limit);
        }

        try {
            $remote = $this->searchBrasilApiNcm($q, $limit);
        } catch (\Throwable) {
            $remote = [];
        }

        $merged = $this->mergeByCodigo($local, $remote);

        return array_slice($merged, 0, $limit);
    }

    /**
     * @return list<array{codigo: string, descricao: string, fonte: string, segmento: ?string, observacao: ?string, vinculado_ncm: bool}>
     */
    public function searchCest(?string $query, ?string $ncm = null, int $limit = 20): array
    {
        $q = $this->normalizeQuery($query);
        $ncmDigits = preg_replace('/\D/', '', $ncm ?? '') ?? '';
        $limit = max(1, min($limit, 40));

        $builder = FiscalCest::query()->where('ativo', true);

        if (strlen($ncmDigits) >= 4) {
            $linked = FiscalCest::query()
                ->where('ativo', true)
                ->whereHas('ncms', function ($query) use ($ncmDigits) {
                    $query->where('codigo', 'like', $ncmDigits.'%');
                })
                ->orderBy('codigo')
                ->limit($limit)
                ->get();

            if ($linked->isNotEmpty() && ($q === '' || $this->matchesAnyCest($linked, $q))) {
                $items = $linked
                    ->filter(fn (FiscalCest $c) => $q === '' || $this->matchText($c->codigo.' '.$c->descricao, $q))
                    ->take($limit)
                    ->map(fn (FiscalCest $c) => $this->formatCest($c, true))
                    ->values()
                    ->all();

                if ($items !== []) {
                    // Sempre oferecer opção explícita de não enquadrar
                    array_unshift($items, $this->emptyCestOption($ncmDigits));

                    return array_slice($items, 0, $limit + 1);
                }
            }
        }

        if ($q !== '') {
            $builder->where(function ($query) use ($q) {
                $digits = preg_replace('/\D/', '', $q) ?? '';
                $query->where('codigo', 'like', $digits.'%')
                    ->orWhere('descricao', 'like', '%'.$q.'%');
            });
        }

        $rows = $builder->orderBy('codigo')->limit($limit)->get();

        $items = $rows->map(fn (FiscalCest $c) => $this->formatCest($c, false))->all();

        if ($q === '' || str_contains(mb_strtolower($q), 'sem') || str_contains(mb_strtolower($q), 'vazio') || $q === '0') {
            array_unshift($items, $this->emptyCestOption($ncmDigits !== '' ? $ncmDigits : null));
        }

        return array_slice($items, 0, $limit + 1);
    }

    /**
     * @return list<array{codigo: string, descricao: string, regime: string, destaque: bool}>
     */
    public function searchCsosn(?string $query, int $limit = 20): array
    {
        return $this->filterStatic(FiscalCatalogData::csosn(), $query, $limit);
    }

    /**
     * @return list<array{codigo: string, descricao: string, tipo: string, destaque: bool}>
     */
    public function searchCfop(?string $query, ?string $tipo = null, int $limit = 20): array
    {
        $tipoNorm = $tipo !== null ? mb_strtoupper(trim($tipo)) : null;
        $items = FiscalCatalogData::cfops();

        if ($tipoNorm === 'ENTRADA' || $tipoNorm === 'SAIDA') {
            $items = array_values(array_filter(
                $items,
                fn (array $row) => ($row['tipo'] ?? '') === $tipoNorm
            ));
        }

        return $this->filterStatic($items, $query, $limit);
    }

    /**
     * @return list<array{codigo: string, descricao: string, grupo: string}>
     */
    public function searchCstIcms(?string $query, int $limit = 20): array
    {
        return $this->filterStatic(FiscalCatalogData::cstIcms(), $query, $limit);
    }

    /**
     * @return list<array{codigo: string, descricao: string, grupo: string}>
     */
    public function searchCstPisCofins(?string $query, int $limit = 20): array
    {
        return $this->filterStatic(FiscalCatalogData::cstPisCofins(), $query, $limit);
    }

    /**
     * @return list<array{codigo: string, descricao: string}>
     */
    public function tiposItemSped(): array
    {
        return FiscalCatalogData::tiposItemSped();
    }

    /**
     * @return list<array{codigo: string, descricao: string}>
     */
    public function origens(): array
    {
        return FiscalCatalogData::origens();
    }

    public function seedCatalog(): void
    {
        foreach (FiscalCatalogData::ncms() as $row) {
            FiscalNcm::query()->updateOrCreate(
                ['codigo' => $row['codigo']],
                [
                    'descricao' => $row['descricao'],
                    'destaque_rlp' => $row['destaque_rlp'],
                    'ativo' => true,
                ]
            );
        }

        foreach (FiscalCatalogData::cests() as $row) {
            FiscalCest::query()->updateOrCreate(
                ['codigo' => $row['codigo']],
                [
                    'descricao' => $row['descricao'],
                    'segmento' => $row['segmento'],
                    'observacao' => $row['observacao'],
                    'ativo' => true,
                ]
            );

            $ncmCodes = $row['ncms'] ?? [];
            foreach ($ncmCodes as $ncmCodigo) {
                if (! FiscalNcm::query()->where('codigo', $ncmCodigo)->exists()) {
                    continue;
                }
                \Illuminate\Support\Facades\DB::table('fiscal_ncm_cest')->updateOrInsert(
                    ['ncm_codigo' => $ncmCodigo, 'cest_codigo' => $row['codigo']],
                    ['updated_at' => now(), 'created_at' => now()]
                );
            }
        }
    }

    /**
     * @return list<array{codigo: string, descricao: string, fonte: string, destaque: bool}>
     */
    private function searchLocalNcm(string $q, int $limit): array
    {
        $builder = FiscalNcm::query()->where('ativo', true);

        if ($q === '') {
            $builder->orderByDesc('destaque_rlp')->orderBy('codigo');
        } else {
            $digits = preg_replace('/\D/', '', $q) ?? '';
            $builder->where(function ($query) use ($q, $digits) {
                if ($digits !== '') {
                    $query->where('codigo', 'like', $digits.'%');
                }
                $query->orWhere('descricao', 'like', '%'.$q.'%');
            })
                ->orderByDesc('destaque_rlp')
                ->orderByRaw('CASE WHEN codigo LIKE ? THEN 0 ELSE 1 END', [$digits.'%'])
                ->orderBy('codigo');
        }

        return $builder->limit($limit)->get()->map(fn (FiscalNcm $n) => [
            'codigo' => $n->codigo,
            'descricao' => $n->descricao,
            'fonte' => 'local',
            'destaque' => (bool) $n->destaque_rlp,
        ])->all();
    }

    /**
     * @return list<array{codigo: string, descricao: string, fonte: string, destaque: bool}>
     */
    private function searchBrasilApiNcm(string $q, int $limit): array
    {
        $cacheKey = 'ncm:search:'.md5(mb_strtolower($q));
        $cached = $this->getCachedList($cacheKey);
        if ($cached !== null) {
            return array_slice($cached, 0, $limit);
        }

        $base = rtrim((string) env('BRASILAPI_BASE', 'https://brasilapi.com.br/api'), '/');
        $response = Http::timeout(8)
            ->acceptJson()
            ->get("{$base}/ncm/v1", ['search' => $q]);

        if ($response->failed()) {
            throw new RequestException($response);
        }

        $payload = is_array($response->json()) ? $response->json() : [];
        $items = [];

        foreach ($payload as $row) {
            if (! is_array($row)) {
                continue;
            }
            $codigo = preg_replace('/\D/', '', (string) ($row['codigo'] ?? '')) ?? '';
            $descricao = trim((string) ($row['descricao'] ?? ''));
            if (strlen($codigo) !== 8 || $descricao === '') {
                continue;
            }
            $items[] = [
                'codigo' => $codigo,
                'descricao' => $descricao,
                'fonte' => 'brasilapi',
                'destaque' => false,
            ];
        }

        $this->storeCache($cacheKey, 'brasilapi_ncm', ['items' => $items], now()->addDays(14));

        return array_slice($items, 0, $limit);
    }

    /**
     * @param  list<array{codigo: string, descricao: string, fonte: string, destaque?: bool}>  $primary
     * @param  list<array{codigo: string, descricao: string, fonte: string, destaque?: bool}>  $secondary
     * @return list<array{codigo: string, descricao: string, fonte: string, destaque: bool}>
     */
    private function mergeByCodigo(array $primary, array $secondary): array
    {
        $seen = [];
        $out = [];

        foreach (array_merge($primary, $secondary) as $row) {
            $codigo = $row['codigo'];
            if (isset($seen[$codigo])) {
                continue;
            }
            $seen[$codigo] = true;
            $out[] = [
                'codigo' => $codigo,
                'descricao' => $row['descricao'],
                'fonte' => $row['fonte'],
                'destaque' => (bool) ($row['destaque'] ?? false),
            ];
        }

        return $out;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function filterStatic(array $items, ?string $query, int $limit): array
    {
        $q = $this->normalizeQuery($query);
        $limit = max(1, min($limit, 40));

        if ($q !== '') {
            $items = array_values(array_filter(
                $items,
                fn (array $row) => $this->matchText(($row['codigo'] ?? '').' '.($row['descricao'] ?? ''), $q)
            ));
        } else {
            usort($items, function (array $a, array $b) {
                $da = (int) ($a['destaque'] ?? false);
                $db = (int) ($b['destaque'] ?? false);

                return [$db, $a['codigo'] ?? ''] <=> [$da, $b['codigo'] ?? ''];
            });
        }

        $normalized = array_map(function (array $row) {
            $row['destaque'] = (bool) ($row['destaque'] ?? false);

            return $row;
        }, $items);

        return array_slice($normalized, 0, $limit);
    }

    private function formatCest(FiscalCest $cest, bool $vinculado): array
    {
        return [
            'codigo' => $cest->codigo,
            'descricao' => $cest->descricao,
            'fonte' => 'local',
            'segmento' => $cest->segmento,
            'observacao' => $cest->observacao,
            'vinculado_ncm' => $vinculado,
        ];
    }

    private function emptyCestOption(?string $ncm = null): array
    {
        $obs = 'Sem CEST — não sujeito a ICMS-ST / finalidade não enquadrada.';
        if ($ncm !== null && str_starts_with($ncm, '3919')) {
            $obs = 'Sem CEST — para NCM 3919 o CEST 10.010.00 só vale "para construções"; etiquetas industriais geralmente ficam sem CEST (estudo RLP).';
        }

        return [
            'codigo' => '',
            'descricao' => 'Sem CEST (não enquadrado em ST)',
            'fonte' => 'local',
            'segmento' => null,
            'observacao' => $obs,
            'vinculado_ncm' => false,
        ];
    }

    /** @param  \Illuminate\Support\Collection<int, FiscalCest>  $rows */
    private function matchesAnyCest($rows, string $q): bool
    {
        foreach ($rows as $row) {
            if ($this->matchText($row->codigo.' '.$row->descricao, $q)) {
                return true;
            }
        }

        return false;
    }

    private function matchText(string $haystack, string $needle): bool
    {
        $h = mb_strtolower($haystack);
        $n = mb_strtolower($needle);
        $hDigits = preg_replace('/\D/', '', $h) ?? '';
        $nDigits = preg_replace('/\D/', '', $n) ?? '';

        if ($nDigits !== '' && str_starts_with($hDigits, $nDigits)) {
            return true;
        }

        return str_contains($h, $n);
    }

    private function normalizeQuery(?string $query): string
    {
        return trim((string) $query);
    }

    /** @return list<array<string, mixed>>|null */
    private function getCachedList(string $chave): ?array
    {
        $row = ApiCache::query()->where('chave', $chave)->first();
        if ($row === null || ! $row->isValid()) {
            return null;
        }
        $payload = $row->payload;
        if (! is_array($payload)) {
            return null;
        }

        return array_values($payload['items'] ?? []);
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
