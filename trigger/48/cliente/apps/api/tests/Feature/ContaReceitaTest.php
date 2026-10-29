<?php

namespace Tests\Feature;

use App\Domain\Empresa\AtualizarReceitaEmpresa;
use App\Models\Auditoria;
use App\Suporte\CpfProtegido;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\CriaEmpresa;

class ContaReceitaTest extends AreaTestCase
{
    use CriaEmpresa;

    public function test_conta_mostra_snapshot_qsa_e_mascara_documento_do_socio(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();
        $cpf = CpfProtegido::ler($usuario->cpf_cifrado);
        $empresa->update([
            'dados_receita' => $this->payloadBrasilApi(
                $empresa->cnpj,
                $empresa->razao_social,
                $cpf,
                true,
            ),
        ]);

        $this->entrarComo($usuario, $empresa)
            ->get('/conta')
            ->assertOk()
            ->assertSee('Empresa na Receita Federal')
            ->assertSee('Quadro societário (QSA)')
            ->assertSee('Responsável da conta')
            ->assertSee('Sócio-Administrador')
            ->assertSee('Desenvolvimento de software')
            ->assertSee('***.')
            ->assertDontSee($cpf)
            ->assertSee('aparece no QSA público');
    }

    public function test_atualizar_receita_respeita_intervalo_de_30_dias(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();
        $empresa->update(['receita_atualizada_em' => now()]);

        Http::fake();

        $this->entrarComo($usuario, $empresa)
            ->from('/conta')
            ->post('/conta/receita', ['_token' => session()->token()])
            ->assertRedirect('/conta')
            ->assertSessionHas('erro');

        Http::assertNothingSent();
    }

    public function test_atualizar_receita_grava_snapshot_auditoria_e_nao_mexe_no_responsavel(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();
        $empresa->update(['receita_atualizada_em' => now()->subDays(AtualizarReceitaEmpresa::INTERVALO_DIAS + 1)]);
        $emailAntes = $usuario->email;
        $cpfHashAntes = $usuario->cpf_hash;
        $disponivelAntes = (int) $empresa->carteira->disponivel_centavos;

        Http::fake([
            'brasilapi.com.br/api/cnpj/v1/*' => Http::response($this->payloadBrasilApi(
                $empresa->cnpj,
                'Razão Atualizada LTDA',
                '39053344705',
                false,
            )),
        ]);

        $this->entrarComo($usuario, $empresa)
            ->from('/conta')
            ->post('/conta/receita', ['_token' => session()->token()])
            ->assertRedirect('/conta')
            ->assertSessionHas('ok');

        $empresa->refresh();
        $usuario->refresh();

        $this->assertSame('Razão Atualizada LTDA', $empresa->razao_social);
        $this->assertSame('ATIVA', $empresa->situacao_cadastral);
        $this->assertNotEmpty($empresa->dados_receita['qsa'] ?? []);
        $this->assertSame($emailAntes, $usuario->email);
        $this->assertSame($cpfHashAntes, $usuario->cpf_hash);
        $this->assertSame($disponivelAntes, (int) $empresa->carteira->fresh()->disponivel_centavos);
        $this->assertTrue(
            Auditoria::query()->where('acao', 'empresa_receita_atualizada')->where('empresa_id', $empresa->id)->exists()
        );
    }

    public function test_situacao_morta_no_refresh_avisa_sem_alterar_status_da_conta(): void
    {
        [$empresa, $usuario] = $this->empresaComSaldo();
        $empresa->update(['receita_atualizada_em' => now()->subDays(40)]);

        Http::fake([
            'brasilapi.com.br/api/cnpj/v1/*' => Http::response([
                'cnpj' => $empresa->cnpj,
                'razao_social' => $empresa->razao_social,
                'nome_fantasia' => null,
                'descricao_situacao_cadastral' => 'BAIXADA',
                'situacao_cadastral' => 8,
                'qsa' => [],
            ]),
        ]);

        $this->entrarComo($usuario, $empresa)
            ->from('/conta')
            ->post('/conta/receita', ['_token' => session()->token()])
            ->assertRedirect('/conta')
            ->assertSessionHas('ok')
            ->assertSessionHas('aviso');

        $empresa->refresh();
        $this->assertSame('ATIVA', $empresa->status);
        $this->assertSame('BAIXADA', $empresa->situacao_cadastral);
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadBrasilApi(string $cnpj, string $razao, string $cpfSocio, bool $incluirCpf): array
    {
        return [
            'cnpj' => $cnpj,
            'razao_social' => $razao,
            'nome_fantasia' => 'Fantasia Teste',
            'descricao_situacao_cadastral' => 'ATIVA',
            'situacao_cadastral' => 2,
            'data_situacao_cadastral' => '2020-01-15',
            'natureza_juridica' => '206-2 - Sociedade Empresária Limitada',
            'porte' => 'DEMAIS',
            'descricao_porte' => 'Demais',
            'capital_social' => 100000,
            'cnae_fiscal' => 6201501,
            'cnae_fiscal_descricao' => 'Desenvolvimento de software',
            'cnaes_secundarios' => [
                ['codigo' => 6202300, 'descricao' => 'Desenvolvimento e licenciamento de software customizável'],
            ],
            'descricao_tipo_de_logradouro' => 'RUA',
            'logradouro' => 'EXEMPLO',
            'numero' => '100',
            'complemento' => 'SALA 1',
            'bairro' => 'CENTRO',
            'cep' => '01001000',
            'uf' => 'SP',
            'municipio' => 'SAO PAULO',
            'ddd_telefone_1' => '1133334444',
            'email' => 'contato@empresa.test',
            'qsa' => [
                [
                    'nome_socio' => 'SOCIO EXEMPLO',
                    'cnpj_cpf_do_socio' => $incluirCpf ? $cpfSocio : '39053344705',
                    'qualificacao_socio' => 'Sócio-Administrador',
                    'data_entrada_sociedade' => '2019-06-01',
                ],
            ],
        ];
    }
}
