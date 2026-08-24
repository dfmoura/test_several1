<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\ImplantacaoAceite;
use App\Models\User;
use App\Support\ImplantacaoCatalogo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ImplantacaoAceiteTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresaA;

    private Empresa $empresaB;

    private User $adminA;

    private User $consultaA;

    private User $adminB;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['implantacao.ler', 'implantacao.validar_dev', 'implantacao.validar_cliente'] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $admin = Role::findOrCreate('ADMIN', 'web');
        $admin->givePermissionTo([
            'implantacao.ler',
            'implantacao.validar_dev',
            'implantacao.validar_cliente',
        ]);

        $consulta = Role::findOrCreate('CONSULTA', 'web');
        $consulta->givePermissionTo('implantacao.ler');

        $this->empresaA = Empresa::query()->create([
            'codigo' => 'EMP-IMP01',
            'razao_social' => 'Gráfica Implante A',
            'nome_fantasia' => 'Implante A',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->empresaB = Empresa::query()->create([
            'codigo' => 'EMP-IMP02',
            'razao_social' => 'Gráfica Implante B',
            'cnpj' => '34028316000103',
            'situacao' => 'ATIVA',
        ]);

        $this->adminA = User::query()->create([
            'codigo' => 'USR-IMP01',
            'name' => 'Admin Implante A',
            'email' => 'imp-a@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresaA->id,
        ]);
        $this->adminA->assignRole('ADMIN');
        $this->adminA->empresas()->attach([$this->empresaA->id]);

        $this->consultaA = User::query()->create([
            'codigo' => 'USR-IMP02',
            'name' => 'Consulta Implante A',
            'email' => 'imp-consulta@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresaA->id,
        ]);
        $this->consultaA->assignRole('CONSULTA');
        $this->consultaA->empresas()->attach([$this->empresaA->id]);

        $this->adminB = User::query()->create([
            'codigo' => 'USR-IMP03',
            'name' => 'Admin Implante B',
            'email' => 'imp-b@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresaB->id,
        ]);
        $this->adminB->assignRole('ADMIN');
        $this->adminB->empresas()->attach([$this->empresaB->id]);
    }

    public function test_matriz_lista_catalogo_com_evidencia_empresa(): void
    {
        Sanctum::actingAs($this->adminA);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresaA->id)
            ->getJson('/api/v1/implantacao')
            ->assertOk();

        $itens = $res->json('data.itens');
        $this->assertIsArray($itens);
        $this->assertGreaterThanOrEqual(count(ImplantacaoCatalogo::itens()), count($itens));

        $empresaItem = collect($itens)->firstWhere('codigo', 'F0_EMPRESA');
        $this->assertNotNull($empresaItem);
        $this->assertTrue($empresaItem['evidencia']['ok']);
        $this->assertSame('pendente_dev', $empresaItem['linha']);

        $this->assertSame('EMP-IMP01', $res->json('data.empresa.codigo'));
        $this->assertArrayHasKey('flexorc', $res->json('data.resumo'));
        $this->assertArrayHasKey('proximo_elo', $res->json('data.resumo'));
    }

    public function test_dual_aceite_marca_linha_aceito(): void
    {
        Sanctum::actingAs($this->adminA);
        $h = ['X-Empresa-Id' => (string) $this->empresaA->id];

        $this->withHeaders($h)
            ->patchJson('/api/v1/implantacao/F0_EMPRESA', [
                'eixo' => 'dev',
                'status' => 'OK',
                'observacao' => 'Configurado em homolog',
            ])
            ->assertOk()
            ->assertJsonPath('data.status_dev', 'OK')
            ->assertJsonPath('data.linha', 'pronto_cliente');

        $this->withHeaders($h)
            ->patchJson('/api/v1/implantacao/F0_EMPRESA', [
                'eixo' => 'cliente',
                'status' => 'OK',
            ])
            ->assertOk()
            ->assertJsonPath('data.status_cliente', 'OK')
            ->assertJsonPath('data.linha', 'aceito');

        $this->assertDatabaseHas('implantacao_aceites', [
            'empresa_id' => $this->empresaA->id,
            'codigo' => 'F0_EMPRESA',
            'status_dev' => 'OK',
            'status_cliente' => 'OK',
        ]);
    }

    public function test_consulta_le_mas_nao_valida(): void
    {
        Sanctum::actingAs($this->consultaA);
        $h = ['X-Empresa-Id' => (string) $this->empresaA->id];

        $this->withHeaders($h)->getJson('/api/v1/implantacao')->assertOk();

        $this->withHeaders($h)
            ->patchJson('/api/v1/implantacao/F1_PARCEIROS', [
                'eixo' => 'dev',
                'status' => 'OK',
            ])
            ->assertForbidden();
    }

    public function test_isolamento_entre_empresas(): void
    {
        Sanctum::actingAs($this->adminA);

        $this->withHeader('X-Empresa-Id', (string) $this->empresaA->id)
            ->patchJson('/api/v1/implantacao/F1_PARCEIROS', [
                'eixo' => 'dev',
                'status' => 'OK',
            ])
            ->assertOk();

        Sanctum::actingAs($this->adminB);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresaB->id)
            ->getJson('/api/v1/implantacao')
            ->assertOk();

        $item = collect($res->json('data.itens'))->firstWhere('codigo', 'F1_PARCEIROS');
        $this->assertSame('PENDENTE', $item['status_dev']);

        $this->assertSame(1, ImplantacaoAceite::query()->where('empresa_id', $this->empresaA->id)->count());
        $this->assertSame(0, ImplantacaoAceite::query()->where('empresa_id', $this->empresaB->id)->count());

        Sanctum::actingAs($this->adminA);
        $this->withHeader('X-Empresa-Id', (string) $this->empresaB->id)
            ->getJson('/api/v1/implantacao')
            ->assertForbidden();
    }

    public function test_codigo_desconhecido_falha(): void
    {
        Sanctum::actingAs($this->adminA);

        $this->withHeader('X-Empresa-Id', (string) $this->empresaA->id)
            ->patchJson('/api/v1/implantacao/XYZ_FAKE', [
                'eixo' => 'dev',
                'status' => 'OK',
            ])
            ->assertStatus(422);
    }
}
