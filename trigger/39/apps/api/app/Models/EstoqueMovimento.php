<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class EstoqueMovimento extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const TIPO_ENTRADA_COMPRA = 'ENTRADA_COMPRA';

    public const TIPO_AJUSTE = 'AJUSTE';

    public const TIPO_SAIDA_PRODUCAO = 'SAIDA_PRODUCAO';

    public const TIPO_ENTRADA_SOBRA = 'ENTRADA_SOBRA';

    public const TIPO_ENTRADA_PA = 'ENTRADA_PA';

    public const TIPOS = [
        self::TIPO_ENTRADA_COMPRA,
        self::TIPO_AJUSTE,
        self::TIPO_SAIDA_PRODUCAO,
        self::TIPO_ENTRADA_SOBRA,
        self::TIPO_ENTRADA_PA,
    ];

    protected $table = 'estoque_movimentos';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'tipo',
        'ordem_compra_id',
        'fornecedor_id',
        'nf_chave',
        'nf_numero',
        'nf_data',
        'nf_valor',
        'nf_totais',
        'conferido_em',
        'conferido_por',
        'observacao',
        'motivo_codigo',
        'ajuste_id',
        'pedido_id',
        'ordem_producao_id',
        'ordem_servico_id',
    ];

    protected function casts(): array
    {
        return [
            'nf_data' => 'date',
            'nf_valor' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_MONEY,
            'nf_totais' => 'array',
            'conferido_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function ordemCompra(): BelongsTo
    {
        return $this->belongsTo(OrdemCompra::class, 'ordem_compra_id');
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'fornecedor_id');
    }

    public function conferidoPorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conferido_por');
    }

    public function itens(): HasMany
    {
        return $this->hasMany(EstoqueMovimentoItem::class, 'movimento_id')->orderBy('ordem');
    }

    /** Compat.: primeiro título do movimento (entrada legada / UI). */
    public function titulo(): HasOne
    {
        return $this->hasOne(Titulo::class, 'movimento_id')->orderBy('parcela')->orderBy('id');
    }

    public function titulos(): HasMany
    {
        return $this->hasMany(Titulo::class, 'movimento_id')->orderBy('parcela')->orderBy('id');
    }

    public function ajuste(): BelongsTo
    {
        return $this->belongsTo(EstoqueAjuste::class, 'ajuste_id');
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function ordemProducao(): BelongsTo
    {
        return $this->belongsTo(OrdemProducao::class, 'ordem_producao_id');
    }

    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }
}
