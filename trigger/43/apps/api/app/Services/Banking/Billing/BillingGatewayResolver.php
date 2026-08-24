<?php

namespace App\Services\Banking\Billing;

use App\Services\Banking\Asaas\AsaasBillingGateway;
use App\Services\Banking\Inter\InterBillingGateway;

/** Seleciona o gateway de mensalidade conforme BILLING_PROVIDER. */
final class BillingGatewayResolver
{
    public function __construct(
        private readonly AsaasBillingGateway $asaas,
        private readonly InterBillingGateway $inter,
    ) {}

    public function resolve(): BillingGateway
    {
        $configured = strtolower(trim((string) config('erp.billing.provider', 'mock')));

        return match ($configured) {
            'inter' => $this->inter,
            default => $this->asaas,
        };
    }
}
