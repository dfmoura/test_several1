<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Grupo de hora-máquina do ORC (tarifas G10) — NÃO é o bem patrimonial.
 *
 * @see docs/ADR_BEM_VS_ORC_MAQUINA.md
 */
class OrcCatalogoMaquina extends Model
{
    protected $table = 'orc_catalogo_maquinas';

    protected $fillable = [
        'empresa_id',
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

    /**
     * Bens físicos (patrimônio) que usam este grupo de hora-máquina.
     * Tarifas G10 ≠ ativo — estudo 32 / BL-023.
     *
     * @return HasMany<BemPatrimonial, $this>
     */
    public function bensPatrimoniais(): HasMany
    {
        return $this->hasMany(BemPatrimonial::class, 'orc_catalogo_maquina_id');
    }
}
