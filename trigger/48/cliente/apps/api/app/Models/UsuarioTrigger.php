<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class UsuarioTrigger extends Authenticatable
{
    public $timestamps = false;

    protected $table = 'usuarios_trigger';

    protected $guarded = ['id'];

    protected $hidden = ['senha_hash'];

    public function getAuthPasswordName(): string
    {
        return 'senha_hash';
    }

    public function getAuthPassword(): string
    {
        return $this->senha_hash;
    }
}
