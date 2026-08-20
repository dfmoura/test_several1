<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrdemServico extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    protected $table = 'ordens_servico';

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
        'qtde_executada',
        'fora_tolerancia',
        'motivo_fora_tolerancia',
        'iniciada_em',
        'concluida_em',
        'concluida_por',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'qtde_planejada' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_executada' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'fora_tolerancia' => 'boolean',
            'iniciada_em' => 'datetime',
            'concluida_em' => 'datetime',
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

    public function concluidaPorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'concluida_por');
    }
}
