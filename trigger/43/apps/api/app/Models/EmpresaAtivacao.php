<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmpresaAtivacao extends Model
{
    public const BILLING_PENDENTE = 'PENDENTE';

    public const BILLING_ATIVA = 'ATIVA';

    public const BILLING_SUSPENSA = 'SUSPENSA';

    protected $table = 'empresa_ativacoes';

    protected $fillable = [
        'empresa_id',
        'billing_status',
        'billing_provider',
        'billing_customer_ref',
        'billing_subscription_ref',
        'billing_checkout_ref',
        'billing_checkout_url',
        'billing_metodo_em',
        'catalogo_conferido_em',
    ];

    protected function casts(): array
    {
        return [
            'billing_metodo_em' => 'datetime',
            'catalogo_conferido_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function pagamentoAutenticado(): bool
    {
        return $this->billing_status === self::BILLING_ATIVA && $this->billing_metodo_em !== null;
    }
}
