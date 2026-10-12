<?php

namespace Tests\Unit;

use App\Support\CaixaRoloLeitura;
use PHPUnit\Framework\TestCase;

class CaixaRoloLeituraTest extends TestCase
{
    public function test_marca_as_caixas_cujo_maior_lado_acomoda_a_face(): void
    {
        $leitura = CaixaRoloLeitura::avaliar('30', [
            [
                'codigo' => 'EMB-CX-002',
                'descricao' => '250x200x200',
                'medida' => '250x200x200',
                'lados' => ['250', '200', '200'],
            ],
            [
                'codigo' => 'EMB-CX-007',
                'descricao' => '500x300x300',
                'medida' => '500x300x300',
                'lados' => ['500', '300', '300'],
            ],
        ]);

        $this->assertSame('300', $leitura['largura_mm']);
        $this->assertFalse($leitura['caixas'][0]['cabe']);
        $this->assertTrue($leitura['caixas'][1]['cabe']);
    }
}
