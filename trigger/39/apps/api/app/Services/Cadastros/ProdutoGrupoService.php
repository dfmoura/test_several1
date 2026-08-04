<?php

namespace App\Services\Cadastros;

use App\Models\Produto;
use App\Models\ProdutoGrupo;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ProdutoGrupoService
{
    public function seedCatalog(): int
    {
        $count = 0;

        foreach (ProdutoGrupoCatalogData::grupos() as $row) {
            ProdutoGrupo::query()->updateOrCreate(
                ['codigo' => $row['codigo']],
                [
                    'nome' => $row['nome'],
                    'familia' => $row['familia'],
                    'natureza' => $row['natureza'],
                    'tipo_item_sped' => $row['tipo_item_sped'],
                    'grupo_estoque_padrao' => $row['grupo_estoque_padrao'],
                    'grupos_estoque' => $row['grupos_estoque'],
                    'ncm_padrao' => $row['ncm_padrao'],
                    'unidade_comercial_padrao' => $row['unidade_comercial_padrao'],
                    'unidade_interna_padrao' => $row['unidade_interna_padrao'],
                    'cfop_entrada_padrao' => $row['cfop_entrada_padrao'],
                    'cfop_saida_padrao' => $row['cfop_saida_padrao'],
                    'exige_dimensao_sku' => $row['exige_dimensao_sku'],
                    'ncm_confirmado' => $row['ncm_confirmado'],
                    'ordenacao' => $row['ordenacao'],
                    'situacao' => 'ATIVO',
                    'observacao' => $row['observacao'],
                ]
            );
            $count++;
        }

        return $count;
    }

    /**
     * Resolve produto.grupo_id a partir do prefixo do código ou do campo grupo legado.
     */
    public function backfillProdutos(): int
    {
        $grupos = ProdutoGrupo::query()->get()->keyBy('codigo');
        $updated = 0;

        Produto::query()
            ->whereNull('grupo_id')
            ->orderBy('id')
            ->each(function (Produto $produto) use ($grupos, &$updated) {
                $codigoGrupo = $this->inferGrupoCodigo($produto);
                if (! $codigoGrupo || ! $grupos->has($codigoGrupo)) {
                    return;
                }

                $grupo = $grupos->get($codigoGrupo);
                $produto->forceFill([
                    'grupo_id' => $grupo->id,
                    'grupo' => $grupo->codigo,
                ])->saveQuietly();
                $updated++;
            });

        return $updated;
    }

    public function list(?string $familia = null, ?string $natureza = null, bool $somenteAtivos = true): Collection
    {
        $query = ProdutoGrupo::query()->orderBy('ordenacao')->orderBy('codigo');

        if ($somenteAtivos) {
            $query->where('situacao', 'ATIVO');
        }

        if ($familia) {
            $query->where('familia', strtoupper($familia));
        }

        if ($natureza) {
            $nat = strtoupper($natureza);
            $query->where(function ($builder) use ($nat) {
                $builder->where('natureza', $nat)->orWhere('natureza', 'AMBOS');
            });
        }

        return $query->get();
    }

    public function resolveForFamilia(string $familia, int|string|null $grupoId = null, ?string $grupoCodigo = null): ProdutoGrupo
    {
        $familia = strtoupper($familia);

        if ($grupoId) {
            $grupo = ProdutoGrupo::query()->find($grupoId);
            if (! $grupo || ! $grupo->isAtivo()) {
                throw ValidationException::withMessages([
                    'grupo_id' => ['Grupo de produto inválido ou inativo.'],
                ]);
            }
            if ($grupo->familia !== $familia) {
                throw ValidationException::withMessages([
                    'grupo_id' => ["O grupo {$grupo->codigo} pertence à família {$grupo->familia}, não a {$familia}."],
                ]);
            }

            return $grupo;
        }

        if ($grupoCodigo) {
            $grupo = ProdutoGrupo::query()
                ->where('codigo', strtoupper($grupoCodigo))
                ->where('situacao', 'ATIVO')
                ->first();

            if (! $grupo) {
                throw ValidationException::withMessages([
                    'grupo' => ['Grupo de produto não encontrado no catálogo canônico.'],
                ]);
            }
            if ($grupo->familia !== $familia) {
                throw ValidationException::withMessages([
                    'grupo' => ["O grupo {$grupo->codigo} pertence à família {$grupo->familia}, não a {$familia}."],
                ]);
            }

            return $grupo;
        }

        throw ValidationException::withMessages([
            'grupo_id' => ['Selecione o grupo canônico do produto (ex.: MP-PAP, PA-ETQ, REV-RIB).'],
        ]);
    }

    public function defaultGrupoForFamilia(string $familia): ?ProdutoGrupo
    {
        $defaults = [
            'MP' => 'MP-PAP',
            'EMB' => 'EMB-TUB',
            'REV' => 'REV-RIB',
            'PA' => 'PA-ETQ',
            'SVC' => 'SVC',
            'FAC' => 'FAC',
        ];

        $codigo = $defaults[strtoupper($familia)] ?? null;
        if (! $codigo) {
            return null;
        }

        return ProdutoGrupo::query()->where('codigo', $codigo)->where('situacao', 'ATIVO')->first();
    }

    private function inferGrupoCodigo(Produto $produto): ?string
    {
        if ($produto->grupo && ProdutoGrupo::query()->where('codigo', strtoupper($produto->grupo))->exists()) {
            return strtoupper($produto->grupo);
        }

        $codigo = strtoupper((string) $produto->codigo);

        // FAC-0001, SVC-001
        if (preg_match('/^(FAC|SVC)(?:-|$)/', $codigo, $m)) {
            return $m[1];
        }

        // MP-PAP-001, PA-ETQ-001, EMB-TUB-001, REV-RIB-001, PA-BOB-001
        if (preg_match('/^([A-Z]+-[A-Z]+)/', $codigo, $m)) {
            return $m[1];
        }

        return $this->defaultGrupoForFamilia((string) $produto->familia)?->codigo;
    }
}
