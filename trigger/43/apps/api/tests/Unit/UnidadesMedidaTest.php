<?php

namespace Tests\Unit;

use App\Support\UnidadesMedida;
use PHPUnit\Framework\TestCase;

class UnidadesMedidaTest extends TestCase
{
    public function test_catalog_matches_estudo_32_official_set(): void
    {
        $codes = UnidadesMedida::codes();

        $this->assertSame(
            ['RL', 'M', 'M2', 'KG', 'G', 'UN', 'MIL', 'L', 'CX'],
            $codes
        );
        $this->assertCount(count($codes), UnidadesMedida::catalog());
        $this->assertSame('in:RL,M,M2,KG,G,UN,MIL,L,CX', UnidadesMedida::validationRule());
    }

    public function test_is_official_is_case_insensitive(): void
    {
        $this->assertTrue(UnidadesMedida::isOfficial('mil'));
        $this->assertTrue(UnidadesMedida::isOfficial('KG'));
        $this->assertFalse(UnidadesMedida::isOfficial('PC'));
        $this->assertFalse(UnidadesMedida::isOfficial(null));
        $this->assertFalse(UnidadesMedida::isOfficial(''));
    }
}
