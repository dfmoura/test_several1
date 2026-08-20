<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\IaProvedor;
use App\Models\User;
use App\Services\Ia\IaClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class IaProvedorTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $admin;

    private User $consulta;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('ia.provedores.gerir', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-IA01',
            'razao_social' => 'Empresa IA Teste',
            'nome_fantasia' => 'IATeste',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);

        $this->admin = User::query()->create([
            'codigo' => 'USR-IA01',
            'name' => 'Admin IA',
            'email' => 'admin.ia@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->admin->givePermissionTo('ia.provedores.gerir');
        $this->admin->empresas()->attach($this->empresa->id);

        $this->consulta = User::query()->create([
            'codigo' => 'USR-IA02',
            'name' => 'Consulta IA',
            'email' => 'consulta.ia@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->consulta->empresas()->attach($this->empresa->id);
    }

    public function test_criar_lista_nao_expoe_key(): void
    {
        Sanctum::actingAs($this->admin);

        $create = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/ia-provedores', [
                'nome' => 'OpenAI Principal',
                'provedor' => 'openai',
                'api_key' => 'sk-test-chave-muito-secreta',
                'modelo' => 'gpt-4o-mini',
                'prioridade' => 10,
            ]);

        $create->assertCreated();
        $json = $create->json('data');
        $this->assertArrayNotHasKey('api_key', $json);
        $this->assertArrayNotHasKey('api_key_criptografada', $json);
        $this->assertSame('sk-t…reta', $json['api_key_mascara']);
        $this->assertStringNotContainsString('sk-test-chave-muito-secreta', $create->getContent());

        $list = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/ia-provedores');

        $list->assertOk();
        $this->assertSame(1, $list->json('total'));
        $this->assertSame(1, $list->json('ativos'));
        $this->assertNotEmpty($list->json('aviso_custo'));
        $this->assertStringNotContainsString('sk-test-chave-muito-secreta', $list->getContent());
        $this->assertStringNotContainsString('api_key_criptografada', $list->getContent());
    }

    public function test_editar_trocar_key_e_manter(): void
    {
        Sanctum::actingAs($this->admin);

        $created = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/ia-provedores', [
                'nome' => 'DeepSeek',
                'provedor' => 'deepseek',
                'api_key' => 'ds-key-original-abcdef',
            ])
            ->json('data');

        $keep = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->putJson('/api/v1/ia-provedores/'.$created['id'], [
                'nome' => 'DeepSeek Ajustado',
                'prioridade' => 5,
            ]);

        $keep->assertOk();
        $this->assertSame('ds-k…cdef', $keep->json('data.api_key_mascara'));
        $this->assertSame('DeepSeek Ajustado', $keep->json('data.nome'));

        $swap = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->putJson('/api/v1/ia-provedores/'.$created['id'], [
                'api_key' => 'ds-key-nova-xyzzyxyzz',
            ]);

        $swap->assertOk();
        $this->assertSame('ds-k…xyzz', $swap->json('data.api_key_mascara'));
        $this->assertNotSame($created['api_key_mascara'], $swap->json('data.api_key_mascara'));
    }

    public function test_desativar_e_remover(): void
    {
        Sanctum::actingAs($this->admin);

        $id = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/ia-provedores', [
                'nome' => 'Groq Temp',
                'provedor' => 'groq',
                'api_key' => 'gsk-temp-key-12345678',
            ])
            ->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->putJson('/api/v1/ia-provedores/'.$id, ['ativo' => false])
            ->assertOk()
            ->assertJsonPath('data.ativo', false);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->deleteJson('/api/v1/ia-provedores/'.$id)
            ->assertOk()
            ->assertJson(['ok' => true, 'id' => $id]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/ia-provedores/'.$id)
            ->assertNotFound();
    }

    public function test_provedor_invalido(): void
    {
        Sanctum::actingAs($this->admin);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/ia-provedores', [
                'nome' => 'Foo',
                'provedor' => 'foo',
                'api_key' => 'chave-qualquer-12345',
            ])
            ->assertStatus(422);
    }

    public function test_tipos_aceitos(): void
    {
        Sanctum::actingAs($this->admin);

        foreach (['deepseek', 'groq', 'mistral', 'xai', 'openrouter', 'together', 'perplexity'] as $tipo) {
            $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
                ->postJson('/api/v1/ia-provedores', [
                    'nome' => 'Prov '.$tipo,
                    'provedor' => $tipo,
                    'api_key' => 'key-'.$tipo.'-12345678',
                ])
                ->assertCreated()
                ->assertJsonPath('data.provedor', $tipo);
        }
    }

    public function test_sem_permissao_bloqueado(): void
    {
        Sanctum::actingAs($this->consulta);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/ia-provedores')
            ->assertForbidden();
    }

    public function test_testar_conexao_persiste_resultado(): void
    {
        Sanctum::actingAs($this->admin);

        Http::fake([
            'api.openai.com/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'OK']],
                ],
            ], 200),
        ]);

        $id = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/ia-provedores', [
                'nome' => 'OpenAI Test',
                'provedor' => 'openai',
                'api_key' => 'sk-live-test-abcdef12',
            ])
            ->json('data.id');

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/ia-provedores/'.$id.'/testar');

        $res->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertTrue((bool) IaProvedor::query()->find($id)?->ultimo_teste_ok);
        $this->assertNotNull(IaProvedor::query()->find($id)?->ultimo_teste_em);
        $this->assertStringContainsString('Conexão OK', (string) $res->json('mensagem'));
    }

    public function test_client_testar_falha_http(): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response(['error' => ['message' => 'Incorrect API key']], 401),
        ]);

        $row = IaProvedor::query()->create([
            'nome' => 'Bad Key',
            'provedor' => 'openai',
            'api_key_criptografada' => app(\App\Services\Ia\IaCrypto::class)->criptografar('sk-bad-key-xxxxxx'),
            'api_key_mascara' => 'sk-b…xxxx',
            'prioridade' => 100,
            'ativo' => true,
        ]);

        $resultado = app(IaClient::class)->testarConexao($row);

        $this->assertFalse($resultado['ok']);
        $this->assertStringContainsString('API key', $resultado['mensagem']);
    }
}
