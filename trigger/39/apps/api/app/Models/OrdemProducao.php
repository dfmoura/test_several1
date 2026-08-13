<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrdemProducao extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    protected $table = 'ordens_producao';

    public const STATUS_ABERTA = 'ABERTA';

    public const STATUS_EM_ANDAMENTO = 'EM_ANDAMENTO';

    public const STATUS_CONCLUIDA = 'CONCLUIDA';

    public const STATUS_CANCELADA = 'CANCELADA';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_ABERTA,
        self::STATUS_EM_ANDAMENTO,
        self::STATUS_CONCLUIDA,
        self::STATUS_CANCELADA,
    ];

    /** @var list<string> */
    public const STATUSES_ABERTOS = [
        self::STATUS_ABERTA,
        self::STATUS_EM_ANDAMENTO,
    ];

    protected $fillable = [
        'empresa_id',
        'codigo',
        'pedido_id',
        'pedido_item_id',
        'status',
        'qtde_planejada',
        'qtde_boa',
        'qtde_refugo',
        'fora_tolerancia',
        'motivo_fora_tolerancia',
        'custo_materiais',
        'pa_movimento_id',
        'iniciada_em',
        'concluida_em',
        'concluida_por',
        'observacao',
        'motivo_cancelamento',
        'cancelada_em',
        'cancelada_por',
    ];

    protected function casts(): array
    {
        return [
            'qtde_planejada' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_boa' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_refugo' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'fora_tolerancia' => 'boolean',
            'custo_materiais' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'iniciada_em' => 'datetime',
            'concluida_em' => 'datetime',
            'cancelada_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function pedidoItem(): BelongsTo
    {
        return $this->belongsTo(PedidoItem::class, 'pedido_item_id');
    }

    public function materiais(): HasMany
    {
        return $this->hasMany(OrdemProducaoMaterial::class, 'ordem_producao_id')->orderBy('ordem');
    }

    public function paMovimento(): BelongsTo
    {
        return $this->belongsTo(EstoqueMovimento::class, 'pa_movimento_id');
    }

    public function concluidaPorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'concluida_por');
    }

    public function canceladaPorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelada_por');
    }
}
