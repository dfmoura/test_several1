<?php

namespace Tests\Unit;

use App\Support\FacasComposicao;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class FacasComposicaoTest extends TestCase
{
    public function test_ausente_sintetiza_legado_faca_nova(): void
    {
        $data = FacasComposicao::ensureInPayload([
            'formato_faca' => 'OVAL',
            'faca_nova' => true,
            'valor_faca_nova' => 800,
            'prazo_faca_dias' => 5,
            'medida' => '8X12',
            'puxada_cm' => 12.4,
        ]);

        $this->assertCount(1, $data['facas']);
        $this->assertTrue($data['facas'][0]['principal']);
        $this->assertTrue($data['facas'][0]['faca_nova']);
        $this->assertEqualsWithDelta(800.0, $data['facas'][0]['valor_faca'], 0.01);
        $this->assertEqualsWithDelta(800.0, $data['valor_faca_nova'], 0.01);
        $this->assertTrue($data['faca_nova']);
        $this->assertSame(5, $data['prazo_faca_dias']);
    }

    public function test_ausente_sem_faca_retorna_lista_vazia(): void
    {
        $data = FacasComposicao::ensureInPayload([
            'medida' => '8X12',
            'puxada_cm' => 10,
        ]);

        $this->assertSame([], $data['facas']);
        $this->assertEqualsWithDelta(0.0, $data['valor_faca_nova'], 0.01);
        $this->assertFalse($data['faca_nova']);
    }

    public function test_multi_uma_principal_e_soma_valores(): void
    {
        $data = FacasComposicao::ensureInPayload([
            'medida' => '10X10',
            'puxada_cm' => 10,
            'facas' => [
                [
                    'principal' => true,
                    'formato' => 'RETA',
                    'medida' => '10X10',
                    'n_facas' => 12,
                    'valor_faca' => 100,
                    'faca_nova' => true,
                    'prazo_faca_dias' => 3,
                ],
                [
                    'principal' => false,
                    'formato' => 'OVAL',
                    'medida' => '5X5',
                    'n_facas' => 40,
                    'valor_faca' => 50,
                    'faca_nova' => false,
                    'prazo_faca_dias' => 7,
                ],
            ],
        ]);

        $this->assertCount(2, $data['facas']);
        $this->assertEqualsWithDelta(150.0, $data['valor_faca_nova'], 0.01);
        $this->assertSame(7, $data['prazo_faca_dias']);
        $this->assertSame('RETA', $data['formato_faca']);
        $this->assertTrue($data['faca_nova']);
    }

    public function test_sem_principal_marca_primeira(): void
    {
        $data = FacasComposicao::ensureInPayload([
            'facas' => [
                ['formato' => 'RETA', 'medida' => '1X1'],
                ['formato' => 'OVAL', 'medida' => '2X2', 'valor_faca' => 10],
            ],
        ]);

        $this->assertTrue($data['facas'][0]['principal']);
        $this->assertFalse($data['facas'][1]['principal']);
        $this->assertEqualsWithDelta(10.0, FacasComposicao::somaValor($data['facas']), 0.01);
    }

    public function test_duas_principais_falha(): void
    {
        $this->expectException(ValidationException::class);
        FacasComposicao::ensureInPayload([
            'facas' => [
                ['principal' => true, 'formato' => 'RETA'],
                ['principal' => true, 'formato' => 'OVAL'],
            ],
        ]);
    }

    public function test_servico_zera_facas(): void
    {
        $data = FacasComposicao::ensureInPayload([
            'tipo_operacao' => 'SERVICO',
            'facas' => [
                ['principal' => true, 'formato' => 'RETA', 'valor_faca' => 99],
            ],
            'faca_nova' => true,
            'valor_faca_nova' => 99,
        ]);

        $this->assertSame([], $data['facas']);
        $this->assertFalse($data['faca_nova']);
        $this->assertEqualsWithDelta(0.0, $data['valor_faca_nova'], 0.01);
    }

    public function test_projeta_tamanho_raw_da_principal(): void
    {
        $data = FacasComposicao::ensureInPayload([
            'medida' => '3,3X0,9',
            'puxada_cm' => 10,
            'facas' => [
                [
                    'principal' => true,
                    'formato' => 'RETA',
                    'medida' => '3,3X0,9',
                    'largura_cm' => 3.3,
                    'tamanho_raw' => '0.9',
                    'tamanho_tipo' => 'altura',
                ],
            ],
        ]);

        $this->assertSame('0.9', $data['facas'][0]['tamanho_raw']);
        $this->assertSame('altura', $data['facas'][0]['tamanho_tipo']);
        $this->assertSame('0.9', $data['faca_tamanho_raw']);
        $this->assertSame('altura', $data['faca_tamanho_tipo']);
    }
}
