<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NfseDpsControle extends Model
{
    protected $table = 'nfse_dps_controles';

    protected $fillable = [
        'empresa_id',
        'serie',
        'ultimo_numero',
    ];

    protected function casts(): array
    {
        return [
            'serie' => 'integer',
            'ultimo_numero' => 'integer',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
