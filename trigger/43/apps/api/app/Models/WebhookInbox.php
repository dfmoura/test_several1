<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookInbox extends Model
{
    protected $table = 'webhook_inbox';

    protected $fillable = [
        'empresa_id',
        'provider',
        'event_id',
        'payload_hash',
        'payload',
        'resultado',
        'mensagem',
        'cobranca_id',
        'titulo_baixa_id',
        'processado_em',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'processado_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function cobranca(): BelongsTo
    {
        return $this->belongsTo(Cobranca::class);
    }

    public function tituloBaixa(): BelongsTo
    {
        return $this->belongsTo(TituloBaixa::class);
    }
}
