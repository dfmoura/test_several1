<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\User;
use App\Services\Cadastros\ParceiroXmlImportService;
use App\Services\Consulta\BrasilApiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ParceiroXmlImportTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private ParceiroXmlImportService $service;

    private string $fixturePath;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['parceiro.ler', 'parceiro.escrever', 'parceiro.bancario', 'credito.escrever'] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-T039',
            'razao_social' => 'RLP ETIQUETAS AUTO ADESIVOS LTDA EPP',
            'nome_fantasia' => 'RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-T039',
            'name' => 'Importador XML',
            'email' => 'xml-import@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['parceiro.ler', 'parceiro.escrever']);
        $this->user->empresas()->attach($this->empresa->id);

        app()->instance('empresa', $this->empresa);
        Auth::login($this->user);

        $brasil = $this->createMock(BrasilApiClient::class);
        $brasil->method('getCnpj')->willReturnCallback(function (string $cnpj) {
            $digits = preg_replace('/\D/', '', $cnpj) ?? '';

            return [
                'razao_social' => 'FEDRIGONI SELF-ADHESIVES DO BRASIL LTDA',
                'nome_fantasia' => 'FEDRIGONI API',
                'logradouro' => 'RUA ANTONIO OVIDIO RODRIGUES',
                'numero' => '105',
                'bairro' => 'PARQUE INDUSTRIAL III',
                'municipio' => 'JUNDIAI',
                'uf' => 'SP',
                'cep' => '13213180',
                'ibge' => '3525904',
                'telefone' => '1145255239',
                'email' => 'fiscal@fedrigoni.example',
                'regime_sugerido' => 'PRESUMIDO',
                'cnae' => '2222600',
            ];
        });
        $brasil->method('getCep')->willReturn([
            'ibge' => '3525904',
            'localidade' => 'Jundiaí',
            'uf' => 'SP',
        ]);
        $this->app->instance(BrasilApiClient::class, $brasil);

        $this->service = app(ParceiroXmlImportService::class);
        $this->fixturePath = base_path('tests/fixtures/nfe_fedrigoni.xml');
    }

    public function test_preview_new_supplier_does_not_persist(): void
    {
        $before = Parceiro::query()->where('empresa_id', $this->empresa->id)->count();
        $file = $this->xmlUpload();

        $report = $this->service->preview($this->empresa, [$file]);

        $this->assertSame(1, $report['ok']);
        $this->assertSame(0, $report['erro']);
        $this->assertSame('criar', $report['rows'][0]['acao']);
        $this->assertSame('novo', $report['rows'][0]['preview']['cnpj_status']);
        $this->assertSame('34661762000150', $report['rows'][0]['preview']['cnpj_cpf']);
        $this->assertTrue((bool) ($report['rows'][0]['data']['papel_fornecedor'] ?? false));
        $this->assertSame('brasilapi', $report['rows'][0]['preview']['field_sources']['razao_social'] ?? null);
        $this->assertSame(
            $before,
            Parceiro::query()->where('empresa_id', $this->empresa->id)->count()
        );
    }

    public function test_commit_creates_fornecedor(): void
    {
        $preview = $this->service->preview($this->empresa, [$this->xmlUpload()]);
        $this->assertSame('ok', $preview['rows'][0]['status']);

        $result = $this->service->commit($this->empresa, [[
            'line' => 1,
            'acao' => 'criar',
            'data' => $preview['rows'][0]['data'],
        ]]);

        $this->assertSame(1, $result['criados']);
        $this->assertSame(0, $result['falhas']);
        $parceiro = Parceiro::query()->where('cnpj_cpf', '34661762000150')->first();
        $this->assertNotNull($parceiro);
        $this->assertTrue($parceiro->papel_fornecedor);
        $this->assertSame('MERCADORIA', $parceiro->tipo_fornecimento);
        $this->assertStringStartsWith('PAR-', (string) $parceiro->codigo);
    }

    public function test_existing_fornecedor_is_info_not_duplicate(): void
    {
        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-90010',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '34661762000150',
            'razao_social' => 'Fedrigoni Já Cadastrada',
            'situacao' => 'ATIVO',
            'papel_fornecedor' => true,
        ]);

        $report = $this->service->preview($this->empresa, [$this->xmlUpload()]);

        $this->assertSame(1, $report['info']);
        $this->assertSame(0, $report['ok']);
        $this->assertSame('nenhuma', $report['rows'][0]['acao']);
        $this->assertSame('ja_fornecedor', $report['rows'][0]['preview']['cnpj_status']);
    }

    public function test_existing_without_papel_offers_add_papel(): void
    {
        $existing = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-90011',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '34661762000150',
            'razao_social' => 'Fedrigoni Cliente',
            'situacao' => 'ATIVO',
            'papel_cliente' => true,
            'papel_fornecedor' => false,
        ]);

        $report = $this->service->preview($this->empresa, [$this->xmlUpload()]);
        $this->assertSame('adicionar_papel', $report['rows'][0]['acao']);
        $this->assertSame('existe_sem_fornecedor', $report['rows'][0]['preview']['cnpj_status']);

        $result = $this->service->commit($this->empresa, [[
            'line' => 1,
            'acao' => 'adicionar_papel',
            'parceiro_id' => $existing->id,
            'data' => $report['rows'][0]['data'],
        ]]);

        $this->assertSame(1, $result['atualizados']);
        $existing->refresh();
        $this->assertTrue($existing->papel_fornecedor);
        $this->assertTrue($existing->papel_cliente);
        $this->assertSame('Fedrigoni Cliente', $existing->razao_social);
    }

    public function test_http_xml_preview_and_commit_endpoints(): void
    {
        Sanctum::actingAs($this->user);

        $previewResponse = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->post('/api/v1/parceiros/import/xml/preview', [
                'files' => [$this->xmlUpload()],
            ]);

        $previewResponse->assertOk();
        $previewResponse->assertJsonPath('data.ok', 1);
        $data = $previewResponse->json('data.rows.0.data');
        $this->assertIsArray($data);

        $commitResponse = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros/import/xml/commit', [
                'rows' => [[
                    'line' => 1,
                    'acao' => 'criar',
                    'data' => $data,
                ]],
            ]);

        $commitResponse->assertOk();
        $commitResponse->assertJsonPath('data.criados', 1);
        $this->assertDatabaseHas('parceiros', [
            'empresa_id' => $this->empresa->id,
            'cnpj_cpf' => '34661762000150',
            'papel_fornecedor' => 1,
        ]);
    }

    public function test_destinatario_diferente_gera_aviso(): void
    {
        $this->empresa->update(['cnpj' => '00000000000191']);
        $report = $this->service->preview($this->empresa, [$this->xmlUpload()]);

        $warnings = $report['rows'][0]['warnings'] ?? [];
        $this->assertTrue(
            collect($warnings)->contains(fn ($w) => str_contains((string) $w, 'Destinatário')),
            'Esperava aviso de destinatário diferente'
        );
    }

    private function xmlUpload(): UploadedFile
    {
        $this->assertFileExists($this->fixturePath);

        return new UploadedFile(
            $this->fixturePath,
            'nfe_fedrigoni.xml',
            'application/xml',
            null,
            true
        );
    }
}
