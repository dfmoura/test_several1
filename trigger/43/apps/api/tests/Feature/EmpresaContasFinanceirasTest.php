<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class EmpresaContasFinanceirasTest extends TestCase
{
    use RefreshDatabase;

    public function test_atualiza_contas_financeiras_da_empresa(): void
    {
        Permission::findOrCreate('empresas.gerir', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-CF01',
            'razao_social' => 'Empresa Contas',
            'nome_fantasia' => 'Contas',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-CF01',
            'name' => 'Admin Contas',
            'email' => 'contas@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo('empresas.gerir');
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        $payload = [
            'contas_financeiras' => [
                [
                    'tipo' => 'BANCO',
                    'descricao' => 'Sicoob operacional',
                    'banco_codigo' => '756',
                    'banco_nome' => 'Sicoob',
                    'agencia' => '1234',
                    'conta' => '56789-0',
                    'tipo_conta' => 'CORRENTE',
                    'pix_chave' => '01423183000110',
                    'principal' => true,
                    'ativa' => true,
                    'saldo_abertura' => 1500.5,
                    'saldo_abertura_em' => '2026-08-01',
                ],
                [
                    'tipo' => 'CAIXA',
                    'descricao' => 'Caixa escritório',
                    'principal' => false,
                    'ativa' => true,
                    'saldo_abertura' => 200,
                    'saldo_abertura_em' => '2026-08-01',
                ],
            ],
        ];

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/empresas/{$empresa->id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.contas_financeiras.0.codigo', 'CFIN-00001')
            ->assertJsonPath('data.contas_financeiras.0.banco_codigo', '756')
            ->assertJsonPath('data.contas_financeiras.0.principal', true)
            ->assertJsonPath('data.contas_financeiras.0.saldo_abertura', '1500.50')
            ->assertJsonPath('data.contas_financeiras.1.tipo', 'CAIXA')
            ->assertJsonPath('data.contas_financeiras.1.codigo', 'CFIN-00002');

        $this->assertSame(2, EmpresaContaFinanceira::query()->where('empresa_id', $empresa->id)->count());

        $show = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson("/api/v1/empresas/{$empresa->id}")
            ->assertOk();

        $idBanco = $show->json('data.contas_financeiras.0.id');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/empresas/{$empresa->id}", [
                'contas_financeiras' => [
                    [
                        'id' => $idBanco,
                        'tipo' => 'BANCO',
                        'descricao' => 'Sicoob operacional',
                        'banco_codigo' => '756',
                        'banco_nome' => 'Sicoob',
                        'agencia' => '1234',
                        'conta' => '56789-0',
                        'tipo_conta' => 'CORRENTE',
                        'principal' => true,
                        'ativa' => true,
                        'saldo_abertura' => 1500.5,
                        'saldo_abertura_em' => '2026-08-01',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonCount(1, 'data.contas_financeiras');

        $this->assertSame(1, EmpresaContaFinanceira::query()->where('empresa_id', $empresa->id)->count());
        $this->assertSame(1, EmpresaContaFinanceira::withTrashed()->where('empresa_id', $empresa->id)->whereNotNull('deleted_at')->count());
    }

    public function test_banco_exige_identificacao_do_banco(): void
    {
        Permission::findOrCreate('empresas.gerir', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-CF02',
            'razao_social' => 'Empresa Contas 2',
            'cnpj' => '34028316000103',
            'situacao' => 'ATIVA',
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-CF02',
            'name' => 'Admin Contas 2',
            'email' => 'contas2@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo('empresas.gerir');
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/empresas/{$empresa->id}", [
                'contas_financeiras' => [
                    [
                        'tipo' => 'BANCO',
                        'descricao' => 'Sem banco',
                        'agencia' => '1',
                        'conta' => '2',
                        'principal' => true,
                    ],
                ],
            ])
            ->assertStatus(422);
    }
}
