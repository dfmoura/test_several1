<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompraNecessidade extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const PRIORIDADE_NORMAL = 'NORMAL';

    public const PRIORIDADE_URGENTE = 'URGENTE';

    public const PRIORIDADES = [
        self::PRIORIDADE_NORMAL,
        self::PRIORIDADE_URGENTE,
    ];

    public const STATUS_ABERTA = 'ABERTA';

    public const STATUS_ATENDIDA = 'ATENDIDA';

    public const STATUS_CANCELADA = 'CANCELADA';

    public const STATUSES = [
        self::STATUS_ABERTA,
        self::STATUS_ATENDIDA,
        self::STATUS_CANCELADA,
    ];

    protected $table = 'compra_necessidades';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'produto_id',
        'qtde',
        'unidade',
        'necessario_em',
        'motivo',
        'prioridade',
        'status',
        'solicitante_user_id',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'qtde' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'necessario_em' => 'date',
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

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitante_user_id');
    }

    public function cotacoes(): HasMany
    {
        return $this->hasMany(Cotacao::class, 'necessidade_id');
    }

    public function ordensCompra(): HasMany
    {
        return $this->hasMany(OrdemCompra::class, 'necessidade_id');
    }
}
