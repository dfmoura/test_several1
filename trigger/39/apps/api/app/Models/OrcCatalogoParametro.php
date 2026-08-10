<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrcCatalogoParametro extends Model
{
    protected $table = 'orc_catalogo_parametros';

    public const CHAVE_MATRIZ_CM2 = 'matriz_cm2';

    /** Chaves conhecidas nesta entrega (extensível sem migration). */
    public const CHAVES_CONHECIDAS = [
        self::CHAVE_MATRIZ_CM2,
    ];

    protected $fillable = [
        'chave',
        'valor',
        'rotulo',
        'unidade',
        'ativo',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:6',
            'ativo' => 'boolean',
            'ordem' => 'integer',
        ];
    }
}
