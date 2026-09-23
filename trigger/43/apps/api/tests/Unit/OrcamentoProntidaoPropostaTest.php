<?php

namespace Tests\Unit;

use App\Models\Orcamento;
use App\Models\OrcamentoItem;
use App\Services\Comercial\OrcamentoProntidaoProposta;
use App\Support\TipoOperacaoSaida;
use PHPUnit\Framework\TestCase;

class OrcamentoProntidaoPropostaTest extends TestCase
{
    public function test_apto_com_documento_comercial_completo(): void
    {
        $orc = $this->orcamento();

        $eval = OrcamentoProntidaoProposta::evaluate($orc);

        $this->assertTrue($eval['apto']);
        $this->assertSame([], $eval['pendencias']);
        $this->assertSame([], $eval['bloqueios']);
    }

    public function test_bloqueia_sem_condicao_e_forma(): void
    {
        $orc = $this->orcamento([
            'input_snapshot' => [
                'tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO,
            ],
        ]);

        $eval = OrcamentoProntidaoProposta::evaluate($orc);

        $this->assertFalse($eval['apto']);
        $this->assertArrayHasKey('condicao_pagamento', $eval['bloqueios']);
        $this->assertArrayHasKey('forma_pagamento', $eval['bloqueios']);
        $this->assertContains('Condição de pagamento', $eval['pendencias']);
        $this->assertContains('Forma de pagamento', $eval['pendencias']);
    }

    public function test_nao_exige_vendedor_nem_frete(): void
    {
        $orc = $this->orcamento();
        $this->assertNull($orc->vendedor_parceiro_id);

        $eval = OrcamentoProntidaoProposta::evaluate($orc);

        $this->assertTrue($eval['apto']);
        $this->assertArrayNotHasKey('vendedor_parceiro_id', $eval['bloqueios']);
        $this->assertArrayNotHasKey('valor_frete_manual', $eval['bloqueios']);
        $this->assertArrayNotHasKey('transportador_id', $eval['bloqueios']);
    }

    public function test_bloqueia_faixa_zerada(): void
    {
        $orc = $this->orcamento([
            'result_snapshot' => [
                'faixas' => [
                    ['quantidade' => 1000, 'valor_total' => 0, 'valor_etiqueta' => 0],
                ],
            ],
        ]);

        $eval = OrcamentoProntidaoProposta::evaluate($orc);

        $this->assertFalse($eval['apto']);
        $this->assertArrayHasKey('faixas', $eval['bloqueios']);
        $this->assertContains('Faixas comerciais', $eval['pendencias']);
    }

    public function test_bloqueia_cessao_de_bem(): void
    {
        $orc = $this->orcamento([
            'input_snapshot' => [
                'tipo_operacao' => TipoOperacaoSaida::CESSAO_BEM,
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
            ],
        ]);

        $eval = OrcamentoProntidaoProposta::evaluate($orc);

        $this->assertFalse($eval['apto']);
        $this->assertArrayHasKey('tipo_operacao', $eval['bloqueios']);
    }

    public function test_bloqueia_posicao_sem_calculo(): void
    {
        $orc = $this->orcamento();
        $orc->setRelation('itens', $orc->newCollection([
            new OrcamentoItem([
                'ordem' => 1,
                'input_snapshot' => [
                    'tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO,
                    'condicao_pagamento' => '28 DDL',
                    'forma_pagamento' => 'PIX',
                ],
                'result_snapshot' => [
                    'faixas' => [['quantidade' => 1000, 'valor_total' => 1900, 'valor_etiqueta' => 1900]],
                ],
            ]),
            new OrcamentoItem([
                'ordem' => 2,
                'input_snapshot' => ['tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO],
                'result_snapshot' => ['faixas' => []],
            ]),
        ]));

        $eval = OrcamentoProntidaoProposta::evaluate($orc);

        $this->assertFalse($eval['apto']);
        $this->assertArrayHasKey('itens.2', $eval['bloqueios']);
        $this->assertContains('Posição 2', $eval['pendencias']);
    }

    public function test_assert_pronto_ignora_lembrete(): void
    {
        $orc = $this->orcamento([
            'status' => Orcamento::STATUS_ENVIADO,
            'input_snapshot' => [
                'tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO,
            ],
        ]);

        $this->assertFalse(OrcamentoProntidaoProposta::deveAplicar($orc));
        OrcamentoProntidaoProposta::assertPronto($orc);
        $this->assertFalse(OrcamentoProntidaoProposta::evaluate($orc)['apto']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function orcamento(array $overrides = []): Orcamento
    {
        $orc = new Orcamento(array_merge([
            'id' => 1,
            'status' => Orcamento::STATUS_CALCULADO,
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'input_snapshot' => [
                'tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO,
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
            ],
            'result_snapshot' => [
                'faixas' => [
                    ['quantidade' => 1000, 'valor_total' => 1900.0, 'valor_etiqueta' => 1900.0],
                ],
            ],
        ], $overrides));
        $orc->setRelation('itens', $orc->newCollection());

        return $orc;
    }
}
