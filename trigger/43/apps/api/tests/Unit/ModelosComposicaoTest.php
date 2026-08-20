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
        $this->assertSame('abacate', $rows[1]['nome']);
        $this->assertEqualsWithDelta(70.0, $rows[1]['percentual'], 0.001);
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
}
