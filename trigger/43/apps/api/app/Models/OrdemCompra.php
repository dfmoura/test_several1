<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrdemCompra extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const ORIGEM_DIRETA = 'DIRETA';

    public const ORIGEM_COTACAO = 'COTACAO';

    public const ORIGEM_XML = 'XML';

    public const ORIGENS = [
        self::ORIGEM_DIRETA,
        self::ORIGEM_COTACAO,
        self::ORIGEM_XML,
    ];

    public const STATUS_ABERTA = 'ABERTA';

    public const STATUS_PARCIAL = 'PARCIAL';

    public const STATUS_RECEBIDA = 'RECEBIDA';

    public const STATUS_CANCELADA = 'CANCELADA';

    public const STATUSES = [
        self::STATUS_ABERTA,
        self::STATUS_PARCIAL,
        self::STATUS_RECEBIDA,
        self::STATUS_CANCELADA,
    ];

    public const STATUSES_RECEBIVEIS = [
        self::STATUS_ABERTA,
        self::STATUS_PARCIAL,
    ];

    protected $table = 'ordens_compra';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'fornecedor_id',
        'cotacao_id',
        'necessidade_id',
        'origem',
        'urgente',
        'status',
        'condicao_pagamento',
        'previsao_entrega',
        'valor_total',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'urgente' => 'boolean',
            'previsao_entrega' => 'date',
            'valor_total' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'fornecedor_id');
    }

    public function cotacao(): BelongsTo
    {
        return $this->belongsTo(Cotacao::class, 'cotacao_id');
    }

    public function necessidade(): BelongsTo
    {
        return $this->belongsTo(CompraNecessidade::class, 'necessidade_id');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(OrdemCompraItem::class, 'ordem_compra_id')->orderBy('ordem');
    }

    public function movimentos(): HasMany
    {
        return $this->hasMany(EstoqueMovimento::class, 'ordem_compra_id');
    }

    public function titulos(): HasMany
    {
        return $this->hasMany(Titulo::class, 'ordem_compra_id');
    }
}
