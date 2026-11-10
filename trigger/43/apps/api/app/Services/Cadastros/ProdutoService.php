<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use App\Support\ProdutoAtributos;
use App\Support\ProdutoDescricoes;
use App\Support\ProdutoLotePolitica;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class ProdutoService
{
    public const LIST_LIMIT_DEFAULT = 250;

    public const LIST_LIMIT_MAX = 500;

    public function __construct(
        private readonly CodigoGenerator $codigoGenerator,
        private readonly AuditLogger $auditLogger,
        private readonly ProdutoGrupoService $produtoGrupoService,
    ) {}

    public function list(
        Empresa $empresa,
        ?string $familia = null,
        ?string $grupo = null,
        ?string $q = null,
        int $limit = self::LIST_LIMIT_DEFAULT
    ) {
        $limit = max(1, min($limit, self::LIST_LIMIT_MAX));

        $query = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->with(Produto::userStampWith())
            ->withCount('fornecedorCodigos')
            ->orderBy('codigo');

        if ($familia) {
            $query->where('familia', strtoupper($familia));
        }

        if ($grupo) {
            $codigoGrupo = strtoupper($grupo);
            $query->where(function ($builder) use ($codigoGrupo) {
                $builder->where('grupo', $codigoGrupo)
                    ->orWhereHas('grupoCatalogo', fn ($g) => $g->where('codigo', $codigoGrupo));
            });
        }

        if ($q) {
            $query->where(function ($builder) use ($q) {
                $builder->where('codigo', 'like', "%{$q}%")
                    ->orWhere('descricao_fiscal', 'like', "%{$q}%")
                    ->orWhere('descricao_comercial', 'like', "%{$q}%")
                    ->orWhere('ncm', 'like', "%{$q}%")
                    ->orWhere('grupo', 'like', "%{$q}%");
            });
        }

        return $query->limit($limit)->get();
    }

    public function create(Empresa $empresa, array $data): Produto
    {
        $familia = strtoupper((string) ($data['familia'] ?? ''));
        if (! in_array($familia, Produto::FAMILIAS, true)) {
            throw ValidationException::withMessages([
                'familia' => ['Família inválida. Use: '.implode(', ', Produto::FAMILIAS)],
            ]);
        }

        $grupo = $this->produtoGrupoService->resolveForFamilia(
            $familia,
            $data['grupo_id'] ?? null,
            $data['grupo'] ?? null,
        );

        return DB::transaction(function () use ($empresa, $data, $familia, $grupo) {
            $payload = $this->normalizeUnidades($this->mapAttributes($data, $grupo, applyDefaults: true));
            $payload = $this->applyLoteFlags($payload, $data, $grupo, applyDefaults: true);
            $this->assertUnidadesConversao($payload);
            $codigo = $data['codigo'] ?? $this->generateCode($empresa->id, $grupo);

            $produto = Produto::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'familia' => $familia,
                'grupo_id' => $grupo->id,
                'grupo' => $grupo->codigo,
                ...$payload,
            ]);

            $this->auditLogger->log('CRIAR', 'produto', $produto->id, null, $produto->toArray());

            return $produto->fresh(Produto::userStampWith());
        });
    }

    public function update(Produto $produto, array $data): Produto
    {
        $before = $produto->loadMissing(Produto::userStampWith())->toArray();
        $familia = strtoupper((string) ($data['familia'] ?? $produto->familia));

        $grupo = null;
        if (array_key_exists('grupo_id', $data) || array_key_exists('grupo', $data)) {
            $grupo = $this->produtoGrupoService->resolveForFamilia(
                $familia,
                $data['grupo_id'] ?? null,
                $data['grupo'] ?? null,
            );
        } elseif (isset($data['familia']) && $produto->grupo_id) {
            // Troca de família exige reescolher grupo compatível.
            $atual = $produto->grupoCatalogo;
            if ($atual && $atual->familia !== $familia) {
                throw ValidationException::withMessages([
                    'grupo_id' => ['Ao alterar a família, selecione um grupo compatível.'],
                ]);
            }
        }

        $payload = $this->mapAttributes($data, $grupo, applyDefaults: false);
        $payload = $this->applyLoteFlags(
            $payload,
            $data,
            $grupo ?? $produto->grupoCatalogo,
            applyDefaults: false,
            atual: $produto
        );

        if ($grupo) {
            $payload['grupo_id'] = $grupo->id;
            $payload['grupo'] = $grupo->codigo;
            $payload['familia'] = $familia;
        } elseif (isset($data['familia'])) {
            $payload['familia'] = $familia;
        }

        // Normaliza só quando o request toca unidades; senão só valida o estado efetivo.
        $touchedUnits = array_key_exists('unidade_comercial', $payload)
            || array_key_exists('unidade_interna', $payload)
            || array_key_exists('fator_conversao', $payload);

        $mergedForUnits = [
            'unidade_comercial' => $payload['unidade_comercial'] ?? $produto->unidade_comercial,
            'unidade_interna' => $payload['unidade_interna'] ?? $produto->unidade_interna,
            'fator_conversao' => array_key_exists('fator_conversao', $payload)
                ? $payload['fator_conversao']
                : $produto->fator_conversao,
        ];
        if ($touchedUnits) {
            $mergedForUnits = $this->normalizeUnidades($mergedForUnits);
            $payload['unidade_comercial'] = $mergedForUnits['unidade_comercial'];
            $payload['unidade_interna'] = $mergedForUnits['unidade_interna'];
            $payload['fator_conversao'] = $mergedForUnits['fator_conversao'];
        }
        $this->assertUnidadesConversao($mergedForUnits);

        if (array_key_exists('atributos', $payload)) {
            if ($payload['atributos'] === null) {
                // null = não tocar no JSON (evita apagar programa_compra / camada_cadastro).
                unset($payload['atributos']);
            } else {
                $payload['atributos'] = ProdutoAtributos::mergeOnUpdate(
                    is_array($produto->atributos) ? $produto->atributos : null,
                    is_array($payload['atributos']) ? $payload['atributos'] : [],
                );
                $payload['atributos'] = PadraoDecimal::canonicalizeProdutoAtributos($payload['atributos']) ?? [];
            }
        }

        $produto->update($payload);
        $this->auditLogger->log('ATUALIZAR', 'produto', $produto->id, $before, $produto->fresh(Produto::userStampWith())->toArray());

        return $produto->fresh(Produto::userStampWith());
    }

    /**
     * Preflight: SKU só pode ser excluído se ainda for “órfão”
     * — sem uso em estoque, compras, ORC, PED, OP, NF-e ou embalagem PA.
     * Catálogo ORC espelho e de-para fornecedor são satélites (purge na exclusão).
     *
     * @return array{pode_excluir: bool, bloqueios: list<string>, mensagem: string}
     */
    public function avaliarExclusao(Produto $produto): array
    {
        $bloqueios = $this->listarBloqueiosExclusao($produto);
        $pode = $bloqueios === [];

        return [
            'pode_excluir' => $pode,
            'bloqueios' => $bloqueios,
            'mensagem' => $pode
                ? 'Produto sem uso operacional. Pode ser excluído (código permanece reservado).'
                : 'Produto em uso. Inative (situação INATIVO) em vez de excluir. Bloqueios: '
                    .implode('; ', $bloqueios).'.',
        ];
    }

    /**
     * Soft-delete de SKU órfão. Recusa se houver vínculo operacional.
     * Código permanece único (inclui soft-deleted) — nunca reutilizar.
     */
    public function softDeleteSeOrfa(Produto $produto): void
    {
        $avaliacao = $this->avaliarExclusao($produto);
        if (! $avaliacao['pode_excluir']) {
            throw ValidationException::withMessages([
                'produto' => [$avaliacao['mensagem']],
            ]);
        }

        DB::transaction(function () use ($produto) {
            $produto->loadMissing([...Produto::userStampWith(), 'fornecedorCodigos']);
            $before = $produto->toArray();
            $produtoId = (int) $produto->id;
            $empresaId = (int) $produto->empresa_id;

            $produto->situacao = 'INATIVO';
            $produto->save();

            $this->purgeSatelitesOrfaos($empresaId, $produtoId);

            $produto->delete();

            $this->auditLogger->log(
                'EXCLUIR',
                'produto',
                $produtoId,
                $before,
                ['soft_deleted' => true, 'codigo' => $produto->codigo, 'situacao' => 'INATIVO']
            );
        });
    }

    /**
     * @return list<string>
     */
    private function listarBloqueiosExclusao(Produto $produto): array
    {
        $bloqueios = [];
        $empresaId = (int) $produto->empresa_id;
        $produtoId = (int) $produto->id;

        foreach (self::BLOQUEIOS_OPERACIONAIS as $item) {
            if (! Schema::hasTable($item['table']) || ! Schema::hasColumn($item['table'], $item['column'])) {
                continue;
            }

            $q = DB::table($item['table'])->where($item['column'], $produtoId);
            if (Schema::hasColumn($item['table'], 'empresa_id')) {
                $q->where('empresa_id', $empresaId);
            }

            $count = (int) $q->count();
            if ($count > 0) {
                $bloqueios[] = "{$count} {$item['label']}";
            }
        }

        $orcRefs = $this->contarRefsEmSnapshotsOrc($empresaId, $produtoId);
        if ($orcRefs > 0) {
            $bloqueios[] = "{$orcRefs} orçamento(s) / item(ns) com este SKU no snapshot";
        }

        return $bloqueios;
    }

    /**
     * Vínculos que impedem exclusão. Catálogo ORC e de-para NÃO entram —
     * são espelho/satélite e saem no purge do órfão.
     *
     * @var list<array{table: string, column: string, label: string}>
     */
    private const BLOQUEIOS_OPERACIONAIS = [
        ['table' => 'estoque_saldos', 'column' => 'produto_id', 'label' => 'saldo(s) de estoque'],
        ['table' => 'estoque_lotes', 'column' => 'produto_id', 'label' => 'lote(s) de estoque'],
        ['table' => 'estoque_movimento_itens', 'column' => 'produto_id', 'label' => 'movimento(s) de estoque'],
        ['table' => 'estoque_ajustes', 'column' => 'produto_id', 'label' => 'ajuste(s) de estoque'],
        ['table' => 'estoque_inventario_itens', 'column' => 'produto_id', 'label' => 'item(ns) de inventário'],
        ['table' => 'estoque_inventario_leituras', 'column' => 'produto_id', 'label' => 'leitura(s) de inventário'],
        ['table' => 'compra_necessidades', 'column' => 'produto_id', 'label' => 'necessidade(s) de compra'],
        ['table' => 'cotacao_itens', 'column' => 'produto_id', 'label' => 'item(ns) de cotação'],
        ['table' => 'ordem_compra_itens', 'column' => 'produto_id', 'label' => 'item(ns) de ordem de compra'],
        ['table' => 'nfe_entrada_itens', 'column' => 'produto_id', 'label' => 'item(ns) de NF-e de entrada'],
        ['table' => 'pedido_itens', 'column' => 'produto_pa_id', 'label' => 'item(ns) de pedido'],
        ['table' => 'ordem_producao_materiais', 'column' => 'produto_id', 'label' => 'material(is) de OP'],
        ['table' => 'pa_embalagens', 'column' => 'caixa_produto_id', 'label' => 'embalagem(ns) PA (caixa)'],
    ];

    /**
     * Chaves de snapshot ORC que referenciam SKU (sem FK).
     *
     * @var list<string>
     */
    private const ORC_SNAPSHOT_PRODUTO_KEYS = [
        'produto_id',
        'papel_produto_id',
        'acabamento_produto_id',
        'tubete_produto_id',
        'caixa_produto_id',
    ];

    private function contarRefsEmSnapshotsOrc(int $empresaId, int $produtoId): int
    {
        $total = 0;
        foreach (['orcamentos', 'orcamento_itens'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'input_snapshot')) {
                continue;
            }
            $total += $this->contarLinhasComProdutoNoJson($table, $empresaId, $produtoId, 'input_snapshot');
            if (Schema::hasColumn($table, 'result_snapshot')) {
                $total += $this->contarLinhasComProdutoNoJson($table, $empresaId, $produtoId, 'result_snapshot');
            }
        }

        return $total;
    }

    private function contarLinhasComProdutoNoJson(
        string $table,
        int $empresaId,
        int $produtoId,
        string $column
    ): int {
        $q = DB::table($table)->where('empresa_id', $empresaId)->where(function ($outer) use ($column, $produtoId) {
            foreach (self::ORC_SNAPSHOT_PRODUTO_KEYS as $key) {
                // Terminadores evitam falso positivo de prefixo (id 12 ≠ 123).
                foreach ([',', '}', ']', ' '] as $term) {
                    $outer->orWhere($column, 'like', '%"'.$key.'":'.$produtoId.$term.'%')
                        ->orWhere($column, 'like', '%"'.$key.'": '.$produtoId.$term.'%');
                }
                // Valor no fim da string JSON (sem trailler).
                $outer->orWhere($column, 'like', '%"'.$key.'":'.$produtoId)
                    ->orWhere($column, 'like', '%"'.$key.'": '.$produtoId);
            }
        });

        return (int) $q->count();
    }

    private function purgeSatelitesOrfaos(int $empresaId, int $produtoId): void
    {
        if (Schema::hasTable('produto_fornecedor_codigos')) {
            DB::table('produto_fornecedor_codigos')
                ->where('empresa_id', $empresaId)
                ->where('produto_id', $produtoId)
                ->delete();
        }

        foreach (['orc_catalogo_papeis', 'orc_catalogo_acabamentos'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'produto_id')) {
                continue;
            }
            DB::table($table)
                ->where('empresa_id', $empresaId)
                ->where('produto_id', $produtoId)
                ->delete();
        }
    }

    private function generateCode(int $empresaId, ProdutoGrupo $grupo): string
    {
        return $this->codigoGenerator->nextCode(
            $empresaId,
            $grupo->codigoPrefixo(),
            $grupo->padDigitos()
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAttributes(array $data, ?ProdutoGrupo $grupo, bool $applyDefaults): array
    {
        $fields = [
            'descricao_fiscal', 'descricao_comercial', 'ncm', 'cest', 'origem',
            'tipo_item_sped', 'unidade_comercial', 'unidade_interna', 'fator_conversao',
            'cfop_saida_padrao', 'cfop_entrada_padrao', 'csosn', 'cst_icms', 'cst_pis',
            'cst_cofins', 'cst_cbs', 'cclass_trib', 'aliquota_cbs', 'preco_tabela',
            'custo_medio', 'estoque_minimo', 'lead_time_dias',
            'controla_lote', 'controla_validade', 'prazo_validade_dias',
            'gtin', 'situacao', 'atributos',
        ];

        $mapped = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $mapped[$field] = $data[$field];
            }
        }

        if ($applyDefaults && $grupo) {
            $defaults = [
                'tipo_item_sped' => $grupo->tipo_item_sped,
                'ncm' => $grupo->ncm_padrao,
                'unidade_comercial' => $grupo->unidade_comercial_padrao,
                'unidade_interna' => $grupo->unidade_interna_padrao,
                'cfop_entrada_padrao' => $grupo->cfop_entrada_padrao,
                'cfop_saida_padrao' => $grupo->cfop_saida_padrao,
            ];

            foreach ($defaults as $field => $value) {
                if ($value === null || $value === '') {
                    continue;
                }
                $current = $mapped[$field] ?? null;
                if ($current === null || $current === '') {
                    $mapped[$field] = $value;
                }
            }

            if (! array_key_exists('atributos', $mapped) || $mapped['atributos'] === null) {
                $mapped['atributos'] = [];
            }

            if (is_array($mapped['atributos']) && $grupo->grupo_estoque_padrao) {
                $mapped['atributos'] = array_merge([
                    'grupo_estoque' => $grupo->grupo_estoque_padrao,
                ], $mapped['atributos']);
            }
        }

        if (array_key_exists('descricao_fiscal', $mapped) && is_string($mapped['descricao_fiscal'])) {
            $mapped['descricao_fiscal'] = ProdutoDescricoes::fiscal($mapped['descricao_fiscal']);
        }
        if (array_key_exists('descricao_comercial', $mapped)) {
            $mapped['descricao_comercial'] = is_string($mapped['descricao_comercial'])
                ? ProdutoDescricoes::maiusculas($mapped['descricao_comercial'])
                : null;
        }

        $mapped = PadraoDecimal::canonicalizeFields($mapped, PadraoDecimal::produtoFieldScales());

        if (array_key_exists('atributos', $mapped) && is_array($mapped['atributos'])) {
            $mapped['atributos'] = PadraoDecimal::canonicalizeProdutoAtributos($mapped['atributos']);
        }

        return $mapped;
    }

    /**
     * ADR-039-UNID-001: interna vazia → comercial; iguais → fator 1 se ausente.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeUnidades(array $data): array
    {
        $uCom = isset($data['unidade_comercial']) ? strtoupper(trim((string) $data['unidade_comercial'])) : '';
        $uInt = isset($data['unidade_interna']) ? strtoupper(trim((string) $data['unidade_interna'])) : '';

        if ($uCom !== '') {
            $data['unidade_comercial'] = $uCom;
        }
        if ($uInt !== '') {
            $data['unidade_interna'] = $uInt;
        }

        if ($uCom !== '' && $uInt === '') {
            $data['unidade_interna'] = $uCom;
            $uInt = $uCom;
        }

        if ($uCom !== '' && $uInt !== '' && $uCom === $uInt) {
            $fator = $data['fator_conversao'] ?? null;
            if ($fator === null || $fator === '') {
                $data['fator_conversao'] = '1';
            }
        }

        return $data;
    }

    /**
     * Domínio 32: unidade comercial ≠ interna exige fator_conversao > 0.
     *
     * @param  array<string, mixed>  $data
     */
    private function assertUnidadesConversao(array $data): void
    {
        $uCom = isset($data['unidade_comercial']) ? strtoupper(trim((string) $data['unidade_comercial'])) : '';
        $uInt = isset($data['unidade_interna']) ? strtoupper(trim((string) $data['unidade_interna'])) : '';

        if ($uCom === '' || $uInt === '' || $uCom === $uInt) {
            return;
        }

        $fator = $data['fator_conversao'] ?? null;
        if ($fator === null || $fator === '') {
            throw ValidationException::withMessages([
                'fator_conversao' => [
                    'fator_conversao é obrigatório e deve ser > 0 quando unidade_comercial ≠ unidade_interna.',
                ],
            ]);
        }

        if (! is_numeric($fator) || (float) $fator <= 0) {
            throw ValidationException::withMessages([
                'fator_conversao' => [
                    'fator_conversao é obrigatório e deve ser > 0 quando unidade_comercial ≠ unidade_interna.',
                ],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function applyLoteFlags(
        array $payload,
        array $data,
        ?ProdutoGrupo $grupo,
        bool $applyDefaults,
        ?Produto $atual = null
    ): array {
        $touched = array_key_exists('controla_lote', $data)
            || array_key_exists('controla_validade', $data)
            || array_key_exists('prazo_validade_dias', $data);

        if ($applyDefaults && ! $touched && $grupo) {
            $pol = ProdutoLotePolitica::paraGrupo($grupo->codigo);
            $payload['controla_lote'] = $pol['controla_lote'];
            $payload['controla_validade'] = $pol['controla_validade'];
            $payload['prazo_validade_dias'] = $pol['prazo_validade_dias'];

            return $payload;
        }

        if (! $touched && ! $applyDefaults) {
            return $payload;
        }

        $base = [
            'controla_lote' => $payload['controla_lote'] ?? $atual?->controla_lote ?? false,
            'controla_validade' => $payload['controla_validade'] ?? $atual?->controla_validade ?? false,
            'prazo_validade_dias' => array_key_exists('prazo_validade_dias', $payload)
                ? $payload['prazo_validade_dias']
                : $atual?->prazo_validade_dias,
        ];
        $norm = ProdutoLotePolitica::normalizar($base);
        $payload['controla_lote'] = $norm['controla_lote'];
        $payload['controla_validade'] = $norm['controla_validade'];
        $payload['prazo_validade_dias'] = $norm['prazo_validade_dias'];

        return $payload;
    }
}
