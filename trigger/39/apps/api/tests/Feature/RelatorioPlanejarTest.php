<?php

namespace Tests\Feature;

use App\Jobs\PlanejarRelatorioJob;
use App\Models\Empresa;
use App\Models\IaProvedor;
use App\Models\Parceiro;
use App\Models\Relatorio;
use App\Models\User;
use App\Services\Ia\IaCrypto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class RelatorioPlanejarTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['relatorio.ler', 'relatorio.escrever'] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-PLN1',
            'razao_social' => 'Empresa Planejar',
            'nome_fantasia' => 'Plan',
            'cnpj' => '00000000000606',
            'situacao' => 'ATIVA',
        ]);

        $this->comercial = $this->makeUser('USR-PLN1', 'plan.rel@test.local', ['relatorio.ler', 'relatorio.escrever']);

        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-PLN1',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Cliente Plan',
            'situacao' => 'ATIVO',
            'papel_cliente' => true,
            'is_prospect' => false,
        ]);
    }

    public function test_planejar_despacha_job_assincrono(): void
    {
        Queue::fake();
        Sanctum::actingAs($this->comercial);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios/planejar', [
                'prompt' => 'Liste parceiros com código e razão social',
                'orientacao' => 'retrato',
            ]);

        $res->assertStatus(202);
        $res->assertJsonPath('data.status', 'PENDENTE');
        Queue::assertPushed(PlanejarRelatorioJob::class);
    }

    public function test_criar_com_spec_invalida_retorna_422(): void
    {
        Sanctum::actingAs($this->comercial);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios', [
                'prompt' => 'Liste parceiros',
                'orientacao' => 'retrato',
                'spec' => [
                    'fonte' => 'parceiros',
                    'colunas' => ['campo_inventado'],
                ],
            ])
            ->assertStatus(422);
    }

    public function test_criar_com_spec_pula_ia_e_gera_pdf(): void
    {
        Sanctum::actingAs($this->comercial);
        Http::fake();

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios', [
                'prompt' => 'Liste parceiros com código e razão social',
                'orientacao' => 'retrato',
                'spec' => [
                    'titulo' => 'Parceiros',
                    'fonte' => 'parceiros',
                    'colunas' => ['codigo', 'razao_social'],
                    'filtros' => [],
                    'ordenacao' => [['campo' => 'codigo', 'dir' => 'asc']],
                    'limite' => 50,
                    'totais' => [],
                ],
            ]);

        $res->assertCreated();
        $rel = Relatorio::query()->findOrFail($res->json('data.id'));
        $this->assertSame('CONCLUIDO', $rel->fresh()->status);
        $this->assertNotNull($rel->fresh()->arquivo_path);
        Http::assertNothingSent();
    }

    public function test_planejar_via_fila_sync_com_ia_fake(): void
    {
        $crypto = app(IaCrypto::class);
        IaProvedor::query()->create([
            'nome' => 'Fake OpenAI',
            'provedor' => 'openai',
            'modelo' => 'gpt-4o-mini',
            'api_key_criptografada' => $crypto->criptografar('sk-test'),
            'api_key_mascara' => 'sk-t…est',
            'ativo' => true,
            'prioridade' => 1,
        ]);

        Http::fake([
            'api.openai.com/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'titulo' => 'Parceiros',
                            'fonte' => 'parceiros',
                            'colunas' => ['codigo', 'razao_social'],
                            'filtros' => [],
                            'ordenacao' => [],
                            'limite' => 50,
                            'totais' => [],
                        ]),
                    ],
                ]],
            ], 200),
        ]);

        Sanctum::actingAs($this->comercial);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/relatorios/planejar', [
                'prompt' => 'Liste parceiros com código e razão social',
                'orientacao' => 'retrato',
            ]);

        $res->assertStatus(202);
        $id = $res->json('data.id');

        $show = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson("/api/v1/relatorios/planejamentos/{$id}");

        $show->assertOk();
        $show->assertJsonPath('data.status', 'PRONTO');
        $show->assertJsonPath('data.spec.fonte', 'parceiros');
        $this->assertNotEmpty($show->json('data.resumo_legivel'));
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
        $user->empresas()->attach([$this->empresa->id]);

        return $user;
    }
}
