<?php

namespace Tests\Unit;

use App\Services\Comercial\Orcamento\OrcamentoMotor;
use App\Services\Comercial\Orcamento\OrcamentoServicoPrecificador;
use App\Support\TipoOperacaoSaida;
use Tests\TestCase;

class OrcamentoServicoPrecificadorTest extends TestCase
{
    public function test_preco_comercial_sem_motor_de_etiqueta(): void
    {
        $out = (new OrcamentoServicoPrecificador(new OrcamentoMotor()))->calcular([
            'tipo_servico' => 'REBOBINACAO',
            'faixas' => [
                ['quantidade' => 10, 'valor_unitario' => 12.3, 'comissao_pct' => 0],
            ],
        ]);

        $this->assertSame(TipoOperacaoSaida::SERVICO, $out['tipo_operacao']);
        $this->assertSame('SVC-001', $out['familia_fiscal']);
        $this->assertFalse($out['cobra_matriz']);
        $this->assertSame(0.0, $out['valor_matriz']);
        $this->assertSame(123.0, $out['faixas'][0]['valor_servico']);
        $this->assertGreaterThanOrEqual(123.0, $out['faixas'][0]['valor_etiqueta']);
        $this->assertSame(0.0, $out['faixas'][0]['valor_papel']);
    }
}
