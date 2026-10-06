<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Usuario extends Authenticatable
{
    use Notifiable;

    public $timestamps = false;

    protected $table = 'usuarios';

    protected $guarded = ['id'];

    protected $hidden = ['senha_hash', 'cpf_cifrado', 'cpf_hash'];

    protected function casts(): array
    {
        return [
            'criado_em' => 'datetime',
            'email_verificado_em' => 'datetime',
        ];
    }

    public function getAuthPasswordName(): string
    {
        return 'senha_hash';
    }

    public function getAuthPassword(): string
    {
        return $this->senha_hash;
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\RedefinirSenha($token));
    }

    public function vinculos(): HasMany
    {
        return $this->hasMany(Vinculo::class);
    }
}
