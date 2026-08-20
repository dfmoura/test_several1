<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrdemCompraItem extends Model
{
    protected $table = 'ordem_compra_itens';

    protected $fillable = [
        'ordem_compra_id',
        'produto_id',
        'qtde_pedida',
        'qtde_recebida',
        'unidade',
        'valor_unitario',
        'valor_total',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'qtde_pedida' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_recebida' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'valor_unitario' => 'decimal:'.PadraoDecimal::SCALE_UNIT_PRICE,
            'valor_total' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'ordem' => 'integer',
        ];
    }

    public function ordemCompra(): BelongsTo
    {
        return $this->belongsTo(OrdemCompra::class, 'ordem_compra_id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function movimentoItens(): HasMany
    {
        return $this->hasMany(EstoqueMovimentoItem::class, 'ordem_compra_item_id');
    }
}
