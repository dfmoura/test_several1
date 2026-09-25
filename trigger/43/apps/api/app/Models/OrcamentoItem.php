<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Job / posição do ORC (ADR_ORC_ITENS).
 * Fase 1: sempre 1 linha por documento (espelho do snapshot flat).
 */
class OrcamentoItem extends Model
{
    use BelongsToEmpresa;

    protected $table = 'orcamento_itens';

    protected $fillable = [
        'empresa_id',
        'orcamento_id',
        'ordem',
        'rotulo',
        'input_snapshot',
        'result_snapshot',
        'aceite_faixa_index',
    ];

    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
            'input_snapshot' => 'array',
            'result_snapshot' => 'array',
            'aceite_faixa_index' => 'integer',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }
}
