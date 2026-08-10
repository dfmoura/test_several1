<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParceiroEnderecoEntrega extends Model
{
    protected $table = 'parceiro_enderecos_entrega';

    protected $fillable = [
        'parceiro_id',
        'apelido',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'municipio',
        'uf',
        'cep',
        'ibge',
        'responsavel_nome',
        'responsavel_telefone',
        'responsavel_documento',
        'observacoes',
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
