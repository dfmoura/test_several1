<?php

namespace Tests\Unit;

use App\Services\Fiscal\NfeCompraExtractor;
use Tests\TestCase;

class NfeCompraExtractorTest extends TestCase
{
    public function test_copia_impostos_do_xml_colacril_sem_recalculo(): void
    {
        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_colacril_udi.xml'));
        $this->assertNotFalse($xml);

        $nfe = (new NfeCompraExtractor)->extractCompra($xml);

        $this->assertSame('41260403514129000106550040005773061452788002', $nfe['chave_nfe']);
        $this->assertSame('577306', $nfe['numero']);
        $this->assertSame('4', $nfe['serie']);
        $this->assertSame('2', $nfe['id_dest']);
        $this->assertSame('PR', $nfe['emit']['uf']);
        $this->assertSame('3', $nfe['emit']['crt']);
        $this->assertSame('456.00', $nfe['totais']['v_icms']);
        $this->assertSame('370.50', $nfe['totais']['v_ipi']);
        $this->assertSame('55.18', $nfe['totais']['v_pis']);
        $this->assertSame('254.14', $nfe['totais']['v_cofins']);
        $this->assertSame('3800.00', $nfe['totais']['v_bc']);

        $item = $nfe['itens'][0];
        $this->assertSame('5', $item['orig']);
        $this->assertSame('00', $item['cst_icms']);
        $this->assertSame('12.00', $item['p_icms']);
        $this->assertSame('456.00', $item['v_icms']);
        $this->assertSame('50', $item['cst_ipi']);
        $this->assertSame('370.50', $item['v_ipi']);
        $this->assertSame('01', $item['cst_pis']);
        $this->assertSame('55.18', $item['v_pis']);
        $this->assertSame('254.14', $item['v_cofins']);
        $this->assertSame('6101', $item['cfop']);
        $this->assertSame('39199010', $item['ncm']);
        $this->assertSame('12.00', $item['impostos']['icms']['pICMS']);
    }

    public function test_item_sem_imposto_permanece_nulo(): void
    {
        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_tubete.xml'));
        $this->assertNotFalse($xml);

        $nfe = (new NfeCompraExtractor)->extractCompra($xml);
        $this->assertSame('5102', $nfe['itens'][0]['cfop']);
        $this->assertNull($nfe['itens'][0]['orig']);
        $this->assertNull($nfe['itens'][0]['v_icms']);
        $this->assertNull($nfe['totais']['v_pis']);
    }
}
