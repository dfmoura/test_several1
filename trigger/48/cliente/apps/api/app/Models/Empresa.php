<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Empresa extends Model
{
    public $timestamps = false;

    protected $table = 'empresas';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'dados_receita' => 'array',
            'criada_em' => 'datetime',
        ];
    }

    public function carteira(): HasOne
    {
        return $this->hasOne(Carteira::class);
    }

    public function vinculos(): HasMany
    {
        return $this->hasMany(Vinculo::class);
    }

    public function demandas(): HasMany
    {
        return $this->hasMany(Demanda::class);
    }
}
