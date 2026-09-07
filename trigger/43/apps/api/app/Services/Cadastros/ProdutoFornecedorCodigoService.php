<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\ProdutoFornecedorCodigo;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

/**
 * De-para cProd ↔ SKU — ADR_CADASTRO_INSUMO_VOLUME / ADR_ENTRADA_XML_ASSIST.
 */
class ProdutoFornecedorCodigoService
{
    /**
     * @return Collection<int, ProdutoFornecedorCodigo>
     */
    public function listForProduto(Produto $produto): Collection
    {
        return ProdutoFornecedorCodigo::query()
            ->where('empresa_id', $produto->empresa_id)
            ->where('produto_id', $produto->id)
            ->with(['fornecedor:id,codigo,razao_social,nome_fantasia,cnpj_cpf'])
            ->orderBy('c_prod')
            ->get();
    }

    /**
     * @param  array{fornecedor_id: int|string, c_prod: string, x_prod?: ?string}  $data
     */
    public function create(Produto $produto, array $data): ProdutoFornecedorCodigo
    {
        $fornecedor = $this->assertFornecedor($produto->empresa_id, (int) $data['fornecedor_id']);
        $cProd = $this->normalizeCProd((string) $data['c_prod']);
        $xProd = $this->normalizeXProd($data['x_prod'] ?? null);

        $this->assertCProdLivre($produto->empresa_id, $fornecedor->id, $cProd);

        $row = ProdutoFornecedorCodigo::query()->create([
            'empresa_id' => $produto->empresa_id,
            'fornecedor_id' => $fornecedor->id,
            'produto_id' => $produto->id,
            'c_prod' => $cProd,
            'x_prod' => $xProd,
        ]);

        return $row->load(['fornecedor:id,codigo,razao_social,nome_fantasia,cnpj_cpf']);
    }

    /**
     * @param  array{fornecedor_id?: int|string, c_prod?: string, x_prod?: ?string}  $data
     */
    public function update(ProdutoFornecedorCodigo $row, array $data): ProdutoFornecedorCodigo
    {
        $fornecedorId = array_key_exists('fornecedor_id', $data)
            ? (int) $data['fornecedor_id']
            : (int) $row->fornecedor_id;
        $fornecedor = $this->assertFornecedor($row->empresa_id, $fornecedorId);

        $cProd = array_key_exists('c_prod', $data)
            ? $this->normalizeCProd((string) $data['c_prod'])
            : (string) $row->c_prod;

        $xProd = array_key_exists('x_prod', $data)
            ? $this->normalizeXProd($data['x_prod'])
            : $row->x_prod;

        $this->assertCProdLivre($row->empresa_id, $fornecedor->id, $cProd, $row->id);

        $row->update([
            'fornecedor_id' => $fornecedor->id,
            'c_prod' => $cProd,
            'x_prod' => $xProd,
        ]);

        return $row->fresh(['fornecedor:id,codigo,razao_social,nome_fantasia,cnpj_cpf']);
    }

    public function delete(ProdutoFornecedorCodigo $row): void
    {
        $row->delete();
    }

    /**
     * Grava hints canônicos quando CNPJ do fornecedor e SKU existem na EMP.
     */
    public function seedCatalogHints(Empresa $empresa): int
    {
        $gravados = 0;

        foreach (ProdutoFornecedorDeParaCatalogData::maps() as $map) {
            $cnpj = preg_replace('/\D/', '', $map['cnpj']) ?? '';
            $fornecedor = Parceiro::query()
                ->where('empresa_id', $empresa->id)
                ->where('papel_fornecedor', true)
                ->get()
                ->first(function (Parceiro $p) use ($cnpj) {
                    return preg_replace('/\D/', '', (string) $p->cnpj_cpf) === $cnpj;
                });

            if (! $fornecedor) {
                continue;
            }

            $produto = Produto::query()
                ->where('empresa_id', $empresa->id)
                ->where('codigo', $map['produto_codigo'])
                ->first();

            if (! $produto) {
                continue;
            }

            $row = ProdutoFornecedorCodigo::query()->updateOrCreate(
                [
                    'empresa_id' => $empresa->id,
                    'fornecedor_id' => $fornecedor->id,
                    'c_prod' => $map['c_prod'],
                ],
                [
                    'produto_id' => $produto->id,
                    'x_prod' => $map['x_prod'],
                ]
            );

            if ($row->wasRecentlyCreated || $row->wasChanged()) {
                $gravados++;
            }
        }

        return $gravados;
    }

    private function assertFornecedor(int $empresaId, int $fornecedorId): Parceiro
    {
        $fornecedor = Parceiro::query()
            ->where('empresa_id', $empresaId)
            ->where('papel_fornecedor', true)
            ->whereKey($fornecedorId)
            ->first();

        if (! $fornecedor) {
            throw ValidationException::withMessages([
                'fornecedor_id' => ['Selecione um fornecedor da empresa ativa.'],
            ]);
        }

        return $fornecedor;
    }

    private function normalizeCProd(string $cProd): string
    {
        $cProd = trim($cProd);
        if ($cProd === '') {
            throw ValidationException::withMessages([
                'c_prod' => ['Informe o código do produto no fornecedor (cProd da NF-e).'],
            ]);
        }
        if (mb_strlen($cProd) > 60) {
            throw ValidationException::withMessages([
                'c_prod' => ['cProd deve ter no máximo 60 caracteres.'],
            ]);
        }

        return $cProd;
    }

    private function normalizeXProd(mixed $xProd): ?string
    {
        if ($xProd === null) {
            return null;
        }
        $text = trim((string) $xProd);
        if ($text === '') {
            return null;
        }
        if (mb_strlen($text) > 240) {
            throw ValidationException::withMessages([
                'x_prod' => ['Descrição do fornecedor deve ter no máximo 240 caracteres.'],
            ]);
        }

        return $text;
    }

    private function assertCProdLivre(int $empresaId, int $fornecedorId, string $cProd, ?int $ignoreId = null): void
    {
        $q = ProdutoFornecedorCodigo::query()
            ->where('empresa_id', $empresaId)
            ->where('fornecedor_id', $fornecedorId)
            ->where('c_prod', $cProd);

        if ($ignoreId !== null) {
            $q->where('id', '!=', $ignoreId);
        }

        if ($q->exists()) {
            throw ValidationException::withMessages([
                'c_prod' => ['Este cProd já está vinculado a outro SKU neste fornecedor.'],
            ]);
        }
    }
}
