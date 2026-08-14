<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pedido extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const STATUS_LIBERADO = 'LIBERADO';

    public const STATUS_EM_PRODUCAO = 'EM_PRODUCAO';

    public const STATUS_PRODUZIDO = 'PRODUZIDO';

    public const STATUS_FATURADO = 'FATURADO';

    public const STATUS_CANCELADO = 'CANCELADO';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_LIBERADO,
        self::STATUS_EM_PRODUCAO,
        self::STATUS_PRODUZIDO,
        self::STATUS_FATURADO,
        self::STATUS_CANCELADO,
    ];

    /** @var list<string> */
    public const STATUSES_ABRE_ORDEM = [
        self::STATUS_LIBERADO,
        self::STATUS_EM_PRODUCAO,
    ];

    protected $fillable = [
        'empresa_id',
        'codigo',
        'orcamento_id',
        'parceiro_id',
        'status',
        'faixa_index',
        'tolerancia_qtd_pct',
        'prazo_entrega_dias',
        'snapshot',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'faixa_index' => 'integer',
            'tolerancia_qtd_pct' => 'decimal:'.PadraoDecimal::SCALE_PERCENT,
            'prazo_entrega_dias' => 'integer',
            'snapshot' => 'array',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(PedidoItem::class)->orderBy('ordem');
    }

    public function ordensProducao(): HasMany
    {
        return $this->hasMany(OrdemProducao::class);
    }

    public function ordensServico(): HasMany
    {
        return $this->hasMany(OrdemServico::class);
    }

    public function faturamentos(): HasMany
    {
        return $this->hasMany(Faturamento::class);
    }

    public function faturamento(): HasOne
    {
        return $this->hasOne(Faturamento::class)->where('status', Faturamento::STATUS_CONFIRMADO);
    }
}
