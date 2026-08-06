<?php

namespace Tests\Feature;

use App\Jobs\GerarRelatorioJob;
use App\Models\Empresa;
use App\Models\IaProvedor;
use App\Models\Parceiro;
use App\Models\Relatorio;
use App\Models\User;
use App\Services\Ia\IaCrypto;
use App\Services\Relatorio\RelatorioService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class RelatorioTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmpresa;

    private User $comercial;

    private User $consulta;

    private User $semPerm;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['relatorio.ler', 'relatorio.escrever', 'credito.escrever', 'parceiro.bancario'] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-REL1',
            'razao_social' => 'Empresa Relatório',
            'nome_fantasia' => 'RelTest',
            'cnpj' => '00000000000353',
            'situacao' => 'ATIVA',
        ]);

        $this->outraEmpresa = Empresa::query()->create([
            'codigo' => 'EMP-REL2',
            'razao_social' => 'Outra Empresa',
            'nome_fantasia' => 'Outra',
            'cnpj' => '00000000000434',
            'situacao' => 'ATIVA',
        ]);

        $this->comercial = $this->makeUser('USR-REL1', 'com.rel@test.local', ['relatorio.ler', 'relatorio.escrever']);
        $this->consulta = $this->makeUser('USR-REL2', 'cons.rel@test.local', ['relatorio.ler']);
        $this->semPerm = $this->makeUser('USR-REL3', 'nop.rel@test.local', []);

        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00001',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Cliente Demo Rel',
            'situacao' => 'ATIVO',
            'papel_cliente' => true,
            'is_prospect' => false,
        ]);
    }

    public function test_criar_despacha_job(): void
    {
        Queue::fake();
        Sanctum::actingAs($this->comercial);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios', [
                'prompt' => 'Liste todos os parceiros com código e razão social',
                'orientacao' => 'retrato',
            ]);

        $res->assertCreated();
        $res->assertJsonPath('data.status', 'PENDENTE');
        $this->assertStringStartsWith('REL-', $res->json('data.codigo'));

        Queue::assertPushed(GerarRelatorioJob::class);
    }

    public function test_403_sem_permissao(): void
    {
        Sanctum::actingAs($this->semPerm);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/relatorios')
            ->assertForbidden();
    }

    public function test_consulta_nao_cria(): void
    {
        Sanctum::actingAs($this->consulta);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios', [
                'prompt' => 'Liste todos os parceiros ativos do sistema',
                'orientacao' => 'paisagem',
            ])
            ->assertForbidden();
    }

    public function test_processar_com_ia_fake_gera_pdf(): void
    {
        Queue::fake();
        Storage::fake('local');
        $this->seedIaProvedor();

        Sanctum::actingAs($this->comercial);
        $create = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios', [
                'prompt' => 'Liste parceiros com código e razão social ordenados por código',
                'orientacao' => 'paisagem',
                'titulo' => 'Parceiros',
            ])
            ->assertCreated();

        $id = (int) $create->json('data.id');

        Http::fake([
            'https://api.openai.com/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'titulo' => 'Parceiros cadastrados',
                            'fonte' => 'parceiros',
                            'colunas' => ['codigo', 'razao_social', 'situacao'],
                            'filtros' => [],
                            'ordenacao' => [['campo' => 'codigo', 'dir' => 'asc']],
                            'limite' => 100,
                            'totais' => [],
                        ], JSON_UNESCAPED_UNICODE),
                    ],
                ]],
            ], 200),
        ]);

        $relatorio = Relatorio::query()->findOrFail($id);
        app(RelatorioService::class)->processar($relatorio);

        $relatorio->refresh();
        $this->assertSame(Relatorio::STATUS_CONCLUIDO, $relatorio->status);
        $this->assertSame('parceiros', $relatorio->programa_json['fonte'] ?? null);
        $this->assertNotEmpty($relatorio->arquivo_path);
        Storage::disk('local')->assertExists($relatorio->arquivo_path);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->get("/api/v1/relatorios/{$id}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_programa_invalido_da_ia_vira_erro(): void
    {
        Queue::fake();
        $this->seedIaProvedor();

        Sanctum::actingAs($this->comercial);
        $id = (int) $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios', [
                'prompt' => 'Quero um relatório impossível com SQL livre',
                'orientacao' => 'retrato',
            ])
            ->json('data.id');

        Http::fake([
            'https://api.openai.com/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'titulo' => 'Hack',
                            'fonte' => 'users_secret',
                            'colunas' => ['password'],
                        ]),
                    ],
                ]],
            ], 200),
        ]);

        $relatorio = Relatorio::query()->findOrFail($id);
        app(RelatorioService::class)->processar($relatorio);

        $relatorio->refresh();
        $this->assertSame(Relatorio::STATUS_ERRO, $relatorio->status);
        $this->assertNotEmpty($relatorio->erro_mensagem);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->get("/api/v1/relatorios/{$id}/download")
            ->assertNotFound();
    }

    public function test_escopo_empresa_404(): void
    {
        Queue::fake();
        Sanctum::actingAs($this->comercial);

        $id = (int) $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios', [
                'prompt' => 'Liste produtos com família PA',
                'orientacao' => 'retrato',
            ])
            ->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $this->outraEmpresa->id)
            ->getJson("/api/v1/relatorios/{$id}")
            ->assertNotFound();
    }

    public function test_catalogo_endpoint(): void
    {
        Sanctum::actingAs($this->consulta);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/relatorios/catalogo');

        $res->assertOk();
        $res->assertJsonPath('data.limite_max', 1000);
        $this->assertNotEmpty($res->json('data.fontes'));
    }

    public function test_processar_facas_com_desenho(): void
    {
        Queue::fake();
        Storage::fake('local');
        $this->seedIaProvedor();

        Sanctum::actingAs($this->comercial);
        $id = (int) $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios', [
                'prompt' => 'Relatório do mapa de facas com desenho do polígono',
                'orientacao' => 'paisagem',
            ])
            ->json('data.id');

        Http::fake([
            'https://api.openai.com/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'titulo' => 'Mapa de facas',
                            'fonte' => 'facas',
                            'colunas' => ['desenho', 'medida', 'formato', 'maquina_catalogo', 'z'],
                            'filtros' => [['campo' => 'completa', 'op' => 'eq', 'valor' => true]],
                            'ordenacao' => [['campo' => 'medida', 'dir' => 'asc']],
                            'limite' => 20,
                            'totais' => [],
                        ], JSON_UNESCAPED_UNICODE),
                    ],
                ]],
            ], 200),
        ]);

        $relatorio = Relatorio::query()->findOrFail($id);
        app(RelatorioService::class)->processar($relatorio);

        $relatorio->refresh();
        $this->assertSame(Relatorio::STATUS_CONCLUIDO, $relatorio->status);
        $this->assertSame('facas', $relatorio->programa_json['fonte'] ?? null);
        $this->assertContains('desenho', $relatorio->programa_json['colunas'] ?? []);
        Storage::disk('local')->assertExists($relatorio->arquivo_path);
        $this->assertSame(20, $relatorio->programa_json['limite'] ?? null);
    }

    public function test_facas_com_desenho_respeita_teto(): void
    {
        $validator = app(\App\Services\Relatorio\RelatorioProgramaValidator::class);
        $out = $validator->validate([
            'titulo' => 'Mapa',
            'fonte' => 'facas',
            'colunas' => ['desenho', 'medida', 'formato'],
            'limite' => 500,
        ], []);
        $this->assertSame(60, $out['limite']);
    }

    /** @param  list<string>  $perms */
    private function makeUser(string $codigo, string $email, array $perms): User
    {
        $user = User::query()->create([
            'codigo' => $codigo,
            'name' => $codigo,
            'email' => $email,
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        if ($perms !== []) {
            $user->givePermissionTo($perms);
        }
        $user->empresas()->attach([$this->empresa->id, $this->outraEmpresa->id]);

        return $user;
    }

    private function seedIaProvedor(): void
    {
        $crypto = app(IaCrypto::class);
        IaProvedor::query()->create([
            'nome' => 'OpenAI Teste',
            'provedor' => 'openai',
            'modelo' => 'gpt-4o-mini',
            'api_key_criptografada' => $crypto->criptografar('sk-test-relatorio-key'),
            'api_key_mascara' => 'sk-t…key',
            'prioridade' => 10,
            'ativo' => true,
        ]);
    }
}
