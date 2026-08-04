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
