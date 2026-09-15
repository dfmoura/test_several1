<?php

namespace Tests\Feature;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\User;
use App\Services\Consulta\BrasilApiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DfeTransportadorCadastroTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private string $fixtureXml;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['compras.ler', 'compras.escrever', 'parceiro.ler', 'parceiro.escrever'] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-DFET1',
            'razao_social' => 'RLP ETIQUETAS AUTO ADESIVOS LTDA EPP',
            'nome_fantasia' => 'RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-DFET1',
            'name' => 'Compras Transportador',
            'email' => 'dfe-transp@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo([
            'compras.ler', 'compras.escrever',
            'parceiro.ler', 'parceiro.escrever',
        ]);
        $this->user->empresas()->attach($this->empresa->id);

        $brasil = $this->createMock(BrasilApiClient::class);
        $brasil->method('getCnpj')->willReturnCallback(function (string $cnpj) {
            $digits = preg_replace('/\D+/', '', $cnpj) ?? '';
            if ($digits === '20290751000105') {
                return [
                    'razao_social' => 'TRLOG COMERCIO LOGISTICA E TRANSPORTES LTDA',
                    'nome_fantasia' => 'TRLOG',
                    'logradouro' => 'AV CELSO DANIEL',
                    'numero' => '1315',
                    'bairro' => 'CENTRO',
                    'municipio' => 'RIBEIRAO PRETO',
                    'uf' => 'SP',
                    'cep' => '14015000',
                    'ibge' => '3543402',
                    'telefone' => '1633334444',
                    'email' => 'fiscal@trlog.example',
                    'regime_sugerido' => 'PRESUMIDO',
                    'cnae' => '4930202',
                ];
            }

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
            'ibge' => '3543402',
            'localidade' => 'Ribeirão Preto',
            'uf' => 'SP',
        ]);
        $this->app->instance(BrasilApiClient::class, $brasil);

        $this->fixtureXml = file_get_contents(base_path('tests/fixtures/nfe_fedrigoni.xml'));
        $this->assertNotFalse($this->fixtureXml);
    }

    public function test_lista_indica_transportador_por_status(): void
    {
        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-TRLOG',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '20290751000105',
            'razao_social' => 'TRLOG COMERCIO LOGISTICA E TRANSPORTES LTDA',
            'papel_transportadora' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $chaveOk = '35260434661762000150550010000910561813102533';
        $pathOk = sprintf('dfe-documentos/%d/%s.xml', $this->empresa->id, $chaveOk);
        Storage::disk((string) config('erp.dfe.xml_disk', 'local'))->put($pathOk, $this->fixtureXml);

        $ano = (int) now()->year;

        DfeDocumento::query()->create([
            'empresa_id' => $this->empresa->id,
            'nsu' => '1',
            'chave' => $chaveOk,
            'numero' => '100',
            'emit_nome' => 'FEDRIGONI',
            'emit_cnpj' => '34661762000150',
            'data_emissao' => sprintf('%d-03-15', $ano),
            'valor_total' => '1500.50',
            'situacao' => DfeDocumento::SITUACAO_DISPONIVEL,
            'xml_path' => $pathOk,
            'xml_sha256' => hash('sha256', $this->fixtureXml),
        ]);

        DfeDocumento::query()->create([
            'empresa_id' => $this->empresa->id,
            'nsu' => '2',
            'chave' => str_repeat('2', 44),
            'numero' => '200',
            'emit_nome' => 'Sem XML',
            'emit_cnpj' => '11222333000181',
            'data_emissao' => sprintf('%d-04-01', $ano),
            'valor_total' => '10.00',
            'situacao' => DfeDocumento::SITUACAO_NOVA,
        ]);

        Sanctum::actingAs($this->user);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/dfe-documentos')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $byNumero = collect($res->json('data'))->keyBy('numero');

        $this->assertSame('cadastrado', $byNumero['100']['transportador']['status']);
        $this->assertSame('PAR-TRLOG', $byNumero['100']['transportador']['codigo']);
        $this->assertFalse($byNumero['100']['transportador']['pode_cadastrar']);
        $this->assertSame('20290751000105', $byNumero['100']['transp_cnpj']);

        $this->assertSame('sem_xml', $byNumero['200']['transportador']['status']);
        $this->assertFalse($byNumero['200']['transportador']['pode_cadastrar']);
    }

    public function test_preview_e_commit_transportador_via_xml_do_cofre(): void
    {
        $chave = '35260434661762000150550010000910561813102533';
        $path = sprintf('dfe-documentos/%d/%s.xml', $this->empresa->id, $chave);
        Storage::disk((string) config('erp.dfe.xml_disk', 'local'))->put($path, $this->fixtureXml);

        $doc = DfeDocumento::query()->create([
            'empresa_id' => $this->empresa->id,
            'nsu' => '10',
            'chave' => $chave,
            'numero' => '91056',
            'serie' => '1',
            'emit_nome' => 'FEDRIGONI SELF-ADHESIVES DO BRASIL LTDA',
            'emit_cnpj' => '34661762000150',
            'data_emissao' => '2026-04-09',
            'valor_total' => '5772.59',
            'situacao' => DfeDocumento::SITUACAO_DISPONIVEL,
            'xml_path' => $path,
            'xml_sha256' => hash('sha256', $this->fixtureXml),
        ]);

        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->getJson('/api/v1/dfe-documentos')
            ->assertOk()
            ->assertJsonPath('data.0.transportador.status', 'nao_cadastrado')
            ->assertJsonPath('data.0.transportador.pode_cadastrar', true);

        $preview = $this->withHeaders($h)
            ->postJson("/api/v1/dfe-documentos/{$doc->id}/transportador/preview")
            ->assertOk()
            ->assertJsonPath('data.row.acao', 'criar')
            ->assertJsonPath('data.row.status', 'ok');

        $this->assertSame(
            '20290751000105',
            preg_replace('/\D/', '', (string) $preview->json('data.row.preview.cnpj_cpf')),
        );

        $this->withHeaders($h)
            ->postJson("/api/v1/dfe-documentos/{$doc->id}/transportador/commit")
            ->assertOk()
            ->assertJsonPath('data.commit.criados', 1)
            ->assertJsonPath('data.documento.transportador.status', 'cadastrado');

        $parceiro = Parceiro::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('cnpj_cpf', '20290751000105')
            ->first();
        $this->assertNotNull($parceiro);
        $this->assertTrue((bool) $parceiro->papel_transportadora);
        $this->assertFalse((bool) $parceiro->papel_fornecedor);
    }

    public function test_commit_adiciona_papel_transportadora_em_parceiro_existente(): void
    {
        $existente = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-CLI-T',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '20290751000105',
            'razao_social' => 'TRLOG COMERCIO LOGISTICA E TRANSPORTES LTDA',
            'papel_cliente' => true,
            'papel_transportadora' => false,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $chave = '35260434661762000150550010000910561813102533';
        $path = sprintf('dfe-documentos/%d/%s.xml', $this->empresa->id, $chave);
        Storage::disk((string) config('erp.dfe.xml_disk', 'local'))->put($path, $this->fixtureXml);

        $doc = DfeDocumento::query()->create([
            'empresa_id' => $this->empresa->id,
            'nsu' => '11',
            'chave' => $chave,
            'numero' => '91056',
            'emit_nome' => 'FEDRIGONI',
            'emit_cnpj' => '34661762000150',
            'data_emissao' => '2026-04-09',
            'situacao' => DfeDocumento::SITUACAO_DISPONIVEL,
            'xml_path' => $path,
            'xml_sha256' => hash('sha256', $this->fixtureXml),
        ]);

        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->postJson("/api/v1/dfe-documentos/{$doc->id}/transportador/preview")
            ->assertOk()
            ->assertJsonPath('data.row.acao', 'adicionar_papel_transportadora');

        $this->withHeaders($h)
            ->postJson("/api/v1/dfe-documentos/{$doc->id}/transportador/commit")
            ->assertOk()
            ->assertJsonPath('data.commit.atualizados', 1)
            ->assertJsonPath('data.documento.transportador.status', 'cadastrado');

        $existente->refresh();
        $this->assertTrue((bool) $existente->papel_transportadora);
    }
}
