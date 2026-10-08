<?php

namespace Tests\Unit;

use App\Services\Comercial\Orcamento\OrcamentoCatalogo;
use PHPUnit\Framework\TestCase;

class CaixaEmpacotamentoTubeteTest extends TestCase
{
    public function test_tubete_um_e_meio_usa_a_propria_caixa_quando_a_linha_existe(): void
    {
        $cat = new OrcamentoCatalogo(caixaEmpacotamento: [
            '1"' => ['medida' => '250x200x200', 'rolos_por_caixa' => 12, 'caixa_id' => 2],
            '1" 1/2' => [
                'medida' => '300x300x317',
                'rolos_por_caixa' => 8,
                'caixa_id' => null,
                'produto_codigo' => 'EMB-CX-004',
            ],
        ]);

        $this->assertSame('300x300x317', $cat->medidaCaixaPreferida('1" 1/2'));
        $this->assertSame(8, $cat->rolosPorCaixa('1" 1/2'));
        $this->assertSame('250x200x200', $cat->medidaCaixaPreferida('1"'));
    }

    public function test_tubete_um_e_meio_sem_linha_segue_a_caixa_de_uma_polegada(): void
    {
        $cat = new OrcamentoCatalogo(caixaEmpacotamento: [
            '1"' => ['medida' => '250x200x200', 'rolos_por_caixa' => 12, 'caixa_id' => 2],
            '3"' => ['medida' => '500x300x300', 'rolos_por_caixa' => 12, 'caixa_id' => 6],
        ]);

        $this->assertSame('250x200x200', $cat->medidaCaixaPreferida('1" 1/2'));
        $this->assertSame(12, $cat->rolosPorCaixa('1" 1/2'));
        $this->assertSame('500x300x300', $cat->medidaCaixaPreferida('3"'));
    }

    public function test_payload_guarda_o_codigo_da_caixa(): void
    {
        $out = OrcamentoCatalogo::normalizeCaixaEmpacotamentoPayload([
            '1"' => [
                'medida' => '250x200x200',
                'rolos_por_caixa' => 12,
                'caixa_id' => 2,
                'produto_codigo' => 'EMB-CX-002',
            ],
            '3"' => [
                'medida' => '500x300x300',
                'rolos_por_caixa' => 12,
                'produto_codigo' => '',
            ],
        ]);

        $this->assertSame('EMB-CX-002', $out['1"']['produto_codigo']);
        $this->assertArrayNotHasKey('produto_codigo', $out['3"']);
    }
}
