<?php

namespace Tests\Unit;

use App\Support\OcComposicaoVolumes;
use PHPUnit\Framework\TestCase;

/**
 * ADR_OC_RASCUNHO_ENVIO — expansão composição → volumes (fallback conferência).
 */
class OcComposicaoVolumesTest extends TestCase
{
    public function test_expande_bobinas_inteiras_em_volumes_unitarios(): void
    {
        $vols = OcComposicaoVolumes::expandir(
            [
                ['largura_mm' => '30', 'quantidade' => '1', 'comprimento_m' => '1000', 'area_m2' => '30.0000'],
                ['largura_mm' => '110', 'quantidade' => '2', 'comprimento_m' => '1000', 'area_m2' => '220.0000'],
            ],
            '2026-09-12',
            'OC-2026-00042',
            1,
        );

        $this->assertCount(3, $vols);
        $this->assertSame('30.0000', $vols[0]['qtde']);
        $this->assertSame('30.00', $vols[0]['largura_mm']);
        $this->assertSame('1000.00', $vols[0]['comprimento_m']);
        $this->assertSame('INT-OC202600042-I01-30x1000-01', $vols[0]['codigo']);
        $this->assertSame('oc_composicao', $vols[0]['fonte']);
        $this->assertSame('INT-OC202600042-I01-110x1000-02', $vols[1]['codigo']);
        $this->assertSame('INT-OC202600042-I01-110x1000-03', $vols[2]['codigo']);
        $this->assertSame('110.0000', $vols[1]['qtde']);
        $this->assertSame('110.0000', $vols[2]['qtde']);
        $this->assertSame('250.0000', OcComposicaoVolumes::somaAreaM2([
            ['largura_mm' => '30', 'quantidade' => '1', 'comprimento_m' => '1000', 'area_m2' => '30.0000'],
            ['largura_mm' => '110', 'quantidade' => '2', 'comprimento_m' => '1000', 'area_m2' => '220.0000'],
        ]));
    }

    public function test_codigo_interno_deterministico_e_cap_60(): void
    {
        $c = OcComposicaoVolumes::codigoInterno('OC-2026-00001', 2, '215.00', '1000.00', 4);
        $this->assertSame('INT-OC202600001-I02-215x1000-04', $c);
        $this->assertLessThanOrEqual(60, strlen($c));
        $this->assertStringStartsWith('INT-', $c);
    }
}
