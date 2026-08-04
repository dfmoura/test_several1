<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParceiroContaBancaria extends Model
{
    protected $table = 'parceiro_contas_bancarias';

    protected $fillable = [
        'parceiro_id',
        'banco_codigo',
        'banco_nome',
        'agencia',
        'conta',
        'pix_chave',
        'tipo_conta',
        'principal',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'principal' => 'boolean',
            'ordem' => 'integer',
        ];
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }
}
