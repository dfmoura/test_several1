<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrcCatalogoTipoTroca extends Model
{
    protected $table = 'orc_catalogo_tipos_troca';

    protected $fillable = [
        'empresa_id',
        'tipo',
        'tempo_h',
        'ativo',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'tempo_h' => 'float',
            'ativo' => 'boolean',
            'ordem' => 'integer',
        ];
    }
}
