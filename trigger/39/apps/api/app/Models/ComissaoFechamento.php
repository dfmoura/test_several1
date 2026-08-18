<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ComissaoFechamento extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const STATUS_ABERTO = 'ABERTO';

    public const STATUS_TITULO_GERADO = 'TITULO_GERADO';

    public const STATUS_PAGO = 'PAGO';

    public const STATUS_CANCELADO = 'CANCELADO';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_ABERTO,
        self::STATUS_TITULO_GERADO,
        self::STATUS_PAGO,
        self::STATUS_CANCELADO,
    ];

    protected $table = 'comissao_fechamentos';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'status',
        'periodo_inicio',
        'periodo_fim',
        'vencimento',
        'valor_total',
        'observacao',
        'liberado_em',
        'liberado_por',
        'cancelado_em',
        'cancelado_por',
        'motivo_cancelamento',
    ];

    protected function casts(): array
    {
        return [
            'periodo_inicio' => 'date',
            'periodo_fim' => 'date',
            'vencimento' => 'date',
            'valor_total' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'liberado_em' => 'datetime',
            'cancelado_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function comissoes(): HasMany
    {
        return $this->hasMany(Comissao::class, 'fechamento_id');
    }
}
