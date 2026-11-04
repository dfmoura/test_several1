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
        $this->assertSame(536.0, $result['cromia_referencia']);
        $this->assertSame(4, $result['motor_version']);
        $this->assertCount(3, $result['faixas']);

        foreach ($fx['faixas'] as $i => $faixaFx) {
            $got = $result['faixas'][$i];
            $excel = $faixaFx['excel'];
            $this->assertSame((int) $faixaFx['quantidade'], $got['quantidade']);
            $this->assertSame('cromia_preto_inteiro', $got['troca_produto_modo']);
            $this->assertEqualsWithDelta($excel['etiqueta'], $got['valor_etiqueta'], 0.01);
            $this->assertEqualsWithDelta($excel['matriz'], $got['valor_matriz'], 0.01);
            $this->assertEqualsWithDelta($excel['total'], $got['valor_total'], 0.01);
            $this->assertEqualsWithDelta($excel['m2'], $got['m2'], 0.05);
            $this->assertEqualsWithDelta($excel['valor_troca_produto'], $got['valor_troca_produto'], 0.01);
            $this->assertEqualsWithDelta($excel['perda_papel_troca_produto'], $got['perda_papel_troca_produto'], 0.01);
            $this->assertEqualsWithDelta($excel['valor_papel_troca_produto'], $got['valor_papel_troca_produto'], 0.01);
        }
    }

    public function test_preto_inteiro_usa_fracao_cromia_e_outros_tipos_hora(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_brahva.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
        $base = [
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
            'matriz' => 'NAO',
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'faixas' => [['quantidade' => 7000, 'comissao_pct' => 0]],
        ];

        $preto = $motor->calcular(array_merge($base, [
            'tipo_troca_produto' => 'PRETO INTEIRO',
        ]), $cat);
        $this->assertSame(0.0, $preto['valor_matriz']);
        $this->assertSame(536.0, $preto['cromia_referencia']);
        $this->assertSame('cromia_preto_inteiro', $preto['faixas'][0]['troca_produto_modo']);
        $this->assertEqualsWithDelta(804.0, $preto['faixas'][0]['valor_troca_produto'], 0.01);

        $borda = $motor->calcular(array_merge($base, [
            'tipo_troca_produto' => 'PRETO INTEIRO+BORDA',
        ]), $cat);
        $this->assertSame('hora_parada', $borda['faixas'][0]['troca_produto_modo']);
        // 0,333… h × 6 extras × taxa 210
        $this->assertEqualsWithDelta(210.0 * (1 / 3) * 6, $borda['faixas'][0]['valor_troca_produto'], 0.05);

        $umModelo = $motor->calcular(array_merge($base, [
            'tipo_troca_produto' => 'PRETO INTEIRO',
            'modelos' => 1,
        ]), $cat);
        $this->assertEqualsWithDelta(0.0, $umModelo['faixas'][0]['valor_troca_produto'], 0.01);
    }

    public function test_rv4_amostra_recalculada_motor_v4(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_rv4_sample.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
        $result = $this->calcularComFixture($motor, $cat, $fx);

        $this->assertSame(4, $result['motor_version']);
        $this->assertFalse($result['cobra_matriz']);
        $got = $result['faixas'][0];
        $ref = $fx['faixas'][0]['motor_v4'];
        $this->assertEqualsWithDelta($ref['etiqueta'], $got['valor_etiqueta'], 0.01);
        $this->assertEqualsWithDelta($ref['m2'], $got['m2'], 0.05);
        $this->assertEqualsWithDelta($ref['perda_papel_troca_produto'], $got['perda_papel_troca_produto'], 0.01);
        $this->assertEqualsWithDelta($ref['perda_acerto'], $got['perda_acerto'], 0.01);
        $this->assertEqualsWithDelta($ref['valor_tinta'], $got['valor_tinta'], 0.05);
        $this->assertSame('hora_parada', $got['troca_produto_modo']);
    }

    public function test_rv8_goldens_controlados(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_rv8_goldens.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
        $this->assertSame(4, $fx['motor_version']);

        foreach ($fx['casos'] as $caso) {
            $result = $motor->calcular([
                'cliente' => 'GOLDEN',
                'medida' => 'TEST',
                'largura_cm' => $caso['largura_cm'],
                'puxada_cm' => $caso['puxada_cm'],
                'cores' => $caso['cores'],
                'papel' => $caso['papel'],
                'acabamento' => $caso['acabamento'],
                'modelos' => $caso['modelos'],
                'colunas' => $caso['colunas'],
                'etiq_por_rolo' => 1000,
                'tubete' => '3"',
                'z' => $caso['z'] ?? null,
                'maquina' => $caso['maquina'],
                'imposto_pct' => 16,
                'matriz' => $caso['matriz'],
                'tipo_troca_produto' => $caso['tipo_troca_produto'],
                'rpm' => 1000,
                'faixas' => [['quantidade' => $caso['quantidade'], 'comissao_pct' => 0]],
            ], $cat);

            $this->assertSame(4, $result['motor_version'], $caso['id']);
            $got = $result['faixas'][0];
            $exp = $caso['esperado'];
            $this->assertEqualsWithDelta($exp['m2'], $got['m2'], 0.05, $caso['id'].' m2');
            $this->assertEqualsWithDelta($exp['perda_acerto'], $got['perda_acerto'], 0.01, $caso['id'].' acerto');
            $this->assertEqualsWithDelta($exp['perda_papel_troca_produto'], $got['perda_papel_troca_produto'], 0.01, $caso['id'].' troca');
            $this->assertEqualsWithDelta($exp['perda_bobina_m2'], $got['perda_bobina_m2'], 0.01, $caso['id'].' bobina');
            $this->assertEqualsWithDelta($exp['valor_tinta'], $got['valor_tinta'], 0.05, $caso['id'].' tinta');
            $this->assertEqualsWithDelta($exp['valor_etiqueta'], $got['valor_etiqueta'], 0.01, $caso['id'].' etiqueta');
            $this->assertEqualsWithDelta($exp['valor_troca_produto'], $got['valor_troca_produto'], 0.05, $caso['id'].' vtroca');
            $this->assertEqualsWithDelta($exp['valor_matriz'], $got['valor_matriz'], 0.01, $caso['id'].' matriz');
        }
    }

    public function test_perda_troca_zero_com_um_modelo(): void
    {
        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
        $this->assertEqualsWithDelta(
            0.0,
            $motor->perdaTrocaProdutoM2(6, 8.5, 1, 3, $cat),
            0.0001,
        );
        $this->assertEqualsWithDelta(
            (8.5 / 100.0) * 3 * 7 * 1,
            $motor->perdaTrocaProdutoM2(6, 8.5, 2, 3, $cat),
            0.0001,
        );
    }

    public function test_perda_acerto_ml_vezes_largura_colunas(): void
    {
        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
        // ml(6)=220 → (8.5/100)*220*3
        $this->assertEqualsWithDelta(56.1, $motor->perdaAcertoM2(6, 8.5, 3, $cat), 0.01);
        // 4V ≡ 4.1 ml=200 → (5.5/100)*200*1
        $this->assertEqualsWithDelta(11.0, $motor->perdaAcertoM2('4V', 5.5, 1, $cat), 0.01);
        $this->assertEqualsWithDelta(11.0, $motor->perdaAcertoM2(4.1, 5.5, 1, $cat), 0.01);
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

        $this->assertSame(4, $result['motor_version']);
        $this->assertArrayHasKey('setup_horas', $result['catalog_snapshot']);
        $this->assertArrayHasKey('ceiling_etiqueta', $result['catalog_snapshot']);
        $this->assertArrayHasKey('minutos_troca_bobina', $result['catalog_snapshot']);
        $this->assertArrayHasKey('perda_papel_acerto_ml', $result['catalog_snapshot']);
        $this->assertSame(4, $result['catalog_snapshot']['motor_version']);
        $this->assertArrayHasKey('cromia_referencia', $result['catalog_snapshot']);
        $this->assertSame(536.0, $result['catalog_snapshot']['cromia_referencia']);
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
        $this->assertEquals(0.0, (float) $base['faixas'][0]['valor_caixa']);
        $this->assertEquals(0.0, (float) $adj['faixas'][0]['valor_caixa']);
    }

    public function test_cores_lisa_sem_tinta_nem_matriz(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_brahva.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $motor = new OrcamentoMotor;
        $cat = OrcamentoCatalogo::loadFromJson();
        $this->assertTrue($cat->usaTintaMatriz());
        $this->assertSame(0.0, $cat->tintaMatrizRate(80.0, 0));
        $this->assertSame(0.0, $cat->tintaMatrizRate(80.0, '0'));

        $result = $motor->calcular([
            'cliente' => $fx['cliente'],
            'medida' => $fx['medida'],
            'largura_cm' => $fx['largura_cm'],
            'puxada_cm' => $fx['puxada_cm'],
            'cores' => 0,
            'papel' => $fx['papel'],
            'acabamento' => $fx['acabamento'],
            'modelos' => 1,
            'colunas' => $fx['colunas'],
            'etiq_por_rolo' => $fx['etiq_por_rolo'],
            'tubete' => $fx['tubete'],
            'z' => $fx['z'],
            'maquina' => $fx['maquina'],
            'imposto_pct' => $fx['imposto_pct'],
            'matriz' => 'SIM',
            'tipo_troca_produto' => 'SEM PARADA',
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'faixas' => [['quantidade' => 7000, 'comissao_pct' => 0]],
        ], $cat);

        // cobra_matriz segue o flag SIM; com 0 cores a geometria zera o valor.
        $this->assertSame(0.0, $result['valor_matriz']);
        $this->assertEqualsWithDelta(0.0, (float) $result['faixas'][0]['valor_tinta'], 0.001);
        $this->assertGreaterThan(0.0, (float) $result['faixas'][0]['valor_etiqueta']);
    }

    public function test_batida_aceita_cores_lisa(): void
    {
        $cat = OrcamentoCatalogo::loadFromJson();
        $this->assertEqualsWithDelta(190.0, $cat->taxaHoraMaquina('BATIDA', 0), 0.001);
        $this->assertEqualsWithDelta(190.0, $cat->taxaHoraMaquina('BATIDA', '0'), 0.001);
    }
}
