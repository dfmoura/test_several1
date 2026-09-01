<?php

namespace App\Models;

use App\Models\Concerns\HasUserStamps;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class OrcMapaFaca extends Model
{
    use HasUserStamps;

    protected $table = 'orc_mapa_facas';

    protected $fillable = [
        'empresa_id',
        'medida',
        'tamanho_raw',
        'tamanho_tipo',
        'diametro_cm',
        'formato',
        'faca',
        'puxada',
        'z',
        'repeticao',
        'maquina_catalogo',
        'maquina_origem',
        'largura_faca',
        'n_facas',
        'cilindro',
        'colunas_mapa',
        'posicao',
        'contorno_svg',
        'conjugada',
        'fornecedor',
        'valor_pago',
        'cliente_nota',
        'completa',
        'label',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'diametro_cm' => 'float',
            'puxada' => 'float',
            'z' => 'float',
            'repeticao' => 'float',
            'largura_faca' => 'float',
            'valor_pago' => 'float',
            'n_facas' => 'integer',
            'completa' => 'boolean',
            'ativo' => 'boolean',
        ];
    }

    /** @param  Builder<self>  $query */
    public function scopeAtivas(Builder $query): Builder
    {
        return $query->where('ativo', true);
    }
}
