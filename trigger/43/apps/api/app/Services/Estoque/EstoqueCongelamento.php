<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueInventario;
use App\Models\EstoqueInventarioItem;
use Illuminate\Validation\ValidationException;

/**
 * Congelamento leve de SKU durante inventário (BL-042).
 */
class EstoqueCongelamento
{
    public function assertProdutoLivre(Empresa $empresa, int $produtoId, string $contexto = 'operação'): void
    {
        $item = EstoqueInventarioItem::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produtoId)
            ->whereIn('status', EstoqueInventarioItem::STATUSES_CONGELADOS)
            ->whereHas('inventario', function ($q) {
                $q->whereNotIn('status', [
                    EstoqueInventario::STATUS_ENCERRADO,
                    EstoqueInventario::STATUS_CANCELADO,
                ]);
            })
            ->with('inventario:id,codigo,status')
            ->first();

        if (! $item) {
            return;
        }

        $codigo = $item->inventario?->codigo ?? 'INV';
        throw ValidationException::withMessages([
            'produto_id' => [
                "Produto em inventário {$codigo} (contagem em andamento). Conclua o inventário antes desta {$contexto}.",
            ],
        ]);
    }

    /**
     * @param  list<int>  $produtoIds
     */
    public function assertProdutosLivres(Empresa $empresa, array $produtoIds, string $contexto = 'operação'): void
    {
        foreach (array_unique($produtoIds) as $id) {
            $this->assertProdutoLivre($empresa, (int) $id, $contexto);
        }
    }
}
