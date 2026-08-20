<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\User;
use App\Services\Cadastros\ParceiroImportService;
use App\Services\Consulta\BrasilApiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Exige DB (sqlite :memory: ou MySQL de teste). Cobre dry-run vs commit insert-only.
 */
class ParceiroImportTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private ParceiroImportService $importService;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['parceiro.ler', 'parceiro.escrever', 'parceiro.bancario', 'credito.escrever'] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-T001',
            'razao_social' => 'Empresa Teste',
            'nome_fantasia' => 'Teste',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-T001',
            'name' => 'Importador',
            'email' => 'import@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['parceiro.ler', 'parceiro.escrever', 'parceiro.bancario', 'credito.escrever']);
        $this->user->empresas()->attach($this->empresa->id);

        app()->instance('empresa', $this->empresa);
        Auth::login($this->user);

        $brasil = $this->createMock(BrasilApiClient::class);
        $brasil->method('getCnpj')->willReturnCallback(function (string $cnpj) {
            $digits = preg_replace('/\D/', '', $cnpj) ?? '';

            return [
                'razao_social' => 'Razao API '.$digits,
                'nome_fantasia' => 'Fantasia API',
                'logradouro' => 'Rua API',
                'numero' => '100',
                'bairro' => 'Centro',
                'municipio' => 'São Paulo',
                'uf' => 'SP',
                'cep' => '01001000',
                'ibge' => '3550308',
                'telefone' => '1133334444',
                'email' => 'api@exemplo.com',
                'regime_sugerido' => 'SIMPLES_NACIONAL',
            ];
        });
        $this->app->instance(BrasilApiClient::class, $brasil);

        $this->importService = app(ParceiroImportService::class);
    }

    public function test_preview_does_not_persist_parceiros(): void
    {
        $before = Parceiro::query()->where('empresa_id', $this->empresa->id)->count();

        $csv = "cnpj_cpf;papeis\n"
            ."11444777000161;cliente\n";
        $file = UploadedFile::fake()->createWithContent('ok.csv', $csv);

        $report = $this->importService->preview($this->empresa, $file);

        $this->assertSame(1, $report['ok']);
        $this->assertSame(0, $report['erro']);
        $this->assertSame('atualizado', $report['rows'][0]['preview']['enrichment']['status']);
        $this->assertStringContainsString('Razao API', (string) $report['rows'][0]['preview']['razao_social']);
        $this->assertSame(
            $before,
            Parceiro::query()->where('empresa_id', $this->empresa->id)->count()
        );
    }

    public function test_preview_marks_existing_cnpj_as_error_without_update(): void
    {
        $existing = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-90001',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '11444777000161',
            'razao_social' => 'Ja Existe LTDA',
            'situacao' => 'ATIVO',
            'papel_cliente' => true,
        ]);
        $originalName = $existing->razao_social;

        $csv = "cnpj_cpf;papeis\n"
            ."11444777000161;cliente\n";
        $file = UploadedFile::fake()->createWithContent('dup.csv', $csv);

        $report = $this->importService->preview($this->empresa, $file);

        $this->assertSame(0, $report['ok']);
        $this->assertSame(1, $report['erro']);
        $this->assertTrue(
            collect($report['rows'][0]['errors'])->contains(fn ($e) => str_contains($e, 'já cadastrado'))
        );

        $existing->refresh();
        $this->assertSame($originalName, $existing->razao_social);
    }

    public function test_commit_creates_valid_rows_via_service(): void
    {
        $result = $this->importService->commit($this->empresa, [
            [
                'line' => 2,
                'data' => [
                    'cnpj_cpf' => '22333444000181',
                    'tipo_pessoa' => 'PJ',
                    'papel_cliente' => true,
                ],
            ],
        ]);

        $this->assertSame(1, $result['criados']);
        $this->assertSame(0, $result['falhas']);
        $this->assertDatabaseHas('parceiros', [
            'empresa_id' => $this->empresa->id,
            'cnpj_cpf' => '22333444000181',
            'razao_social' => 'Razao API 22333444000181',
            'municipio' => 'São Paulo',
        ]);
    }

    public function test_commit_does_not_update_existing_on_cnpj_conflict(): void
    {
        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-90002',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '33444555000191',
            'razao_social' => 'Original LTDA',
            'situacao' => 'ATIVO',
            'papel_cliente' => true,
        ]);

        $result = $this->importService->commit($this->empresa, [
            [
                'line' => 2,
                'data' => [
                    'razao_social' => 'Nao Deve Sobrescrever',
                    'cnpj_cpf' => '33444555000191',
                    'papel_cliente' => true,
                ],
            ],
        ]);

        $this->assertSame(0, $result['criados']);
        $this->assertSame(1, $result['falhas']);
        $this->assertDatabaseHas('parceiros', [
            'cnpj_cpf' => '33444555000191',
            'razao_social' => 'Original LTDA',
        ]);
        $this->assertDatabaseMissing('parceiros', [
            'razao_social' => 'Nao Deve Sobrescrever',
        ]);
    }

    public function test_http_preview_endpoint_requires_permission(): void
    {
        Sanctum::actingAs($this->user);

        $csv = "razao_social;papeis\nCliente API;cliente\n";
        $file = UploadedFile::fake()->createWithContent('api.csv', $csv);

        $response = $this->post('/api/v1/parceiros/import/preview', [
            'file' => $file,
        ], [
            'X-Empresa-Id' => (string) $this->empresa->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.ok', 1);
        $this->assertSame(0, Parceiro::query()->where('razao_social', 'Cliente API')->count());
    }
}
