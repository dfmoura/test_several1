<?php

namespace Tests\Feature;

use App\Models\CondicaoPagamentoSugestao;
use App\Models\Empresa;
use App\Models\User;
use App\Services\Cadastros\CondicaoPagamentoSugestaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CondicaoPagamentoSugestaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_crud_sugestoes_por_emp_e_consulta(): void
    {
        Permission::findOrCreate('condicao_pagamento.ler', 'web');
        Permission::findOrCreate('condicao_pagamento.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-CP1',
            'razao_social' => 'Empresa Condições',
            'nome_fantasia' => 'Conds',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-CP2',
            'razao_social' => 'Outra Empresa',
            'nome_fantasia' => 'Outra',
            'cnpj' => '44555666000199',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-CP1',
            'name' => 'Admin CP',
            'email' => 'cp@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['condicao_pagamento.ler', 'condicao_pagamento.escrever']);
        $user->empresas()->attach([$empresa->id, $outra->id]);

        Sanctum::actingAs($user);

        $create = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/condicoes-pagamento-sugestoes', ['texto' => '28 DDL'])
            ->assertCreated()
            ->assertJsonPath('data.texto', '28 DDL')
            ->assertJsonPath('data.ativo', true);

        $sugId = (int) $create->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/condicoes-pagamento-sugestoes')
            ->assertOk()
            ->assertJsonPath('data.0.texto', '28 DDL');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/consulta/condicoes-pagamento-sugestoes')
            ->assertOk()
            ->assertJsonPath('data.0.texto', '28 DDL');

        // Isolamento multi-EMP.
        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson('/api/v1/condicoes-pagamento-sugestoes')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson("/api/v1/condicoes-pagamento-sugestoes/{$sugId}")
            ->assertNotFound();

        // Duplicata case-insensitive na mesma EMP.
        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/condicoes-pagamento-sugestoes', ['texto' => '28 ddl'])
            ->assertStatus(422);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/condicoes-pagamento-sugestoes/{$sugId}", ['texto' => '14/28/42'])
            ->assertOk()
            ->assertJsonPath('data.texto', '14/28/42');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/condicoes-pagamento-sugestoes/{$sugId}", ['ativo' => false])
            ->assertOk()
            ->assertJsonPath('data.ativo', false);

        // Reativar via novo cadastro com mesmo texto.
        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/condicoes-pagamento-sugestoes', ['texto' => '14/28/42'])
            ->assertCreated()
            ->assertJsonPath('data.texto', '14/28/42')
            ->assertJsonPath('data.ativo', true);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/consulta/condicoes-pagamento-sugestoes')
            ->assertOk()
            ->assertJsonPath('data.0.texto', '14/28/42');
    }

    public function test_seed_canonicos_idempotente(): void
    {
        Permission::findOrCreate('condicao_pagamento.ler', 'web');
        Permission::findOrCreate('condicao_pagamento.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-CP3',
            'razao_social' => 'Seed Condições',
            'nome_fantasia' => 'Seed',
            'cnpj' => '66777888000155',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-CP3',
            'name' => 'Admin Seed',
            'email' => 'cpseed@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['condicao_pagamento.ler', 'condicao_pagamento.escrever']);
        $user->empresas()->attach($empresa->id);

        Sanctum::actingAs($user);

        $first = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/condicoes-pagamento-sugestoes/seed-canonicos')
            ->assertOk();

        $criados = (int) $first->json('data.criados');
        $this->assertGreaterThan(0, $criados);
        $this->assertSame(count(CondicaoPagamentoSugestao::CANONICOS), (int) $first->json('data.total'));

        $second = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/condicoes-pagamento-sugestoes/seed-canonicos')
            ->assertOk();

        $this->assertSame(0, (int) $second->json('data.criados'));
    }

    public function test_onboarding_garante_canonicos(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-CP4',
            'razao_social' => 'Onboarding CP',
            'nome_fantasia' => 'Onb',
            'cnpj' => '88999000000177',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        app(CondicaoPagamentoSugestaoService::class)->ensureCanonicos($empresa);

        $this->assertSame(
            count(CondicaoPagamentoSugestao::CANONICOS),
            CondicaoPagamentoSugestao::query()->where('empresa_id', $empresa->id)->count(),
        );
    }
}
