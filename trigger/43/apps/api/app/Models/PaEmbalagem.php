<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PaEmbalagem extends Model
{
    use SoftDeletes;

    public const STATUS_CONFIRMADA = 'CONFIRMADA';

    public const ORIGEM_SUGERIDA = 'SUGERIDA';

    public const ORIGEM_MANUAL = 'MANUAL';

    protected $table = 'pa_embalagens';

    protected $fillable = [
        'empresa_id',
        'codigo',
        'pedido_id',
        'pedido_item_id',
        'ordem_producao_id',
        'status',
        'qtde_etiquetas',
        'qtde_bobinas',
        'qtde_caixas',
        'etiq_por_rolo',
        'rolos_por_caixa',
        'tubete',
        'caixa_medida',
        'saida_etiqueta',
        'origem',
        'observacao',
        'confirmada_em',
        'confirmada_por',
    ];

    protected function casts(): array
    {
        return [
            'qtde_etiquetas' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_bobinas' => 'integer',
            'qtde_caixas' => 'integer',
            'etiq_por_rolo' => 'integer',
            'rolos_por_caixa' => 'integer',
            'confirmada_em' => 'datetime',
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

    public function pedidoItem(): BelongsTo
    {
        return $this->belongsTo(PedidoItem::class, 'pedido_item_id');
    }

    public function ordemProducao(): BelongsTo
    {
        return $this->belongsTo(OrdemProducao::class, 'ordem_producao_id');
    }

    public function confirmadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmada_por');
    }

    public function bobinas(): HasMany
    {
        return $this->hasMany(PaEmbalagemBobina::class, 'embalagem_id')->orderBy('sequencia');
    }

    public function caixas(): HasMany
    {
        return $this->hasMany(PaEmbalagemCaixa::class, 'embalagem_id')->orderBy('sequencia');
    }

    public function resumoTexto(): string
    {
        $parts = [
            number_format((float) $this->qtde_etiquetas, 0, ',', '.').' etiquetas',
            $this->qtde_bobinas.' bobina'.($this->qtde_bobinas === 1 ? '' : 's'),
            $this->qtde_caixas.' caixa'.($this->qtde_caixas === 1 ? '' : 's'),
        ];
        if ($this->tubete) {
            $parts[] = 'tubete '.$this->tubete;
        }

        return implode(' · ', $parts);
    }
}
