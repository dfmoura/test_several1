<?php

namespace Tests\Unit;

use App\Models\Parceiro;
use App\Services\Cadastros\ParceiroProntidaoProposta;
use PHPUnit\Framework\TestCase;

class ParceiroProntidaoPropostaTest extends TestCase
{
    public function test_apto_com_identidade_e_endereco_base(): void
    {
        $parceiro = new Parceiro([
            'id' => 1,
            'razao_social' => 'Cliente OK',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '60746948000112',
            'is_prospect' => false,
            'situacao' => 'ATIVO',
            'logradouro' => 'Rua A',
            'numero' => '10',
            'bairro' => 'Centro',
            'municipio' => 'Betim',
            'uf' => 'MG',
            'cep' => '32600000',
        ]);

        $eval = ParceiroProntidaoProposta::evaluate($parceiro);

        $this->assertTrue($eval['apto']);
        $this->assertSame([], $eval['pendencias']);
        $this->assertSame([], $eval['bloqueios']);
    }

    public function test_bloqueia_prospect_e_sem_cnpj(): void
    {
        $parceiro = new Parceiro([
            'id' => 2,
            'razao_social' => 'Lead',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '',
            'is_prospect' => true,
            'situacao' => 'ATIVO',
            'logradouro' => 'Rua A',
            'numero' => '10',
            'bairro' => 'Centro',
            'municipio' => 'Betim',
            'uf' => 'MG',
            'cep' => '32600000',
        ]);

        $eval = ParceiroProntidaoProposta::evaluate($parceiro);

        $this->assertFalse($eval['apto']);
        $this->assertArrayHasKey('is_prospect', $eval['bloqueios']);
        $this->assertArrayHasKey('cnpj_cpf', $eval['bloqueios']);
        $this->assertContains('Cadastro ainda é prospect', $eval['pendencias']);
        $this->assertContains('CNPJ (14 dígitos)', $eval['pendencias']);
    }

    public function test_nao_exige_fiscal_completo(): void
    {
        $parceiro = new Parceiro([
            'id' => 3,
            'razao_social' => 'Cliente Comercial',
            'tipo_pessoa' => 'PF',
            'cnpj_cpf' => '39053344705',
            'is_prospect' => false,
            'situacao' => 'ATIVO',
            'logradouro' => 'Av B',
            'numero' => '20',
            'bairro' => 'Industrial',
            'municipio' => 'Contagem',
            'uf' => 'MG',
            'cep' => '32200000',
            // Sem IE / IBGE / finalidade / email_xml — ok para proposta.
        ]);

        $eval = ParceiroProntidaoProposta::evaluate($parceiro);

        $this->assertTrue($eval['apto']);
    }
}
