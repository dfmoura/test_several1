<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProdutoGrupo extends Model
{
    public const FAMILIAS = ['MP', 'EMB', 'REV', 'PA', 'SVC', 'FAC'];

    public const NATUREZAS = ['COMPRA', 'VENDA', 'AMBOS'];

    protected $fillable = [
        'codigo',
        'nome',
        'familia',
        'natureza',
        'tipo_item_sped',
        'grupo_estoque_padrao',
        'grupos_estoque',
        'ncm_padrao',
        'unidade_comercial_padrao',
        'unidade_interna_padrao',
        'cfop_entrada_padrao',
        'cfop_saida_padrao',
        'exige_dimensao_sku',
        'ncm_confirmado',
        'ordenacao',
        'situacao',
        'observacao',
    ];

    protected function casts(): array
    {
        return [
            'grupos_estoque' => 'array',
            'exige_dimensao_sku' => 'boolean',
            'ncm_confirmado' => 'boolean',
        ];
    }

    public function produtos(): HasMany
    {
        return $this->hasMany(Produto::class, 'grupo_id');
    }

    public function isAtivo(): bool
    {
        return $this->situacao === 'ATIVO';
    }

    /** Prefixo usado na geração do código de negócio (MP-PAP-nnn). */
    public function codigoPrefixo(): string
    {
        return strtoupper($this->codigo);
    }

    public function padDigitos(): int
    {
        return $this->familia === 'FAC' ? 4 : 3;
    }
}
