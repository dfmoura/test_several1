<?php

namespace Tests\Unit;

use App\Support\TituloAging;
use Carbon\Carbon;
use Tests\TestCase;

class TituloAgingTest extends TestCase
{
    public function test_faixas_canonicas(): void
    {
        $hoje = Carbon::parse('2026-08-18');

        $this->assertSame(TituloAging::A_VENCER, TituloAging::faixaDeVencimento('2026-08-25', $hoje));
        $this->assertSame(TituloAging::VENCE_HOJE, TituloAging::faixaDeVencimento('2026-08-18', $hoje));
        $this->assertSame(TituloAging::D_1_30, TituloAging::faixaDeVencimento('2026-08-17', $hoje));
        $this->assertSame(TituloAging::D_1_30, TituloAging::faixaDeVencimento('2026-07-19', $hoje));
        $this->assertSame(TituloAging::D_31_60, TituloAging::faixaDeVencimento('2026-07-18', $hoje));
        $this->assertSame(TituloAging::D_61_90, TituloAging::faixaDeVencimento('2026-06-18', $hoje));
        $this->assertSame(TituloAging::D_90_MAIS, TituloAging::faixaDeVencimento('2026-05-01', $hoje));

        $this->assertSame(1, TituloAging::diasAtraso('2026-08-17', $hoje));
        $this->assertTrue(TituloAging::vencido(1));
        $this->assertFalse(TituloAging::vencido(0));
        $this->assertFalse(TituloAging::vencido(-3));
    }
}
