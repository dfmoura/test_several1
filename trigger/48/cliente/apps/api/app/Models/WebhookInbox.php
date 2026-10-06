<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookInbox extends Model
{
    public $timestamps = false;

    protected $table = 'webhook_inbox';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'recebido_em' => 'datetime',
            'processado_em' => 'datetime',
        ];
    }
}
