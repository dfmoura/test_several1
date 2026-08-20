<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParceiroContato extends Model
{
    protected $fillable = [
        'parceiro_id',
        'nome',
        'funcao',
        'telefone',
        'whatsapp',
        'email',
        'principal',
        'autorizado_aprovar',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'principal' => 'boolean',
            'autorizado_aprovar' => 'boolean',
            'ordem' => 'integer',
        ];
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }
}
