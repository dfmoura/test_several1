<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CotacaoProposta extends Model
{
    protected $table = 'cotacao_propostas';

    protected $fillable = [
        'cotacao_id',
        'cotacao_item_id',
        'fornecedor_id',
        'valor_unitario',
        'frete',
        'prazo_dias',
        'validade',
        'condicao_pagamento',
        'vencedora',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'valor_unitario' => 'decimal:'.PadraoDecimal::SCALE_UNIT_PRICE,
            'frete' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'prazo_dias' => 'integer',
            'validade' => 'date',
            'vencedora' => 'boolean',
        ];
    }

    public function cotacao(): BelongsTo
    {
        return $this->belongsTo(Cotacao::class, 'cotacao_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(CotacaoItem::class, 'cotacao_item_id');
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'fornecedor_id');
    }
}
