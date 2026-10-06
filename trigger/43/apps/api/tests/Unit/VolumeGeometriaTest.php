<?php

namespace Tests\Unit;

use App\Support\VolumeGeometria;
use PHPUnit\Framework\TestCase;

class VolumeGeometriaTest extends TestCase
{
    public function test_m2_deriva_comprimento_a_partir_da_largura_e_da_area(): void
    {
        $g = VolumeGeometria::fechar('210', null, '210.0000', 'M2');

        $this->assertSame(VolumeGeometria::STATUS_FECHADO, $g['status']);
        $this->assertSame('210.00', $g['largura_mm']);
        $this->assertSame('1000.00', $g['comprimento_m']);
        $this->assertSame('210.0000', $g['qtde']);
    }

    public function test_m2_deriva_largura_a_partir_do_metro_e_da_area(): void
    {
        $g = VolumeGeometria::fechar(null, '1000', '210.0000', 'M2');

        $this->assertSame('210.00', $g['largura_mm']);
        $this->assertSame('1000.00', $g['comprimento_m']);
    }

    public function test_m2_preenche_qtde_com_area_quando_lx_c_vierem_sozinhos(): void
    {
        $g = VolumeGeometria::fechar('330', '1000', null, 'M2');

        $this->assertSame('330.0000', $g['qtde']);
        $this->assertSame('330.0000', $g['area_m2']);
    }

    public function test_m2_recusa_tripla_que_nao_fecha(): void
    {
        $g = VolumeGeometria::fechar('210', '1020', '210.0000', 'M2');

        $this->assertSame(VolumeGeometria::STATUS_CONTRADITORIO, $g['status']);
        $this->assertNotNull($g['mensagem']);
    }

    public function test_metro_usa_a_quantidade_como_comprimento_do_rolo(): void
    {
        $g = VolumeGeometria::fechar('40', null, '250.0000', 'M');

        $this->assertSame(VolumeGeometria::STATUS_FECHADO, $g['status']);
        $this->assertSame('40.00', $g['largura_mm']);
        $this->assertSame('250.00', $g['comprimento_m']);
        $this->assertSame('10.0000', $g['area_m2']);
    }

    public function test_metro_recusa_quantidade_diferente_do_comprimento(): void
    {
        $g = VolumeGeometria::fechar('40', '250', '100.0000', 'M');

        $this->assertSame(VolumeGeometria::STATUS_CONTRADITORIO, $g['status']);
    }

    public function test_rl_nao_inventa_metro_a_partir_da_contagem(): void
    {
        $g = VolumeGeometria::fechar('100', null, '1.0000', 'RL');

        $this->assertSame(VolumeGeometria::STATUS_FECHADO, $g['status']);
        $this->assertSame('100.00', $g['largura_mm']);
        $this->assertNull($g['comprimento_m']);
        $this->assertSame('1.0000', $g['qtde']);
    }

    public function test_pedido_em_metros_soma_n_vezes_comprimento(): void
    {
        $qtde = VolumeGeometria::qtdePedido('M', 'M', [
            ['quantidade' => '2', 'comprimento_m' => '1000'],
            ['quantidade' => '1', 'comprimento_m' => '500'],
        ]);

        $this->assertSame('2500.0000', $qtde);
    }

    public function test_pedido_em_rolos_conta_volumes_quando_saldo_nao_e_m2(): void
    {
        $qtde = VolumeGeometria::qtdePedido('RL', 'RL', [
            ['quantidade' => '3', 'comprimento_m' => '1000'],
        ]);

        $this->assertSame('3.0000', $qtde);
        $this->assertNull(VolumeGeometria::qtdePedido('M2', 'M2', [
            ['quantidade' => '1', 'comprimento_m' => '1000'],
        ]));
    }

    public function test_um_volume_em_metros_e_um_rolo(): void
    {
        $this->assertSame('1000.0000', VolumeGeometria::qtdeDeUmVolume('M', 'M', '1000'));
        $this->assertSame('1.0000', VolumeGeometria::qtdeDeUmVolume('RL', 'RL', '1000'));
        $this->assertNull(VolumeGeometria::qtdeDeUmVolume('M2', 'M2', '1000'));
    }
}
