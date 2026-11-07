<?php

namespace Tests\Unit;

use App\Services\Comercial\Orcamento\OrcamentoCatalogo;
use App\Services\Comercial\Orcamento\OrcamentoMotor;
use Tests\TestCase;

/**
 * Override ORC de Papel/Acabamento deve vencer o preço SKU do catálogo.
 * Regressão: sem override o SKU continua vencendo o mapa por nome.
 */
class OrcamentoOverrideSkuTest extends TestCase
{
    public function test_preco_papel_sku_vence_sem_override(): void
    {
        $cat = $this->catalogoComSkuPapel(4.2, 'BOPP BRILHO AUTOADESIVO');

        $this->assertEqualsWithDelta(4.2, $cat->precoPapelEfetivo([
            'papel_produto_id' => 42,
            'papel' => 'BOPP BRILHO AUTOADESIVO',
        ]), 0.0001);
    }

    public function test_override_papel_vence_sku_e_limpar_restaura(): void
    {
        $base = $this->catalogoComSkuPapel(4.2, 'BOPP BRILHO AUTOADESIVO');
        $comOv = $base->withOverrides([
            'papel' => ['BOPP BRILHO AUTOADESIVO' => 9.9],
        ]);

        $input = [
            'papel_produto_id' => 42,
            'papel' => 'BOPP BRILHO AUTOADESIVO',
        ];
        $this->assertEqualsWithDelta(9.9, $comOv->precoPapelEfetivo($input), 0.0001);

        $limpo = $base->withOverrides([]);
        $this->assertEqualsWithDelta(4.2, $limpo->precoPapelEfetivo($input), 0.0001);
    }

    public function test_override_papel_por_tarifa_vence_sku(): void
    {
        $cat = $this->catalogoComSkuPapel(4.2, 'COUCHE FASSON 20G');
        $adj = $cat->withOverrides([
            'papel' => ['COUCHE FASSON 20G' => 11.5],
        ]);

        $this->assertEqualsWithDelta(11.5, $adj->precoPapelEfetivo([
            'papel_produto_id' => 42,
            'papel' => 'PAPEL COUCHE 20G AUTOADESIVO FASSON',
            'papel_tarifa' => 'COUCHE FASSON 20G',
        ]), 0.0001);
    }

    public function test_preco_acabamento_sku_vence_sem_override(): void
    {
        $cat = $this->catalogoComSkuAcabamento(3.1, 'LAMINAÇÃO FOSCA');

        $this->assertEqualsWithDelta(3.1, $cat->precoAcabamentoEfetivo([
            'acabamento_produto_id' => 99,
            'acabamento' => 'LAMINAÇÃO FOSCA',
        ]), 0.0001);
    }

    public function test_override_acabamento_vence_sku_e_limpar_restaura(): void
    {
        $base = $this->catalogoComSkuAcabamento(3.1, 'LAMINAÇÃO FOSCA');
        $comOv = $base->withOverrides([
            'acabamentos' => ['LAMINAÇÃO FOSCA' => 7.7],
        ]);

        $input = [
            'acabamento_produto_id' => 99,
            'acabamento' => 'LAMINAÇÃO FOSCA',
        ];
        $this->assertEqualsWithDelta(7.7, $comOv->precoAcabamentoEfetivo($input), 0.0001);

        $limpo = $base->withOverrides(['acabamentos' => []]);
        $this->assertEqualsWithDelta(3.1, $limpo->precoAcabamentoEfetivo($input), 0.0001);
    }

    public function test_motor_reflete_override_papel_sku_em_valor_e_tarifas(): void
    {
        $fixturePath = dirname(__DIR__).'/fixtures/orcamento_brahva.json';
        $fx = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        $cat = OrcamentoCatalogo::loadFromJson();
        $cat->papelPorProduto = [42 => 3.0];

        $baseInput = [
            'cliente' => $fx['cliente'],
            'medida' => $fx['medida'],
            'largura_cm' => $fx['largura_cm'],
            'puxada_cm' => $fx['puxada_cm'],
            'cores' => $fx['cores'],
            'papel' => $fx['papel'],
            'papel_produto_id' => 42,
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
            'faixas' => [['quantidade' => 7000, 'comissao_pct' => 0]],
        ];

        $motor = new OrcamentoMotor;
        $sku = $motor->calcular(array_merge($baseInput, [
            'overrides' => null,
        ]), $cat);
        $ov = $motor->calcular(array_merge($baseInput, [
            'overrides' => [
                'papel' => [$fx['papel'] => 20.0],
            ],
        ]), $cat);

        $this->assertEqualsWithDelta(3.0, (float) $sku['catalog_snapshot']['tarifas_resolvidas']['preco_papel'], 0.001);
        $this->assertEqualsWithDelta(20.0, (float) $ov['catalog_snapshot']['tarifas_resolvidas']['preco_papel'], 0.001);
        $this->assertGreaterThan(
            (float) $sku['faixas'][0]['valor_papel'],
            (float) $ov['faixas'][0]['valor_papel'],
        );
        $this->assertGreaterThan(
            (float) $sku['faixas'][0]['valor_etiqueta'],
            (float) $ov['faixas'][0]['valor_etiqueta'],
        );

        $limpo = $motor->calcular(array_merge($baseInput, [
            'overrides' => ['papel' => []],
        ]), $cat);
        $this->assertEqualsWithDelta(3.0, (float) $limpo['catalog_snapshot']['tarifas_resolvidas']['preco_papel'], 0.001);
        $this->assertEqualsWithDelta(
            (float) $sku['faixas'][0]['valor_papel'],
            (float) $limpo['faixas'][0]['valor_papel'],
            0.001,
        );
    }

    private function catalogoComSkuPapel(float $precoSku, string $nomeLegado): OrcamentoCatalogo
    {
        $cat = new OrcamentoCatalogo(
            papel: [$nomeLegado => 1.0],
        );
        $cat->papelPorProduto = [42 => $precoSku];

        return $cat;
    }

    private function catalogoComSkuAcabamento(float $precoSku, string $rotulo): OrcamentoCatalogo
    {
        $cat = new OrcamentoCatalogo(
            acabamentos: [$rotulo => 1.0, 'VERNIZ' => 2.0],
        );
        $cat->acabamentoPorProduto = [
            99 => [
                'preco' => $precoSku,
                'cola' => null,
                'perda' => 5.0,
                'grupo' => 'MP-LAM',
            ],
        ];

        return $cat;
    }
}
