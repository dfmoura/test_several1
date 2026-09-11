<?php

namespace Tests\Unit;

use App\Support\ProdutoAtributos;
use PHPUnit\Framework\TestCase;

class ProdutoAtributosTest extends TestCase
{
    public function test_merge_preserva_metadados_de_seed_e_aplica_form(): void
    {
        $current = [
            'camada_cadastro' => 'A',
            'programa_compra' => 'EXACT 1000',
            'grupo_estoque' => '11',
            'origem_pendente_xml' => true,
            'largura_mm' => '210',
        ];

        $incoming = [
            'programa_compra' => 'EXACT 1500',
            'grupo_estoque' => '11',
            'gramatura_g_m2' => '160',
            // largura_mm omitido → limpa
        ];

        $merged = ProdutoAtributos::mergeOnUpdate($current, $incoming);

        $this->assertSame('A', $merged['camada_cadastro']);
        $this->assertTrue($merged['origem_pendente_xml']);
        $this->assertSame('EXACT 1500', $merged['programa_compra']);
        $this->assertSame('160', $merged['gramatura_g_m2']);
        $this->assertArrayNotHasKey('largura_mm', $merged);
    }

    public function test_merge_limpa_form_key_vazia(): void
    {
        $merged = ProdutoAtributos::mergeOnUpdate(
            ['programa_compra' => 'EXACT 1000', 'camada_cadastro' => 'A'],
            ['programa_compra' => '']
        );

        $this->assertArrayNotHasKey('programa_compra', $merged);
        $this->assertSame('A', $merged['camada_cadastro']);
    }
}
