<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class FiscalNcm extends Model
{
    protected $table = 'fiscal_ncms';

    protected $fillable = [
        'codigo',
        'descricao',
        'destaque_rlp',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'destaque_rlp' => 'boolean',
            'ativo' => 'boolean',
        ];
    }

    public function cests(): BelongsToMany
    {
        return $this->belongsToMany(
            FiscalCest::class,
            'fiscal_ncm_cest',
            'ncm_codigo',
            'cest_codigo',
            'codigo',
            'codigo'
        );
    }
}
