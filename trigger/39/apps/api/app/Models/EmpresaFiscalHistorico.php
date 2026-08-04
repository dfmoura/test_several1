<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmpresaFiscalHistorico extends Model
{
    protected $table = 'empresa_fiscal_historicos';

    protected $fillable = [
        'empresa_id',
        'vigencia_inicio',
        'vigencia_fim',
        'ie',
        'im',
        'iest',
        'ie_status',
        'regime',
        'crt',
        'motivo',
        'alterado_por',
    ];

    protected function casts(): array
    {
        return [
            'vigencia_inicio' => 'date',
            'vigencia_fim' => 'date',
            'crt' => 'integer',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'alterado_por');
    }
}
