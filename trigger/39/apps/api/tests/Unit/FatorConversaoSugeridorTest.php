<?php

namespace Tests\Unit;

use App\Services\Cadastros\FatorConversaoSugeridor;
use PHPUnit\Framework\TestCase;

class FatorConversaoSugeridorTest extends TestCase
{
    private FatorConversaoSugeridor $sugeridor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->sugeridor = new FatorConversaoSugeridor;
    }

    public function test_unidades_iguais_retorna_um(): void
    {
        $r = $this->sugeridor->sugerir('UN', 'UN');
        $this->assertSame(FatorConversaoSugeridor::STATUS_IGUAL, $r['status']);
        $this->assertSame('1', $r['fator']);
    }

    public function test_mil_para_un_constante(): void
    {
        $r = $this->sugeridor->sugerir('MIL', 'UN');
        $this->assertSame(FatorConversaoSugeridor::STATUS_SUGERIDO, $r['status']);
        $this->assertSame('1000.0000000000', $r['fator']);
        $this->assertSame('constante_mil_un', $r['origem']);
    }

    public function test_un_para_mil_inverso(): void
    {
        $r = $this->sugeridor->sugerir('UN', 'MIL');
        $this->assertSame(FatorConversaoSugeridor::STATUS_SUGERIDO, $r['status']);
        $this->assertSame('0.0010000000', $r['fator']);
    }

    public function test_kg_para_m2_via_gramatura(): void
    {
        // 1 KG = 1000/160 M2 = 6.25
        $r = $this->sugeridor->sugerir('KG', 'M2', ['gramatura_g_m2' => '160']);
        $this->assertSame(FatorConversaoSugeridor::STATUS_SUGERIDO, $r['status']);
        $this->assertSame('6.2500000000', $r['fator']);
    }

    public function test_kg_m2_sem_gramatura_incompleto(): void
    {
        $r = $this->sugeridor->sugerir('KG', 'M2');
        $this->assertSame(FatorConversaoSugeridor::STATUS_INCOMPLETO, $r['status']);
        $this->assertContains('gramatura_g_m2', $r['faltando']);
        $this->assertNull($r['fator']);
    }

    public function test_rl_para_m_via_comprimento(): void
    {
        $r = $this->sugeridor->sugerir('RL', 'M', ['comprimento_m' => '1000']);
        $this->assertSame(FatorConversaoSugeridor::STATUS_SUGERIDO, $r['status']);
        $this->assertSame('1000.0000000000', $r['fator']);
    }

    public function test_rl_para_m2_exemplo_estudo(): void
    {
        // 130 mm × 1000 m = 130 m2
        $r = $this->sugeridor->sugerir('RL', 'M2', [
            'largura_mm' => '130',
            'comprimento_m' => '1000',
        ]);
        $this->assertSame(FatorConversaoSugeridor::STATUS_SUGERIDO, $r['status']);
        $this->assertSame('130.0000000000', $r['fator']);
    }

    public function test_par_sem_formula(): void
    {
        $r = $this->sugeridor->sugerir('MIL', 'KG');
        $this->assertSame(FatorConversaoSugeridor::STATUS_SEM_FORMULA, $r['status']);
        $this->assertNull($r['fator']);
    }
}
