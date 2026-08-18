<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comissao extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const STATUS_PREVISTA = 'PREVISTA';

    public const STATUS_LIBERADA = 'LIBERADA';

    public const STATUS_PAGA = 'PAGA';

    public const STATUS_ESTORNADA = 'ESTORNADA';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_PREVISTA,
        self::STATUS_LIBERADA,
        self::STATUS_PAGA,
        self::STATUS_ESTORNADA,
    ];

    public const ORIGEM_BAIXA = 'BAIXA';

    public const ORIGEM_APROPRIACAO_SINAL = 'APROPRIACAO_SINAL';

    /** @var list<string> */
    public const ORIGENS = [
        self::ORIGEM_BAIXA,
        self::ORIGEM_APROPRIACAO_SINAL,
    ];

    protected $table = 'comissoes';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'idempotency_key',
        'vendedor_parceiro_id',
        'orcamento_id',
        'pedido_id',
        'faturamento_id',
        'titulo_id',
        'baixa_id',
        'fechamento_id',
        'titulo_pagar_id',
        'origem_evento',
        'status',
        'aliquota',
        'base_valor',
        'valor',
        'observacao',
        'estornada_em',
        'estornada_por',
    ];

    protected function casts(): array
    {
        return [
            'aliquota' => 'decimal:'.PadraoDecimal::SCALE_PERCENT,
            'base_valor' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'valor' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'estornada_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'vendedor_parceiro_id');
    }

    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function faturamento(): BelongsTo
    {
        return $this->belongsTo(Faturamento::class);
    }

    public function titulo(): BelongsTo
    {
        return $this->belongsTo(Titulo::class, 'titulo_id');
    }

    public function baixa(): BelongsTo
    {
        return $this->belongsTo(TituloBaixa::class, 'baixa_id');
    }

    public function fechamento(): BelongsTo
    {
        return $this->belongsTo(ComissaoFechamento::class, 'fechamento_id');
    }

    public function tituloPagar(): BelongsTo
    {
        return $this->belongsTo(Titulo::class, 'titulo_pagar_id');
    }
}
