<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TituloBaixa extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    protected $table = 'titulo_baixas';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'titulo_id',
        'conta_financeira_id',
        'valor',
        'pago_em',
        'forma',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'pago_em' => 'date',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function titulo(): BelongsTo
    {
        return $this->belongsTo(Titulo::class, 'titulo_id');
    }

    public function contaFinanceira(): BelongsTo
    {
        return $this->belongsTo(EmpresaContaFinanceira::class, 'conta_financeira_id');
    }
}
