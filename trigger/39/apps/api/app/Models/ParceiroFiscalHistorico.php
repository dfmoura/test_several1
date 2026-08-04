<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParceiroFiscalHistorico extends Model
{
    protected $table = 'parceiro_fiscal_historicos';

    protected $fillable = [
        'parceiro_id',
        'vigencia_inicio',
        'vigencia_fim',
        'ie',
        'im',
        'ind_ie_dest',
        'ie_status',
        'regime',
        'finalidade',
        'consumidor_final',
        'suframa',
        'area_incentivada',
        'motivo',
        'alterado_por',
    ];

    protected function casts(): array
    {
        return [
            'vigencia_inicio' => 'date',
            'vigencia_fim' => 'date',
            'consumidor_final' => 'boolean',
            'area_incentivada' => 'boolean',
            'ind_ie_dest' => 'integer',
        ];
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'alterado_por');
    }
}
