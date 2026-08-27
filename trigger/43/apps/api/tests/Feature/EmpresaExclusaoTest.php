<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\Concerns\FakesConsultaExterna;
use Tests\TestCase;

class EmpresaExclusaoTest extends TestCase
{
    use FakesConsultaExterna;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeConsultaExternaIndisponivel();
        config(['erp.flexorc.public_conta_registration' => true]);

        foreach ([
            'empresas.gerir',
            'parametros.gerir',
            'usuarios.gerir',
            'parceiro.ler',
            'parceiro.escrever',
            'orcamento.ler',
            'orcamento.escrever',
            'orcamento.catalogo.gerir',
            'financeiro.ler',
            'financeiro.escrever',
            'patrimonio.ler',
            'patrimonio.escrever',
            'departamento.ler',
            'departamento.escrever',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $admin = Role::findOrCreate('ADMIN', 'web');
        $admin->syncPermissions(Permission::all());
    }

    /**
     * @return array{token: string, empresa_id: int, user: User}
     */
    private function abrirContaComEmpresa(string $email = 'excluir@grafica.test'): array
    {
        $conta = $this->postJson('/api/v1/auth/registrar-conta', [
            'admin_name' => 'Admin Excluir',
            'admin_email' => $email,
            'admin_password' => 'SenhaForte1',
        ])->assertCreated();

        $token = (string) $conta->json('token');
        $this->withToken($token)->postJson('/api/v1/ativacao/pagamento/confirmar-demo')->assertOk();

        $emp = $this->withToken($token)->postJson('/api/v1/auth/abrir-empresa', [
            'cnpj' => '34661762000150',
            'razao_social' => 'GRAFICA EXCLUIR LTDA',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
        ])->assertCreated();

        $empresaId = (int) $emp->json('empresa.id');
        $user = User::query()->where('email', $email)->firstOrFail();

        return ['token' => $token, 'empresa_id' => $empresaId, 'user' => $user];
    }

    public function test_preflight_permite_emp_virgem_apos_abrir(): void
    {
        $ctx = $this->abrirContaComEmpresa();

        $res = $this->withToken($ctx['token'])
            ->withHeader('X-Empresa-Id', (string) $ctx['empresa_id'])
            ->getJson("/api/v1/empresas/{$ctx['empresa_id']}/exclusao-preflight")
            ->assertOk();

        $this->assertTrue($res->json('data.pode_excluir'));
        $this->assertSame([], $res->json('data.bloqueios'));
    }

    public function test_exclui_emp_virgem_purge_definitivo_e_libera_cnpj(): void
    {
        $ctx = $this->abrirContaComEmpresa();
        $empresaId = $ctx['empresa_id'];

        $this->withToken($ctx['token'])
            ->withHeader('X-Empresa-Id', (string) $empresaId)
            ->deleteJson("/api/v1/empresas/{$empresaId}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('empresas', ['id' => $empresaId]);
        $this->assertDatabaseMissing('empresa_user', [
            'empresa_id' => $empresaId,
            'user_id' => $ctx['user']->id,
        ]);

        $this->flushHeaders();
        Sanctum::actingAs($ctx['user']->fresh());
        $lista = $this->getJson('/api/v1/empresas')->assertOk();
        $this->assertSame([], $lista->json('data'));

        // CNPJ liberado: novo cadastro cria EMP nova (não fantasma).
        $reabre = $this->postJson('/api/v1/auth/abrir-empresa', [
            'cnpj' => '34661762000150',
            'razao_social' => 'GRAFICA EXCLUIR LTDA',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
        ])->assertCreated();

        $novoId = (int) $reabre->json('empresa.id');
        $this->assertNotSame($empresaId, $novoId);
        $this->assertDatabaseHas('empresas', [
            'id' => $novoId,
            'cnpj' => '34661762000150',
            'deleted_at' => null,
        ]);
    }

    public function test_bloqueia_exclusao_com_orcamento(): void
    {
        $ctx = $this->abrirContaComEmpresa();
        $empresaId = $ctx['empresa_id'];

        $par = Parceiro::query()->where('empresa_id', $empresaId)->firstOrFail();
        Orcamento::query()->create([
            'empresa_id' => $empresaId,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-2026-00001',
            'versao' => 1,
            'parceiro_id' => $par->id,
            'cliente_nome' => $par->razao_social,
            'status' => Orcamento::STATUS_RASCUNHO,
            'input_snapshot' => [],
            'result_snapshot' => null,
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        $this->withToken($ctx['token'])
            ->withHeader('X-Empresa-Id', (string) $empresaId)
            ->deleteJson("/api/v1/empresas/{$empresaId}")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['empresa']);

        $this->assertDatabaseHas('empresas', [
            'id' => $empresaId,
            'deleted_at' => null,
        ]);
    }

    public function test_bloqueia_exclusao_com_parceiro_cliente(): void
    {
        $ctx = $this->abrirContaComEmpresa('cliente-block@grafica.test');
        $empresaId = $ctx['empresa_id'];

        Parceiro::query()->create([
            'empresa_id' => $empresaId,
            'codigo' => 'PAR-CLI01',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'CLIENTE BLOQUEIO LTDA',
            'papel_cliente' => true,
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => false,
        ]);

        $pre = $this->withToken($ctx['token'])
            ->withHeader('X-Empresa-Id', (string) $empresaId)
            ->getJson("/api/v1/empresas/{$empresaId}/exclusao-preflight")
            ->assertOk();

        $this->assertFalse($pre->json('data.pode_excluir'));
        $this->assertNotEmpty($pre->json('data.bloqueios'));

        $this->withToken($ctx['token'])
            ->withHeader('X-Empresa-Id', (string) $empresaId)
            ->deleteJson("/api/v1/empresas/{$empresaId}")
            ->assertStatus(422);
    }

    public function test_exclusao_exige_permissao_e_vinculo(): void
    {
        $ctx = $this->abrirContaComEmpresa('perm@grafica.test');
        $empresaId = $ctx['empresa_id'];

        $outro = User::query()->create([
            'name' => 'Sem Gerir',
            'email' => 'sem-gerir@grafica.test',
            'password' => 'SenhaForte1',
            'codigo' => 'USR-SG001',
            'ativo' => true,
            'empresa_default_id' => $empresaId,
        ]);
        $outro->empresas()->attach($empresaId, ['padrao' => true]);
        $this->assertFalse($outro->can('empresas.gerir'));

        $this->flushHeaders();
        Sanctum::actingAs($outro);
        $this->withHeader('X-Empresa-Id', (string) $empresaId)
            ->deleteJson("/api/v1/empresas/{$empresaId}")
            ->assertForbidden();

        $estranho = User::query()->create([
            'name' => 'Estranho',
            'email' => 'estranho@grafica.test',
            'password' => 'SenhaForte1',
            'codigo' => 'USR-ES001',
            'ativo' => true,
        ]);
        $estranho->givePermissionTo('empresas.gerir');

        $this->flushHeaders();
        Sanctum::actingAs($estranho);
        $this->withHeader('X-Empresa-Id', (string) $empresaId)
            ->deleteJson("/api/v1/empresas/{$empresaId}")
            ->assertForbidden();

        $this->assertDatabaseHas('empresas', [
            'id' => $empresaId,
            'deleted_at' => null,
        ]);
    }
}
