<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Faturamento extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const STATUS_CONFIRMADO = 'CONFIRMADO';

    public const STATUS_ESTORNADO = 'ESTORNADO';

    public const NF_PENDENTE = 'PENDENTE';

    public const NF_PROCESSANDO = 'PROCESSANDO';

    public const NF_AUTORIZADA = 'AUTORIZADA';

    public const NF_REJEITADA = 'REJEITADA';

    public const NF_CANCELADA = 'CANCELADA';

    protected $table = 'faturamentos';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'pedido_id',
        'orcamento_id',
        'parceiro_id',
        'status',
        'nf_status',
        'valor_bruto',
        'valor_adiantamento',
        'valor_a_cobrar',
        'condicao_pagamento',
        'forma_pagamento',
        'adiantamento_titulo_id',
        'snapshot',
        'observacao',
        'motivo_estorno',
        'faturado_em',
        'faturado_por',
        'estornado_em',
        'estornado_por',
    ];

    protected function casts(): array
    {
        return [
            'valor_bruto' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'valor_adiantamento' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'valor_a_cobrar' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'snapshot' => 'array',
            'faturado_em' => 'datetime',
            'estornado_em' => 'datetime',
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

    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }

    public function adiantamentoTitulo(): BelongsTo
    {
        return $this->belongsTo(Titulo::class, 'adiantamento_titulo_id');
    }

    public function faturadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'faturado_por');
    }

    public function estornadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'estornado_por');
    }

    public function estaVigente(): bool
    {
        return $this->status === self::STATUS_CONFIRMADO;
    }

    public function itens(): HasMany
    {
        return $this->hasMany(FaturamentoItem::class)->orderBy('ordem');
    }

    public function titulos(): HasMany
    {
        return $this->hasMany(Titulo::class)->orderBy('parcela')->orderBy('id');
    }

    public function documentosFiscais(): HasMany
    {
        return $this->hasMany(DocumentoFiscalSaida::class)->orderBy('tipo');
    }

    public function saidasEstoque(): HasMany
    {
        return $this->hasMany(EstoqueMovimento::class)->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA);
    }
}
