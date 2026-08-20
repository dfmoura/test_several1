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
        'latitude',
        'longitude',
        'distancia_km',
        'distancia_fonte',
        'distancia_calculada_em',
        'distancia_empresa_id',
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
            'latitude' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_COORD,
            'longitude' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_COORD,
            'distancia_km' => 'decimal:'.\App\Support\PadraoDecimal::SCALE_DISTANCE,
            'distancia_calculada_em' => 'datetime',
        ];
    }

    public function parceiro(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class);
    }
}
