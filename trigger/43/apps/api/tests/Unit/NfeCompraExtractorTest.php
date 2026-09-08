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
        $this->assertSame('0A09E41E-3E1E-4958-9A73-5FF4F2327C49', $item['n_fci']);
        $this->assertNull($item['x_ped']);
        $this->assertSame('000', $item['cst_ibs_cbs']);
        $this->assertSame('000001', $item['c_class_trib']);
        $this->assertSame('3034.68', $item['v_bc_ibs_cbs']);
        $this->assertSame('3.03', $item['v_ibs']);
        $this->assertSame('27.31', $item['v_cbs']);
        $this->assertSame('0.9000', $item['p_cbs']);
        $this->assertSame('3034.68', $nfe['totais']['v_bc_ibs_cbs']);
        $this->assertSame('3.03', $nfe['totais']['v_ibs']);
        $this->assertSame('27.31', $nfe['totais']['v_cbs']);
        $this->assertSame('000', $item['impostos']['ibscbs']['CST']);
        $this->assertSame('27.31', $item['impostos']['ibscbs']['gIBSCBS']['gCBS']['vCBS']);

        $this->assertNotNull($nfe['resp_tec']);
        $this->assertSame('63027692000181', $nfe['resp_tec']['cnpj']);
        $this->assertSame('Miriam Rocha Negreiro', $nfe['resp_tec']['x_contato']);
        $this->assertSame('miriam.negreiro@abc71.com.br', $nfe['resp_tec']['email']);
        $this->assertSame('1121793111', $nfe['resp_tec']['fone']);
        $this->assertNotNull($nfe['inf_adic']);
        $this->assertStringContainsString('PEDIDO', (string) $nfe['inf_adic']['inf_cpl']);
        $this->assertSame('0', $nfe['transporte']['mod_frete']);
        $this->assertSame('16701779000102', $nfe['transporte']['transporta']['cnpj']);
        $this->assertSame('TRUCKDOOR TRANSPORTE  E LOGISTICA LTDA  EPP', $nfe['transporte']['transporta']['nome']);
        $this->assertSame('PR', $nfe['transporte']['transporta']['uf']);
        $this->assertCount(1, $nfe['transporte']['vol']);
        $this->assertSame('1', $nfe['transporte']['vol'][0]['q_vol']);
        $this->assertSame('PALLET', $nfe['transporte']['vol'][0]['esp']);
        $this->assertSame('119.000', $nfe['transporte']['vol'][0]['peso_l']);
        $this->assertSame('137.000', $nfe['transporte']['vol'][0]['peso_b']);
        $this->assertSame([], $nfe['transporte']['vol'][0]['lacres']);
        $this->assertSame('577306', $nfe['fat']['n_fat']);
        $this->assertSame('15', $nfe['pag']['det_pag'][0]['t_pag']);
        $this->assertSame('ADESIVOS ETIQUETAS E ROTULOS UDI LT', $nfe['dest_nome']);
        $this->assertSame('2026-04-11', $nfe['ide_extra']['d_prev_entrega']);
    }

    public function test_resp_tec_ausente_permanece_nulo(): void
    {
        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_tubete.xml'));
        $this->assertNotFalse($xml);

        $nfe = (new NfeCompraExtractor)->extractCompra($xml);
        $this->assertNull($nfe['resp_tec']);
        $this->assertNull($nfe['inf_adic']);
        $this->assertNull($nfe['transporte']);
        $this->assertNull($nfe['pag']);
        $this->assertNull($nfe['fat']);
    }

    public function test_extrai_transp_vol_com_lacres_e_veiculo(): void
    {
        $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260400000000000000550010000000011000000020" versao="4.00">
      <ide><cUF>35</cUF><natOp>Compra</natOp><mod>55</mod><serie>1</serie><nNF>20</nNF>
        <dhEmi>2026-08-26T10:00:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><finNFe>1</finNFe>
      </ide>
      <emit><CNPJ>00000000000191</CNPJ><xNome>Emit</xNome><enderEmit><UF>SP</UF></enderEmit><IE>123</IE><CRT>3</CRT></emit>
      <dest><CNPJ>00000000000272</CNPJ></dest>
      <det nItem="1">
        <prod>
          <cProd>SKU1</cProd><xProd>Bobina</xProd><NCM>39199010</NCM><CFOP>5102</CFOP>
          <uCom>M2</uCom><qCom>10.0000</qCom><vUnCom>1.0000</vUnCom><vProd>10.00</vProd>
        </prod>
        <imposto/>
      </det>
      <total><ICMSTot><vNF>10.00</vNF><vProd>10.00</vProd></ICMSTot></total>
      <transp>
        <modFrete>1</modFrete>
        <transporta><CNPJ>11222333000181</CNPJ><xNome>Transp Teste</xNome><UF>MG</UF></transporta>
        <veicTransp><placa>ABC1D23</placa><UF>MG</UF><RNTC>998877</RNTC></veicTransp>
        <vol>
          <qVol>2</qVol><esp>CAIXA</esp><marca>MARCA-X</marca><nVol>A1</nVol>
          <pesoL>10.500</pesoL><pesoB>11.000</pesoB>
          <lacres><nLacre>LAC-001</nLacre></lacres>
          <lacres><nLacre>LAC-002</nLacre></lacres>
        </vol>
        <vol>
          <qVol>1</qVol><esp>PALLET</esp><pesoL>50.000</pesoL><pesoB>55.000</pesoB>
        </vol>
      </transp>
    </infNFe>
  </NFe>
</nfeProc>
XML;

        $nfe = (new NfeCompraExtractor)->extractCompra($xml);
        $t = $nfe['transporte'];
        $this->assertSame('1', $t['mod_frete']);
        $this->assertSame('11222333000181', $t['transporta']['cnpj']);
        $this->assertSame('ABC1D23', $t['veiculo']['placa']);
        $this->assertSame('MG', $t['veiculo']['uf']);
        $this->assertSame('998877', $t['veiculo']['rntc']);
        $this->assertCount(2, $t['vol']);
        $this->assertSame('2', $t['vol'][0]['q_vol']);
        $this->assertSame('CAIXA', $t['vol'][0]['esp']);
        $this->assertSame('MARCA-X', $t['vol'][0]['marca']);
        $this->assertSame('A1', $t['vol'][0]['n_vol']);
        $this->assertSame('10.500', $t['vol'][0]['peso_l']);
        $this->assertSame('11.000', $t['vol'][0]['peso_b']);
        $this->assertSame(
            [['n_lacre' => 'LAC-001'], ['n_lacre' => 'LAC-002']],
            $t['vol'][0]['lacres']
        );
        $this->assertSame('1', $t['vol'][1]['q_vol']);
        $this->assertSame('PALLET', $t['vol'][1]['esp']);
        $this->assertSame([], $t['vol'][1]['lacres']);
    }

    public function test_lote_em_inf_ad_prod_quando_sem_rastro(): void
    {
        $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260400000000000000550010000000011000000012" versao="4.00">
      <ide><cUF>35</cUF><natOp>Compra</natOp><mod>55</mod><serie>1</serie><nNF>2</nNF>
        <dhEmi>2026-08-26T10:00:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><finNFe>1</finNFe>
      </ide>
      <emit><CNPJ>00000000000191</CNPJ><xNome>Emit</xNome><enderEmit><UF>SP</UF></enderEmit><IE>123</IE><CRT>3</CRT></emit>
      <dest><CNPJ>00000000000272</CNPJ></dest>
      <det nItem="1">
        <prod>
          <cProd>TINTA-01</cProd><xProd>Tinta UV preta</xProd><NCM>32151100</NCM><CFOP>5102</CFOP>
          <uCom>KG</uCom><qCom>25.0000</qCom><vUnCom>40.0000</vUnCom><vProd>1000.00</vProd>
          <uTrib>KG</uTrib><qTrib>25.0000</qTrib><vUnTrib>40.0000</vUnTrib>
        </prod>
        <imposto/>
        <infAdProd>LOTE: COL-4412 · Validade sob consulta. FCI nao se aplica.</infAdProd>
      </det>
      <total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vProd>1000.00</vProd><vNF>1000.00</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>
XML;

        $nfe = (new NfeCompraExtractor)->extractCompra($xml);
        $item = $nfe['itens'][0];
        $this->assertSame('LOTE: COL-4412 · Validade sob consulta. FCI nao se aplica.', $item['inf_ad_prod']);
        $this->assertCount(1, $item['rastros']);
        $this->assertSame('COL-4412', $item['rastros'][0]['codigo']);
        $this->assertSame('25.0000', $item['rastros'][0]['qtde']);
        $this->assertSame('inf_ad_prod', $item['rastros'][0]['fonte']);
    }

    public function test_rastro_oficial_prevalece_sobre_inf_ad_prod(): void
    {
        $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260400000000000000550010000000011000000013" versao="4.00">
      <ide><cUF>35</cUF><natOp>Compra</natOp><mod>55</mod><serie>1</serie><nNF>3</nNF>
        <dhEmi>2026-08-26T10:00:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><finNFe>1</finNFe>
      </ide>
      <emit><CNPJ>00000000000191</CNPJ><xNome>Emit</xNome><enderEmit><UF>SP</UF></enderEmit><IE>123</IE><CRT>3</CRT></emit>
      <dest><CNPJ>00000000000272</CNPJ></dest>
      <det nItem="1">
        <prod>
          <cProd>ABC</cProd><xProd>Papel</xProd><NCM>48114190</NCM><CFOP>5102</CFOP>
          <uCom>KG</uCom><qCom>10.0000</qCom><vUnCom>5.00</vUnCom><vProd>50.00</vProd>
          <rastro>
            <nLote>RASTRO-01</nLote>
            <qLote>10.0000</qLote>
            <dFab>2026-01-15</dFab>
            <dVal>2027-01-15</dVal>
          </rastro>
        </prod>
        <imposto/>
        <infAdProd>LOTE: TEXTO-99 ignorado quando ha rastro</infAdProd>
      </det>
      <total><ICMSTot><vNF>50.00</vNF><vProd>50.00</vProd></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>
XML;

        $nfe = (new NfeCompraExtractor)->extractCompra($xml);
        $this->assertCount(1, $nfe['itens'][0]['rastros']);
        $this->assertSame('RASTRO-01', $nfe['itens'][0]['rastros'][0]['codigo']);
        $this->assertSame('rastro', $nfe['itens'][0]['rastros'][0]['fonte']);
    }

    public function test_extrai_x_ped_n_item_ped_e_n_fci_do_prod(): void
    {
        $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260400000000000000550010000000011000000010" versao="4.00">
      <ide><cUF>35</cUF><natOp>Compra</natOp><mod>55</mod><serie>1</serie><nNF>1</nNF>
        <dhEmi>2026-08-26T10:00:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><finNFe>1</finNFe>
      </ide>
      <emit><CNPJ>00000000000191</CNPJ><xNome>Emit</xNome><enderEmit><UF>SP</UF></enderEmit><IE>123</IE><CRT>3</CRT></emit>
      <dest><CNPJ>00000000000272</CNPJ></dest>
      <det nItem="1">
        <prod>
          <cProd>SKU1</cProd><xProd>Bobina teste</xProd><NCM>39199010</NCM><CFOP>5102</CFOP>
          <uCom>M2</uCom><qCom>100.0000</qCom><vUnCom>1.0000</vUnCom><vProd>100.00</vProd>
          <uTrib>M2</uTrib><qTrib>100.0000</qTrib><vUnTrib>1.0000</vUnTrib>
          <xPed>2508261627</xPed><nItemPed>1</nItemPed>
          <nFCI>72FDD80D-485A-42DA-832F-F8EA8E679F80</nFCI>
        </prod>
        <imposto/>
      </det>
      <total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vProd>100.00</vProd><vNF>100.00</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>
XML;

        $nfe = (new NfeCompraExtractor)->extractCompra($xml);
        $item = $nfe['itens'][0];
        $this->assertSame('2508261627', $item['x_ped']);
        $this->assertSame('1', $item['n_item_ped']);
        $this->assertSame('72FDD80D-485A-42DA-832F-F8EA8E679F80', $item['n_fci']);
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
