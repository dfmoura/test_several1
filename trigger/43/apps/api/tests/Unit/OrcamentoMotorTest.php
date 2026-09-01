<?php

namespace Tests\Unit;

use App\Services\Comercial\Orcamento\OrcamentoMotor;
use App\Services\Comercial\Orcamento\OrcamentoCatalogo;
use Tests\TestCase;

class OrcamentoMotorTest extends TestCase
{
    public function test_brahva_faixas_bate_excel(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_brahva.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
        $result = $this->calcularComFixture($motor, $cat, $fx);

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

    public function test_rv4_amostra_oficial_motor_v2(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_rv4_sample.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
        $result = $this->calcularComFixture($motor, $cat, $fx);

        $this->assertSame(2, $result['motor_version']);
        $this->assertFalse($result['cobra_matriz']);
        $got = $result['faixas'][0];
        $ref = $fx['faixas'][0]['motor_v2'];
        $this->assertEqualsWithDelta($ref['etiqueta'], $got['valor_etiqueta'], 0.01);
        $this->assertEqualsWithDelta($ref['m2'], $got['m2'], 0.05);
        $this->assertEqualsWithDelta($ref['perda_papel_troca_produto'], $got['perda_papel_troca_produto'], 0.01);
        $this->assertEqualsWithDelta($ref['valor_tinta'], $got['valor_tinta'], 0.05);
    }

    /**
     * @param  array<string, mixed>  $fx
     * @return array<string, mixed>
     */
    private function calcularComFixture(OrcamentoMotor $motor, OrcamentoCatalogo $cat, array $fx): array
    {
        return $motor->calcular([
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
            'z' => $fx['z'] ?? null,
            'maquina' => $fx['maquina'],
            'maquina_roda_servico' => $fx['maquina_roda_servico'] ?? $fx['maquina'],
            'imposto_pct' => $fx['imposto_pct'],
            'matriz' => $fx['matriz'],
            'coluna_rebobinacao' => $fx['coluna_rebobinacao'] ?? 1,
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'] ?? null,
            'faixas' => array_map(static fn (array $f) => [
                'quantidade' => $f['quantidade'],
                'comissao_pct' => $f['comissao_pct'],
            ], $fx['faixas']),
        ], $cat);
    }

    public function test_matriz_isenta_quando_ja_cobrada(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_brahva.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
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
        ], $cat);

        $this->assertFalse($result['cobra_matriz']);
        $this->assertSame(0.0, $result['valor_matriz']);
        $this->assertSame(0.0, $result['faixas'][0]['valor_matriz']);
    }

    public function test_motor_version_and_catalog_snapshot_incluem_escalares(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_brahva.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
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
            'matriz' => $fx['matriz'],
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'faixas' => [['quantidade' => $fx['faixas'][0]['quantidade'], 'comissao_pct' => 0]],
        ], $cat);

        $this->assertSame(2, $result['motor_version']);
        $this->assertArrayHasKey('setup_horas', $result['catalog_snapshot']);
        $this->assertArrayHasKey('ceiling_etiqueta', $result['catalog_snapshot']);
        $this->assertArrayHasKey('minutos_troca_bobina', $result['catalog_snapshot']);
        $this->assertSame(2, $result['catalog_snapshot']['motor_version']);
        $this->assertArrayHasKey('tarifas_resolvidas', $result['catalog_snapshot']);
        $tarifas = $result['catalog_snapshot']['tarifas_resolvidas'];
        $this->assertEqualsWithDelta(8.0, (float) $tarifas['preco_papel'], 0.001);
        $this->assertEqualsWithDelta(0.8, (float) $tarifas['tinta_acima_m2'], 0.001);
        $this->assertSame($fx['papel'], $tarifas['papel']);
        $this->assertArrayHasKey('taxa_hora_maquina', $tarifas);
        $this->assertArrayHasKey('preco_caixa', $tarifas);
    }

    public function test_override_hora_maquina_e_tubete_reflete_no_resultado(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_brahva.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
        $base = $motor->calcular([
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
            'matriz' => $fx['matriz'],
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'faixas' => [['quantidade' => 7000, 'comissao_pct' => 0]],
        ], $cat);

        $adj = $motor->calcular([
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
            'matriz' => $fx['matriz'],
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => array_merge($fx['overrides'], [
                'preco_caixa' => 99.0,
                'hora_maquina' => [
                    $fx['maquina'] => ['5' => 1.0],
                ],
            ]),
            'faixas' => [['quantidade' => 7000, 'comissao_pct' => 0]],
        ], $cat);

        $this->assertLessThan(
            (float) $base['faixas'][0]['valor_maquina'],
            (float) $adj['faixas'][0]['valor_maquina'],
        );
        $this->assertEqualsWithDelta(99.0, (float) $adj['catalog_snapshot']['tarifas_resolvidas']['preco_caixa'], 0.001);
        $this->assertGreaterThan(
            (float) $base['faixas'][0]['valor_caixa'],
            (float) $adj['faixas'][0]['valor_caixa'],
        );
    }
}
