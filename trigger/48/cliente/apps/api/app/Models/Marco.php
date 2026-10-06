<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Marco extends Model
{
    public $timestamps = false;

    protected $table = 'marcos';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'visivel_ao_cliente' => 'boolean',
            'criado_em' => 'datetime',
        ];
    }
}
