<?php

namespace Tests\Unit;

use App\Domain\Empresa\ReceitaEmpresaLeitura;
use App\Models\Empresa;
use Tests\TestCase;

class ReceitaEmpresaLeituraTest extends TestCase
{
    public function test_le_qsa_mascara_e_detecta_cpf_do_responsavel(): void
    {
        $empresa = new Empresa([
            'cnpj' => '11222333000181',
            'razao_social' => 'Empresa Exemplo Ltda',
            'nome_fantasia' => 'Exemplo',
            'situacao_cadastral' => 'ATIVA',
            'dados_receita' => [
                'descricao_situacao_cadastral' => 'ATIVA',
                'cnae_fiscal' => 6201501,
                'cnae_fiscal_descricao' => 'Software',
                'capital_social' => 5000.5,
                'logradouro' => 'CENTRAL',
                'numero' => '10',
                'municipio' => 'SAO PAULO',
                'uf' => 'SP',
                'cep' => '01001000',
                'qsa' => [
                    [
                        'nome_socio' => 'FULANO',
                        'cnpj_cpf_do_socio' => '52998224725',
                        'qualificacao_socio' => 'Administrador',
                        'data_entrada_sociedade' => '2021-03-10',
                    ],
                ],
            ],
            'receita_atualizada_em' => now(),
            'criada_em' => now(),
        ]);

        $leitura = ReceitaEmpresaLeitura::de($empresa, '52998224725');

        $this->assertTrue($leitura->cpfResponsavelNoQsa);
        $this->assertSame('***.982.247-**', $leitura->qsa[0]['documento']);
        $this->assertSame('10/03/2021', $leitura->qsa[0]['entrada']);
        $this->assertSame('R$ 5.000,50', $leitura->capitalSocial);
        $this->assertStringContainsString('6201-5/01', (string) $leitura->cnaePrincipal);
        $this->assertStringContainsString('CEP 01001-000', (string) $leitura->endereco);
    }
}
