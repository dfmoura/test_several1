<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstoqueMovimentoItem extends Model
{
    protected $table = 'estoque_movimento_itens';

    protected $fillable = [
        'movimento_id',
        'ordem_compra_item_id',
        'produto_id',
        'lote_id',
        'qtde',
        'unidade',
        'valor_unitario',
        'valor_total',
        'custo_medio_apos',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'qtde' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'valor_unitario' => 'decimal:'.PadraoDecimal::SCALE_UNIT_PRICE,
            'valor_total' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'custo_medio_apos' => 'decimal:'.PadraoDecimal::SCALE_UNIT_PRICE,
            'ordem' => 'integer',
        ];
    }

    public function movimento(): BelongsTo
    {
        return $this->belongsTo(EstoqueMovimento::class, 'movimento_id');
    }

    public function ordemCompraItem(): BelongsTo
    {
        return $this->belongsTo(OrdemCompraItem::class, 'ordem_compra_item_id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(EstoqueLote::class, 'lote_id');
    }
}
