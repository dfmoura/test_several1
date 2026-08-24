<?php

namespace App\Models;

use Carbon\CarbonInterface;
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
        'billing_pix_copia_cola',
        'billing_pix_qr_base64',
        'billing_charge_vencimento',
        'billing_pix_emitido_em',
        'billing_metodo_em',
        'cortesia_ate',
        'cortesia_motivo',
        'cortesia_concedida_em',
        'cortesia_por_user_id',
    ];

    protected function casts(): array
    {
        return [
            'billing_metodo_em' => 'datetime',
            'billing_charge_vencimento' => 'date',
            'billing_pix_emitido_em' => 'datetime',
            'cortesia_ate' => 'datetime',
            'cortesia_concedida_em' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cortesiaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cortesia_por_user_id');
    }

    /** Mensalidade autenticada no ASAAS (ou mock). Distinto de cortesia. */
    public function pagamentoAutenticado(): bool
    {
        return $this->billing_status === self::BILLING_ATIVA && $this->billing_metodo_em !== null;
    }

    /** Período free concedido pela TRIGGER, ainda vigente. */
    public function cortesiaVigente(?CarbonInterface $agora = null): bool
    {
        if ($this->cortesia_ate === null) {
            return false;
        }

        $agora ??= now();

        return $this->cortesia_ate->greaterThanOrEqualTo($agora);
    }

    /** Houve cortesia e ela já passou — distinto de nunca ter bonificado (revogar). */
    public function cortesiaEncerrada(?CarbonInterface $agora = null): bool
    {
        return $this->cortesia_ate !== null && ! $this->cortesiaVigente($agora);
    }

    /** Libera envio/operação: pago no ASAAS ou cortesia vigente. */
    public function acessoLiberado(?CarbonInterface $agora = null): bool
    {
        return $this->pagamentoAutenticado() || $this->cortesiaVigente($agora);
    }

    public static function maxEmpresasPorConta(): int
    {
        $n = (int) config('erp.billing.max_empresas_conta', 3);

        return $n > 0 ? $n : 3;
    }
}
