<?php

namespace Tests\Unit;

use App\Services\Cadastros\ParceiroFiscalRules;
use PHPUnit\Framework\TestCase;

class ParceiroFiscalRulesTest extends TestCase
{
    public function test_derives_ind_ie_dest_from_ie(): void
    {
        $this->assertSame(1, ParceiroFiscalRules::deriveIndIeDest('062.307.864.00-33'));
        $this->assertSame(2, ParceiroFiscalRules::deriveIndIeDest('ISENTO'));
        $this->assertSame(2, ParceiroFiscalRules::deriveIndIeDest('isenta'));
        $this->assertSame(9, ParceiroFiscalRules::deriveIndIeDest(null));
        $this->assertSame(9, ParceiroFiscalRules::deriveIndIeDest(''));
    }

    public function test_cliente_incompleto_sem_finalidade_e_email_xml(): void
    {
        $result = ParceiroFiscalRules::evaluate([
            'papel_cliente' => true,
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '01423183000110',
            'razao_social' => 'Cliente Teste',
            'ie' => '123456789',
            'ind_ie_dest' => 1,
            'logradouro' => 'Rua A',
            'numero' => '100',
            'bairro' => 'Centro',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'cep' => '38400000',
            'ibge' => '3170206',
            'emite_documento_fiscal' => true,
            'situacao' => 'ATIVO',
            'ie_status' => 'OK',
        ]);

        $this->assertFalse($result['completo']);
        $this->assertContains('Finalidade (revenda / industrialização / uso e consumo)', $result['pendencias']);
        $this->assertContains('E-mail para envio de XML/DANFE', $result['pendencias']);
    }

    public function test_cliente_completo_mas_ie_nao_verificada_bloqueia_emissao(): void
    {
        $result = ParceiroFiscalRules::evaluate([
            'papel_cliente' => true,
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '01423183000110',
            'razao_social' => 'Cliente Teste',
            'ie' => '123456789',
            'ind_ie_dest' => 1,
            'finalidade' => 'REVENDA',
            'email_xml' => 'xml@cliente.com',
            'logradouro' => 'Rua A',
            'numero' => '100',
            'bairro' => 'Centro',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'cep' => '38400000',
            'ibge' => '3170206',
            'emite_documento_fiscal' => true,
            'situacao' => 'ATIVO',
            'ie_status' => 'NAO_VERIFICADA',
        ]);

        $this->assertTrue($result['completo']);
        $this->assertFalse($result['apto_emissao_nfe']);
        $this->assertNotEmpty($result['pendencias_emissao']);
    }

    public function test_suggest_area_incentivada_for_am(): void
    {
        $this->assertTrue(ParceiroFiscalRules::suggestAreaIncentivada('AM'));
        $this->assertTrue(ParceiroFiscalRules::suggestAreaIncentivada('MG', '123456789'));
        $this->assertFalse(ParceiroFiscalRules::suggestAreaIncentivada('MG'));
    }
}
