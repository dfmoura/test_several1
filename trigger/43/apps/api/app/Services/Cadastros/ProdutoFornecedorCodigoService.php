<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\ProdutoFornecedorCodigo;

/**
 * De-para cProd ↔ SKU — ADR_CADASTRO_INSUMO_VOLUME / ADR_ENTRADA_XML_ASSIST.
 */
class ProdutoFornecedorCodigoService
{
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
}
