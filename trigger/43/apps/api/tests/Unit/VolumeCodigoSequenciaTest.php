<?php

namespace Tests\Unit;

use App\Support\VolumeCodigoSequencia;
use PHPUnit\Framework\TestCase;

class VolumeCodigoSequenciaTest extends TestCase
{
    public function test_incrementa_o_numero_final_e_preserva_zeros(): void
    {
        $this->assertSame('VIR-MP-PAP-013-2', VolumeCodigoSequencia::proximo('VIR-MP-PAP-013-1', []));
        $this->assertSame('BOB-02', VolumeCodigoSequencia::proximo('BOB-01', []));
        $this->assertSame('COL-100', VolumeCodigoSequencia::proximo('COL-99', []));
    }

    public function test_codigo_sem_numero_segue_com_sufixo(): void
    {
        $this->assertSame('BOB-A-2', VolumeCodigoSequencia::proximo('BOB-A', []));
        $this->assertSame('BOB-A-3', VolumeCodigoSequencia::proximo('BOB-A', ['BOB-A-2']));
    }

    public function test_reservar_mantem_livre_e_avanca_ocupado_sem_distinguir_maiusculas(): void
    {
        $this->assertSame('BOB-01', VolumeCodigoSequencia::reservar('BOB-01', ['OUTRO']));
        $this->assertSame('BOB-02', VolumeCodigoSequencia::reservar('BOB-01', ['bob-01']));
        $this->assertSame('BOB-03', VolumeCodigoSequencia::reservar('BOB-01', ['BOB-01', 'BOB-02']));
    }

    public function test_canonico_e_o_padrao_vir_ou_aju(): void
    {
        $this->assertSame('VIR-MP-PAP-013-1', VolumeCodigoSequencia::canonico('VIR', 'MP-PAP-013', 1));
        $this->assertSame('AJU-MP-PAP-013-4', VolumeCodigoSequencia::canonico('AJU', 'MP-PAP-013', 4));
    }

    public function test_cauda_numerica_cabe_em_60(): void
    {
        $prefixo = str_repeat('P', 59);
        $base = $prefixo.'1';
        $this->assertSame(60, mb_strlen($base));
        $proximo = VolumeCodigoSequencia::proximo($base, [$base]);
        $this->assertLessThanOrEqual(60, mb_strlen($proximo));
        $this->assertStringEndsWith('2', $proximo);
    }
}
