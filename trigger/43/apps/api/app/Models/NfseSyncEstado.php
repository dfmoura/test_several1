<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NfseSyncEstado extends Model
{
    protected $table = 'nfse_sync_estados';

    protected $fillable = [
        'empresa_id',
        'ultimo_nsu',
        'max_nsu',
        'sync_status',
        'sync_mensagem',
        'ultima_sync_em',
    ];

    protected function casts(): array
    {
        return [
            'ultima_sync_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
