<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $fillable = [
        'empresa_id',
        'user_id',
        'acao',
        'entidade',
        'entidade_id',
        'de',
        'para',
        'ip',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'de' => 'array',
            'para' => 'array',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
