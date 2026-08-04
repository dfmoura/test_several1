<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class FiscalCest extends Model
{
    protected $table = 'fiscal_cests';

    protected $fillable = [
        'codigo',
        'descricao',
        'segmento',
        'observacao',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    public function ncms(): BelongsToMany
    {
        return $this->belongsToMany(
            FiscalNcm::class,
            'fiscal_ncm_cest',
            'cest_codigo',
            'ncm_codigo',
            'codigo',
            'codigo'
        );
    }
}
