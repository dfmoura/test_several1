<?php

namespace Tests\Unit;

use App\Models\PedidoItem;
use App\Services\Comercial\Orcamento\OrcamentoRevendaPrecificador;
use App\Support\TipoOperacaoSaida;
use Tests\TestCase;

class OrcamentoRevendaPrecificadorTest extends TestCase
{
    public function test_preco_comercial_sem_motor_nem_teto_de_servico(): void
    {
        $out = (new OrcamentoRevendaPrecificador())->calcular([
            'produto_id' => 9,
            'produto_codigo' => 'REV-RIB-001',
            'produto_descricao' => 'Ribbon cera 110 mm',
            'familia_fiscal' => 'REV-RIB',
            'unidade' => 'UN',
            'faixas' => [
                ['quantidade' => 4, 'valor_unitario' => 37.5, 'comissao_pct' => 0],
            ],
        ]);

        $this->assertSame(TipoOperacaoSaida::INDUSTRIALIZACAO, $out['tipo_operacao']);
        $this->assertSame(PedidoItem::NEC_REVENDA, $out['necessidade']);
        $this->assertSame('REV-RIB', $out['familia_fiscal']);
        $this->assertFalse($out['cobra_matriz']);
        $this->assertSame(0.0, $out['valor_matriz']);
        $this->assertSame(150.0, $out['faixas'][0]['valor_etiqueta']);
        $this->assertSame(150.0, $out['faixas'][0]['valor_total']);
        $this->assertSame(0.0, $out['faixas'][0]['valor_papel']);
    }
}
