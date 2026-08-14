<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NfeEntradaItem extends Model
{
    protected $table = 'nfe_entrada_itens';

    protected $fillable = [
        'nfe_entrada_id',
        'produto_id',
        'n_item',
        'c_prod',
        'x_prod',
        'ncm',
        'cest',
        'cfop',
        'u_com',
        'q_com',
        'v_un_com',
        'v_prod',
        'u_trib',
        'q_trib',
        'orig',
        'cst_icms',
        'csosn',
        'v_bc',
        'p_icms',
        'v_icms',
        'v_bc_st',
        'v_icms_st',
        'cst_ipi',
        'p_ipi',
        'v_ipi',
        'cst_pis',
        'p_pis',
        'v_pis',
        'cst_cofins',
        'p_cofins',
        'v_cofins',
        'v_frete',
        'v_desc',
        'v_outro',
        'impostos',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'n_item' => 'integer',
            'ordem' => 'integer',
            'impostos' => 'array',
        ];
    }

    public function nfeEntrada(): BelongsTo
    {
        return $this->belongsTo(NfeEntrada::class, 'nfe_entrada_id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }
}
