<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\ProdutoFornecedorCodigo;
use App\Models\User;
use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProdutoFromNfeXmlTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private Parceiro $fornecedor;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('produto.ler', 'web');
        Permission::findOrCreate('produto.escrever', 'web');
        app(ProdutoGrupoService::class)->seedCatalog();

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-NFXML',
            'razao_social' => 'Empresa From XML',
            'nome_fantasia' => 'NF XML',
            'cnpj' => '00000000000872',
            'situacao' => 'ATIVA',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-NFXML',
            'name' => 'Cadastro XML',
            'email' => 'nfxml@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['produto.ler', 'produto.escrever']);
        $this->user->empresas()->attach($this->empresa->id);

        $this->fornecedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-AVERY-XML',
            'razao_social' => 'AVERY DENNISON DO BRASIL LTDA',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '43999630000124',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
        ]);
    }

    public function test_preview_xml_agrupa_cprod_e_sugere(): void
    {
        Sanctum::actingAs($this->user);

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_exact_multidet.xml'));
        $this->assertNotFalse($xml);

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->post('/api/v1/produtos/from-nfe-xml/preview', [
                'file' => UploadedFile::fake()->createWithContent('exact.xml', $xml),
            ])
            ->assertOk()
            ->assertJsonPath('data.fornecedor.codigo', 'PAR-AVERY-XML')
            ->assertJsonPath('data.total_dets', 2)
            ->assertJsonPath('data.total_cprods', 1)
            ->assertJsonPath('data.itens.0.c_prod', 'AAS029-EX4')
            ->assertJsonPath('data.itens.0.qtd_dets', 2)
            ->assertJsonPath('data.itens.0.status', 'novo')
            ->assertJsonPath('data.itens.0.sugestao.grupo', 'MP-PAP');

        $this->assertSame(0, ProdutoFornecedorCodigo::query()->count());
    }

    public function test_commit_cria_sku_e_depara(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_exact_multidet.xml'));
        $this->assertNotFalse($xml);

        $preview = $this->withHeaders($h)
            ->post('/api/v1/produtos/from-nfe-xml/preview', [
                'file' => UploadedFile::fake()->createWithContent('exact.xml', $xml),
            ])
            ->assertOk()
            ->json('data');

        $item = $preview['itens'][0];
        $s = $item['sugestao'];

        $this->withHeaders($h)
            ->postJson('/api/v1/produtos/from-nfe-xml/commit', [
                'items' => [[
                    'acao' => 'criar',
                    'c_prod' => $item['c_prod'],
                    'x_prod' => $item['x_prod'],
                    'ncm' => $item['ncm'],
                    'u_com' => $item['u_com'],
                    'origem' => $item['origem'],
                    'fornecedor_id' => $preview['fornecedor']['id'],
                    'familia' => $s['familia'],
                    'grupo' => $s['grupo'],
                    'descricao_fiscal' => $s['descricao_fiscal'],
                    'descricao_comercial' => $s['descricao_comercial'],
                    'unidade_comercial' => $s['unidade_comercial'],
                    'unidade_interna' => $s['unidade_interna'],
                    'programa_compra' => $s['programa_compra'],
                    'gravar_depara' => true,
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('data.criados', 1)
            ->assertJsonPath('data.falhas', 0)
            ->assertJsonPath('data.rows.0.status', 'criado')
            ->assertJsonPath('data.rows.0.c_prod', 'AAS029-EX4');

        $this->assertDatabaseHas('produto_fornecedor_codigos', [
            'empresa_id' => $this->empresa->id,
            'fornecedor_id' => $this->fornecedor->id,
            'c_prod' => 'AAS029-EX4',
        ]);
    }

    public function test_preview_marca_ja_cadastrado(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->postJson('/api/v1/produtos/from-nfe-item', [
                'c_prod' => 'AAS029-EX4',
                'x_prod' => 'FASSON ECOPRINT',
                'ncm' => '48114190',
                'u_com' => 'M2',
                'fornecedor_id' => $this->fornecedor->id,
            ])
            ->assertCreated();

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_exact_multidet.xml'));
        $this->assertNotFalse($xml);

        $res = $this->withHeaders($h)
            ->post('/api/v1/produtos/from-nfe-xml/preview', [
                'file' => UploadedFile::fake()->createWithContent('exact.xml', $xml),
            ])
            ->assertOk()
            ->assertJsonPath('data.itens.0.status', 'ja_cadastrado');

        $this->assertNotEmpty($res->json('data.itens.0.produto_existente.codigo'));
    }
}
