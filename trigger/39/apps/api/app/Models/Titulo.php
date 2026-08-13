<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Titulo extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const TIPO_PAGAR = 'PAGAR';

    public const TIPO_RECEBER = 'RECEBER';

    public const TIPOS = [
        self::TIPO_PAGAR,
        self::TIPO_RECEBER,
    ];

    public const STATUS_ABERTO = 'ABERTO';

    public const STATUS_PARCIAL = 'PARCIAL';

    public const STATUS_QUITADO = 'QUITADO';

    public const STATUS_CANCELADO = 'CANCELADO';

    public const STATUSES = [
        self::STATUS_ABERTO,
        self::STATUS_PARCIAL,
        self::STATUS_QUITADO,
        self::STATUS_CANCELADO,
    ];

    protected $table = 'titulos';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'tipo',
        'parceiro_id',
        'natureza_id',
        'ordem_compra_id',
        'movimento_id',
        'orcamento_id',
        'origem',
        'documento',
        'parcela',
        'n_dup',
        'emissao',
        'vencimento',
        'valor',
        'saldo',
        'status',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'emissao' => 'date',
            'vencimento' => 'date',
            'valor' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'saldo' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'parceiro_id');
    }

    public function natureza(): BelongsTo
    {
        return $this->belongsTo(NaturezaGerencial::class, 'natureza_id');
    }

    public function ordemCompra(): BelongsTo
    {
        return $this->belongsTo(OrdemCompra::class, 'ordem_compra_id');
    }

    public function movimento(): BelongsTo
    {
        return $this->belongsTo(EstoqueMovimento::class, 'movimento_id');
    }

    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class, 'orcamento_id');
    }

    public function cobrancas(): HasMany
    {
        return $this->hasMany(Cobranca::class, 'titulo_id');
    }

    public function baixas(): HasMany
    {
        return $this->hasMany(TituloBaixa::class, 'titulo_id');
    }
}
