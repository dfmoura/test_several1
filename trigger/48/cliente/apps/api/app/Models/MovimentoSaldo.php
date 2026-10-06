<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MovimentoSaldo extends Model
{
    public $timestamps = false;

    protected $table = 'movimentos_saldo';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['criado_em' => 'datetime'];
    }
}
