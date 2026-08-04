<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiCache extends Model
{
    protected $table = 'api_cache';

    protected $fillable = [
        'chave',
        'fonte',
        'payload',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'expires_at' => 'datetime',
        ];
    }

    public function isValid(): bool
    {
        return $this->expires_at->isFuture();
    }
}
