<?php

namespace App\Models;

use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Model;

class OrcCatalogoFaixaFrete extends Model
{
    protected $table = 'orc_catalogo_faixas_frete';

    /** Política recomendada no seed (kg; R$ vazio; inativas). */
    public const SEED_KG_ATE = ['20', '50', '100', '200', null];

    protected $fillable = [
        'empresa_id',
        'kg_ate',
        'preco_por_km',
        'minimo_rs',
        'ativo',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'kg_ate' => 'decimal:'.PadraoDecimal::SCALE_WEIGHT,
            'preco_por_km' => 'decimal:'.PadraoDecimal::SCALE_UNIT_PRICE,
            'minimo_rs' => 'decimal:'.PadraoDecimal::SCALE_MONEY,
            'ativo' => 'boolean',
            'ordem' => 'integer',
        ];
    }

    public function isAcima(): bool
    {
        return $this->kg_ate === null || $this->kg_ate === '';
    }
}
