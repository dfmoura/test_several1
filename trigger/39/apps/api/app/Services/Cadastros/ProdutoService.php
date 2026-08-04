<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProdutoService
{
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
        int $limit = 50
    ) {
        $query = Produto::query()
            ->where('empresa_id', $empresa->id)
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
            $payload = $this->mapAttributes($data, $grupo, applyDefaults: true);
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

            return $produto->fresh();
        });
    }

    public function update(Produto $produto, array $data): Produto
    {
        $before = $produto->toArray();
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

        if ($grupo) {
            $payload['grupo_id'] = $grupo->id;
            $payload['grupo'] = $grupo->codigo;
            $payload['familia'] = $familia;
        } elseif (isset($data['familia'])) {
            $payload['familia'] = $familia;
        }

        $produto->update($payload);
        $this->auditLogger->log('ATUALIZAR', 'produto', $produto->id, $before, $produto->fresh()->toArray());

        return $produto->fresh();
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
            'cst_cofins', 'preco_tabela', 'custo_medio', 'estoque_minimo', 'lead_time_dias',
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

        $mapped = PadraoDecimal::canonicalizeFields($mapped, PadraoDecimal::produtoFieldScales());

        if (array_key_exists('atributos', $mapped) && is_array($mapped['atributos'])) {
            $mapped['atributos'] = PadraoDecimal::canonicalizeProdutoAtributos($mapped['atributos']);
        }

        return $mapped;
    }
}
