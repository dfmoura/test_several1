<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmpresaBankCredential extends Model
{
    protected $table = 'empresa_bank_credentials';

    protected $fillable = [
        'empresa_id',
        'provider',
        'ambiente',
        'conta_financeira_id',
        'client_id_cipher',
        'client_secret_cipher',
        'cert_path',
        'key_path',
        'ativo',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function contaFinanceira(): BelongsTo
    {
        return $this->belongsTo(EmpresaContaFinanceira::class, 'conta_financeira_id');
    }
}
