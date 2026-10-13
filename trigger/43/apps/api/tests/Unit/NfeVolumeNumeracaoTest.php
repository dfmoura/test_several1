<?php

namespace Tests\Unit;

use App\Services\Fiscal\NfeVolumeNumeracao;
use PHPUnit\Framework\TestCase;

class NfeVolumeNumeracaoTest extends TestCase
{
    public function test_tres_caixas_viram_faixa_e_nao_cortam_o_codigo(): void
    {
        $this->assertSame('CX01-CX03', NfeVolumeNumeracao::nVol([1, 2, 3], 3));
        $this->assertLessThanOrEqual(60, mb_strlen(NfeVolumeNumeracao::nVol([1, 2, 3], 3)));
    }

    public function test_uma_caixa_e_sem_caixa_confirmada(): void
    {
        $this->assertSame('CX01', NfeVolumeNumeracao::nVol([1], 1));
        $this->assertSame('1-3', NfeVolumeNumeracao::nVol([], 3));
        $this->assertSame('1', NfeVolumeNumeracao::nVol([], 1));
    }

    public function test_texto_acima_de_60_nao_entra_no_xml(): void
    {
        $cortado = 'EMBPA-2026-00032-CX01,EMBPA-2026-00032-CX02,EMBPA-2026-00032-CX03';

        $this->assertGreaterThan(60, mb_strlen($cortado));
        $this->assertNull(NfeVolumeNumeracao::paraXml($cortado));
        $this->assertSame('CX01-CX03', NfeVolumeNumeracao::paraXml('CX01-CX03'));
    }
}
