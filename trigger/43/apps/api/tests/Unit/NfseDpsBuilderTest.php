<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Services\Fiscal\Nfse\NfseDpsBuilder;
use Tests\TestCase;

class NfseDpsBuilderTest extends TestCase
{
    public function test_id_da_dps_tem_42_digitos(): void
    {
        $empresa = new Empresa;
        $empresa->ibge = '3106200';
        $empresa->cnpj = '11222333000181';
        $empresa->crt = 1;

        $toma = new Parceiro;
        $toma->cnpj_cpf = '00000000000191';
        $toma->razao_social = 'Tomador Teste';
        $toma->logradouro = 'Rua A';
        $toma->numero = '10';
        $toma->bairro = 'Centro';
        $toma->cep = '38400000';
        $toma->ibge = '3170206';

        $xml = (new NfseDpsBuilder)->montar($empresa, $toma, [
            'codigo_municipio_emissora' => 3106200,
            'cnpj_prestador' => '11222333000181',
            'serie_dps' => 1,
            'codigo_tributacao_nacional_iss' => '140101',
            'codigo_nbs' => '121012100',
            'descricao_servico' => 'Rebobinação',
            'valor_servico' => 150,
            'codigo_municipio_prestacao' => '3106200',
        ], 7, 2);

        $this->assertSame(42, strlen($xml['id_dps']));
        $this->assertStringContainsString('Id="DPS'.$xml['id_dps'].'"', $xml['xml']);
        $this->assertStringContainsString('<nDPS>7</nDPS>', $xml['xml']);
        $this->assertStringContainsString('<cTribNac>140101</cTribNac>', $xml['xml']);
        $this->assertStringContainsString('<endNac><cMun>3170206</cMun><CEP>38400000</CEP></endNac>', $xml['xml']);
        $this->assertStringContainsString('<opSimpNac>3</opSimpNac>', $xml['xml']);
        $this->assertStringContainsString('<serie>00001</serie>', $xml['xml']);
    }
}
