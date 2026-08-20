<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CotacaoItem extends Model
{
    protected $table = 'cotacao_itens';

    protected $fillable = [
        'cotacao_id',
        'produto_id',
        'qtde',
        'unidade',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'qtde' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'ordem' => 'integer',
        ];
    }

    public function cotacao(): BelongsTo
    {
        return $this->belongsTo(Cotacao::class, 'cotacao_id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function propostas(): HasMany
    {
        return $this->hasMany(CotacaoProposta::class, 'cotacao_item_id');
    }
}
