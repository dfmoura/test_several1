<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Plano comercial da mensalidade FLEXORC — singleton lógico por instalação. */
class BillingCatalogoInstalacao extends Model
{
    protected $table = 'billing_catalogo_instalacao';

    protected $fillable = [
        'valor',
        'ciclo',
        'descricao',
        'vigente_desde',
        'atualizado_por_user_id',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
            'vigente_desde' => 'datetime',
        ];
    }

    public function atualizadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'atualizado_por_user_id');
    }

    public static function atual(): ?self
    {
        return self::query()->orderByDesc('id')->first();
    }
}
