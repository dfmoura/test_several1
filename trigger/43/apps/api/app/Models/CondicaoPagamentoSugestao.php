<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Sugestão de condição de pagamento por EMP (autocomplete).
 * Não é catálogo COND- — documentos guardam texto livre no snapshot.
 */
class CondicaoPagamentoSugestao extends Model
{
    use BelongsToEmpresa;
    use SoftDeletes;

    /** @var list<string> Lista canônica inicial (estudo 32 / condicoesComerciais.ts). */
    public const CANONICOS = [
        'À vista',
        'PIX antecipado',
        '50% sinal + 50% 28 DDL',
        '7 DDL',
        '14 DDL',
        '21 DDL',
        '28 DDL',
        '14/28',
        '14/28/42',
        '28/35/42',
    ];

    protected $table = 'condicao_pagamento_sugestoes';

    protected $fillable = [
        'empresa_id',
        'texto',
        'ordenacao',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ordenacao' => 'integer',
            'ativo' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }
}
