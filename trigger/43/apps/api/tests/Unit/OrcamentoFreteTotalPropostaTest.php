<?php

namespace Tests\Unit;

use App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService;
use Tests\TestCase;

/**
 * Fechamento comercial: frete somável compõe o total; motor intacto.
 */
class OrcamentoFreteTotalPropostaTest extends TestCase
{
    public function test_sem_frete_total_e_o_motor(): void
    {
        $this->assertSame('3626.00', OrcamentoFreteEstimadoService::comporTotalProposta([
            'valor_total' => 3626,
        ]));
    }

    public function test_faca_nova_entra_sem_frete(): void
    {
        $this->assertSame('4426.00', OrcamentoFreteEstimadoService::comporTotalProposta([
            'valor_total' => 3626,
            'valor_total_com_faca' => 4426,
        ]));
    }

    public function test_frete_somavel_compoe_o_total(): void
    {
        $this->assertSame('3651.00', OrcamentoFreteEstimadoService::comporTotalProposta([
            'valor_total' => 3626,
            'valor_frete' => '25.00',
            'frete_somavel' => true,
        ]));
    }

    public function test_faca_mais_frete_somavel(): void
    {
        $this->assertSame('4451.00', OrcamentoFreteEstimadoService::comporTotalProposta([
            'valor_total' => 3626,
            'valor_total_com_faca' => 4426,
            'valor_frete' => '25.00',
            'frete_somavel' => true,
        ]));
    }

    public function test_frete_nao_somavel_nao_infla(): void
    {
        $this->assertSame('3626.00', OrcamentoFreteEstimadoService::comporTotalProposta([
            'valor_total' => 3626,
            'valor_frete' => '99.00',
            'frete_somavel' => false,
        ]));
        $this->assertSame('3626.00', OrcamentoFreteEstimadoService::comporTotalProposta([
            'valor_total' => 3626,
            'valor_frete' => '0.00',
            'frete_somavel' => false,
        ]));
    }

    public function test_fotografia_prevalece_sobre_recomposicao(): void
    {
        $this->assertSame('3651.00', OrcamentoFreteEstimadoService::totalPropostaFaixa([
            'valor_total' => 3626,
            'valor_frete' => '25.00',
            'frete_somavel' => true,
            'valor_total_proposta' => '3651.00',
        ]));
        $this->assertSame('3651.00', OrcamentoFreteEstimadoService::totalPropostaFaixa([
            'valor_total' => 1,
            'valor_total_proposta' => '3651.00',
        ]));
    }
}
