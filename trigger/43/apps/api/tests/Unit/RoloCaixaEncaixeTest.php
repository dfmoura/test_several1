<?php

namespace Tests\Unit;

use App\Support\RoloCaixaEncaixe;
use PHPUnit\Framework\TestCase;

class RoloCaixaEncaixeTest extends TestCase
{
    public function test_rolo_cabe_quando_a_largura_e_menor_que_um_lado_da_caixa(): void
    {
        $r = RoloCaixaEncaixe::avaliar('10', ['250', '200', '200'], '250x200x200');

        $this->assertSame('cabe', $r['status']);
        $this->assertSame('100.00', $r['rolo_mm']);
        $this->assertSame('O rolo de 100 mm cabe na caixa 250x200x200.', $r['texto']);
    }

    public function test_rolo_nao_cabe_quando_a_largura_passa_do_maior_lado(): void
    {
        $r = RoloCaixaEncaixe::avaliar('30', ['200', '250', '200'], 'EMB-CX-002 · 250x200x200');

        $this->assertSame('nao_cabe', $r['status']);
        $this->assertStringContainsString('300 mm', (string) $r['texto']);
        $this->assertStringContainsString('250 mm', (string) $r['texto']);
    }

    public function test_sem_largura_ou_sem_tres_lados_nao_inventa_encaixe(): void
    {
        $this->assertNull(RoloCaixaEncaixe::avaliar(null, ['250', '200', '200'])['texto']);
        $this->assertSame('sem_dados', RoloCaixaEncaixe::avaliar('10', ['500', '300'])['status']);
        $this->assertNull(RoloCaixaEncaixe::avaliar('10', null)['texto']);
    }
}
