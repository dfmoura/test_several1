<?php

namespace App\Services\Comercial;

use App\Models\OrcMapaFaca;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Catálogo MAPA DE FACAS — fonte única do FacaPicker / ORC / relatórios.
 *
 * Persistência em `orc_mapa_facas` (seed do JSON oficial). Fallback JSON se a
 * tabela ainda estiver vazia. Invariante: nunca apagar — só inativar.
 * Geometria de facas existentes não é editável (criar nova + inativar a antiga).
 */
class FacasMapaService
{
    /** @var list<array<string, mixed>>|null */
    private static ?array $jsonCache = null;

    public function __construct(private readonly AuditLogger $audit) {}

    public function tablesReady(): bool
    {
        return Schema::hasTable('orc_mapa_facas');
    }

    public function usingDatabase(): bool
    {
        return $this->tablesReady() && OrcMapaFaca::query()->exists();
    }

    /**
     * Importa itens ausentes do JSON oficial. Não altera facas já cadastradas.
     *
     * @return array{criados: int, existentes: int, fonte: string}
     */
    public function seedFromJson(?string $path = null, bool $forceOverwrite = false): array
    {
        if (! $this->tablesReady()) {
            throw ValidationException::withMessages([
                'mapa' => 'Tabela orc_mapa_facas ausente — rode as migrations.',
            ]);
        }

        $path ??= resource_path('data/orcamento/mapa_facas.json');
        $raw = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $items = is_array($raw) && array_is_list($raw)
            ? $raw
            : ($raw['facas'] ?? $raw['items'] ?? []);

        $criados = 0;
        $existentes = 0;
        $maxId = 0;

        DB::transaction(function () use ($items, $forceOverwrite, &$criados, &$existentes, &$maxId) {
            foreach ($items as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $id = (int) ($row['id'] ?? 0);
                if ($id <= 0) {
                    continue;
                }
                $maxId = max($maxId, $id);
                $payload = $this->normalizeRow($row, forSeed: true);
                $existing = OrcMapaFaca::query()->find($id);
                if ($existing) {
                    $existentes++;
                    if ($forceOverwrite) {
                        $existing->fill($payload);
                        $existing->save();
                    }
                    continue;
                }
                $faca = new OrcMapaFaca($payload);
                $faca->id = $id;
                $faca->save();
                $criados++;
            }
        });

        // MySQL: próximo AUTO_INCREMENT acima do maior id do mapa oficial.
        if ($maxId > 0 && Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE orc_mapa_facas AUTO_INCREMENT = '.($maxId + 1));
        }

        self::$jsonCache = null;

        return [
            'criados' => $criados,
            'existentes' => $existentes,
            'fonte' => 'MAPA DE FACAS 20260715 ATUAL',
        ];
    }

    /**
     * @param  array{
     *   q?: string|null,
     *   medida?: string|null,
     *   maquina?: string|null,
     *   formato?: string|null,
     *   so_completas?: bool,
     *   completas?: bool,
     *   incluir_inativas?: bool,
     *   ativo?: bool|null,
     *   limit?: int|null
     * }  $filters
     * @return array{total: int, items: list<array<string, mixed>>, formatos: list<string>, meta: array<string, string>}
     */
    public function list(array $filters = []): array
    {
        if ($this->usingDatabase()) {
            return $this->listFromDatabase($filters);
        }

        return $this->listFromJson($filters);
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        if ($this->usingDatabase()) {
            $row = OrcMapaFaca::query()->find($id);

            return $row ? $this->toArray($row) : null;
        }

        foreach ($this->allFromJson() as $f) {
            if ((int) ($f['id'] ?? 0) === $id) {
                return $f;
            }
        }

        return null;
    }

    /**
     * Cadastra faca nova no mapa oficial (pós-aprovação / manutenção comercial).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        if (! $this->tablesReady()) {
            throw ValidationException::withMessages([
                'mapa' => 'Persistência do mapa indisponível — rode migrations/seed.',
            ]);
        }

        // Garante seed antes do 1º cadastro manual (evita mapa só com a nova).
        if (! $this->usingDatabase()) {
            $this->seedFromJson();
        }

        $payload = $this->normalizeRow($data, forSeed: false);
        $this->assertNoDuplicateAtiva($payload);

        $faca = OrcMapaFaca::query()->create($payload);
        $out = $this->toArray($faca);
        $this->audit->log('mapa_facas.criar', 'orc_mapa_facas', $faca->id, null, $out);
        self::$jsonCache = null;

        return $out;
    }

    /**
     * Inativa ou reativa. Não apaga — preserva histórico e snapshots de ORC.
     *
     * @return array<string, mixed>
     */
    public function setAtivo(int $id, bool $ativo): array
    {
        if (! $this->tablesReady()) {
            throw ValidationException::withMessages([
                'mapa' => 'Persistência do mapa indisponível.',
            ]);
        }

        $faca = OrcMapaFaca::query()->find($id);
        if (! $faca) {
            abort(404, 'Faca não encontrada no mapa.');
        }

        if ((bool) $faca->ativo === $ativo) {
            return $this->toArray($faca);
        }

        if ($ativo) {
            $this->assertNoDuplicateAtiva($this->toArray($faca), exceptId: $faca->id);
        }

        $de = $this->toArray($faca);
        $faca->ativo = $ativo;
        $faca->save();
        $para = $this->toArray($faca);
        $this->audit->log(
            $ativo ? 'mapa_facas.reativar' : 'mapa_facas.inativar',
            'orc_mapa_facas',
            $faca->id,
            $de,
            $para,
        );
        self::$jsonCache = null;

        return $para;
    }

    /** @return array{total: int, ativas: int, inativas: int, completas: int, incompletas: int, fonte: string} */
    public function resumo(): array
    {
        if ($this->usingDatabase()) {
            $base = OrcMapaFaca::query();

            return [
                'total' => (clone $base)->count(),
                'ativas' => (clone $base)->where('ativo', true)->count(),
                'inativas' => (clone $base)->where('ativo', false)->count(),
                'completas' => (clone $base)->where('ativo', true)->where('completa', true)->count(),
                'incompletas' => (clone $base)->where('ativo', true)->where('completa', false)->count(),
                'fonte' => 'database',
            ];
        }

        $all = $this->allFromJson();
        $completas = count(array_filter($all, static fn (array $f) => (bool) ($f['completa'] ?? true)));

        return [
            'total' => count($all),
            'ativas' => count($all),
            'inativas' => 0,
            'completas' => $completas,
            'incompletas' => count($all) - $completas,
            'fonte' => 'json_fallback',
        ];
    }

    /**
     * @param  array{
     *   q?: string|null,
     *   medida?: string|null,
     *   maquina?: string|null,
     *   formato?: string|null,
     *   so_completas?: bool,
     *   completas?: bool,
     *   incluir_inativas?: bool,
     *   ativo?: bool|null,
     *   limit?: int|null
     * }  $filters
     * @return array{total: int, items: list<array<string, mixed>>, formatos: list<string>, meta: array<string, string>}
     */
    private function listFromDatabase(array $filters): array
    {
        $q = OrcMapaFaca::query()->orderBy('medida')->orderBy('id');

        $incluirInativas = (bool) ($filters['incluir_inativas'] ?? false);
        if (array_key_exists('ativo', $filters) && $filters['ativo'] !== null) {
            $q->where('ativo', (bool) $filters['ativo']);
        } elseif (! $incluirInativas) {
            $q->where('ativo', true);
        }

        $onlyComplete = (bool) ($filters['completas'] ?? false) || (bool) ($filters['so_completas'] ?? false);
        if ($onlyComplete) {
            $q->where('completa', true);
        }

        if (! empty($filters['medida'])) {
            $m = $this->normKey((string) $filters['medida']);
            $q->where(function ($w) use ($m) {
                $w->whereRaw("REPLACE(UPPER(medida), ' ', '') = ?", [$m])
                    ->orWhereRaw("REPLACE(UPPER(COALESCE(tamanho_raw,'')), ' ', '') = ?", [$m]);
            });
        }

        if (! empty($filters['maquina'])) {
            $mq = strtoupper(trim((string) $filters['maquina']));
            $q->where(function ($w) use ($mq) {
                $w->whereRaw('UPPER(maquina_catalogo) = ?', [$mq])
                    ->orWhereRaw('UPPER(COALESCE(maquina_origem,\'\')) = ?', [$mq]);
            });
        }

        if (! empty($filters['formato'])) {
            $fo = strtoupper(trim((string) $filters['formato']));
            $q->where(function ($w) use ($fo) {
                $w->whereRaw('UPPER(formato) LIKE ?', ['%'.$fo.'%'])
                    ->orWhereRaw('UPPER(COALESCE(faca,\'\')) LIKE ?', ['%'.$fo.'%']);
            });
        }

        if (! empty($filters['q'])) {
            $qq = '%'.strtoupper(trim((string) $filters['q'])).'%';
            $q->where(function ($w) use ($qq) {
                foreach ([
                    'label', 'medida', 'tamanho_raw', 'formato', 'faca',
                    'cliente_nota', 'maquina_catalogo', 'maquina_origem',
                    'fornecedor', 'conjugada',
                ] as $col) {
                    $w->orWhereRaw('UPPER(COALESCE('.$col.",'')) LIKE ?", [$qq]);
                }
            });
        }

        $total = (clone $q)->count();
        $limit = max(1, min(800, (int) ($filters['limit'] ?? 800)));
        $items = $q->limit($limit)->get()->map(fn (OrcMapaFaca $f) => $this->toArray($f))->all();

        $formatos = OrcMapaFaca::query()
            ->where('ativo', true)
            ->whereNotNull('formato')
            ->where('formato', '!=', '')
            ->distinct()
            ->orderBy('formato')
            ->pluck('formato')
            ->all();

        return [
            'total' => $total,
            'items' => $items,
            'formatos' => array_values($formatos),
            'meta' => $this->meta('database'),
        ];
    }

    /**
     * @param  array{
     *   q?: string|null,
     *   medida?: string|null,
     *   maquina?: string|null,
     *   formato?: string|null,
     *   so_completas?: bool,
     *   completas?: bool,
     *   incluir_inativas?: bool,
     *   ativo?: bool|null,
     *   limit?: int|null
     * }  $filters
     * @return array{total: int, items: list<array<string, mixed>>, formatos: list<string>, meta: array<string, string>}
     */
    private function listFromJson(array $filters): array
    {
        $all = $this->allFromJson();
        $facas = $all;

        $onlyComplete = (bool) ($filters['completas'] ?? false) || (bool) ($filters['so_completas'] ?? false);
        if ($onlyComplete) {
            $facas = array_values(array_filter(
                $facas,
                static fn (array $f) => (bool) ($f['completa'] ?? true)
            ));
        }

        if (! empty($filters['medida'])) {
            $m = $this->normKey((string) $filters['medida']);
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

        $limit = max(1, min(800, (int) ($filters['limit'] ?? 800)));

        return [
            'total' => count($facas),
            'items' => array_slice($facas, 0, $limit),
            'formatos' => $formatosList,
            'meta' => $this->meta('json_fallback'),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function allFromJson(): array
    {
        if (self::$jsonCache !== null) {
            return self::$jsonCache;
        }

        $path = resource_path('data/orcamento/mapa_facas.json');
        $raw = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (is_array($raw) && array_is_list($raw)) {
            self::$jsonCache = $raw;
        } else {
            self::$jsonCache = $raw['facas'] ?? $raw['items'] ?? [];
        }

        return self::$jsonCache;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row, bool $forSeed): array
    {
        $medida = trim((string) ($row['medida'] ?? ''));
        if ($medida === '') {
            if ($forSeed) {
                // Oficiais incompletas (PICOTE/GAP/…) sem medida no planilha.
                $medida = trim((string) ($row['formato'] ?? $row['faca'] ?? 'SEM MEDIDA'));
                if ($medida === '') {
                    $medida = 'SEM MEDIDA';
                }
            } else {
                throw ValidationException::withMessages(['medida' => 'Medida é obrigatória.']);
            }
        }

        $formato = strtoupper(trim((string) ($row['formato'] ?? $row['faca'] ?? '')));
        if ($formato === '') {
            throw ValidationException::withMessages(['formato' => 'Formato é obrigatório.']);
        }

        $maquina = strtoupper(trim((string) ($row['maquina_catalogo'] ?? '')));
        if (! $forSeed && $maquina === '') {
            throw ValidationException::withMessages(['maquina_catalogo' => 'Máquina do catálogo é obrigatória.']);
        }

        $puxada = $this->nullableFloat($row['puxada'] ?? null);
        $z = $this->nullableFloat($row['z'] ?? null);
        $repeticao = $this->nullableFloat($row['repeticao'] ?? null);
        $largura = $this->nullableFloat($row['largura_faca'] ?? null);
        $diametro = $this->nullableFloat($row['diametro_cm'] ?? null);

        if (array_key_exists('completa', $row) && $row['completa'] !== null && $row['completa'] !== '') {
            $completa = (bool) $row['completa'];
        } else {
            $completa = $puxada !== null && $z !== null;
        }

        $faca = strtoupper(trim((string) ($row['faca'] ?? $formato)));
        $tamanhoRaw = trim((string) ($row['tamanho_raw'] ?? ''));
        if ($tamanhoRaw === '') {
            $tamanhoRaw = $this->inferTamanhoRaw($medida, $formato, $puxada, $diametro);
        }
        $tamanhoTipo = trim((string) ($row['tamanho_tipo'] ?? ''));
        if ($tamanhoTipo === '') {
            $tamanhoTipo = str_starts_with($formato, 'REDOND') ? 'diametro' : 'altura';
        }

        if ($largura === null) {
            $largura = $this->inferLargura($medida, $formato, $diametro);
        }

        $label = trim((string) ($row['label'] ?? ''));
        if ($label === '' || ! $forSeed) {
            $label = $this->buildLabel($medida, $formato, $maquina, $z, $repeticao, $puxada, $completa);
        }

        $nFacas = $row['n_facas'] ?? null;
        $nFacas = $nFacas === null || $nFacas === '' ? null : (int) $nFacas;

        return [
            'medida' => $medida,
            'tamanho_raw' => $tamanhoRaw !== '' ? $tamanhoRaw : null,
            'tamanho_tipo' => $tamanhoTipo !== '' ? $tamanhoTipo : null,
            'diametro_cm' => $diametro,
            'formato' => $formato,
            'faca' => $faca !== '' ? $faca : $formato,
            'puxada' => $puxada,
            'z' => $z,
            'repeticao' => $repeticao,
            'maquina_catalogo' => $maquina !== '' ? $maquina : null,
            'maquina_origem' => ($o = trim((string) ($row['maquina_origem'] ?? ''))) !== '' ? $o : null,
            'largura_faca' => $largura,
            'n_facas' => $nFacas,
            'cilindro' => ($c = trim((string) ($row['cilindro'] ?? ''))) !== '' ? $c : null,
            'colunas_mapa' => ($col = trim((string) ($row['colunas_mapa'] ?? ''))) !== '' ? $col : null,
            'conjugada' => ($cj = trim((string) ($row['conjugada'] ?? ''))) !== '' ? $cj : null,
            'fornecedor' => ($fo = trim((string) ($row['fornecedor'] ?? ''))) !== '' ? $fo : null,
            'cliente_nota' => ($cn = trim((string) ($row['cliente_nota'] ?? ''))) !== '' ? $cn : null,
            'completa' => $completa,
            'label' => $label,
            'ativo' => array_key_exists('ativo', $row) ? (bool) $row['ativo'] : true,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function assertNoDuplicateAtiva(array $payload, ?int $exceptId = null): void
    {
        $q = OrcMapaFaca::query()
            ->where('ativo', true)
            ->whereRaw("REPLACE(UPPER(medida), ' ', '') = ?", [$this->normKey((string) $payload['medida'])])
            ->whereRaw('UPPER(formato) = ?', [strtoupper((string) $payload['formato'])])
            ->whereRaw('UPPER(COALESCE(maquina_catalogo,\'\')) = ?', [strtoupper((string) ($payload['maquina_catalogo'] ?? ''))]);

        if ($exceptId !== null) {
            $q->where('id', '!=', $exceptId);
        }

        // Compara Z/puxada com tolerância de float nula.
        $z = $payload['z'] ?? null;
        $puxada = $payload['puxada'] ?? null;
        if ($z === null) {
            $q->whereNull('z');
        } else {
            $q->where('z', $z);
        }
        if ($puxada === null) {
            $q->whereNull('puxada');
        } else {
            $q->where('puxada', $puxada);
        }

        $dup = $q->first();
        if ($dup) {
            throw ValidationException::withMessages([
                'medida' => sprintf(
                    'Já existe faca ativa equivalente (#%d — %s). Inative a antiga antes de cadastrar outra idêntica.',
                    $dup->id,
                    $dup->label ?: $dup->medida,
                ),
            ]);
        }
    }

    /** @return array<string, mixed> */
    private function toArray(OrcMapaFaca $f): array
    {
        return [
            'id' => $f->id,
            'medida' => $f->medida,
            'tamanho_raw' => $f->tamanho_raw,
            'tamanho_tipo' => $f->tamanho_tipo,
            'diametro_cm' => $f->diametro_cm,
            'formato' => $f->formato,
            'faca' => $f->faca,
            'puxada' => $f->puxada,
            'z' => $f->z,
            'repeticao' => $f->repeticao,
            'maquina_catalogo' => $f->maquina_catalogo,
            'maquina_origem' => $f->maquina_origem,
            'largura_faca' => $f->largura_faca,
            'n_facas' => $f->n_facas,
            'cilindro' => $f->cilindro,
            'colunas_mapa' => $f->colunas_mapa,
            'conjugada' => $f->conjugada,
            'fornecedor' => $f->fornecedor,
            'cliente_nota' => $f->cliente_nota,
            'completa' => (bool) $f->completa,
            'label' => $f->label,
            'ativo' => (bool) $f->ativo,
        ];
    }

    /** @return array<string, string> */
    private function meta(string $fonte): array
    {
        return [
            'fonte' => 'MAPA DE FACAS 20260715 ATUAL',
            'persistencia' => $fonte,
            'pivot' => 'MAPA_DE_FACAS',
            'nota_redonda' => 'Formato REDONDA: TAMANHO = diâmetro (Ø).',
            'nota_rep' => 'REP = REPETIÇÃO.',
            'nota_manual' => 'Facas incompletas exigem puxada/Z manuais.',
            'nota_ciclo' => 'Geometria não é editável: cadastre nova e inative a antiga.',
        ];
    }

    private function nullableFloat(mixed $v): ?float
    {
        if ($v === null || $v === '') {
            return null;
        }
        if (is_string($v)) {
            $v = str_replace(',', '.', trim($v));
        }
        if (! is_numeric($v)) {
            return null;
        }

        return (float) $v;
    }

    private function normKey(string $v): string
    {
        return strtoupper(str_replace(' ', '', trim($v)));
    }

    private function inferTamanhoRaw(string $medida, string $formato, ?float $puxada, ?float $diametro): string
    {
        if (str_starts_with($formato, 'REDOND')) {
            if ($diametro !== null) {
                return rtrim(rtrim(number_format($diametro, 4, '.', ''), '0'), '.') ?: (string) $diametro;
            }

            return $medida;
        }
        if ($puxada !== null) {
            return rtrim(rtrim(number_format($puxada, 4, '.', ''), '0'), '.') ?: (string) $puxada;
        }
        if (preg_match('/[xX×]/u', $medida)) {
            $parts = preg_split('/[xX×]/u', $medida) ?: [];
            if (count($parts) >= 2) {
                return trim($parts[1]);
            }
        }

        return $medida;
    }

    private function inferLargura(string $medida, string $formato, ?float $diametro): ?float
    {
        if (str_starts_with($formato, 'REDOND') && $diametro !== null) {
            return $diametro;
        }
        if (preg_match('/[xX×]/u', $medida)) {
            $parts = preg_split('/[xX×]/u', str_replace(' ', '', $medida)) ?: [];
            if (count($parts) >= 1) {
                $n = $this->nullableFloat(str_replace(',', '.', $parts[0]));

                return $n;
            }
        }

        return null;
    }

    private function buildLabel(
        string $medida,
        string $formato,
        string $maquina,
        ?float $z,
        ?float $repeticao,
        ?float $puxada,
        bool $completa,
    ): string {
        $parts = [$medida, $formato];
        if ($maquina !== '') {
            $parts[] = $maquina;
        }
        if ($z !== null) {
            $parts[] = 'Z='.$this->fmtNum($z, 4);
        }
        if ($repeticao !== null) {
            $parts[] = 'REP='.$this->fmtNum($repeticao, 6);
        }
        $parts[] = 'pux='.($puxada !== null ? $this->fmtNum($puxada, 4) : ($completa ? '—' : 'MANUAL'));

        return implode(' · ', $parts);
    }

    private function fmtNum(float $n, int $maxDec): string
    {
        $s = rtrim(rtrim(number_format($n, $maxDec, ',', ''), '0'), ',');

        return $s === '' ? '0' : $s;
    }
}
