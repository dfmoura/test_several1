<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Apresentacao extends Model
{
    public $timestamps = false;

    protected $table = 'apresentacoes';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['criada_em' => 'datetime'];
    }
}
