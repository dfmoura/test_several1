<?php

namespace Tests\Unit;

use App\Support\PartidaBobina;
use PHPUnit\Framework\TestCase;

class PartidaBobinaTest extends TestCase
{
    public function test_exemplo_18cm_para_15_5cm_conserva_area(): void
    {
        // 18 cm × 1000 m → necessidade 15,5 cm × 300 m
        $plano = PartidaBobina::planejar('180', '1000', '155', '300', 42);

        $this->assertTrue($plano['aplica']);
        $this->assertSame(42, $plano['lote_pai_id']);
        $this->assertSame('180.00', $plano['L_p']);
        $this->assertSame('155.00', $plano['L_n']);
        $this->assertSame('300.00', $plano['C_u']);
        $this->assertSame('180.0000', $plano['area_pai']);
        $this->assertSame('46.5000', $plano['area_consumida']);
        $this->assertSame('25.00', $plano['refile']['largura_mm']);
        $this->assertSame('1000.00', $plano['refile']['comprimento_m']);
        $this->assertSame('25.0000', $plano['refile']['qtde']);
        $this->assertSame('155.00', $plano['sobra']['largura_mm']);
        $this->assertSame('700.00', $plano['sobra']['comprimento_m']);
        $this->assertSame('108.5000', $plano['sobra']['qtde']);
    }

    public function test_medida_exata_nao_aplica_partida(): void
    {
        $plano = PartidaBobina::planejar('155', '1000', '155', '300');

        $this->assertFalse($plano['aplica']);
    }

    public function test_mais_estreita_recusa(): void
    {
        $plano = PartidaBobina::planejar('140', '1000', '155', '300');

        $this->assertFalse($plano['aplica']);
        $this->assertStringContainsString('estreita', (string) $plano['mensagem']);
    }

    public function test_comprimento_insuficiente_recusa(): void
    {
        $plano = PartidaBobina::planejar('180', '200', '155', '300');

        $this->assertFalse($plano['aplica']);
        $this->assertStringContainsString('Comprimento', (string) $plano['mensagem']);
    }

    public function test_sem_sobra_de_comprimento_quando_usa_tudo(): void
    {
        $plano = PartidaBobina::planejar('180', '300', '155', '300');

        $this->assertTrue($plano['aplica']);
        $this->assertNotNull($plano['refile']);
        $this->assertNull($plano['sobra']);
        $this->assertSame('54.0000', $plano['area_pai']);
        $this->assertSame('46.5000', $plano['area_consumida']);
        $this->assertSame('7.5000', $plano['refile']['qtde']);
    }

    public function test_cabivel_aceita_mais_larga_e_exata(): void
    {
        $this->assertTrue(PartidaBobina::cabeNaLargura('180', '155', PartidaBobina::MODO_CABIVEL));
        $this->assertTrue(PartidaBobina::cabeNaLargura('155', '155', PartidaBobina::MODO_CABIVEL));
        $this->assertTrue(PartidaBobina::cabeNaLargura('155.4', '155', PartidaBobina::MODO_CABIVEL));
        $this->assertFalse(PartidaBobina::cabeNaLargura('154', '155', PartidaBobina::MODO_CABIVEL));
    }

    public function test_exato_rejeita_mais_larga(): void
    {
        $this->assertFalse(PartidaBobina::cabeNaLargura('180', '155', PartidaBobina::MODO_EXATO));
        $this->assertTrue(PartidaBobina::cabeNaLargura('155', '155', PartidaBobina::MODO_EXATO));
    }

    public function test_grupos_partida(): void
    {
        $this->assertTrue(PartidaBobina::produtoPermitePartida('MP-PAP-EXACT', null));
        $this->assertTrue(PartidaBobina::produtoPermitePartida(null, 'MP-FLM'));
        $this->assertFalse(PartidaBobina::produtoPermitePartida('MP-TEC-40', 'MP-TEC'));
        $this->assertFalse(PartidaBobina::produtoPermitePartida('MP-ADF', null));
    }

    public function test_passa_comprimento_mesma_medida(): void
    {
        // 15,5 cm × 1000 m · usa 300 m → Passa 700 m
        $plano = PartidaBobina::planejarSobraComprimento('155', '1000', '155', '300', 7);

        $this->assertTrue($plano['aplica']);
        $this->assertSame(PartidaBobina::TIPO_SOBRA_COMPRIMENTO, $plano['tipo']);
        $this->assertNull($plano['refile']);
        $this->assertSame('155.00', $plano['sobra']['largura_mm']);
        $this->assertSame('700.00', $plano['sobra']['comprimento_m']);
        $this->assertSame('108.5000', $plano['sobra']['qtde']);
        $this->assertSame('108.5000', PartidaBobina::areaRetorno(PartidaBobina::paraPersistencia($plano)));

        $bobinas = PartidaBobina::bobinasRetorno(PartidaBobina::paraPersistencia($plano));
        $this->assertCount(1, $bobinas);
        $this->assertSame('sobra', $bobinas[0]['tipo']);
        $this->assertSame('7-sobra', $bobinas[0]['chave']);
        $this->assertSame('700.00', $bobinas[0]['comprimento_m']);
    }
}
