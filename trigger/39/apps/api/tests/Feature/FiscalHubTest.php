<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\FiscalHub;
use App\Models\User;
use App\Services\Fiscal\FiscalHubResolver;
use App\Services\Fiscal\FocusNfeClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FiscalHubTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmpresa;

    private User $admin;

    private User $consulta;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('fiscal.hubs.gerir', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-HUB1',
            'razao_social' => 'Empresa Hub Teste',
            'nome_fantasia' => 'HubTeste',
            'cnpj' => '00000000000353',
            'situacao' => 'ATIVA',
        ]);

        $this->outraEmpresa = Empresa::query()->create([
            'codigo' => 'EMP-HUB2',
            'razao_social' => 'Outra Empresa Hub',
            'nome_fantasia' => 'Hub2',
            'cnpj' => '00000000000434',
            'situacao' => 'ATIVA',
        ]);

        $this->admin = User::query()->create([
            'codigo' => 'USR-HUB1',
            'name' => 'Admin Hub',
            'email' => 'admin.hub@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->admin->givePermissionTo('fiscal.hubs.gerir');
        $this->admin->empresas()->attach([$this->empresa->id, $this->outraEmpresa->id]);

        $this->consulta = User::query()->create([
            'codigo' => 'USR-HUB2',
            'name' => 'Consulta Hub',
            'email' => 'consulta.hub@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->consulta->empresas()->attach($this->empresa->id);
    }

    public function test_criar_lista_nao_expoe_tokens(): void
    {
        Sanctum::actingAs($this->admin);

        $create = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/fiscal-hubs', [
                'nome' => 'Focus Principal',
                'provedor' => 'focusnfe',
                'token_homologacao' => 'tok-homolog-muito-secreto',
                'token_producao' => 'tok-producao-muito-secreto',
                'ambiente_ativo' => 'homologacao',
            ]);

        $create->assertCreated();
        $json = $create->json('data');
        $this->assertSame('HUB-00001', $json['codigo']);
        $this->assertTrue($json['padrao']);
        $this->assertArrayNotHasKey('token_homologacao', $json);
        $this->assertArrayNotHasKey('token_producao', $json);
        $this->assertArrayNotHasKey('token_homologacao_criptografada', $json);
        $this->assertArrayNotHasKey('token_producao_criptografada', $json);
        $this->assertSame('tok-…reto', $json['token_homologacao_mascara']);
        $this->assertStringNotContainsString('tok-homolog-muito-secreto', $create->getContent());
        $this->assertStringNotContainsString('tok-producao-muito-secreto', $create->getContent());
        $this->assertSame(FiscalHub::FOCUS_URL_HOMOLOGACAO, $json['base_url_homologacao_efetiva']);

        $list = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/fiscal-hubs');

        $list->assertOk();
        $this->assertSame(1, $list->json('total'));
        $this->assertSame(1, $list->json('ativos'));
        $this->assertNotEmpty($list->json('aviso'));
        $this->assertStringNotContainsString('tok-homolog-muito-secreto', $list->getContent());
    }

    public function test_escopo_por_empresa(): void
    {
        Sanctum::actingAs($this->admin);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/fiscal-hubs', [
                'nome' => 'Focus Emp1',
                'provedor' => 'focusnfe',
                'token_homologacao' => 'tok-emp1-homologacao1',
            ])
            ->assertCreated();

        $listOutra = $this->withHeader('X-Empresa-Id', (string) $this->outraEmpresa->id)
            ->getJson('/api/v1/fiscal-hubs');

        $listOutra->assertOk();
        $this->assertSame(0, $listOutra->json('total'));
    }

    public function test_editar_token_e_manter_outro(): void
    {
        Sanctum::actingAs($this->admin);

        $created = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/fiscal-hubs', [
                'nome' => 'Focus Edit',
                'provedor' => 'focusnfe',
                'token_homologacao' => 'hom-key-original-abcdef',
                'token_producao' => 'prod-key-original-xyzzyx',
            ])
            ->json('data');

        $keep = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->putJson('/api/v1/fiscal-hubs/'.$created['id'], [
                'nome' => 'Focus Editado',
                'token_homologacao' => 'hom-key-nova-xxxxxxxxxx',
            ]);

        $keep->assertOk();
        $this->assertSame('Focus Editado', $keep->json('data.nome'));
        $this->assertSame('hom-…xxxx', $keep->json('data.token_homologacao_mascara'));
        $this->assertSame('prod…zzyx', $keep->json('data.token_producao_mascara'));
    }

    public function test_padrao_unico_e_resolver(): void
    {
        Sanctum::actingAs($this->admin);

        $a = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/fiscal-hubs', [
                'nome' => 'Hub A',
                'provedor' => 'focusnfe',
                'token_homologacao' => 'tok-hub-a-homologacao',
                'padrao' => true,
            ])
            ->json('data');

        $b = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/fiscal-hubs', [
                'nome' => 'Hub B',
                'provedor' => 'focusnfe',
                'token_homologacao' => 'tok-hub-b-homologacao',
                'padrao' => true,
            ])
            ->json('data');

        $this->assertTrue($b['padrao']);
        $this->assertFalse(
            (bool) FiscalHub::query()->find($a['id'])?->padrao
        );

        $runtime = app(FiscalHubResolver::class)->runtime($this->empresa);
        $this->assertSame($b['id'], $runtime['hub']->id);
        $this->assertSame('homologacao', $runtime['ambiente']);
        $this->assertSame('tok-hub-b-homologacao', $runtime['token']);
        $this->assertSame(FiscalHub::FOCUS_URL_HOMOLOGACAO, $runtime['base_url']);
    }

    public function test_bloqueia_producao_sem_token(): void
    {
        Sanctum::actingAs($this->admin);

        $id = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/fiscal-hubs', [
                'nome' => 'Só Homolog',
                'provedor' => 'focusnfe',
                'token_homologacao' => 'tok-so-homologacao-xx',
            ])
            ->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->putJson('/api/v1/fiscal-hubs/'.$id, [
                'ambiente_ativo' => 'producao',
            ])
            ->assertStatus(422);
    }

    public function test_sem_permissao_bloqueado(): void
    {
        Sanctum::actingAs($this->consulta);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/fiscal-hubs')
            ->assertForbidden();
    }

    public function test_testar_conexao_focus(): void
    {
        Sanctum::actingAs($this->admin);

        Http::fake([
            'homologacao.focusnfe.com.br/*' => Http::response([['id' => 1]], 200),
        ]);

        $id = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/fiscal-hubs', [
                'nome' => 'Focus Test',
                'provedor' => 'focusnfe',
                'token_homologacao' => 'tok-live-test-abcdef12',
            ])
            ->json('data.id');

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/fiscal-hubs/'.$id.'/testar', [
                'ambiente' => 'homologacao',
            ]);

        $res->assertOk()->assertJsonPath('ok', true);
        $this->assertTrue((bool) FiscalHub::query()->find($id)?->ultimo_teste_ok);
        $this->assertSame('homologacao', FiscalHub::query()->find($id)?->ultimo_teste_ambiente);
        $this->assertStringContainsString('Conexão OK', (string) $res->json('mensagem'));
    }

    public function test_client_rejeita_token(): void
    {
        Http::fake([
            'homologacao.focusnfe.com.br/*' => Http::response(['mensagem' => 'Unauthorized'], 401),
        ]);

        $crypto = app(\App\Services\Fiscal\FiscalHubCrypto::class);
        $row = FiscalHub::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'HUB-00999',
            'nome' => 'Bad Token',
            'provedor' => 'focusnfe',
            'ambiente_ativo' => 'homologacao',
            'padrao' => true,
            'ativo' => true,
            'token_homologacao_criptografada' => $crypto->criptografar('tok-bad-key-xxxxxx'),
            'token_homologacao_mascara' => 'tok-…xxxx',
        ]);

        $resultado = app(FocusNfeClient::class)->testarConexao($row, 'homologacao');

        $this->assertFalse($resultado['ok']);
        $this->assertStringContainsString('Token rejeitado', $resultado['mensagem']);
    }

    public function test_generico_exige_url(): void
    {
        Sanctum::actingAs($this->admin);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/fiscal-hubs', [
                'nome' => 'Gen Sem URL',
                'provedor' => 'generico',
                'token_homologacao' => 'tok-generico-12345678',
            ])
            ->assertStatus(422);
    }
}
