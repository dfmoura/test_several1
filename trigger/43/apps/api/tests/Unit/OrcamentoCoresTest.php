<?php

namespace Tests\Unit;

use App\Support\OrcamentoCores;
use PHPUnit\Framework\TestCase;

class OrcamentoCoresTest extends TestCase
{
    public function test_lisa_e_informada(): void
    {
        $this->assertTrue(OrcamentoCores::isInformada(0));
        $this->assertTrue(OrcamentoCores::isInformada('0'));
        $this->assertTrue(OrcamentoCores::isLisa(0));
        $this->assertTrue(OrcamentoCores::isLisa('0'));
        $this->assertSame('0', OrcamentoCores::chave(0));
        $this->assertSame('0', OrcamentoCores::chave('0'));
    }

    public function test_4v_e_faixa_numerica(): void
    {
        $this->assertSame('4V', OrcamentoCores::chave('4v'));
        $this->assertSame('4V', OrcamentoCores::chave('4V'));
        $this->assertSame('5', OrcamentoCores::chave(5));
        $this->assertTrue(OrcamentoCores::isInformada('4V'));
        $this->assertFalse(OrcamentoCores::isLisa(4));
    }

    public function test_vazio_e_invalido(): void
    {
        $this->assertNull(OrcamentoCores::chave(null));
        $this->assertNull(OrcamentoCores::chave(''));
        $this->assertNull(OrcamentoCores::chave('   '));
        $this->assertNull(OrcamentoCores::chave('9'));
        $this->assertNull(OrcamentoCores::chave('LISA'));
        $this->assertFalse(OrcamentoCores::isInformada(null));
        $this->assertFalse(OrcamentoCores::isInformada(''));
    }
}
