<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Auditoria extends Model
{
    public $timestamps = false;

    protected $table = 'auditoria';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'antes' => 'array',
            'depois' => 'array',
            'em' => 'datetime',
        ];
    }
}
