<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\ParceiroEnderecoEntrega;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ParceiroEnderecosEntregaTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(Empresa $empresa): User
    {
        foreach (['parceiro.ler', 'parceiro.escrever', 'parceiro.bancario', 'credito.escrever'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $user = User::query()->create([
            'codigo' => 'USR-ENT01',
            'name' => 'Admin Entrega',
            'email' => 'entrega@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['parceiro.ler', 'parceiro.escrever', 'parceiro.bancario', 'credito.escrever']);
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        return $user;
    }

    private function empresa(): Empresa
    {
        return Empresa::query()->create([
            'codigo' => 'EMP-ENT1',
            'razao_social' => 'Empresa Entrega',
            'nome_fantasia' => 'Entrega',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
    }

    public function test_cria_parceiro_sem_endereco_entrega_significa_mesmo_fiscal(): void
    {
        $empresa = $this->empresa();
        $this->actingAdmin($empresa);

        $res = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Cliente Sem Entrega Extra',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'logradouro' => 'Rua Fiscal',
                'numero' => '100',
                'bairro' => 'Centro',
                'municipio' => 'Belo Horizonte',
                'uf' => 'MG',
                'cep' => '30130100',
                'enderecos_entrega' => [],
            ])
            ->assertCreated();

        $this->assertSame([], $res->json('data.enderecos_entrega'));
        $this->assertSame(0, ParceiroEnderecoEntrega::query()->count());
    }

    public function test_cria_e_atualiza_multiplos_enderecos_com_principal(): void
    {
        $empresa = $this->empresa();
        $this->actingAdmin($empresa);

        $create = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Cliente Multi Entrega',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'logradouro' => 'Rua Fiscal',
                'numero' => '1',
                'bairro' => 'Centro',
                'municipio' => 'Belo Horizonte',
                'uf' => 'MG',
                'cep' => '30130100',
                'enderecos_entrega' => [
                    [
                        'apelido' => 'CD SP',
                        'logradouro' => 'Av Paulista',
                        'numero' => '1000',
                        'bairro' => 'Bela Vista',
                        'municipio' => 'São Paulo',
                        'uf' => 'SP',
                        'cep' => '01310100',
                        'ibge' => '3550308',
                        'responsavel_nome' => 'Maria Portaria',
                        'responsavel_telefone' => '11999990000',
                        'principal' => true,
                    ],
                    [
                        'apelido' => 'Fábrica',
                        'logradouro' => 'Rua Industrial',
                        'numero' => '50',
                        'bairro' => 'Distrito',
                        'municipio' => 'Contagem',
                        'uf' => 'MG',
                        'cep' => '32240000',
                        'responsavel_nome' => 'João Almoxarifado',
                        'principal' => false,
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonCount(2, 'data.enderecos_entrega')
            ->assertJsonPath('data.enderecos_entrega.0.apelido', 'CD SP')
            ->assertJsonPath('data.enderecos_entrega.0.responsavel_nome', 'Maria Portaria')
            ->assertJsonPath('data.enderecos_entrega.0.principal', true)
            ->assertJsonPath('data.enderecos_entrega.1.apelido', 'Fábrica')
            ->assertJsonPath('data.enderecos_entrega.1.principal', false);

        $parceiroId = $create->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/parceiros/{$parceiroId}", [
                'enderecos_entrega' => [
                    [
                        'logradouro' => 'Rua Única',
                        'numero' => '9',
                        'bairro' => 'Centro',
                        'municipio' => 'Betim',
                        'uf' => 'MG',
                        'cep' => '32600000',
                        'responsavel_nome' => 'Só Este',
                        'principal' => true,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonCount(1, 'data.enderecos_entrega')
            ->assertJsonPath('data.enderecos_entrega.0.municipio', 'Betim')
            ->assertJsonPath('data.enderecos_entrega.0.responsavel_nome', 'Só Este');

        $this->assertSame(1, ParceiroEnderecoEntrega::query()->where('parceiro_id', $parceiroId)->count());

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/parceiros/{$parceiroId}", [
                'enderecos_entrega' => [],
            ])
            ->assertOk()
            ->assertJsonCount(0, 'data.enderecos_entrega');

        $this->assertSame(0, ParceiroEnderecoEntrega::query()->where('parceiro_id', $parceiroId)->count());
    }

    public function test_endereco_entrega_exige_responsavel_e_campos_minimos(): void
    {
        $empresa = $this->empresa();
        $this->actingAdmin($empresa);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Cliente Incompleto',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'enderecos_entrega' => [
                    [
                        'logradouro' => 'Rua Sem Responsavel',
                        'numero' => '1',
                        'bairro' => 'Centro',
                        'municipio' => 'BH',
                        'uf' => 'MG',
                        'cep' => '30130100',
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['enderecos_entrega.0.responsavel_nome']);

        $this->assertSame(0, Parceiro::query()->count());
    }
}
