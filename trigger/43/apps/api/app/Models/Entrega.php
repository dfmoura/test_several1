<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Entrega extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const MODO_RETIRAR = 'RETIRAR';

    public const MODO_ENTREGAR = 'ENTREGAR';

    public const TIPO_BALCAO = 'BALCAO';

    public const TIPO_FROTA = 'FROTA';

    public const TIPO_TRANSPORTADORA = 'TRANSPORTADORA';

    public const TIPO_OUTRO = 'OUTRO';

    public const STATUS_AGUARDA_RETIRADA = 'AGUARDA_RETIRADA';

    public const STATUS_EM_TRANSITO = 'EM_TRANSITO';

    public const STATUS_ENTREGUE = 'ENTREGUE';

    public const STATUS_RECUSADA = 'RECUSADA';

    public const STATUS_CANCELADA = 'CANCELADA';

    public const PROVA_ASSINATURA_BALCAO = 'ASSINATURA_BALCAO';

    public const PROVA_CANHOTO = 'CANHOTO';

    public const PROVA_RASTREIO = 'RASTREIO';

    public const PROVA_OUTRO = 'OUTRO';

    /** @var list<string> */
    public const MODOS = [self::MODO_RETIRAR, self::MODO_ENTREGAR];

    /** @var list<string> */
    public const TIPOS_SAIDA = [
        self::TIPO_BALCAO,
        self::TIPO_FROTA,
        self::TIPO_TRANSPORTADORA,
        self::TIPO_OUTRO,
    ];

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_AGUARDA_RETIRADA,
        self::STATUS_EM_TRANSITO,
        self::STATUS_ENTREGUE,
        self::STATUS_RECUSADA,
        self::STATUS_CANCELADA,
    ];

    /** @var list<string> */
    public const STATUSES_VIGENTES = [
        self::STATUS_AGUARDA_RETIRADA,
        self::STATUS_EM_TRANSITO,
    ];

    /** @var list<string> */
    public const PROVAS = [
        self::PROVA_ASSINATURA_BALCAO,
        self::PROVA_CANHOTO,
        self::PROVA_RASTREIO,
        self::PROVA_OUTRO,
    ];

    protected $table = 'entregas';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'pedido_id',
        'faturamento_id',
        'parceiro_id',
        'modo',
        'tipo_saida',
        'status',
        'volumes',
        'peso_kg',
        'qtde',
        'unidade',
        'transportadora_id',
        'rastreio',
        'destino_snapshot',
        'observacao',
        'prova_tipo',
        'prova_nome',
        'prova_documento',
        'prova_obs',
        'expedido_em',
        'expedido_por',
        'confirmado_em',
        'confirmado_por',
        'recusado_em',
        'recusado_por',
        'motivo_recusa',
        'cancelado_em',
        'cancelado_por',
        'motivo_cancelamento',
    ];

    protected function casts(): array
    {
        return [
            'volumes' => 'integer',
            'peso_kg' => 'decimal:3',
            'qtde' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'destino_snapshot' => 'array',
            'expedido_em' => 'datetime',
            'confirmado_em' => 'datetime',
            'recusado_em' => 'datetime',
            'cancelado_em' => 'datetime',
        ];
    }

    public function estaVigente(): bool
    {
        return in_array($this->status, self::STATUSES_VIGENTES, true);
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function faturamento(): BelongsTo
    {
        return $this->belongsTo(Faturamento::class);
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }

    public function transportadora(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'transportadora_id');
    }

    public function expedidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'expedido_por');
    }

    public function confirmadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmado_por');
    }

    public function recusadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recusado_por');
    }

    public function canceladoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelado_por');
    }
}
