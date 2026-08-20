<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContaAtivacao extends Model
{
    public const BILLING_PENDENTE = 'PENDENTE';

    public const BILLING_ATIVA = 'ATIVA';

    public const BILLING_SUSPENSA = 'SUSPENSA';

    protected $table = 'conta_ativacoes';

    protected $fillable = [
        'user_id',
        'billing_status',
        'billing_provider',
        'billing_customer_ref',
        'billing_subscription_ref',
        'billing_checkout_ref',
        'billing_checkout_url',
        'billing_metodo_em',
    ];

    protected function casts(): array
    {
        return [
            'billing_metodo_em' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pagamentoAutenticado(): bool
    {
        return $this->billing_status === self::BILLING_ATIVA && $this->billing_metodo_em !== null;
    }

    public static function maxEmpresasPorConta(): int
    {
        $n = (int) config('erp.billing.max_empresas_conta', 3);

        return $n > 0 ? $n : 3;
    }
}
