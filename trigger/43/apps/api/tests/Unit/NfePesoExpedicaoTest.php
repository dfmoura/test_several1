<?php

namespace Tests\Unit;

use App\Services\Fiscal\NfePesoExpedicao;
use PHPUnit\Framework\TestCase;

class NfePesoExpedicaoTest extends TestCase
{
    private NfePesoExpedicao $peso;

    protected function setUp(): void
    {
        $this->peso = new NfePesoExpedicao;
    }

    public function test_etiqueta_usa_m2_travado_vezes_160_gramas(): void
    {
        $out = $this->peso->calcular([
            ['tipo' => 'etiqueta', 'm2' => '50'],
        ], []);

        $this->assertSame('8.000', $out['peso_liquido']);
        $this->assertSame('8.000', $out['peso_bruto']);
    }

    public function test_gramatura_de_expedicao_substitui_o_default(): void
    {
        $out = $this->peso->calcular([
            ['tipo' => 'etiqueta', 'm2' => '50', 'gramatura_g_m2' => '200'],
        ], []);

        $this->assertSame('10.000', $out['peso_liquido']);
    }

    public function test_sem_m2_a_nota_nao_leva_peso(): void
    {
        $out = $this->peso->calcular([
            ['tipo' => 'etiqueta', 'm2' => null],
            ['tipo' => 'servico', 'm2' => '50'],
        ], [[
            'qtde_bobinas' => 10,
            'qtde_caixas' => 3,
            'tubete' => '3"',
            'largura_bobina_mm' => '100',
            'caixa_comp_mm' => '250',
            'caixa_larg_mm' => '200',
            'caixa_alt_mm' => '200',
        ]]);

        $this->assertNull($out['peso_liquido']);
        $this->assertNull($out['peso_bruto']);
    }

    public function test_revenda_usa_peso_do_sku_e_nao_a_area_da_etiqueta(): void
    {
        $out = $this->peso->calcular([
            ['tipo' => 'revenda', 'qtde' => '4', 'unidade' => 'UN', 'peso_unitario_kg' => '0.250'],
            ['tipo' => 'revenda', 'qtde' => '2.5', 'unidade' => 'KG'],
            ['tipo' => 'revenda', 'qtde' => '10', 'unidade' => 'UN', 'm2' => '50'],
        ], []);

        $this->assertSame('3.500', $out['peso_liquido']);
        $this->assertSame('3.500', $out['peso_bruto']);
    }

    public function test_bruto_soma_casca_do_tubete_e_chapa_da_caixa(): void
    {
        $out = $this->peso->calcular([
            ['tipo' => 'etiqueta', 'm2' => '50'],
        ], [[
            'qtde_bobinas' => 10,
            'qtde_caixas' => 3,
            'tubete' => '3"',
            'espessura_mm' => '3',
            'comprimento_mm' => '100',
            'caixa_comp_mm' => '250',
            'caixa_larg_mm' => '200',
            'caixa_alt_mm' => '200',
        ]]);

        $this->assertSame('8.000', $out['peso_liquido']);
        $this->assertSame('9.022', $out['peso_bruto']);
    }

    public function test_peso_cadastrado_vence_a_geometria(): void
    {
        $out = $this->peso->calcular([
            ['tipo' => 'etiqueta', 'm2' => '50'],
        ], [[
            'qtde_bobinas' => 10,
            'qtde_caixas' => 3,
            'tubete' => '3"',
            'peso_tubete_kg' => '0.050',
            'espessura_mm' => '3',
            'comprimento_mm' => '100',
            'peso_caixa_kg' => '0.200',
            'caixa_comp_mm' => '250',
            'caixa_larg_mm' => '200',
            'caixa_alt_mm' => '200',
        ]]);

        $this->assertSame('8.000', $out['peso_liquido']);
        $this->assertSame('9.100', $out['peso_bruto']);
    }

    public function test_comprimento_curto_do_tubete_nao_entra_e_usa_a_largura_da_bobina(): void
    {
        $pelaLargura = $this->peso->calcular([
            ['tipo' => 'etiqueta', 'm2' => '50'],
        ], [[
            'qtde_bobinas' => 1,
            'qtde_caixas' => 0,
            'tubete' => '3"',
            'espessura_mm' => '3',
            'comprimento_mm' => '1.8',
            'largura_bobina_mm' => '100',
        ]]);
        $peloComprimento = $this->peso->calcular([
            ['tipo' => 'etiqueta', 'm2' => '50'],
        ], [[
            'qtde_bobinas' => 1,
            'qtde_caixas' => 0,
            'tubete' => '3"',
            'espessura_mm' => '3',
            'comprimento_mm' => '100',
        ]]);

        $this->assertSame($peloComprimento, $pelaLargura);
        $this->assertSame('8.056', $pelaLargura['peso_bruto']);
    }
}
