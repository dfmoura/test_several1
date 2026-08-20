<?php

namespace Tests\Unit;

use App\Services\Comercial\Orcamento\OrcamentoMotor;
use Tests\TestCase;

class OrcamentoMotorTest extends TestCase
{
    public function test_brahva_faixas_bate_excel(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_brahva.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $result = $motor->calcular([
            'cliente' => $fx['cliente'],
            'medida' => $fx['medida'],
            'largura_cm' => $fx['largura_cm'],
            'puxada_cm' => $fx['puxada_cm'],
            'cores' => $fx['cores'],
            'papel' => $fx['papel'],
            'acabamento' => $fx['acabamento'],
            'modelos' => $fx['modelos'],
            'colunas' => $fx['colunas'],
            'etiq_por_rolo' => $fx['etiq_por_rolo'],
            'tubete' => $fx['tubete'],
            'z' => $fx['z'],
            'maquina' => $fx['maquina'],
            'maquina_roda_servico' => $fx['maquina_roda_servico'],
            'imposto_pct' => $fx['imposto_pct'],
            'matriz' => $fx['matriz'],
            'coluna_rebobinacao' => $fx['coluna_rebobinacao'],
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'faixas' => array_map(static fn (array $f) => [
                'quantidade' => $f['quantidade'],
                'comissao_pct' => $f['comissao_pct'],
            ], $fx['faixas']),
        ]);

        $this->assertTrue($result['cobra_matriz']);
        $this->assertSame(536.0, $result['valor_matriz']);
        $this->assertCount(3, $result['faixas']);

        foreach ($fx['faixas'] as $i => $faixaFx) {
            $got = $result['faixas'][$i];
            $excel = $faixaFx['excel'];
            $this->assertSame((int) $faixaFx['quantidade'], $got['quantidade']);
            $this->assertEqualsWithDelta($excel['etiqueta'], $got['valor_etiqueta'], 0.01);
            $this->assertEqualsWithDelta($excel['matriz'], $got['valor_matriz'], 0.01);
            $this->assertEqualsWithDelta($excel['total'], $got['valor_total'], 0.01);
            $this->assertEqualsWithDelta($excel['m2'], $got['m2'], 0.05);
            $this->assertEqualsWithDelta($excel['perda_papel_troca_produto'], $got['perda_papel_troca_produto'], 0.01);
            $this->assertEqualsWithDelta($excel['valor_papel_troca_produto'], $got['valor_papel_troca_produto'], 0.01);
        }
    }

    public function test_matriz_isenta_quando_ja_cobrada(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_brahva.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $result = $motor->calcular([
            'cliente' => $fx['cliente'],
            'medida' => $fx['medida'],
            'largura_cm' => $fx['largura_cm'],
            'puxada_cm' => $fx['puxada_cm'],
            'cores' => $fx['cores'],
            'papel' => $fx['papel'],
            'acabamento' => $fx['acabamento'],
            'modelos' => $fx['modelos'],
            'colunas' => $fx['colunas'],
            'etiq_por_rolo' => $fx['etiq_por_rolo'],
            'tubete' => $fx['tubete'],
            'z' => $fx['z'],
            'maquina' => $fx['maquina'],
            'imposto_pct' => $fx['imposto_pct'],
            'matriz' => 'SIM',
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'matriz_ja_cobrada' => true,
            'faixas' => [['quantidade' => 7000, 'comissao_pct' => 0]],
        ]);

        $this->assertFalse($result['cobra_matriz']);
        $this->assertSame(0.0, $result['valor_matriz']);
        $this->assertSame(0.0, $result['faixas'][0]['valor_matriz']);
    }
}
