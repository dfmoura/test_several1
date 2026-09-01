<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrcCatalogoEstrutura extends Model
{
    public const CHAVE_TINTA_MATRIZ = 'tinta_matriz';

    public const CHAVE_PERDA_TROCA_M2_FATOR = 'perda_troca_m2_fator';

    public const CHAVE_CAIXA_EMPACOTAMENTO = 'caixa_empacotamento';

    /** @var list<string> */
    public const CHAVES_CONHECIDAS = [
        self::CHAVE_TINTA_MATRIZ,
        self::CHAVE_PERDA_TROCA_M2_FATOR,
        self::CHAVE_CAIXA_EMPACOTAMENTO,
    ];

    protected $table = 'orc_catalogo_estruturas';

    protected $fillable = [
        'empresa_id',
        'chave',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }
}
