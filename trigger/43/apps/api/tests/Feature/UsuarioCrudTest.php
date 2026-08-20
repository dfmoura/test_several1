<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UsuarioCrudTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empA;

    private Empresa $empB;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('usuarios.gerir', 'web');
        Role::findOrCreate('ADMIN', 'web');
        Role::findOrCreate('COMERCIAL', 'web');
        Role::findOrCreate('CONSULTA', 'web');

        $this->empA = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'cnpj' => '00000000000191',
            'razao_social' => 'Empresa A',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->empB = Empresa::query()->create([
            'codigo' => 'EMP-00002',
            'cnpj' => '00000000000272',
            'razao_social' => 'Empresa B',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => false,
        ]);

        $this->admin = User::query()->create([
            'codigo' => 'USR-ADM',
            'name' => 'Admin Teste',
            'email' => 'admin@test.local',
            'password' => bcrypt('Admin@123'),
            'ativo' => true,
            'empresa_default_id' => $this->empA->id,
        ]);
        $this->admin->givePermissionTo('usuarios.gerir');
        $this->admin->assignRole('ADMIN');
        $this->admin->empresas()->attach([
            $this->empA->id => ['padrao' => true],
            $this->empB->id => ['padrao' => false],
        ]);
    }

    public function test_lista_apenas_usuarios_do_escopo_do_gestor(): void
    {
        $outro = $this->criarUsuarioOperacional('USR-OUT', 'outro@test.local', $this->empB);

        $isolado = User::query()->create([
            'codigo' => 'USR-ISO',
            'name' => 'Isolado C',
            'email' => 'isolado@test.local',
            'password' => bcrypt('Demo@123'),
            'ativo' => true,
        ]);
        $empC = Empresa::query()->create([
            'codigo' => 'EMP-00003',
            'cnpj' => '00000000000353',
            'razao_social' => 'Empresa C',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => false,
        ]);
        $isolado->empresas()->attach($empC->id, ['padrao' => true]);

        Sanctum::actingAs($this->admin, ['*']);

        $response = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/usuarios');

        $response->assertOk();
        $codigos = collect($response->json('data'))->pluck('codigo')->all();

        $this->assertContains('USR-ADM', $codigos);
        $this->assertContains('USR-OUT', $codigos);
        $this->assertNotContains('USR-ISO', $codigos);
    }

    public function test_cria_usuario_vinculado_a_colaborador_com_resposta_estavel(): void
    {
        $parceiro = $this->criarColaborador('PAR-NOVO', $this->empA);

        Sanctum::actingAs($this->admin, ['*']);

        $response = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->postJson('/api/v1/usuarios', [
                'name' => 'Novo Operacional',
                'email' => 'novo@test.local',
                'password' => 'Senha@123',
                'parceiro_id' => $parceiro->id,
                'roles' => ['COMERCIAL'],
                'empresa_ids' => [$this->empA->id],
                'empresa_default_id' => $this->empA->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.tipo', 'colaborador')
            ->assertJsonPath('data.roles', ['COMERCIAL'])
            ->assertJsonPath('data.parceiro.codigo', 'PAR-NOVO');

        $this->assertDatabaseHas('users', [
            'email' => 'novo@test.local',
            'parceiro_id' => $parceiro->id,
        ]);
    }

    public function test_rejeita_sod_incompativel(): void
    {
        $parceiro = $this->criarColaborador('PAR-SOD', $this->empA);

        Sanctum::actingAs($this->admin, ['*']);

        $response = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->postJson('/api/v1/usuarios', [
                'name' => 'Conflito SoD',
                'email' => 'sod@test.local',
                'password' => 'Senha@123',
                'parceiro_id' => $parceiro->id,
                'roles' => ['ADMIN', 'COMERCIAL'],
                'empresa_ids' => [$this->empA->id],
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['roles']);
    }

    public function test_nao_permite_desativar_proprio_acesso(): void
    {
        Sanctum::actingAs($this->admin, ['*']);

        $response = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->patchJson('/api/v1/usuarios/'.$this->admin->id.'/deactivate');

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['ativo']);
    }

    public function test_colaboradores_disponiveis_respeitam_todas_as_emps_do_gestor(): void
    {
        $colabA = $this->criarColaborador('PAR-A1', $this->empA);
        $this->criarColaborador('PAR-B1', $this->empB);

        Sanctum::actingAs($this->admin, ['*']);

        $response = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/usuarios/colaboradores-disponiveis');

        $response->assertOk();
        $codigos = collect($response->json('data'))->pluck('codigo')->all();

        $this->assertContains('PAR-A1', $codigos);
        $this->assertContains('PAR-B1', $codigos);
        $this->assertGreaterThanOrEqual(2, count($codigos));
    }

    private function criarColaborador(string $codigo, Empresa $empresa): Parceiro
    {
        return Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Colaborador '.$codigo,
            'papel_colaborador' => true,
            'situacao' => 'ATIVO',
        ]);
    }

    private function criarUsuarioOperacional(string $codigo, string $email, Empresa $empresa): User
    {
        $parceiro = $this->criarColaborador('PAR-'.$codigo, $empresa);

        $user = User::query()->create([
            'codigo' => $codigo,
            'name' => 'User '.$codigo,
            'email' => $email,
            'password' => bcrypt('Demo@123'),
            'ativo' => true,
            'parceiro_id' => $parceiro->id,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->assignRole('CONSULTA');
        $user->empresas()->attach($empresa->id, ['padrao' => true]);

        return $user;
    }
}
