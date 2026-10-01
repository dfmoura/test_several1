<?php

namespace Tests\Feature;

use App\Services\Banking\Asaas\AsaasBillingGateway;
use App\Services\Banking\Inter\InterBillingGateway;
use Tests\TestCase;

/**
 * REV-03 — homolog e produção não confirmam mensalidade de demonstração.
 */
class BillingDemoStageTest extends TestCase
{
    public function test_homolog_e_producao_recusam_demo_mesmo_com_mock(): void
    {
        config([
            'erp.billing.provider' => 'mock',
            'erp.asaas.api_key' => '',
        ]);

        foreach (['homolog', 'production'] as $stage) {
            config(['erp.stage' => $stage]);
            $this->assertFalse(app(AsaasBillingGateway::class)->podeConfirmarDemo(), $stage);
            $this->assertFalse(app(InterBillingGateway::class)->podeConfirmarDemo(), $stage);
        }

        config(['erp.stage' => 'testing']);
        $this->assertTrue(app(AsaasBillingGateway::class)->podeConfirmarDemo());
        $this->assertTrue(app(InterBillingGateway::class)->podeConfirmarDemo());
    }
}
