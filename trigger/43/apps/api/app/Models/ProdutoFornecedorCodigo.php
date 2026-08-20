<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProdutoFornecedorCodigo extends Model
{
    protected $table = 'produto_fornecedor_codigos';

    protected $fillable = [
        'empresa_id',
        'fornecedor_id',
        'produto_id',
        'c_prod',
        'x_prod',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Parceiro::class, 'fornecedor_id');
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }
}
