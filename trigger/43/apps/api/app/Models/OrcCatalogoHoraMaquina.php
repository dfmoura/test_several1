<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrcCatalogoHoraMaquina extends Model
{
    protected $table = 'orc_catalogo_hora_maquina';

    protected $fillable = [
        'maquina_id',
        'cores',
        'tarifa',
    ];

    protected function casts(): array
    {
        return [
            'tarifa' => 'decimal:4',
        ];
    }

    /** @return BelongsTo<OrcCatalogoMaquina, $this> */
    public function maquina(): BelongsTo
    {
        return $this->belongsTo(OrcCatalogoMaquina::class, 'maquina_id');
    }
}
