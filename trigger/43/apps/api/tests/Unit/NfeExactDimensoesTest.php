<?php

namespace Tests\Unit;

use App\Support\NfeExactDimensoes;
use PHPUnit\Framework\TestCase;

/**
 * ADR_CADASTRO_INSUMO_VOLUME F2.1 — parse NxLxC Exact + amarre por área.
 */
class NfeExactDimensoesTest extends TestCase
{
    public function test_expandir_slots_iguais(): void
    {
        $slots = NfeExactDimensoes::expandirSlots(
            'COD SPEC: AAS029  |PV: 417698.7  | 4x205x1000 |PEDIDO CLIENTE: 2508261627'
        );

        $this->assertCount(4, $slots);
        foreach ($slots as $slot) {
            $this->assertSame('205.00', $slot['largura_mm']);
            $this->assertSame('1000.00', $slot['comprimento_m']);
            $this->assertSame('205.0000', $slot['area_m2']);
        }
    }

    public function test_expandir_slots_mistos(): void
    {
        $slots = NfeExactDimensoes::expandirSlots(
            'COD SPEC: AAS029  |PV: 417698.9  | 1x215x900 | 1x215x1050 | 4x215x1000 |PEDIDO'
        );

        $this->assertCount(6, $slots);
        $this->assertSame('193.5000', $slots[0]['area_m2']);
        $this->assertSame('900.00', $slots[0]['comprimento_m']);
        $this->assertSame('225.7500', $slots[1]['area_m2']);
        $this->assertSame('1050.00', $slots[1]['comprimento_m']);
        $this->assertSame('215.0000', $slots[2]['area_m2']);
        $this->assertSame('1000.00', $slots[5]['comprimento_m']);
    }

    public function test_amarrar_por_area_mistura(): void
    {
        $inf = '1x215x900 | 1x215x1050 | 4x215x1000';
        $volumes = [
            ['codigo' => 'A', 'qtde' => '225.7500'],
            ['codigo' => 'B', 'qtde' => '215.0000'],
            ['codigo' => 'C', 'qtde' => '193.5000'],
            ['codigo' => 'D', 'qtde' => '215.0000'],
            ['codigo' => 'E', 'qtde' => '215.0000'],
            ['codigo' => 'F', 'qtde' => '215.0000'],
        ];

        $out = NfeExactDimensoes::amarrarVolumes($volumes, $inf, null, 'AAS029-EX4');

        $byCodigo = [];
        foreach ($out as $v) {
            $byCodigo[$v['codigo']] = $v;
        }

        $this->assertSame('215.00', $byCodigo['A']['largura_mm']);
        $this->assertSame('1050.00', $byCodigo['A']['comprimento_m']);
        $this->assertSame('215.00', $byCodigo['C']['largura_mm']);
        $this->assertSame('900.00', $byCodigo['C']['comprimento_m']);
        $this->assertSame('1000.00', $byCodigo['B']['comprimento_m']);
        $this->assertFalse(NfeExactDimensoes::algumSemDimensao($out));
    }

    public function test_sem_inf_ad_usa_heuristica_mm(): void
    {
        $out = NfeExactDimensoes::amarrarVolumes(
            [['codigo' => 'X', 'qtde' => '60.0000']],
            null,
            'FILME 60 MM TRANSPARENTE',
            'ABC'
        );

        $this->assertSame('60.00', $out[0]['largura_mm']);
        $this->assertSame('1000.00', $out[0]['comprimento_m']);
    }

    public function test_sem_match_fica_sem_dimensao(): void
    {
        $out = NfeExactDimensoes::amarrarVolumes(
            [['codigo' => 'X', 'qtde' => '99.0000']],
            '2x210x1000',
            'FASSON ECOPRINT - EXACT 1000',
            'AAS029-EX4'
        );

        $this->assertNull($out[0]['largura_mm']);
        $this->assertNull($out[0]['comprimento_m']);
        $this->assertTrue(NfeExactDimensoes::algumSemDimensao($out));
    }

    public function test_expandir_slots_rls_thermotag(): void
    {
        $slots = NfeExactDimensoes::expandirSlots(
            '(S) 12RLS X 110MM X 1000M / 06RLS X 115MM X 1000M'
        );

        $this->assertCount(18, $slots);
        $resumo = NfeExactDimensoes::resumirSlots($slots);
        $this->assertSame(18, $resumo['volumes']);
        $this->assertSame('2010.0000', $resumo['area_m2']);
        $this->assertSame('110.00', $slots[0]['largura_mm']);
        $this->assertSame('115.00', $slots[17]['largura_mm']);
    }
}
