<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Produto extends Model
{
    use HasUserStamps;
    use SoftDeletes;

    public const FAMILIAS = ['MP', 'EMB', 'REV', 'PA', 'SVC', 'FAC'];

    protected $fillable = [
        'empresa_id',
        'codigo',
        'familia',
        'grupo_id',
        'descricao_fiscal',
        'descricao_comercial',
        'grupo',
        'ncm',
        'cest',
        'origem',
        'tipo_item_sped',
        'unidade_comercial',
        'unidade_interna',
        'fator_conversao',
        'cfop_saida_padrao',
        'cfop_entrada_padrao',
        'csosn',
        'cst_icms',
        'cst_pis',
        'cst_cofins',
        'cst_cbs',
        'cclass_trib',
        'aliquota_cbs',
        'preco_tabela',
        'custo_medio',
        'estoque_minimo',
        'lead_time_dias',
        'controla_lote',
        'controla_validade',
        'prazo_validade_dias',
        'gtin',
        'situacao',
        'atributos',
    ];

    protected $with = ['grupoCatalogo'];

    protected function casts(): array
    {
        return [
            // Casts decimal:N → string JSON (PADRAO_DECIMAL §1.2 / §9.1)
            'fator_conversao' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_FACTOR,
            'preco_tabela' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_UNIT_PRICE,
            'custo_medio' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_UNIT_PRICE,
            'estoque_minimo' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_QTY,
            'aliquota_cbs' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_PERCENT,
            'controla_lote' => 'boolean',
            'controla_validade' => 'boolean',
            'prazo_validade_dias' => 'integer',
            'atributos' => 'array',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function grupoCatalogo(): BelongsTo
    {
        return $this->belongsTo(ProdutoGrupo::class, 'grupo_id');
    }
}
