<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrcCatalogoAcabamento extends Model
{
    protected $table = 'orc_catalogo_acabamentos';

    protected $fillable = [
        'nome',
        'preco_m2',
        'perda_m2',
        'ativo',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'preco_m2' => 'decimal:4',
            'perda_m2' => 'decimal:4',
            'ativo' => 'boolean',
            'ordem' => 'integer',
        ];
    }
}
