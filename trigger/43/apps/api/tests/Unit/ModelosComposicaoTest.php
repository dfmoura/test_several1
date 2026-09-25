<?php

namespace Tests\Unit;

use App\Support\ModelosComposicao;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ModelosComposicaoTest extends TestCase
{
    public function test_equal_split_soma_100(): void
    {
        foreach ([1, 2, 3, 7] as $n) {
            $rows = ModelosComposicao::equalSplit($n);
            $this->assertCount($n, $rows);
            $soma = array_sum(array_column($rows, 'percentual'));
            $this->assertEqualsWithDelta(100.0, $soma, 0.01, "n={$n}");
        }
    }

    public function test_ensure_ausente_gera_equal_split(): void
    {
        $data = ModelosComposicao::ensureInPayload(['modelos' => 2]);
        $this->assertCount(2, $data['modelos_composicao']);
        $this->assertEqualsWithDelta(
            100.0,
            array_sum(array_column($data['modelos_composicao'], 'percentual')),
            0.01
        );
    }

    public function test_normalize_aceita_exemplo_dois_modelos(): void
    {
        $rows = ModelosComposicao::normalizeAndAssert([
            ['nome' => 'maçã verde', 'percentual' => 30],
            ['nome' => 'abacate', 'percentual' => 70],
        ], 2);

        $this->assertSame('maçã verde', $rows[0]['nome']);
        $this->assertSame(1, $rows[0]['ordem']);
        $this->assertEqualsWithDelta(30.0, $rows[0]['percentual'], 0.001);
        $this->assertEqualsWithDelta(0.0, $rows[0]['valor_arte'], 0.001);
        $this->assertSame('abacate', $rows[1]['nome']);
        $this->assertEqualsWithDelta(70.0, $rows[1]['percentual'], 0.001);
        $this->assertSame([], $rows[0]['tintas']);
        $this->assertSame([], $rows[1]['tintas']);
    }

    public function test_normalize_tintas_por_modelo(): void
    {
        $rows = ModelosComposicao::normalizeAndAssert([
            ['nome' => 'maçã verde', 'percentual' => 30, 'tintas' => ['Pantone 354', 'preto', 'Preto', '  ']],
            ['nome' => 'abacate', 'percentual' => 70, 'tintas' => 'Pantone 378, Branco cobrante'],
        ], 2);

        $this->assertSame(['Pantone 354', 'preto'], $rows[0]['tintas']);
        $this->assertSame(['Pantone 378', 'Branco cobrante'], $rows[1]['tintas']);

        $aloc = ModelosComposicao::alocarQuantidades(1000, $rows);
        $this->assertSame(['Pantone 354', 'preto'], $aloc[0]['tintas']);
    }

    public function test_normalize_tintas_ausente_fica_vazio(): void
    {
        $this->assertSame([], ModelosComposicao::normalizeTintas(null));
        $this->assertSame([], ModelosComposicao::normalizeTintas([]));
        $this->assertSame([], ModelosComposicao::equalSplit(1)[0]['tintas']);
    }

    public function test_rejeita_tinta_longa_demais(): void
    {
        $this->expectException(ValidationException::class);
        ModelosComposicao::normalizeTintas([str_repeat('a', 41)]);
    }

    public function test_rejeita_mais_de_doze_tintas(): void
    {
        $this->expectException(ValidationException::class);
        ModelosComposicao::normalizeTintas(range(1, 13));
    }

    public function test_normalize_preserva_valor_arte(): void
    {
        $rows = ModelosComposicao::normalizeAndAssert([
            ['nome' => 'maçã verde', 'percentual' => 30, 'valor_arte' => 120.5],
            ['nome' => 'abacate', 'percentual' => 70, 'valor_arte' => 80],
        ], 2);

        $this->assertEqualsWithDelta(120.5, $rows[0]['valor_arte'], 0.001);
        $this->assertEqualsWithDelta(80.0, $rows[1]['valor_arte'], 0.001);
        $this->assertEqualsWithDelta(200.5, ModelosComposicao::somaValorArte($rows), 0.001);
    }

    public function test_rejeita_soma_diferente_de_100(): void
    {
        $this->expectException(ValidationException::class);
        ModelosComposicao::normalizeAndAssert([
            ['nome' => 'a', 'percentual' => 40],
            ['nome' => 'b', 'percentual' => 40],
        ], 2);
    }

    public function test_rejeita_nome_vazio(): void
    {
        $this->expectException(ValidationException::class);
        ModelosComposicao::normalizeAndAssert([
            ['nome' => '  ', 'percentual' => 100],
        ], 1);
    }

    public function test_rejeita_contagem_divergente(): void
    {
        $this->expectException(ValidationException::class);
        ModelosComposicao::normalizeAndAssert([
            ['nome' => 'só um', 'percentual' => 100],
        ], 2);
    }

    public function test_alocar_quantidades_resto_no_ultimo(): void
    {
        $out = ModelosComposicao::alocarQuantidades(1000, [
            ['nome' => 'maçã verde', 'percentual' => 30],
            ['nome' => 'abacate', 'percentual' => 70],
        ]);

        $this->assertSame(300, $out[0]['quantidade']);
        $this->assertSame(700, $out[1]['quantidade']);
        $this->assertSame(1000, $out[0]['quantidade'] + $out[1]['quantidade']);
    }

    public function test_alocar_arredondamento_preserva_total(): void
    {
        $out = ModelosComposicao::alocarQuantidades(100, [
            ['nome' => 'a', 'percentual' => 33.33],
            ['nome' => 'b', 'percentual' => 33.33],
            ['nome' => 'c', 'percentual' => 33.34],
        ]);

        $this->assertSame(100, array_sum(array_column($out, 'quantidade')));
        $this->assertSame(33, $out[0]['quantidade']);
        $this->assertSame(33, $out[1]['quantidade']);
        $this->assertSame(34, $out[2]['quantidade']);
    }

    public function test_matriz_por_faixa_independente(): void
    {
        $faixas = [
            ['quantidade' => 1000, 'comissao_pct' => 0],
            ['quantidade' => 5000, 'comissao_pct' => 0],
        ];
        $matriz = [
            [300, 700],
            [2000, 3000],
        ];

        $data = ModelosComposicao::ensureInPayload([
            'modelos' => 2,
            'faixas' => $faixas,
            'modelos_composicao' => [
                ['nome' => 'maçã verde', 'percentual' => 30],
                ['nome' => 'abacate', 'percentual' => 70],
            ],
            'modelos_composicao_quantidades' => $matriz,
        ]);

        $this->assertSame($matriz, $data['modelos_composicao_quantidades']);
        $this->assertEqualsWithDelta(30.0, $data['modelos_composicao'][0]['percentual'], 0.001);

        $outFaixa2 = ModelosComposicao::alocarQuantidadesFaixa(
            5000,
            $data['modelos_composicao'],
            $data['modelos_composicao_quantidades'],
            1,
        );
        $this->assertSame(2000, $outFaixa2[0]['quantidade']);
        $this->assertSame(3000, $outFaixa2[1]['quantidade']);
    }

    public function test_rejeita_matriz_com_soma_errada(): void
    {
        $this->expectException(ValidationException::class);
        ModelosComposicao::normalizeQuantidadesMatriz(
            [[400, 700]],
            [['quantidade' => 1000]],
            2,
        );
    }
}
