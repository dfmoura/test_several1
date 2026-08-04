<?php

namespace App\Services\Comercial;

/**
 * Catálogo MAPA DE FACAS — port do endpoint /facas do trigger/36.
 */
class FacasMapaService
{
    /** @var list<array<string, mixed>>|null */
    private static ?array $cache = null;

    /**
     * @param  array{q?: string|null, medida?: string|null, maquina?: string|null, formato?: string|null, so_completas?: bool, completas?: bool}  $filters
     * @return array{total: int, items: list<array<string, mixed>>, formatos: list<string>, meta: array<string, string>}
     */
    public function list(array $filters = []): array
    {
        $all = $this->all();
        $facas = $all;

        $onlyComplete = (bool) ($filters['completas'] ?? false) || (bool) ($filters['so_completas'] ?? false);
        if ($onlyComplete) {
            $facas = array_values(array_filter(
                $facas,
                static fn (array $f) => (bool) ($f['completa'] ?? true)
            ));
        }

        if (! empty($filters['medida'])) {
            $m = strtoupper(str_replace(' ', '', trim((string) $filters['medida'])));
            $facas = array_values(array_filter($facas, static function (array $f) use ($m) {
                $medida = strtoupper(str_replace(' ', '', (string) ($f['medida'] ?? '')));
                $raw = strtoupper(str_replace(' ', '', (string) ($f['tamanho_raw'] ?? '')));

                return $medida === $m || $raw === $m;
            }));
        }

        if (! empty($filters['maquina'])) {
            $mq = strtoupper(trim((string) $filters['maquina']));
            $facas = array_values(array_filter($facas, static function (array $f) use ($mq) {
                return strtoupper((string) ($f['maquina_catalogo'] ?? '')) === $mq
                    || strtoupper((string) ($f['maquina_origem'] ?? '')) === $mq;
            }));
        }

        if (! empty($filters['formato'])) {
            $fo = strtoupper(trim((string) $filters['formato']));
            $facas = array_values(array_filter($facas, static function (array $f) use ($fo) {
                return str_contains(strtoupper((string) ($f['formato'] ?? '')), $fo)
                    || str_contains(strtoupper((string) ($f['faca'] ?? '')), $fo);
            }));
        }

        if (! empty($filters['q'])) {
            $qq = strtoupper(trim((string) $filters['q']));
            $facas = array_values(array_filter($facas, static function (array $f) use ($qq) {
                foreach ([
                    'label', 'medida', 'tamanho_raw', 'formato', 'faca',
                    'cliente_nota', 'maquina_catalogo', 'maquina_origem',
                    'fornecedor', 'conjugada',
                ] as $key) {
                    if (str_contains(strtoupper((string) ($f[$key] ?? '')), $qq)) {
                        return true;
                    }
                }

                return false;
            }));
        }

        $formatos = [];
        foreach ($all as $f) {
            $fmt = trim((string) ($f['formato'] ?? ''));
            if ($fmt !== '') {
                $formatos[$fmt] = true;
            }
        }
        $formatosList = array_keys($formatos);
        sort($formatosList);

        return [
            'total' => count($facas),
            'items' => array_slice($facas, 0, 800),
            'formatos' => $formatosList,
            'meta' => [
                'fonte' => 'MAPA DE FACAS 20260715 ATUAL',
                'pivot' => 'MAPA_DE_FACAS',
                'nota_redonda' => 'Formato REDONDA: TAMANHO = diâmetro (Ø).',
                'nota_rep' => 'REP = REPETIÇÃO.',
                'nota_manual' => 'Facas incompletas exigem puxada/Z manuais.',
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    private function all(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }

        $path = resource_path('data/orcamento/mapa_facas.json');
        $raw = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (is_array($raw) && array_is_list($raw)) {
            self::$cache = $raw;
        } else {
            self::$cache = $raw['facas'] ?? $raw['items'] ?? [];
        }

        return self::$cache;
    }
}
