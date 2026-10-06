<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notificacao extends Model
{
    public $timestamps = false;

    protected $table = 'notificacoes';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'lida_em' => 'datetime',
            'email_enviado_em' => 'datetime',
            'criada_em' => 'datetime',
        ];
    }
}
