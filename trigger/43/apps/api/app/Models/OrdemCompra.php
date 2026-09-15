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

    public const STATUS_RASCUNHO = 'RASCUNHO';

    public const STATUS_ABERTA = 'ABERTA';

    public const STATUS_PARCIAL = 'PARCIAL';

    public const STATUS_RECEBIDA = 'RECEBIDA';

    public const STATUS_CANCELADA = 'CANCELADA';

    public const STATUSES = [
        self::STATUS_RASCUNHO,
        self::STATUS_ABERTA,
        self::STATUS_PARCIAL,
        self::STATUS_RECEBIDA,
        self::STATUS_CANCELADA,
    ];

    /** Editável / excluível até o envio ao fornecedor (ADR_OC_RASCUNHO_ENVIO). */
    public const STATUSES_EDITAVEIS = [
        self::STATUS_RASCUNHO,
    ];

    public const STATUSES_RECEBIVEIS = [
        self::STATUS_ABERTA,
        self::STATUS_PARCIAL,
    ];

    /** Conta como em trânsito na reposição. */
    public const STATUSES_EM_TRANSITO = [
        self::STATUS_ABERTA,
        self::STATUS_PARCIAL,
    ];

    /** Modalidade frete NF-e (transp/modFrete) — CIF emitente / FOB destinatário. */
    public const MOD_FRETE_CIF = '0';

    public const MOD_FRETE_FOB = '1';

    public const MOD_FRETES = [
        self::MOD_FRETE_CIF,
        self::MOD_FRETE_FOB,
    ];

    protected $table = 'ordens_compra';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'fornecedor_id',
        'transportador_id',
        'cotacao_id',
        'necessidade_id',
        'origem',
        'urgente',
        'status',
        'condicao_pagamento',
        'previsao_entrega',
        'valor_total',
        'valor_frete',
        'mod_frete',
        'valor_ipi',
        'valor_icms',
        'observacao',
        'enviado_em',
    ];

    protected function casts(): array
    {
        return [
            'urgente' => 'boolean',
            'previsao_entrega' => 'date',
            'valor_total' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'valor_frete' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'valor_ipi' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'valor_icms' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'enviado_em' => 'datetime',
        ];
    }

    public function isEditavel(): bool
    {
        return in_array($this->status, self::STATUSES_EDITAVEIS, true);
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'fornecedor_id');
    }

    public function transportador(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'transportador_id');
    }

    public static function modFreteLabel(?string $mod): ?string
    {
        return match ($mod) {
            self::MOD_FRETE_CIF => 'CIF (emitente)',
            self::MOD_FRETE_FOB => 'FOB (destinatário)',
            default => null,
        };
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
