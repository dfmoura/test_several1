<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdemProducaoMaterial extends Model
{
    protected $table = 'ordem_producao_materiais';

    protected $fillable = [
        'empresa_id',
        'ordem_producao_id',
        'produto_id',
        'qtde_planejada',
        'qtde_requisitada',
        'qtde_consumida',
        'qtde_retorno',
        'qtde_perda',
        'unidade',
        'componente',
        'origem_texto',
        'saida_movimento_id',
        'retorno_movimento_id',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'qtde_planejada' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_requisitada' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_consumida' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_retorno' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'qtde_perda' => 'decimal:'.PadraoDecimal::SCALE_QTY,
            'ordem' => 'integer',
        ];
    }

    public function isPendente(): bool
    {
        return $this->saida_movimento_id === null;
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function ordemProducao(): BelongsTo
    {
        return $this->belongsTo(OrdemProducao::class, 'ordem_producao_id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function saidaMovimento(): BelongsTo
    {
        return $this->belongsTo(EstoqueMovimento::class, 'saida_movimento_id');
    }

    public function retornoMovimento(): BelongsTo
    {
        return $this->belongsTo(EstoqueMovimento::class, 'retorno_movimento_id');
    }
}
