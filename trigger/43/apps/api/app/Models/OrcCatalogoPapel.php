<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrcCatalogoPapel extends Model
{
    protected $table = 'orc_catalogo_papeis';

    protected $fillable = [
        'empresa_id',
        'nome',
        'preco_m2',
        'ativo',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'preco_m2' => 'decimal:4',
            'ativo' => 'boolean',
            'ordem' => 'integer',
        ];
    }
}
