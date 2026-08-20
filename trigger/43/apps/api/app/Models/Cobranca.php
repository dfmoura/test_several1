<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cobranca extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const STATUS_EMITIDA = 'EMITIDA';

    public const STATUS_REGISTRADA = 'REGISTRADA';

    public const STATUS_PAGA = 'PAGA';

    public const STATUS_CANCELADA = 'CANCELADA';

    public const STATUS_VENCIDA = 'VENCIDA';

    public const STATUS_FALHA = 'FALHA';

    public const STATUS_ESTORNADA = 'ESTORNADA';

    /** @var list<string> */
    public const STATUSES = [
        self::STATUS_EMITIDA,
        self::STATUS_REGISTRADA,
        self::STATUS_PAGA,
        self::STATUS_CANCELADA,
        self::STATUS_VENCIDA,
        self::STATUS_FALHA,
        self::STATUS_ESTORNADA,
    ];

    protected $table = 'cobrancas';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'titulo_id',
        'empresa_conta_financeira_id',
        'provider',
        'provider_ref',
        'txid',
        'idempotency_key',
        'pix_copia_cola',
        'pix_qr_base64',
        'linha_digitavel',
        'pdf_url',
        'vencimento',
        'status',
        'provider_payload',
    ];

    protected function casts(): array
    {
        return [
            'vencimento' => 'date',
            'provider_payload' => 'array',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function titulo(): BelongsTo
    {
        return $this->belongsTo(Titulo::class);
    }

    public function contaFinanceira(): BelongsTo
    {
        return $this->belongsTo(EmpresaContaFinanceira::class, 'empresa_conta_financeira_id');
    }
}
