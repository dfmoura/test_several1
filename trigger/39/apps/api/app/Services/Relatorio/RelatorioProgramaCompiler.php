<?php

namespace App\Services\Relatorio;

use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Produto;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RelatorioProgramaCompiler
{
    public function __construct(
        private readonly RelatorioCatalogo $catalogo,
        private readonly RelatorioProgramaValidator $validator,
        private readonly \App\Services\Comercial\FacasMapaService $facasMapa,
        private readonly FacaShapeSvg $facaShape,
    ) {}

    /**
     * @param  array<string, mixed>  $programa
     * @param  array<string, mixed>  $flags
     * @return array{
     *   programa: array<string, mixed>,
     *   labels: array<string, string>,
     *   rows: list<array<string, mixed>>,
     *   totais: array<string, mixed>,
     *   total_linhas: int,
     *   total_disponivel: int,
     *   truncado: bool,
     *   fonte: string
     * }
     */
    public function execute(int $empresaId, array $programa, array $flags): array
    {
        $spec = $this->validator->validate($programa, $flags);
        $catalog = $this->catalogo->forFlags($flags);
        $campoMeta = $catalog['fontes'][$spec['fonte']]['campos'];

        $labels = [];
        foreach ($spec['colunas'] as $col) {
            $labels[$col] = $campoMeta[$col]['label'] ?? $col;
        }

        $result = match ($spec['fonte']) {
            'orcamentos' => $this->queryOrcamentos($empresaId, $spec),
            'parceiros' => $this->queryParceiros($empresaId, $spec),
            'produtos' => $this->queryProdutos($empresaId, $spec),
            'facas' => $this->queryFacas($spec),
            default => throw new InvalidArgumentException('Fonte não suportada.'),
        };

        return [
            'programa' => $spec,
            'labels' => $labels,
            'rows' => $result['rows'],
            'totais' => $result['totais'],
            'total_linhas' => count($result['rows']),
            'total_disponivel' => $result['total_disponivel'],
            'truncado' => $result['truncado'],
            'fonte' => $spec['fonte'],
        ];
    }

    /**
     * Preview leve: amostra + contagem (sem PDF).
     *
     * @param  array<string, mixed>  $programa
     * @param  array<string, mixed>  $flags
     * @return array{amostra: list<array<string, mixed>>, total_estimado: int, labels: array<string, string>, programa: array<string, mixed>}
     */
    public function preview(int $empresaId, array $programa, array $flags, int $amostraLimite = 20): array
    {
        $spec = $this->validator->validate($programa, $flags);
        $previewSpec = $spec;
        $previewSpec['limite'] = min($amostraLimite, $spec['limite']);
        $previewSpec['totais'] = [];

        $full = $this->execute($empresaId, $previewSpec, $flags);

        // Contagem do universo com a spec original (limite da amostra não altera o COUNT).
        $countSpec = $spec;
        $countOnly = match ($spec['fonte']) {
            'orcamentos' => $this->countOrcamentos($empresaId, $countSpec),
            'parceiros' => $this->countParceiros($empresaId, $countSpec),
            'produtos' => $this->countProdutos($empresaId, $countSpec),
            'facas' => $this->countFacas($countSpec),
            default => 0,
        };

        return [
            'amostra' => $full['rows'],
            'total_estimado' => $countOnly,
            'labels' => $full['labels'],
            'programa' => $spec,
        ];
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return array{rows: list<array<string, mixed>>, totais: array<string, mixed>, total_disponivel: int, truncado: bool}
     */
    private function queryOrcamentos(int $empresaId, array $spec): array
    {
        $base = $this->baseOrcamentosQuery($empresaId, $spec);
        $totalDisponivel = (clone $base)->count();

        $q = clone $base;
        $this->applyDbOrder($q, $spec['ordenacao'], [
            'codigo' => 'orcamentos.codigo',
            'status' => 'orcamentos.status',
            'cliente_nome' => 'orcamentos.cliente_nome',
            'parceiro_codigo' => 'parceiros.codigo',
            'parceiro_nome' => 'parceiros.razao_social',
            'versao' => 'orcamentos.versao',
            'total' => 'orcamentos.valor_primeira_faixa',
            'prazo_entrega_dias' => 'orcamentos.prazo_entrega_dias',
            'validade_dias' => 'orcamentos.validade_dias',
            'created_at' => 'orcamentos.created_at',
            'updated_at' => 'orcamentos.updated_at',
        ], 'orcamentos.created_at');

        $models = $q->limit($spec['limite'])->get();

        $rows = [];
        foreach ($models as $o) {
            /** @var Orcamento $o */
            $total = $o->valor_primeira_faixa !== null
                ? (float) $o->valor_primeira_faixa
                : (is_numeric(data_get($o->result_snapshot, 'faixas.0.valor_etiqueta'))
                    ? (float) data_get($o->result_snapshot, 'faixas.0.valor_etiqueta')
                    : null);
            $row = [
                'codigo' => $o->codigo,
                'status' => $o->status,
                'parceiro_codigo' => $o->parceiro?->codigo,
                'parceiro_nome' => $o->parceiro?->razao_social ?? $o->cliente_nome,
                'cliente_nome' => $o->cliente_nome,
                'versao' => $o->versao,
                'total' => $total,
                'prazo_entrega_dias' => $o->prazo_entrega_dias,
                'validade_dias' => $o->validade_dias,
                'observacao' => $o->observacao,
                'created_at' => optional($o->created_at)?->format('d/m/Y H:i'),
                'updated_at' => optional($o->updated_at)?->format('d/m/Y H:i'),
            ];
            $rows[] = $this->project($row, $spec['colunas']);
        }

        $totais = $this->aggregateOrcamentos($empresaId, $spec);

        return [
            'rows' => $rows,
            'totais' => $totais,
            'total_disponivel' => $totalDisponivel,
            'truncado' => $totalDisponivel > count($rows),
        ];
    }

    /** @param  array<string, mixed>  $spec */
    private function countOrcamentos(int $empresaId, array $spec): int
    {
        return $this->baseOrcamentosQuery($empresaId, $spec)->count();
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return Builder<\App\Models\Orcamento>
     */
    private function baseOrcamentosQuery(int $empresaId, array $spec): Builder
    {
        $q = Orcamento::query()
            ->select('orcamentos.*')
            ->with('parceiro:id,codigo,razao_social,nome_fantasia')
            ->leftJoin('parceiros', 'parceiros.id', '=', 'orcamentos.parceiro_id')
            ->where('orcamentos.empresa_id', $empresaId)
            ->whereNull('orcamentos.deleted_at');

        $this->applyDbFilters($q, $spec['filtros'], [
            'codigo' => 'orcamentos.codigo',
            'status' => 'orcamentos.status',
            'cliente_nome' => 'orcamentos.cliente_nome',
            'parceiro_codigo' => 'parceiros.codigo',
            'parceiro_nome' => 'parceiros.razao_social',
            'versao' => 'orcamentos.versao',
            'total' => 'orcamentos.valor_primeira_faixa',
            'prazo_entrega_dias' => 'orcamentos.prazo_entrega_dias',
            'validade_dias' => 'orcamentos.validade_dias',
            'observacao' => 'orcamentos.observacao',
            'created_at' => 'orcamentos.created_at',
            'updated_at' => 'orcamentos.updated_at',
        ]);

        return $q;
    }

    /**
     * Agrega sobre o universo (sem LIMIT do detalhe).
     *
     * @param  array<string, mixed>  $spec
     * @return array<string, mixed>
     */
    private function aggregateOrcamentos(int $empresaId, array $spec): array
    {
        if ($spec['totais'] === []) {
            return [];
        }

        $q = $this->baseOrcamentosQuery($empresaId, $spec);
        $selects = [];
        $keyMap = [];
        foreach ($spec['totais'] as $i => $t) {
            $alias = 'agg_'.$i;
            $keyMap[$alias] = $t['campo'];
            $col = match ($t['campo']) {
                'total' => 'orcamentos.valor_primeira_faixa',
                'versao' => 'orcamentos.versao',
                'prazo_entrega_dias' => 'orcamentos.prazo_entrega_dias',
                'validade_dias' => 'orcamentos.validade_dias',
                'parceiro_nome' => 'parceiros.razao_social',
                'parceiro_codigo' => 'parceiros.codigo',
                'codigo' => 'orcamentos.codigo',
                'status' => 'orcamentos.status',
                'cliente_nome' => 'orcamentos.cliente_nome',
                default => 'orcamentos.id',
            };
            $selects[] = match ($t['fn']) {
                'sum' => DB::raw("SUM({$col}) as {$alias}"),
                'avg' => DB::raw("AVG({$col}) as {$alias}"),
                'min' => DB::raw("MIN({$col}) as {$alias}"),
                'max' => DB::raw("MAX({$col}) as {$alias}"),
                'count_distinct' => DB::raw("COUNT(DISTINCT {$col}) as {$alias}"),
                default => DB::raw('COUNT(*) as '.$alias),
            };
        }

        $row = $q->clone()->reorder()->select($selects)->first();
        $out = [];
        foreach ($keyMap as $alias => $campo) {
            $val = $row?->{$alias};
            $out[$campo] = $val !== null ? (is_numeric($val) ? (float) $val : $val) : null;
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return array{rows: list<array<string, mixed>>, totais: array<string, mixed>, total_disponivel: int, truncado: bool}
     */
    private function queryParceiros(int $empresaId, array $spec): array
    {
        $map = [
            'codigo' => 'codigo',
            'razao_social' => 'razao_social',
            'nome_fantasia' => 'nome_fantasia',
            'cnpj_cpf' => 'cnpj_cpf',
            'situacao' => 'situacao',
            'is_prospect' => 'is_prospect',
            'papel_cliente' => 'papel_cliente',
            'papel_fornecedor' => 'papel_fornecedor',
            'municipio' => 'municipio',
            'uf' => 'uf',
            'email' => 'email',
            'whatsapp' => 'whatsapp',
            'telefone' => 'telefone',
            'limite_credito' => 'limite_credito',
            'credito_utilizado' => 'credito_utilizado',
            'created_at' => 'created_at',
        ];

        $base = Parceiro::query()->where('empresa_id', $empresaId);
        $this->applyDbFilters($base, $spec['filtros'], $map);
        $totalDisponivel = (clone $base)->count();

        $q = clone $base;
        $this->applyDbOrder($q, $spec['ordenacao'], $map, 'codigo');

        $rows = $q->limit($spec['limite'])->get()->map(function (Parceiro $p) use ($spec) {
            $row = [
                'codigo' => $p->codigo,
                'razao_social' => $p->razao_social,
                'nome_fantasia' => $p->nome_fantasia,
                'cnpj_cpf' => $p->cnpj_cpf,
                'situacao' => $p->situacao,
                'is_prospect' => $p->is_prospect ? 'Sim' : 'Não',
                'papel_cliente' => $p->papel_cliente ? 'Sim' : 'Não',
                'papel_fornecedor' => $p->papel_fornecedor ? 'Sim' : 'Não',
                'municipio' => $p->municipio,
                'uf' => $p->uf,
                'email' => $p->email,
                'whatsapp' => $p->whatsapp,
                'telefone' => $p->telefone,
                'limite_credito' => $p->limite_credito,
                'credito_utilizado' => $p->credito_utilizado,
                'created_at' => optional($p->created_at)?->format('d/m/Y H:i'),
            ];

            return $this->project($row, $spec['colunas']);
        })->all();

        $totais = $this->aggregateEloquent($base, $spec['totais'], $map, [
            'limite_credito' => 'limite_credito',
            'credito_utilizado' => 'credito_utilizado',
        ]);

        return [
            'rows' => $rows,
            'totais' => $totais,
            'total_disponivel' => $totalDisponivel,
            'truncado' => $totalDisponivel > count($rows),
        ];
    }

    /** @param  array<string, mixed>  $spec */
    private function countParceiros(int $empresaId, array $spec): int
    {
        $map = [
            'codigo' => 'codigo', 'razao_social' => 'razao_social', 'nome_fantasia' => 'nome_fantasia',
            'cnpj_cpf' => 'cnpj_cpf', 'situacao' => 'situacao', 'is_prospect' => 'is_prospect',
            'papel_cliente' => 'papel_cliente', 'papel_fornecedor' => 'papel_fornecedor',
            'municipio' => 'municipio', 'uf' => 'uf', 'email' => 'email',
            'whatsapp' => 'whatsapp', 'telefone' => 'telefone',
            'limite_credito' => 'limite_credito', 'credito_utilizado' => 'credito_utilizado',
            'created_at' => 'created_at',
        ];
        $q = Parceiro::query()->where('empresa_id', $empresaId);
        $this->applyDbFilters($q, $spec['filtros'], $map);

        return $q->count();
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return array{rows: list<array<string, mixed>>, totais: array<string, mixed>, total_disponivel: int, truncado: bool}
     */
    private function queryProdutos(int $empresaId, array $spec): array
    {
        $map = [
            'codigo' => 'codigo',
            'descricao_comercial' => 'descricao_comercial',
            'descricao_fiscal' => 'descricao_fiscal',
            'familia' => 'familia',
            'grupo' => 'grupo',
            'ncm' => 'ncm',
            'cst_cbs' => 'cst_cbs',
            'cclass_trib' => 'cclass_trib',
            'aliquota_cbs' => 'aliquota_cbs',
            'unidade_comercial' => 'unidade_comercial',
            'preco_tabela' => 'preco_tabela',
            'estoque_minimo' => 'estoque_minimo',
            'lead_time_dias' => 'lead_time_dias',
            'situacao' => 'situacao',
            'created_at' => 'created_at',
        ];

        $base = Produto::query()->where('empresa_id', $empresaId);
        $this->applyDbFilters($base, $spec['filtros'], $map);
        $totalDisponivel = (clone $base)->count();

        $q = clone $base;
        $this->applyDbOrder($q, $spec['ordenacao'], $map, 'codigo');

        $rows = $q->limit($spec['limite'])->get()->map(function (Produto $p) use ($spec) {
            $row = [
                'codigo' => $p->codigo,
                'descricao_comercial' => $p->descricao_comercial,
                'descricao_fiscal' => $p->descricao_fiscal,
                'familia' => $p->familia,
                'grupo' => $p->grupo,
                'ncm' => $p->ncm,
                'cst_cbs' => $p->cst_cbs,
                'cclass_trib' => $p->cclass_trib,
                'aliquota_cbs' => $p->aliquota_cbs,
                'unidade_comercial' => $p->unidade_comercial,
                'preco_tabela' => $p->preco_tabela,
                'estoque_minimo' => $p->estoque_minimo,
                'lead_time_dias' => $p->lead_time_dias,
                'situacao' => $p->situacao,
                'created_at' => optional($p->created_at)?->format('d/m/Y H:i'),
            ];

            return $this->project($row, $spec['colunas']);
        })->all();

        $totais = $this->aggregateEloquent($base, $spec['totais'], $map, [
            'aliquota_cbs' => 'aliquota_cbs',
            'preco_tabela' => 'preco_tabela',
            'estoque_minimo' => 'estoque_minimo',
            'lead_time_dias' => 'lead_time_dias',
        ]);

        return [
            'rows' => $rows,
            'totais' => $totais,
            'total_disponivel' => $totalDisponivel,
            'truncado' => $totalDisponivel > count($rows),
        ];
    }

    /** @param  array<string, mixed>  $spec */
    private function countProdutos(int $empresaId, array $spec): int
    {
        $map = [
            'codigo' => 'codigo', 'descricao_comercial' => 'descricao_comercial',
            'descricao_fiscal' => 'descricao_fiscal', 'familia' => 'familia', 'grupo' => 'grupo',
            'ncm' => 'ncm', 'cst_cbs' => 'cst_cbs', 'cclass_trib' => 'cclass_trib',
            'aliquota_cbs' => 'aliquota_cbs', 'unidade_comercial' => 'unidade_comercial',
            'preco_tabela' => 'preco_tabela', 'estoque_minimo' => 'estoque_minimo',
            'lead_time_dias' => 'lead_time_dias', 'situacao' => 'situacao', 'created_at' => 'created_at',
        ];
        $q = Produto::query()->where('empresa_id', $empresaId);
        $this->applyDbFilters($q, $spec['filtros'], $map);

        return $q->count();
    }

    /**
     * Facas: filtrar e ordenar ANTES do corte de limite (E7).
     *
     * @param  array<string, mixed>  $spec
     * @return array{rows: list<array<string, mixed>>, totais: array<string, mixed>, total_disponivel: int, truncado: bool}
     */
    private function queryFacas(array $spec): array
    {
        $fullRows = $this->collectFacasRows($spec);
        $totalDisponivel = count($fullRows);

        if ($spec['ordenacao'] !== []) {
            usort($fullRows, function (array $a, array $b) use ($spec) {
                foreach ($spec['ordenacao'] as $o) {
                    if ($o['campo'] === 'desenho') {
                        continue;
                    }
                    $av = $a[$o['campo']] ?? null;
                    $bv = $b[$o['campo']] ?? null;
                    $aNum = is_numeric($av);
                    $bNum = is_numeric($bv);
                    if ($aNum && $bNum) {
                        $cmp = (float) $av <=> (float) $bv;
                    } elseif ($aNum) {
                        $cmp = -1;
                    } elseif ($bNum) {
                        $cmp = 1;
                    } else {
                        $cmp = strcmp((string) $av, (string) $bv);
                    }
                    if ($cmp !== 0) {
                        return $o['dir'] === 'desc' ? -$cmp : $cmp;
                    }
                }

                return 0;
            });
        }

        $sliced = array_slice($fullRows, 0, $spec['limite']);
        $rows = array_map(fn (array $row) => $this->project($row, $spec['colunas']), $sliced);
        $totais = $this->computeTotaisFromRows($fullRows, $spec['totais']);

        return [
            'rows' => $rows,
            'totais' => $totais,
            'total_disponivel' => $totalDisponivel,
            'truncado' => $totalDisponivel > count($rows),
        ];
    }

    /** @param  array<string, mixed>  $spec */
    private function countFacas(array $spec): int
    {
        return count($this->collectFacasRows($spec));
    }

    /**
     * @param  array<string, mixed>  $spec
     * @return list<array<string, mixed>>
     */
    private function collectFacasRows(array $spec): array
    {
        $filters = ['so_completas' => false];
        $qText = null;

        foreach ($spec['filtros'] as $f) {
            $campo = $f['campo'];
            $valor = $f['valor'];
            if ($campo === 'desenho') {
                continue;
            }
            if ($campo === 'completa') {
                $truthy = filter_var($valor, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($f['op'] === 'eq' && $truthy === true) {
                    $filters['so_completas'] = true;
                } elseif ($f['op'] === 'eq' && ($valor === 'Sim' || $valor === 1 || $valor === '1')) {
                    $filters['so_completas'] = true;
                }

                continue;
            }
            if ($campo === 'formato' && in_array($f['op'], ['eq', 'like'], true)) {
                $filters['formato'] = (string) $valor;

                continue;
            }
            if ($campo === 'maquina_catalogo' && in_array($f['op'], ['eq', 'like'], true)) {
                $filters['maquina'] = (string) $valor;

                continue;
            }
            if ($campo === 'medida' && in_array($f['op'], ['eq', 'like'], true)) {
                $filters['medida'] = (string) $valor;

                continue;
            }
            if (in_array($campo, ['label', 'fornecedor', 'conjugada', 'maquina_origem'], true)
                && in_array($f['op'], ['eq', 'like'], true)) {
                $qText = trim(($qText ? $qText.' ' : '').(string) $valor);
            }
        }

        if ($qText !== null && $qText !== '') {
            $filters['q'] = $qText;
        }

        $items = $this->facasMapa->list($filters)['items'];
        $virtualFilterFields = ['id', 'puxada', 'z', 'repeticao', 'n_facas', 'largura_faca', 'cilindro'];
        $mapped = [];
        foreach ($items as $faca) {
            $row = [
                'desenho' => $this->facaShape->renderHtml($faca, 32),
                'id' => $faca['id'] ?? null,
                'medida' => $faca['medida'] ?? null,
                'formato' => $faca['formato'] ?? ($faca['faca'] ?? null),
                'maquina_catalogo' => $faca['maquina_catalogo'] ?? null,
                'maquina_origem' => $faca['maquina_origem'] ?? null,
                'puxada' => $faca['puxada'] ?? null,
                'z' => $faca['z'] ?? null,
                'repeticao' => $faca['repeticao'] ?? null,
                'n_facas' => $faca['n_facas'] ?? null,
                'largura_faca' => $faca['largura_faca'] ?? null,
                'cilindro' => $faca['cilindro'] ?? null,
                'fornecedor' => $faca['fornecedor'] ?? null,
                'conjugada' => $faca['conjugada'] ?? null,
                'completa' => ! empty($faca['completa']) ? 'Sim' : 'Não',
                'label' => $faca['label'] ?? null,
            ];

            if (! $this->passesVirtualFilters($row, $spec['filtros'], $virtualFilterFields)) {
                continue;
            }

            $mapped[] = $row;
        }

        return $mapped;
    }

    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $base
     * @param  list<array{campo: string, fn: string}>  $totais
     * @param  array<string, string>  $map
     * @param  array<string, string>  $numericCols
     * @return array<string, mixed>
     */
    private function aggregateEloquent(Builder $base, array $totais, array $map, array $numericCols): array
    {
        if ($totais === []) {
            return [];
        }

        $selects = [];
        $keyMap = [];
        foreach ($totais as $i => $t) {
            $alias = 'agg_'.$i;
            $keyMap[$alias] = $t['campo'];
            $col = $map[$t['campo']] ?? 'id';
            $selects[] = match ($t['fn']) {
                'sum' => DB::raw("SUM({$col}) as {$alias}"),
                'avg' => DB::raw("AVG({$col}) as {$alias}"),
                'min' => DB::raw("MIN({$col}) as {$alias}"),
                'max' => DB::raw("MAX({$col}) as {$alias}"),
                'count_distinct' => DB::raw("COUNT(DISTINCT {$col}) as {$alias}"),
                default => DB::raw('COUNT(*) as '.$alias),
            };
        }

        $row = (clone $base)->reorder()->select($selects)->first();
        $out = [];
        foreach ($keyMap as $alias => $campo) {
            $val = $row?->{$alias};
            $out[$campo] = $val !== null ? (is_numeric($val) ? (float) $val : $val) : null;
        }

        return $out;
    }

    /**
     * Totais sobre o conjunto completo (antes do slice) — usado em facas.
     *
     * @param  list<array<string, mixed>>  $rows
     * @param  list<array{campo: string, fn: string}>  $totais
     * @return array<string, mixed>
     */
    private function computeTotaisFromRows(array $rows, array $totais): array
    {
        $out = [];
        foreach ($totais as $t) {
            $campo = $t['campo'];
            $fn = $t['fn'];
            if ($fn === 'count') {
                $out[$campo] = count($rows);

                continue;
            }
            if ($fn === 'count_distinct') {
                $vals = array_map(fn ($r) => $r[$campo] ?? null, $rows);
                $out[$campo] = count(array_unique(array_filter($vals, fn ($v) => $v !== null && $v !== '')));

                continue;
            }
            $nums = array_values(array_filter(
                array_map(fn ($r) => is_numeric($r[$campo] ?? null) ? (float) $r[$campo] : null, $rows),
                fn ($v) => $v !== null
            ));
            $out[$campo] = match ($fn) {
                'sum' => array_sum($nums),
                'avg' => $nums === [] ? null : array_sum($nums) / count($nums),
                'min' => $nums === [] ? null : min($nums),
                'max' => $nums === [] ? null : max($nums),
                default => null,
            };
        }

        return $out;
    }

    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $q
     * @param  list<array{campo: string, op: string, valor: mixed}>  $filtros
     * @param  array<string, string>  $map
     */
    private function applyDbFilters(Builder $q, array $filtros, array $map): void
    {
        foreach ($filtros as $f) {
            $col = $map[$f['campo']] ?? null;
            if ($col === null) {
                continue;
            }
            $op = $f['op'];
            $valor = $f['valor'];

            match ($op) {
                'eq' => $q->where($col, $valor),
                'neq' => $q->where($col, '!=', $valor),
                'in' => $q->whereIn($col, is_array($valor) ? $valor : [$valor]),
                'like' => $q->where($col, 'like', '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $valor).'%'),
                'gte' => $q->where($col, '>=', $valor),
                'lte' => $q->where($col, '<=', $valor),
                'gt' => $q->where($col, '>', $valor),
                'lt' => $q->where($col, '<', $valor),
                'between' => is_array($valor) && count($valor) >= 2
                    ? $q->whereBetween($col, [$valor[0], $valor[1]])
                    : null,
                default => null,
            };
        }
    }

    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $q
     * @param  list<array{campo: string, dir: string}>  $ordenacao
     * @param  array<string, string>  $map
     */
    private function applyDbOrder(Builder $q, array $ordenacao, array $map, string $defaultCol): void
    {
        $applied = false;
        foreach ($ordenacao as $o) {
            $col = $map[$o['campo']] ?? null;
            if ($col === null) {
                throw new InvalidArgumentException(
                    "Ordenação por '{$o['campo']}' não é suportada nesta fonte. Use um campo ordenável do catálogo."
                );
            }
            $q->orderBy($col, $o['dir']);
            $applied = true;
        }
        if (! $applied) {
            $q->orderBy($defaultCol);
        }
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  list<array{campo: string, op: string, valor: mixed}>  $filtros
     * @param  list<string>  $virtualFields
     */
    private function passesVirtualFilters(array $row, array $filtros, array $virtualFields): bool
    {
        foreach ($filtros as $f) {
            if (! in_array($f['campo'], $virtualFields, true)) {
                continue;
            }
            $actual = $row[$f['campo']] ?? null;
            $valor = $f['valor'];
            $ok = match ($f['op']) {
                'eq' => (string) $actual === (string) $valor,
                'neq' => (string) $actual !== (string) $valor,
                'in' => in_array($actual, is_array($valor) ? $valor : [$valor], false),
                'like' => str_contains(mb_strtolower((string) $actual), mb_strtolower((string) $valor)),
                'gte' => is_numeric($actual) && is_numeric($valor) && (float) $actual >= (float) $valor,
                'lte' => is_numeric($actual) && is_numeric($valor) && (float) $actual <= (float) $valor,
                'gt' => is_numeric($actual) && is_numeric($valor) && (float) $actual > (float) $valor,
                'lt' => is_numeric($actual) && is_numeric($valor) && (float) $actual < (float) $valor,
                'between' => is_array($valor) && count($valor) >= 2 && is_numeric($actual)
                    && (float) $actual >= (float) $valor[0] && (float) $actual <= (float) $valor[1],
                default => true,
            };
            if (! $ok) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  list<string>  $colunas
     * @return array<string, mixed>
     */
    private function project(array $row, array $colunas): array
    {
        $out = [];
        foreach ($colunas as $c) {
            $out[$c] = $row[$c] ?? null;
        }

        return $out;
    }
}
