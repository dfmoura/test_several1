<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrcCatalogoAcabamento extends Model
{
    protected $table = 'orc_catalogo_acabamentos';

    protected $fillable = [
        'empresa_id',
        'nome',
        'grupo_id',
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

    public function grupo(): BelongsTo
    {
        return $this->belongsTo(ProdutoGrupo::class, 'grupo_id');
    }
}
