<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstoqueSaldo extends Model
{
    protected $table = 'estoque_saldos';

    protected $fillable = [
        'empresa_id',
        'produto_id',
        'qtde',
        'unidade',
        'custo_medio',
    ];

    protected function casts(): array
    {
        return [
            'qtde' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'custo_medio' => 'decimal:'.PadraoDecimal::SCALE_UNIT_PRICE,
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }
}
