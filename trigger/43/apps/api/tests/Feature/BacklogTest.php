<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class BacklogTest extends TestCase
{
    use RefreshDatabase;

    public function test_backlog_crud_datas_automaticas_e_isolamento_emp(): void
    {
        Permission::findOrCreate('backlog.ler', 'web');
        Permission::findOrCreate('backlog.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BLG1',
            'razao_social' => 'Empresa Backlog',
            'nome_fantasia' => 'BLG',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-BLG2',
            'razao_social' => 'Outra Empresa',
            'nome_fantasia' => 'Outra',
            'cnpj' => '44555666000199',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-BLG1',
            'name' => 'Admin BLG',
            'email' => 'blg@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['backlog.ler', 'backlog.escrever']);
        $user->empresas()->attach([$empresa->id, $outra->id]);

        Sanctum::actingAs($user);

        $create = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/backlog', ['tarefa' => 'Revisar catálogo ORC'])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'BLG-00001')
            ->assertJsonPath('data.tarefa', 'Revisar catálogo ORC')
            ->assertJsonPath('data.situacao', 'ABERTO')
            ->assertJsonPath('data.concluido_em', null);

        $this->assertNotEmpty($create->json('data.lancado_em'));
        $id = (int) $create->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson('/api/v1/backlog')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson("/api/v1/backlog/{$id}")
            ->assertNotFound();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson("/api/v1/backlog/{$id}/concluir", [
                'observacao_conclusao' => 'Catálogo revisado e preços alinhados.',
            ])
            ->assertOk()
            ->assertJsonPath('data.situacao', 'CONCLUIDO')
            ->assertJsonPath('data.observacao_conclusao', 'Catálogo revisado e preços alinhados.');

        $concluido = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson("/api/v1/backlog/{$id}")
            ->assertOk()
            ->json('data.concluido_em');

        $this->assertNotEmpty($concluido);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/backlog?situacao=abertos')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/backlog?situacao=concluidos')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.observacao_conclusao', 'Catálogo revisado e preços alinhados.');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson("/api/v1/backlog/{$id}/reabrir")
            ->assertOk()
            ->assertJsonPath('data.situacao', 'ABERTO')
            ->assertJsonPath('data.concluido_em', null)
            ->assertJsonPath('data.observacao_conclusao', null);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/backlog/{$id}", ['tarefa' => 'Revisar catálogo e facas'])
            ->assertOk()
            ->assertJsonPath('data.tarefa', 'Revisar catálogo e facas');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->deleteJson("/api/v1/backlog/{$id}")
            ->assertOk();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/backlog')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_backlog_exige_tarefa(): void
    {
        Permission::findOrCreate('backlog.ler', 'web');
        Permission::findOrCreate('backlog.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BLG3',
            'razao_social' => 'Empresa Validação',
            'nome_fantasia' => 'Val',
            'cnpj' => '55666777000100',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-BLG2',
            'name' => 'User BLG',
            'email' => 'blg2@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['backlog.ler', 'backlog.escrever']);
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/backlog', ['tarefa' => '   '])
            ->assertStatus(422);
    }

    public function test_backlog_consulta_sem_escrita(): void
    {
        Permission::findOrCreate('backlog.ler', 'web');
        Permission::findOrCreate('backlog.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BLG4',
            'razao_social' => 'Empresa Consulta',
            'nome_fantasia' => 'Cons',
            'cnpj' => '66777888000111',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $escritor = User::query()->create([
            'codigo' => 'USR-BLG-W',
            'name' => 'Escritor BLG',
            'email' => 'blg-w@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $escritor->givePermissionTo(['backlog.ler', 'backlog.escrever']);
        $escritor->empresas()->attach([$empresa->id]);

        $consulta = User::query()->create([
            'codigo' => 'USR-BLG-R',
            'name' => 'Consulta BLG',
            'email' => 'blg-r@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $consulta->givePermissionTo(['backlog.ler']);
        $consulta->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($escritor);
        $id = (int) $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/backlog', ['tarefa' => 'Visível na consulta'])
            ->assertCreated()
            ->json('data.id');

        Sanctum::actingAs($consulta);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/backlog')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.tarefa', 'Visível na consulta');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson("/api/v1/backlog/{$id}")
            ->assertOk();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/backlog', ['tarefa' => 'Não pode'])
            ->assertForbidden();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/backlog/{$id}", ['tarefa' => 'Não pode'])
            ->assertForbidden();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson("/api/v1/backlog/{$id}/concluir")
            ->assertForbidden();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->deleteJson("/api/v1/backlog/{$id}")
            ->assertForbidden();
    }

    public function test_me_inclui_backlog_ler_quando_concedido(): void
    {
        Permission::findOrCreate('backlog.ler', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BLG5',
            'razao_social' => 'Empresa Me Backlog',
            'nome_fantasia' => 'Me',
            'cnpj' => '77888999000122',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-BLG-ME',
            'name' => 'Consulta Me',
            'email' => 'blg-me@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo('backlog.ler');
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        $response = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/auth/me')
            ->assertOk();

        $this->assertContains('backlog.ler', $response->json('permissions'));
    }
}
