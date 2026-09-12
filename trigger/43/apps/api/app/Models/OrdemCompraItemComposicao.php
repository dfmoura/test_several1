<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Faixa do pedido ao fornecedor (largura × bobinas × comprimento → m²).
 * Norma: ADR_OC_RASCUNHO_ENVIO · ADR_CADASTRO_INSUMO_VOLUME.
 */
class OrdemCompraItemComposicao extends Model
{
    protected $table = 'ordem_compra_item_composicoes';

    protected $fillable = [
        'ordem_compra_item_id',
        'ordem',
        'largura_mm',
        'quantidade',
        'comprimento_m',
        'area_m2',
    ];

    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
            'largura_mm' => 'decimal:'.PadraoDecimal::SCALE_DIM,
            'quantidade' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'comprimento_m' => 'decimal:'.PadraoDecimal::SCALE_DIM,
            'area_m2' => 'decimal:'.PadraoDecimal::SCALE_QTY,
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(OrdemCompraItem::class, 'ordem_compra_item_id');
    }
}
