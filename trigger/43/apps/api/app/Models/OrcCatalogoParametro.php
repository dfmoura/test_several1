<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrcCatalogoParametro extends Model
{
    protected $table = 'orc_catalogo_parametros';

    public const CHAVE_MATRIZ_CM2 = 'matriz_cm2';

    /** Estimativa de carga no ORC = qtde_caixas × este peso (aba Frete). */
    public const CHAVE_PESO_CAIXA_KG = 'peso_caixa_kg';

    /** Chaves conhecidas nesta entrega (extensível sem migration). */
    public const CHAVES_CONHECIDAS = [
        self::CHAVE_MATRIZ_CM2,
        self::CHAVE_PESO_CAIXA_KG,
    ];

    protected $fillable = [
        'empresa_id',
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
