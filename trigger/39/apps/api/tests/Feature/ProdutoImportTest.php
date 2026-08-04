<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Produto;
use App\Models\User;
use App\Services\Cadastros\ProdutoGrupoService;
use App\Services\Cadastros\ProdutoImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Exige DB (sqlite :memory: ou MySQL de teste). Cobre dry-run vs commit insert-only.
 */
class ProdutoImportTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private ProdutoImportService $importService;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['produto.ler', 'produto.escrever', 'produto.fiscal'] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-P001',
            'razao_social' => 'Empresa Produto Teste',
            'nome_fantasia' => 'ProdTeste',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-P001',
            'name' => 'Importador Produto',
            'email' => 'import.produto@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['produto.ler', 'produto.escrever', 'produto.fiscal']);
        $this->user->empresas()->attach($this->empresa->id);

        app()->instance('empresa', $this->empresa);
        Auth::login($this->user);

        app(ProdutoGrupoService::class)->seedCatalog();

        $this->importService = app(ProdutoImportService::class);
    }

    public function test_preview_does_not_persist_produtos(): void
    {
        $before = Produto::query()->where('empresa_id', $this->empresa->id)->count();

        $csv = "familia;grupo;descricao_fiscal;fator_conversao;largura_mm;comprimento_m\n"
            ."MP;MP-PAP;PAPEL TESTE;12.5;330;1000\n";
        $file = UploadedFile::fake()->createWithContent('ok.csv', $csv);

        $report = $this->importService->preview($this->empresa, $file);

        $this->assertSame(1, $report['ok']);
        $this->assertSame(0, $report['erro']);
        $this->assertSame('atualizado', $report['rows'][0]['preview']['enrichment']['status']);
        $this->assertSame('48114190', $report['rows'][0]['preview']['ncm']);
        $this->assertSame(
            $before,
            Produto::query()->where('empresa_id', $this->empresa->id)->count()
        );
    }

    public function test_preview_marks_existing_codigo_as_error_without_update(): void
    {
        $existing = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-PAP-999',
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'JA EXISTE',
            'situacao' => 'ATIVO',
        ]);
        $original = $existing->descricao_fiscal;

        $csv = "codigo;familia;grupo;descricao_fiscal;fator_conversao;largura_mm;comprimento_m\n"
            ."MP-PAP-999;MP;MP-PAP;NAO DEVE ATUALIZAR;12.5;330;1000\n";
        $file = UploadedFile::fake()->createWithContent('dup.csv', $csv);

        $report = $this->importService->preview($this->empresa, $file);

        $this->assertSame(0, $report['ok']);
        $this->assertSame(1, $report['erro']);
        $this->assertTrue(
            collect($report['rows'][0]['errors'])->contains(fn ($e) => str_contains($e, 'já cadastrado'))
        );

        $existing->refresh();
        $this->assertSame($original, $existing->descricao_fiscal);
    }

    public function test_preview_requires_dimensions_for_dimensional_grupo(): void
    {
        $csv = "familia;grupo;descricao_fiscal;fator_conversao\n"
            ."MP;MP-PAP;SEM DIMENSAO;12.5\n";
        $file = UploadedFile::fake()->createWithContent('dim.csv', $csv);

        $report = $this->importService->preview($this->empresa, $file);

        $this->assertSame(0, $report['ok']);
        $this->assertTrue(
            collect($report['rows'][0]['errors'])->contains(fn ($e) => str_contains($e, 'largura_mm'))
        );
    }

    public function test_commit_creates_valid_rows_via_service(): void
    {
        $result = $this->importService->commit($this->empresa, [
            [
                'line' => 2,
                'data' => [
                    'familia' => 'PA',
                    'grupo' => 'PA-ETQ',
                    'descricao_fiscal' => 'ETIQUETA BOPP',
                    'descricao_comercial' => 'Família fiscal',
                ],
            ],
        ]);

        $this->assertSame(1, $result['criados']);
        $this->assertSame(0, $result['falhas']);
        $this->assertDatabaseHas('produtos', [
            'empresa_id' => $this->empresa->id,
            'descricao_fiscal' => 'ETIQUETA BOPP',
            'familia' => 'PA',
            'grupo' => 'PA-ETQ',
        ]);
    }

    public function test_commit_does_not_update_existing_on_codigo_conflict(): void
    {
        Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'REV-RIB-001',
            'familia' => 'REV',
            'grupo' => 'REV-RIB',
            'descricao_fiscal' => 'ORIGINAL',
            'situacao' => 'ATIVO',
        ]);

        $result = $this->importService->commit($this->empresa, [
            [
                'line' => 2,
                'data' => [
                    'codigo' => 'REV-RIB-001',
                    'familia' => 'REV',
                    'grupo' => 'REV-RIB',
                    'descricao_fiscal' => 'NAO DEVE SOBRESCREVER',
                ],
            ],
        ]);

        $this->assertSame(0, $result['criados']);
        $this->assertSame(1, $result['falhas']);
        $this->assertDatabaseHas('produtos', [
            'codigo' => 'REV-RIB-001',
            'descricao_fiscal' => 'ORIGINAL',
        ]);
        $this->assertDatabaseMissing('produtos', [
            'descricao_fiscal' => 'NAO DEVE SOBRESCREVER',
        ]);
    }

    public function test_http_preview_endpoint_requires_permission(): void
    {
        Sanctum::actingAs($this->user);

        $csv = "familia;grupo;descricao_fiscal\nPA;PA-ETQ;ETQ API\n";
        $file = UploadedFile::fake()->createWithContent('api.csv', $csv);

        $response = $this->post('/api/v1/produtos/import/preview', [
            'file' => $file,
        ], [
            'X-Empresa-Id' => (string) $this->empresa->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.ok', 1);
        $this->assertSame(0, Produto::query()->where('descricao_fiscal', 'ETQ API')->count());
    }

    public function test_http_preview_forbidden_without_write_permission(): void
    {
        $limited = User::query()->create([
            'codigo' => 'USR-P002',
            'name' => 'Somente leitura',
            'email' => 'ler.produto@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $limited->givePermissionTo(['produto.ler']);
        $limited->empresas()->attach($this->empresa->id);

        Sanctum::actingAs($limited);

        $csv = "familia;grupo;descricao_fiscal\nPA;PA-ETQ;X\n";
        $file = UploadedFile::fake()->createWithContent('api.csv', $csv);

        $response = $this->post('/api/v1/produtos/import/preview', [
            'file' => $file,
        ], [
            'X-Empresa-Id' => (string) $this->empresa->id,
        ]);

        $response->assertForbidden();
    }
}
