<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrcamentoLinkAprovacao extends Model
{
    protected $table = 'orcamento_links_aprovacao';

    protected $fillable = [
        'orcamento_id',
        'token',
        'ativo',
        'expira_em',
        'enviado_em',
        'canal_envio',
        'destino_envio',
        'visualizacoes',
        'usado_em',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'expira_em' => 'datetime',
            'enviado_em' => 'datetime',
            'usado_em' => 'datetime',
            'visualizacoes' => 'integer',
        ];
    }

    public function orcamento(): BelongsTo
    {
        return $this->belongsTo(Orcamento::class);
    }

    public function isDisponivel(): bool
    {
        return $this->ativo
            && $this->usado_em === null
            && $this->expira_em !== null
            && $this->expira_em->isFuture();
    }
}
