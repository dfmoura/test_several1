<?php

namespace Tests\Unit;

use App\Models\FaturamentoItem;
use App\Services\Fiscal\ItensFiscaisNfe;
use PHPUnit\Framework\TestCase;

class ItensFiscaisNfeTest extends TestCase
{
    public function test_pa_absorve_matriz_faca_e_arte(): void
    {
        $out = ItensFiscaisNfe::consolidar([
            [
                'descricao' => 'Etiqueta promocional',
                'familia_fiscal' => 'PA-ETQ',
                'qtde' => '100.0000',
                'preco_unitario' => '2.000000',
                'valor' => '200.00',
            ],
            [
                'descricao' => FaturamentoItem::DESC_MATRIZ,
                'familia_fiscal' => 'PA-ETQ',
                'qtde' => '1.0000',
                'preco_unitario' => '40.000000',
                'valor' => '40.00',
            ],
            [
                'descricao' => FaturamentoItem::DESC_FACA,
                'familia_fiscal' => 'PA-ETQ',
                'qtde' => '1.0000',
                'preco_unitario' => '10.000000',
                'valor' => '10.00',
            ],
            [
                'descricao' => FaturamentoItem::DESC_ARTE_PREFIX.'Logo',
                'familia_fiscal' => 'PA-ETQ',
                'qtde' => '1.0000',
                'preco_unitario' => '5.000000',
                'valor' => '5.00',
            ],
        ]);

        $this->assertCount(1, $out);
        $this->assertSame('Etiqueta promocional', $out[0]['descricao']);
        $this->assertSame('255.00', $out[0]['valor']);
        $this->assertTrue(ItensFiscaisNfe::temSetup([
            ['descricao' => FaturamentoItem::DESC_MATRIZ],
        ]));
    }

    public function test_servico_sem_pa_nao_inventa_mercadoria(): void
    {
        $svc = [
            'descricao' => 'Impressão avulsa',
            'familia_fiscal' => 'SVC',
            'qtde' => '1.0000',
            'preco_unitario' => '80.000000',
            'valor' => '80.00',
        ];
        $out = ItensFiscaisNfe::consolidar([
            $svc,
            [
                'descricao' => FaturamentoItem::DESC_MATRIZ,
                'familia_fiscal' => 'PA-ETQ',
                'qtde' => '1.0000',
                'preco_unitario' => '20.000000',
                'valor' => '20.00',
            ],
        ]);

        $this->assertCount(1, $out);
        $this->assertSame('Impressão avulsa', $out[0]['descricao']);
        $this->assertSame('80.00', $out[0]['valor']);
    }
}
