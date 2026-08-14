<?php

namespace Tests\Unit;

use App\Support\PadraoDecimal;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PadraoDecimalTest extends TestCase
{
    public function test_parse_aceita_formato_brasileiro_e_canonico(): void
    {
        $this->assertSame('1234.56', PadraoDecimal::parse('1.234,56'));
        $this->assertSame('1234.56', PadraoDecimal::parse('1234.56'));
        $this->assertSame('1234.56', PadraoDecimal::parse('1,234.56'));
        $this->assertSame('0.045', PadraoDecimal::parse('0,045'));
        $this->assertSame('50', PadraoDecimal::parse('50'));
        $this->assertNull(PadraoDecimal::parse(''));
        $this->assertNull(PadraoDecimal::parse(null));
    }

    public function test_parse_rejeita_float_binario(): void
    {
        $this->expectException(InvalidArgumentException::class);
        PadraoDecimal::parse(0.1);
    }

    public function test_parse_strict_rejeita_excesso_de_casas(): void
    {
        $this->assertSame('10.1234', PadraoDecimal::parseStrict('10.1234', PadraoDecimal::SCALE_QTY));

        $this->expectException(InvalidArgumentException::class);
        PadraoDecimal::parseStrict('10.12345', PadraoDecimal::SCALE_QTY);
    }

    public function test_round_half_up(): void
    {
        $this->assertSame('0.01', PadraoDecimal::roundHalfUp('0.005', 2));
        $this->assertSame('2.35', PadraoDecimal::roundHalfUp('2.345', 2));
        $this->assertSame('2.34', PadraoDecimal::roundHalfUp('2.344', 2));
        $this->assertSame('1.234568', PadraoDecimal::roundHalfUp('1.2345675', 6));
    }

    public function test_round_floor_positivo(): void
    {
        $this->assertSame('10.1234', PadraoDecimal::roundFloor('10.12349', 4));
        $this->assertSame('10.1234', PadraoDecimal::roundFloor('10.1234', 4));
    }

    public function test_round_ceil_teto_comercial_em_centavos(): void
    {
        $this->assertSame('15.01', PadraoDecimal::roundCeil('15.001', PadraoDecimal::SCALE_MONEY));
        $this->assertSame('25.00', PadraoDecimal::roundCeil('25.00', PadraoDecimal::SCALE_MONEY));
        $this->assertSame('8.00', PadraoDecimal::roundCeil('8', PadraoDecimal::SCALE_MONEY));
        $this->assertSame('0.01', PadraoDecimal::roundCeil('0.0001', PadraoDecimal::SCALE_MONEY));
    }

    public function test_escalas_oficiais(): void
    {
        $this->assertSame(2, PadraoDecimal::SCALE_MONEY);
        $this->assertSame(6, PadraoDecimal::SCALE_UNIT_PRICE);
        $this->assertSame(10, PadraoDecimal::SCALE_NF_UNIT);
        $this->assertSame(4, PadraoDecimal::SCALE_QTY);
        $this->assertSame(4, PadraoDecimal::SCALE_PERCENT);
        $this->assertSame(10, PadraoDecimal::SCALE_FACTOR);
        $this->assertSame(PadraoDecimal::ROUND_HALF_UP, PadraoDecimal::ROUNDING_MODE);
    }

    public function test_canonicalize_produto_fields(): void
    {
        $data = PadraoDecimal::canonicalizeFields([
            'fator_conversao' => '0,045',
            'preco_tabela' => '180,5',
            'estoque_minimo' => '12,5',
            'aliquota_cbs' => '0,9000',
            'descricao_fiscal' => 'X',
        ], PadraoDecimal::produtoFieldScales());

        $this->assertSame('0.045', $data['fator_conversao']);
        $this->assertSame('180.5', $data['preco_tabela']);
        $this->assertSame('12.5', $data['estoque_minimo']);
        $this->assertSame('0.9000', $data['aliquota_cbs']);
        $this->assertSame('X', $data['descricao_fiscal']);
    }

    public function test_canonicalize_atributos_como_string(): void
    {
        $attrs = PadraoDecimal::canonicalizeProdutoAtributos([
            'largura_mm' => '330,5',
            'comprimento_m' => '1000',
            'gramatura_g_m2' => '80,25',
            'grupo_estoque' => '10',
        ]);

        $this->assertSame('330.5', $attrs['largura_mm']);
        $this->assertSame('1000', $attrs['comprimento_m']);
        $this->assertSame('80.25', $attrs['gramatura_g_m2']);
        $this->assertSame('10', $attrs['grupo_estoque']);
    }

    #[DataProvider('ambiguousProvider')]
    public function test_parse_rejeita_ambiguidade(string $value): void
    {
        $this->expectException(InvalidArgumentException::class);
        PadraoDecimal::parse($value);
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function ambiguousProvider(): array
    {
        return [
            'dois pontos' => ['1.234.567'],
            'duas virgulas' => ['1,234,567'],
            'lixo' => ['abc'],
        ];
    }
}
