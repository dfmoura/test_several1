<?php

namespace App\Services\Comercial;

use App\Models\OrcCatalogoMaquina;
use App\Models\OrcMapaFaca;
use App\Models\Parceiro;
use App\Services\Audit\AuditLogger;
use App\Support\CatalogoOrcEmpresa;
use App\Support\ContornoSvgSanitizer;
use App\Support\FacaPosicao;
use Illuminate\Database\Eloquent\Builder;
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
    /** Vocabulário visual canônico; a EMP pode ter formatos extras no mapa. */
    public const FORMATOS_CANONICOS = ['RETA', 'REDONDA', 'OVAL', 'DESENHADA', 'ESPECIAL', 'LACRE'];

    /** @var list<array<string, mixed>>|null */
    private static ?array $jsonCache = null;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ContornoSvgSanitizer $contornoSvgSanitizer,
    ) {}

    public function tablesReady(): bool
    {
        return Schema::hasTable('orc_mapa_facas');
    }

    public function usingDatabase(): bool
    {
        return $this->tablesReady() && $this->scopedQuery()->exists();
    }

    /**
     * Importa itens ausentes do JSON oficial. Não altera facas já cadastradas.
     *
     * @return array{criados: int, existentes: int, fonte: string}
     */
    public function seedFromJson(?string $path = null, bool $forceOverwrite = false, ?int $empresaId = null): array
    {
        if (! $this->tablesReady()) {
            throw ValidationException::withMessages([
                'mapa' => 'Tabela orc_mapa_facas ausente — rode as migrations.',
            ]);
        }

        $empresaId ??= CatalogoOrcEmpresa::id();
        $path ??= resource_path('data/orcamento/mapa_facas.json');
        $raw = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $items = is_array($raw) && array_is_list($raw)
            ? $raw
            : ($raw['facas'] ?? $raw['items'] ?? []);

        $criados = 0;
        $existentes = 0;
        $maxId = 0;

        DB::transaction(function () use ($items, $forceOverwrite, $empresaId, &$criados, &$existentes, &$maxId) {
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
                $payload['empresa_id'] = $empresaId;
                // Sem fallback ao template: senão EMP vazia “enxerga” o compartilhado e nunca materializa.
                $existing = $empresaId === null
                    ? OrcMapaFaca::query()->find($id)
                    : OrcMapaFaca::query()
                        ->where('empresa_id', $empresaId)
                        ->where('medida', $payload['medida'] ?? null)
                        ->where('formato', $payload['formato'] ?? null)
                        ->where('faca', $payload['faca'] ?? null)
                        ->where('maquina_catalogo', $payload['maquina_catalogo'] ?? null)
                        ->first();
                if ($existing) {
                    $existentes++;
                    if ($forceOverwrite) {
                        $existing->fill($payload);
                        $existing->save();
                    }
                    continue;
                }
                $faca = new OrcMapaFaca($payload);
                if ($empresaId === null) {
                    $faca->id = $id;
                }
                $faca->save();
                $criados++;
            }
        });

        // Seed por EMP não usa o id do JSON. ALTER TABLE no MySQL faz COMMIT implícito
        // e derruba a transação da alta (`There is no active transaction`).
        if (
            $empresaId === null
            && $maxId > 0
            && DB::getDriverName() === 'mysql'
            && DB::transactionLevel() === 0
        ) {
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
     * @return array{total: int, items: list<array<string, mixed>>, formatos: list<string>, maquinas: list<string>, meta: array<string, string>}
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
            $row = $this->scopedQuery()->whereKey($id)->first();

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
     * Materializa o mapa oficial na EMP se ela ainda só enxerga o template compartilhado.
     * Idempotente — não altera geometria nem sobrescreve linhas já da EMP.
     *
     * @return array{criados: int, existentes: int, fonte: string, materializado: bool}
     */
    public function ensureMapaEmpresa(?int $empresaId = null): array
    {
        if (! $this->tablesReady()) {
            throw ValidationException::withMessages([
                'mapa' => 'Persistência do mapa indisponível — rode migrations/seed.',
            ]);
        }

        $empresaId ??= CatalogoOrcEmpresa::id();
        if ($empresaId === null) {
            throw ValidationException::withMessages([
                'empresa' => 'Empresa do contexto é obrigatória para materializar o mapa.',
            ]);
        }

        $ownedCount = OrcMapaFaca::query()->where('empresa_id', $empresaId)->count();
        if ($ownedCount > 0) {
            return [
                'criados' => 0,
                'existentes' => $ownedCount,
                'fonte' => 'MAPA DE FACAS 20260715 ATUAL',
                'materializado' => false,
            ];
        }

        $seed = $this->seedFromJson(null, false, $empresaId);

        return [
            'criados' => $seed['criados'],
            'existentes' => $seed['existentes'],
            'fonte' => $seed['fonte'],
            'materializado' => $seed['criados'] > 0,
        ];
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

        // Não criar 1 faca da EMP sobre o template compartilhado — materializa o mapa completo antes.
        $this->ensureMapaEmpresa();

        if (
            (! array_key_exists('n_facas', $data) || $data['n_facas'] === null || $data['n_facas'] === '')
            && ! empty($data['maquina_catalogo'])
        ) {
            $data['n_facas'] = $this->sugerirProximoNFacas((string) $data['maquina_catalogo'])['sugerido'];
        }

        $payload = $this->normalizeRow($data, forSeed: false);
        $payload['empresa_id'] = CatalogoOrcEmpresa::id();
        $this->assertNoDuplicateAtiva($payload);

        $faca = OrcMapaFaca::query()->create($payload);
        $faca->loadMissing(OrcMapaFaca::userStampWith());
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

        $faca = $this->resolverFacaEscrita($id);
        if (! $faca) {
            abort(404, 'Faca não encontrada no mapa.');
        }

        if ((bool) $faca->ativo === $ativo) {
            $faca->loadMissing(OrcMapaFaca::userStampWith());

            return $this->toArray($faca);
        }

        if ($ativo) {
            $this->assertNoDuplicateAtiva($this->toArray($faca), exceptId: $faca->id);
        }

        $faca->loadMissing(OrcMapaFaca::userStampWith());
        $de = $this->toArray($faca);
        $faca->ativo = $ativo;
        $faca->save();
        $faca->loadMissing(OrcMapaFaca::userStampWith());
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

    /**
     * Ajusta dados operacionais (nota, fornecedor, grupo ORC). Geometria permanece travada.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updateMetadados(int $id, array $data): array
    {
        if (! $this->tablesReady()) {
            throw ValidationException::withMessages([
                'mapa' => 'Persistência do mapa indisponível.',
            ]);
        }

        $faca = $this->resolverFacaEscrita($id);
        if (! $faca) {
            abort(404, 'Faca não encontrada no mapa.');
        }

        $faca->loadMissing(OrcMapaFaca::userStampWith());
        $de = $this->toArray($faca);

        if (array_key_exists('maquina_catalogo', $data) && $data['maquina_catalogo'] !== null && $data['maquina_catalogo'] !== '') {
            $maq = strtoupper(trim((string) $data['maquina_catalogo']));
            $this->assertMaquinaCatalogo($maq);
            $faca->maquina_catalogo = $maq;
        }
        if (array_key_exists('maquina_origem', $data)) {
            $o = trim((string) ($data['maquina_origem'] ?? ''));
            $faca->maquina_origem = $o !== '' ? $o : null;
        }
        if (array_key_exists('n_facas', $data)) {
            $n = $data['n_facas'];
            $faca->n_facas = ($n === null || $n === '') ? null : (int) $n;
        }
        if (array_key_exists('valor_pago', $data)) {
            $vp = $data['valor_pago'];
            if ($vp === null || $vp === '') {
                $faca->valor_pago = null;
            } elseif (is_numeric($vp)) {
                $faca->valor_pago = round((float) $vp, 2);
            }
        }
        foreach (['cilindro', 'colunas_mapa', 'conjugada', 'fornecedor', 'cliente_nota', 'obs'] as $col) {
            if (! array_key_exists($col, $data)) {
                continue;
            }
            $v = trim((string) ($data[$col] ?? ''));
            $faca->{$col} = $v !== '' ? $v : null;
        }
        if (array_key_exists('posicao', $data)) {
            $faca->posicao = FacaPosicao::normalize($data['posicao']);
        }
        if (array_key_exists('contorno_svg', $data)) {
            $raw = $data['contorno_svg'];
            if ($raw === null || trim((string) $raw) === '') {
                $faca->contorno_svg = null;
            } else {
                $sanitized = $this->contornoSvgSanitizer->sanitize((string) $raw);
                if ($sanitized === null) {
                    throw ValidationException::withMessages([
                        'contorno_svg' => 'SVG inválido ou não permitido. Exporte apenas o contorno (path) do Corel/Illustrator.',
                    ]);
                }
                $faca->contorno_svg = $sanitized;
            }
        }

        $faca->label = $this->buildLabel(
            (string) $faca->medida,
            (string) $faca->formato,
            (string) ($faca->maquina_catalogo ?? ''),
            $faca->z !== null ? (float) $faca->z : null,
            $faca->repeticao !== null ? (float) $faca->repeticao : null,
            $faca->puxada !== null ? (float) $faca->puxada : null,
            (bool) $faca->completa,
        );
        $faca->save();
        $faca->loadMissing(OrcMapaFaca::userStampWith());
        $para = $this->toArray($faca);
        $this->audit->log('mapa_facas.metadados', 'orc_mapa_facas', $faca->id, $de, $para);
        self::$jsonCache = null;

        return $para;
    }

    /** @return array{total: int, ativas: int, inativas: int, completas: int, incompletas: int, fonte: string} */
    public function resumo(): array
    {
        if ($this->usingDatabase()) {
            $base = $this->scopedQuery();

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
     * Próximo N facas sugerido para cadastro na máquina (último cadastrado + 1).
     * Considera ativas e inativas — o número já utilizado permanece reservado.
     *
     * @return array{maquina_catalogo: string, ultimo_n_facas: int|null, sugerido: int}
     */
    public function sugerirProximoNFacas(string $maquinaCatalogo): array
    {
        $maquina = strtoupper(trim($maquinaCatalogo));
        if ($maquina === '') {
            throw ValidationException::withMessages([
                'maquina_catalogo' => 'Máquina é obrigatória para sugerir N facas.',
            ]);
        }

        if ($this->usingDatabase()) {
            $ultimo = $this->scopedQuery()
                ->whereNotNull('n_facas')
                ->where(function (Builder $w) use ($maquina) {
                    $w->whereRaw('UPPER(maquina_catalogo) = ?', [$maquina])
                        ->orWhereRaw('UPPER(COALESCE(maquina_origem,\'\')) = ?', [$maquina]);
                })
                ->max('n_facas');
        } else {
            $ultimo = null;
            foreach ($this->allFromJson() as $f) {
                if (! is_array($f) || ! array_key_exists('n_facas', $f) || $f['n_facas'] === null || $f['n_facas'] === '') {
                    continue;
                }
                $mq = strtoupper(trim((string) ($f['maquina_catalogo'] ?? '')));
                $orig = strtoupper(trim((string) ($f['maquina_origem'] ?? '')));
                if ($mq !== $maquina && $orig !== $maquina) {
                    continue;
                }
                $n = (int) $f['n_facas'];
                $ultimo = $ultimo === null ? $n : max($ultimo, $n);
            }
        }

        $ultimoInt = $ultimo === null ? null : (int) $ultimo;

        return [
            'maquina_catalogo' => $maquina,
            'ultimo_n_facas' => $ultimoInt,
            'sugerido' => ($ultimoInt ?? 0) + 1,
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
     * @return array{total: int, items: list<array<string, mixed>>, formatos: list<string>, maquinas: list<string>, meta: array<string, string>}
     */
    private function listFromDatabase(array $filters): array
    {
        $q = $this->scopedQuery()
            ->with(OrcMapaFaca::userStampWith())
            ->orderBy('medida')
            ->orderBy('id');

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
                    'cliente_nota', 'obs', 'maquina_catalogo', 'maquina_origem',
                    'fornecedor', 'conjugada',
                ] as $col) {
                    $w->orWhereRaw('UPPER(COALESCE('.$col.",'')) LIKE ?", [$qq]);
                }
            });
        }

        $total = (clone $q)->count();
        $limit = max(1, min(800, (int) ($filters['limit'] ?? 800)));
        $items = $q->limit($limit)->get()->map(fn (OrcMapaFaca $f) => $this->toArray($f))->all();

        $formatos = $this->scopedQuery()
            ->where('ativo', true)
            ->whereNotNull('formato')
            ->where('formato', '!=', '')
            ->distinct()
            ->orderBy('formato')
            ->pluck('formato')
            ->all();

        $maquinasMapa = $this->scopedQuery()
            ->where('ativo', true)
            ->whereNotNull('maquina_catalogo')
            ->where('maquina_catalogo', '!=', '')
            ->distinct()
            ->orderBy('maquina_catalogo')
            ->pluck('maquina_catalogo')
            ->all();

        return [
            'total' => $total,
            'items' => $items,
            'formatos' => $this->mergeVocabulario(self::FORMATOS_CANONICOS, $formatos),
            'maquinas' => $this->mergeVocabulario($this->maquinasDoCatalogo(), $maquinasMapa),
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
     * @return array{total: int, items: list<array<string, mixed>>, formatos: list<string>, maquinas: list<string>, meta: array<string, string>}
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
                    'cliente_nota', 'obs', 'maquina_catalogo', 'maquina_origem',
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
        $maquinasMapa = [];
        foreach ($all as $f) {
            $fmt = trim((string) ($f['formato'] ?? ''));
            if ($fmt !== '') {
                $formatos[$fmt] = true;
            }
            $mq = trim((string) ($f['maquina_catalogo'] ?? ''));
            if ($mq !== '') {
                $maquinasMapa[$mq] = true;
            }
        }
        $formatosList = array_keys($formatos);
        sort($formatosList);
        $maquinasList = array_keys($maquinasMapa);
        sort($maquinasList);

        $limit = max(1, min(800, (int) ($filters['limit'] ?? 800)));

        return [
            'total' => count($facas),
            'items' => array_slice($facas, 0, $limit),
            'formatos' => $this->mergeVocabulario(self::FORMATOS_CANONICOS, $formatosList),
            'maquinas' => $this->mergeVocabulario($this->maquinasDoCatalogo(), $maquinasList),
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

        $valorPago = $this->nullableFloat($row['valor_pago'] ?? null);
        if ($valorPago !== null) {
            $valorPago = round($valorPago, 2);
            if ($valorPago < 0) {
                throw ValidationException::withMessages(['valor_pago' => 'Valor pago não pode ser negativo.']);
            }
        }

        $contornoSvg = null;
        if (array_key_exists('contorno_svg', $row) && $row['contorno_svg'] !== null && trim((string) $row['contorno_svg']) !== '') {
            $contornoSvg = $this->contornoSvgSanitizer->sanitize((string) $row['contorno_svg']);
            if ($contornoSvg === null && ! $forSeed) {
                throw ValidationException::withMessages([
                    'contorno_svg' => 'SVG inválido ou não permitido. Exporte apenas o contorno (path) do Corel/Illustrator.',
                ]);
            }
        }

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
            'posicao' => $this->normalizePosicaoOptional($row['posicao'] ?? null, $forSeed),
            'contorno_svg' => $contornoSvg,
            'conjugada' => ($cj = trim((string) ($row['conjugada'] ?? ''))) !== '' ? $cj : null,
            'fornecedor' => ($fo = trim((string) ($row['fornecedor'] ?? ''))) !== '' ? $fo : null,
            'valor_pago' => $valorPago,
            'cliente_nota' => ($cn = trim((string) ($row['cliente_nota'] ?? ''))) !== '' ? $cn : null,
            'obs' => ($ob = trim((string) ($row['obs'] ?? ''))) !== '' ? $ob : null,
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
        $q = $this->scopedQuery()
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
        $f->loadMissing(OrcMapaFaca::userStampWith());

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
            'posicao' => $f->posicao,
            'contorno_svg' => $f->contorno_svg,
            'conjugada' => $f->conjugada,
            'fornecedor' => $f->fornecedor,
            'valor_pago' => $f->valor_pago,
            'cliente_nota' => $f->cliente_nota,
            'obs' => $f->obs,
            'completa' => (bool) $f->completa,
            'label' => $f->label,
            'ativo' => (bool) $f->ativo,
            'criado_por' => OrcMapaFaca::userStampFrom($f->criador),
            'atualizado_por' => OrcMapaFaca::userStampFrom($f->atualizador),
            'created_at' => optional($f->created_at)?->toIso8601String(),
            'updated_at' => optional($f->updated_at)?->toIso8601String(),
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
            'nota_ciclo' => 'Geometria não é editável: cadastre nova e inative a antiga. Nota, fornecedor, valor pago e grupo ORC podem ser ajustados.',
        ];
    }

    /**
     * @param  list<string>  ...$listas
     * @return list<string>
     */
    private function mergeVocabulario(array ...$listas): array
    {
        $seen = [];
        $out = [];
        foreach ($listas as $lista) {
            foreach ($lista as $item) {
                $v = strtoupper(trim((string) $item));
                if ($v === '' || isset($seen[$v])) {
                    continue;
                }
                $seen[$v] = true;
                $out[] = $v;
            }
        }

        return $out;
    }

    /** @return list<string> */
    private function maquinasDoCatalogo(): array
    {
        if (! Schema::hasTable('orc_catalogo_maquinas')) {
            return [];
        }

        return CatalogoOrcEmpresa::apply(
            OrcCatalogoMaquina::query()->where('ativo', true)->orderBy('ordem')->orderBy('nome'),
            CatalogoOrcEmpresa::id(),
            true,
        )->pluck('nome')->all();
    }

    private function assertMaquinaCatalogo(string $nome): void
    {
        $catalogo = $this->maquinasDoCatalogo();
        if ($catalogo === []) {
            return;
        }
        $ok = in_array($nome, array_map(static fn (string $n) => strtoupper($n), $catalogo), true);
        if (! $ok) {
            throw ValidationException::withMessages([
                'maquina_catalogo' => 'Máquina deve existir no catálogo ORC desta empresa (ou cadastre o grupo hora-máquina).',
            ]);
        }
    }

    private function normalizePosicaoOptional(mixed $value, bool $forSeed): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        try {
            return FacaPosicao::normalize($value);
        } catch (ValidationException) {
            if ($forSeed) {
                return null;
            }
            throw ValidationException::withMessages([
                'posicao' => ['Posição inválida. Use CIMA, BAIXO, ESQUERDA ou DIREITA.'],
            ]);
        }
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

    /**
     * Alinha `orc_mapa_facas.fornecedor` (rótulo legado) ao nome do PAR fornecedor da EMP.
     * Materializa o mapa na EMP se ainda estiver só no template. Não cria parceiro,
     * não altera geometria, não toca rótulos sem match único.
     *
     * @return array{
     *   atualizados: int,
     *   ja_alinhados: int,
     *   sem_match: list<array{rotulo: string, facas: int}>,
     *   ambiguos: list<array{rotulo: string, facas: int}>,
     *   mapa: list<array{de: string, para: string, facas: int, parceiro: string}>,
     *   materializado: bool,
     *   materializados: int
     * }
     */
    public function alinharFornecedoresParceiros(?int $empresaId = null): array
    {
        $empresaId ??= CatalogoOrcEmpresa::id();
        if ($empresaId === null) {
            throw ValidationException::withMessages([
                'empresa' => 'Empresa do contexto é obrigatória para alinhar fornecedores.',
            ]);
        }
        if (! $this->tablesReady() || ! Schema::hasTable('parceiros')) {
            throw ValidationException::withMessages([
                'mapa' => 'Persistência indisponível para alinhar fornecedores.',
            ]);
        }

        // Sem cópia da EMP o aligner não toca o template compartilhado (correto) — materializa antes.
        $ensure = $this->ensureMapaEmpresa($empresaId);

        $index = $this->indiceFornecedoresParceiros($empresaId);
        $query = OrcMapaFaca::query()
            ->where('empresa_id', $empresaId)
            ->whereNotNull('fornecedor')
            ->where('fornecedor', '!=', '');

        $atualizados = 0;
        $jaAlinhados = 0;
        $semMatch = [];
        $ambiguos = [];
        $mapa = [];

        $grupos = $query->clone()
            ->select('fornecedor', DB::raw('COUNT(*) as n'))
            ->groupBy('fornecedor')
            ->get();

        foreach ($grupos as $grupo) {
            $rotulo = trim((string) $grupo->fornecedor);
            $n = (int) $grupo->n;
            $canonico = $this->resolverFornecedorParceiro($rotulo, $index);

            if ($canonico === null) {
                $semMatch[] = ['rotulo' => $rotulo, 'facas' => $n];

                continue;
            }
            if ($canonico === false) {
                $ambiguos[] = ['rotulo' => $rotulo, 'facas' => $n];

                continue;
            }

            $para = $canonico['label'];
            if ($this->normalizarRotuloFornecedor($rotulo) === $this->normalizarRotuloFornecedor($para)
                && $rotulo === $para) {
                $jaAlinhados += $n;

                continue;
            }

            $affected = OrcMapaFaca::query()
                ->where('empresa_id', $empresaId)
                ->where('fornecedor', $rotulo)
                ->update(['fornecedor' => $para]);
            $atualizados += $affected;
            $mapa[] = [
                'de' => $rotulo,
                'para' => $para,
                'facas' => $affected,
                'parceiro' => $canonico['codigo'],
            ];
        }

        if ($atualizados > 0) {
            $this->audit->log(
                'mapa_facas.alinhar_fornecedores',
                'orc_mapa_facas',
                $empresaId,
                null,
                ['atualizados' => $atualizados, 'mapa' => $mapa],
            );
            self::$jsonCache = null;
        }

        return [
            'atualizados' => $atualizados,
            'ja_alinhados' => $jaAlinhados,
            'sem_match' => $semMatch,
            'ambiguos' => $ambiguos,
            'mapa' => $mapa,
            'materializado' => (bool) $ensure['materializado'],
            'materializados' => (int) $ensure['criados'],
        ];
    }

    /**
     * Resolve faca para escrita na EMP. Nunca grava no template compartilhado (empresa_id nulo).
     */
    private function resolverFacaEscrita(int $id): ?OrcMapaFaca
    {
        $empresaId = CatalogoOrcEmpresa::id();
        $faca = $this->scopedQuery()->whereKey($id)->first();
        if (! $faca) {
            return null;
        }

        // Já é da EMP (ou contexto sem EMP / template direto).
        if ($empresaId === null || (int) ($faca->empresa_id ?? 0) === $empresaId) {
            return $faca;
        }

        // Estava no template: materializa e re-resolve pela chave natural (ids do JSON ≠ ids da EMP).
        $this->ensureMapaEmpresa($empresaId);

        return $this->scopedQuery($empresaId)
            ->where('medida', $faca->medida)
            ->where('formato', $faca->formato)
            ->where('faca', $faca->faca)
            ->where('maquina_catalogo', $faca->maquina_catalogo)
            ->first();
    }

    /**
     * @return array<string, array{ids: list<int>, by_id: array<int, array{id: int, codigo: string, label: string}>}>
     */
    private function indiceFornecedoresParceiros(int $empresaId): array
    {
        $rows = Parceiro::query()
            ->where('empresa_id', $empresaId)
            ->where('papel_fornecedor', true)
            ->get(['id', 'codigo', 'razao_social', 'nome_fantasia']);

        $byId = [];
        $keys = [];
        foreach ($rows as $p) {
            $label = trim((string) ($p->nome_fantasia ?: '')) !== ''
                ? trim((string) $p->nome_fantasia)
                : trim((string) $p->razao_social);
            if ($label === '') {
                continue;
            }
            $byId[(int) $p->id] = [
                'id' => (int) $p->id,
                'codigo' => (string) $p->codigo,
                'label' => $label,
            ];
            $candidatos = [
                $this->normalizarRotuloFornecedor($label),
                $this->normalizarRotuloFornecedor((string) $p->codigo),
                $this->normalizarRotuloFornecedor((string) $p->razao_social),
                $this->normalizarRotuloFornecedor((string) ($p->nome_fantasia ?? '')),
                $this->primeiroTokenFornecedor($label),
                $this->primeiroTokenFornecedor((string) $p->razao_social),
                $this->primeiroTokenFornecedor((string) ($p->nome_fantasia ?? '')),
            ];
            foreach (array_unique(array_filter($candidatos)) as $key) {
                $keys[$key][] = (int) $p->id;
            }
        }

        $index = [];
        foreach ($keys as $key => $ids) {
            $index[$key] = [
                'ids' => array_values(array_unique($ids)),
                'by_id' => $byId,
            ];
        }

        return $index;
    }

    /**
     * @param  array<string, array{ids: list<int>, by_id: array<int, array{id: int, codigo: string, label: string}>}>  $index
     * @return array{id: int, codigo: string, label: string}|false|null  false = ambíguo
     */
    private function resolverFornecedorParceiro(string $rotulo, array $index): array|false|null
    {
        $key = $this->normalizarRotuloFornecedor($rotulo);
        if ($key === '' || ! isset($index[$key])) {
            return null;
        }
        $ids = $index[$key]['ids'];
        if (count($ids) !== 1) {
            return false;
        }
        $id = $ids[0];

        return $index[$key]['by_id'][$id] ?? null;
    }

    private function normalizarRotuloFornecedor(string $value): string
    {
        $s = mb_strtoupper(trim($value), 'UTF-8');
        if ($s === '') {
            return '';
        }
        $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if (is_string($ascii) && $ascii !== '') {
            $s = $ascii;
        }
        $s = preg_replace('/[^A-Z0-9 ]+/', ' ', $s) ?? $s;
        $s = preg_replace('/\s+/', ' ', $s) ?? $s;

        return trim($s);
    }

    private function primeiroTokenFornecedor(string $value): string
    {
        $n = $this->normalizarRotuloFornecedor($value);
        if ($n === '') {
            return '';
        }
        $token = explode(' ', $n, 2)[0];

        return strlen($token) >= 3 ? $token : '';
    }

    private function scopedQuery(?int $empresaId = null): Builder
    {
        return CatalogoOrcEmpresa::apply(OrcMapaFaca::query(), $empresaId ?? CatalogoOrcEmpresa::id(), true);
    }
}
