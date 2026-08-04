<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParametroEmpresa extends Model
{
    protected $table = 'parametros_empresa';

    protected $fillable = [
        'empresa_id',
        'chave',
        'valor',
        'status',
        'versao',
        'alterado_por',
    ];

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function alteradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'alterado_por');
    }
}
