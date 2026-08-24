<?php

namespace Tests\Unit;

use App\Support\BillingReference;
use PHPUnit\Framework\TestCase;

class BillingReferenceTest extends TestCase
{
    public function test_novos_prefixos_flexoerp(): void
    {
        $this->assertSame('FLEXOERP-CONTA-42', BillingReference::contaRef(42));
        $this->assertSame('FLEXOERP-BILLING-7', BillingReference::billingRef(7));
    }

    public function test_resolve_conta_legado_e_novo(): void
    {
        $this->assertSame(42, BillingReference::userIdFromContaRef('FLEXORC-CONTA-42'));
        $this->assertSame(42, BillingReference::userIdFromContaRef('FLEXOERP-CONTA-42'));
        $this->assertNull(BillingReference::userIdFromContaRef('OUTRO-CONTA-42'));
    }

    public function test_resolve_billing_legado_e_novo(): void
    {
        $this->assertSame(7, BillingReference::empresaIdFromBillingRef('FLEXORC-BILLING-7'));
        $this->assertSame(7, BillingReference::empresaIdFromBillingRef('FLEXOERP-BILLING-7'));
    }

    public function test_is_any_ref(): void
    {
        $this->assertTrue(BillingReference::isAnyRef('FLEXORC-CONTA-1'));
        $this->assertTrue(BillingReference::isAnyRef('FLEXOERP-BILLING-2'));
        $this->assertFalse(BillingReference::isAnyRef('ASAAS-123'));
    }
}
