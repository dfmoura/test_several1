<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrcCatalogoMaquina extends Model
{
    protected $table = 'orc_catalogo_maquinas';

    protected $fillable = [
        'nome',
        'ativo',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'ordem' => 'integer',
        ];
    }

    /** @return HasMany<OrcCatalogoHoraMaquina, $this> */
    public function tarifas(): HasMany
    {
        return $this->hasMany(OrcCatalogoHoraMaquina::class, 'maquina_id');
    }
}
