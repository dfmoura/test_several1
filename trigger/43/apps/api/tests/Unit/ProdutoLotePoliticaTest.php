<?php

namespace Tests\Unit;

use App\Services\Estoque\EstoqueLoteAbertura;
use App\Services\Fiscal\NfeCompraExtractor;
use App\Support\ProdutoLotePolitica;
use Tests\TestCase;

class ProdutoLotePoliticaTest extends TestCase
{
    public function test_status_validade(): void
    {
        $this->assertSame(ProdutoLotePolitica::STATUS_SEM_VALIDADE, ProdutoLotePolitica::statusValidade(null, '2026-08-12'));
        $this->assertSame(ProdutoLotePolitica::STATUS_VENCIDO, ProdutoLotePolitica::statusValidade('2026-08-01', '2026-08-12'));
        $this->assertSame(ProdutoLotePolitica::STATUS_A_VENCER, ProdutoLotePolitica::statusValidade('2026-09-01', '2026-08-12'));
        $this->assertSame(ProdutoLotePolitica::STATUS_OK, ProdutoLotePolitica::statusValidade('2027-08-12', '2026-08-12'));
    }

    public function test_normalizar_validade_implica_lote(): void
    {
        $n = ProdutoLotePolitica::normalizar([
            'controla_lote' => false,
            'controla_validade' => true,
            'prazo_validade_dias' => 365,
        ]);
        $this->assertTrue($n['controla_lote']);
        $this->assertTrue($n['controla_validade']);
    }

    public function test_abertura_soma_igual_ao_total(): void
    {
        $produto = new \App\Models\Produto([
            'codigo' => 'MP-PAP-004',
            'controla_lote' => true,
            'controla_validade' => true,
            'prazo_validade_dias' => 548,
        ]);
        $linhas = EstoqueLoteAbertura::planejar($produto, '312.0000', '2026-08-12');
        $this->assertCount(2, $linhas);
        $soma = '0';
        foreach ($linhas as $l) {
            $soma = bcadd($soma, $l['qtde'], 4);
        }
        $this->assertSame('312.0000', $soma);
        $this->assertNotNull($linhas[0]['data_validade']);
        $this->assertNotNull($linhas[0]['data_entrada']);
    }

    public function test_extractor_le_rastro_nfe(): void
    {
        $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260400000000000000550010000000011000000011">
      <ide><cUF>35</cUF><nNF>1</nNF><serie>1</serie><dhEmi>2026-08-01T10:00:00-03:00</dhEmi><mod>55</mod></ide>
      <emit><CNPJ>03514129000106</CNPJ><xNome>FORN</xNome></emit>
      <dest><CNPJ>01423183000110</CNPJ></dest>
      <det nItem="1">
        <prod>
          <cProd>ABC</cProd><xProd>PAPEL</xProd><NCM>48114190</NCM>
          <CFOP>2101</CFOP><uCom>KG</uCom><qCom>10.0000</qCom>
          <vUnCom>5.00</vUnCom><vProd>50.00</vProd>
          <rastro>
            <nLote>COL-99</nLote>
            <qLote>10.0000</qLote>
            <dFab>2026-01-15</dFab>
            <dVal>2027-01-15</dVal>
          </rastro>
        </prod>
      </det>
      <total><ICMSTot><vNF>50.00</vNF><vProd>50.00</vProd></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>
XML;

        $nfe = app(NfeCompraExtractor::class)->extractCompra($xml);
        $this->assertSame('COL-99', $nfe['itens'][0]['rastros'][0]['codigo']);
        $this->assertSame('2027-01-15', $nfe['itens'][0]['rastros'][0]['data_validade']);
        $this->assertSame('2026-01-15', $nfe['itens'][0]['rastros'][0]['data_fabricacao']);
    }
}
