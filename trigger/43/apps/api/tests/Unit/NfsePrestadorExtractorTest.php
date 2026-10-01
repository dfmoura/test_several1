<?php

namespace Tests\Unit;

use App\Services\Fiscal\Nfse\NfsePrestadorExtractor;
use InvalidArgumentException;
use Tests\TestCase;

class NfsePrestadorExtractorTest extends TestCase
{
    public function test_le_prestador_do_layout_nacional(): void
    {
        $xml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">
  <infNFSe Id="NFS35260134661762000150000000000000000000000000000001">
    <emit>
      <CNPJ>34.661.762/0001-50</CNPJ>
      <xNome>Escritorio Alfa Ltda</xNome>
      <enderNac>
        <xLgr>Rua das Flores</xLgr>
        <nro>100</nro>
        <xBairro>Centro</xBairro>
        <cMun>3106200</cMun>
        <UF>mg</UF>
        <CEP>30130-000</CEP>
      </enderNac>
      <fone>(31) 3000-0000</fone>
    </emit>
    <DPS>
      <infDPS>
        <prest><CNPJ>34661762000150</CNPJ></prest>
        <toma><CNPJ>01423183000110</CNPJ></toma>
      </infDPS>
    </DPS>
  </infNFSe>
</NFSe>
XML;

        $out = (new NfsePrestadorExtractor)->extrair($xml);

        $this->assertSame('34661762000150', $out['emit']['cnpj_cpf']);
        $this->assertSame('Escritorio Alfa Ltda', $out['emit']['razao_social']);
        $this->assertSame('Rua das Flores', $out['emit']['logradouro']);
        $this->assertSame('MG', $out['emit']['uf']);
        $this->assertSame('30130000', $out['emit']['cep']);
        $this->assertSame('3106200', $out['emit']['ibge']);
        $this->assertSame('01423183000110', $out['dest_cnpj']);
        $this->assertNull($out['cfop_entrada_sugerido']);
        $this->assertNull($out['transportadora']);
        $this->assertSame(50, strlen((string) $out['chave_nfse']));
    }

    public function test_recusa_xml_sem_prestador(): void
    {
        $this->expectException(InvalidArgumentException::class);
        (new NfsePrestadorExtractor)->extrair('<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse"><infNFSe/></NFSe>');
    }
}
