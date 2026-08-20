<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AsaasAutorizacaoSaque extends Model
{
    protected $table = 'asaas_autorizacao_saques';

    protected $fillable = [
        'tipo',
        'provedor_ref',
        'valor',
        'decisao',
        'motivo',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
            'payload' => 'array',
        ];
    }
}
