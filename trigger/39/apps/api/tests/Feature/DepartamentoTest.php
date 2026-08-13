<?php

namespace Tests\Feature;

use App\Models\Departamento;
use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DepartamentoTest extends TestCase
{
    use RefreshDatabase;

    public function test_crud_departamento_por_emp_e_vinculo_parceiro(): void
    {
        Permission::findOrCreate('departamento.ler', 'web');
        Permission::findOrCreate('departamento.escrever', 'web');
        Permission::findOrCreate('parceiro.ler', 'web');
        Permission::findOrCreate('parceiro.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DEP1',
            'razao_social' => 'Empresa Departamentos',
            'nome_fantasia' => 'Deps',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-DEP2',
            'razao_social' => 'Outra Empresa',
            'nome_fantasia' => 'Outra',
            'cnpj' => '44555666000199',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-DEP1',
            'name' => 'Admin DEP',
            'email' => 'dep@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo([
            'departamento.ler',
            'departamento.escrever',
            'parceiro.ler',
            'parceiro.escrever',
        ]);
        $user->empresas()->attach([$empresa->id, $outra->id]);

        Sanctum::actingAs($user);

        $create = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/departamentos', ['nome' => 'Comercial'])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'DEP-00001')
            ->assertJsonPath('data.nome', 'Comercial')
            ->assertJsonPath('data.ativo', true);

        $depId = (int) $create->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/departamentos')
            ->assertOk()
            ->assertJsonPath('data.0.codigo', 'DEP-00001');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/consulta/departamentos')
            ->assertOk()
            ->assertJsonPath('data.0.nome', 'Comercial');

        // Isolamento: EMP B não vê DEP da EMP A.
        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson('/api/v1/departamentos')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson("/api/v1/departamentos/{$depId}")
            ->assertNotFound();

        // Nome duplicado (case-insensitive) na mesma EMP.
        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/departamentos', ['nome' => 'comercial'])
            ->assertStatus(422);

        // Vínculo no colaborador.
        $parceiro = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/parceiros', [
                'tipo_pessoa' => 'PF',
                'razao_social' => 'Colaborador Teste',
                'papel_colaborador' => true,
                'cargo' => 'Analista',
                'departamento_id' => $depId,
                'situacao' => 'ATIVO',
            ])
            ->assertCreated()
            ->assertJsonPath('data.departamento_id', $depId)
            ->assertJsonPath('data.departamento', 'Comercial');

        $parceiroId = (int) $parceiro->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/departamentos/{$depId}", ['nome' => 'Comercial VIP'])
            ->assertOk()
            ->assertJsonPath('data.nome', 'Comercial VIP');

        $this->assertDatabaseHas('parceiros', [
            'id' => $parceiroId,
            'departamento' => 'Comercial VIP',
            'departamento_id' => $depId,
        ]);

        // Soft-delete bloqueado se em uso.
        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->deleteJson("/api/v1/departamentos/{$depId}")
            ->assertStatus(422);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/departamentos/{$depId}", ['ativo' => false])
            ->assertOk()
            ->assertJsonPath('data.ativo', false);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/consulta/departamentos')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Liberar vínculo e excluir (soft).
        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/parceiros/{$parceiroId}", ['departamento_id' => null])
            ->assertOk()
            ->assertJsonPath('data.departamento_id', null);

        // Patrimônio também usa DEP como local.
        Permission::findOrCreate('patrimonio.ler', 'web');
        Permission::findOrCreate('patrimonio.escrever', 'web');
        $user->givePermissionTo(['patrimonio.ler', 'patrimonio.escrever']);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/departamentos/{$depId}", ['ativo' => true])
            ->assertOk();

        $bem = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/bens', [
                'descricao' => 'Notebook departamento',
                'categoria' => 'INFORMATICA',
                'departamento_id' => $depId,
                'status' => 'ATIVO',
            ])
            ->assertCreated()
            ->assertJsonPath('data.departamento_id', $depId)
            ->assertJsonPath('data.local', 'Comercial VIP');

        $bemId = (int) $bem->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->deleteJson("/api/v1/departamentos/{$depId}")
            ->assertStatus(422);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/bens/{$bemId}", ['departamento_id' => null])
            ->assertOk();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->deleteJson("/api/v1/departamentos/{$depId}")
            ->assertOk();

        $this->assertSoftDeleted('departamentos', ['id' => $depId]);
    }

    public function test_sem_permissao_retorna_403(): void
    {
        Permission::findOrCreate('departamento.ler', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DEP3',
            'razao_social' => 'Sem Permissão DEP',
            'nome_fantasia' => 'Sem',
            'cnpj' => '55666777000188',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-DEP3',
            'name' => 'Sem Permissão',
            'email' => 'sem.dep@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/departamentos')
            ->assertForbidden();
    }

    public function test_backfill_legacy_departamento_string(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-DEP4',
            'razao_social' => 'Backfill DEP',
            'nome_fantasia' => 'BF',
            'cnpj' => '66777888000177',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $dep = Departamento::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'DEP-00001',
            'nome' => 'Operacional',
            'ativo' => true,
        ]);

        $parceiro = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-DEP4',
            'tipo_pessoa' => 'PF',
            'razao_social' => 'Legado',
            'papel_colaborador' => true,
            'departamento' => 'Operacional',
            'departamento_id' => $dep->id,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $this->assertSame($dep->id, $parceiro->fresh()->departamento_id);
        $this->assertSame('Operacional', $parceiro->fresh()->departamento);
    }
}
