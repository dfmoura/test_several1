<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\ProdutoFornecedorCodigo;
use App\Models\User;
use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProdutoFromNfeItemTest extends TestCase
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
            'codigo' => 'EMP-NFITEM',
            'razao_social' => 'Empresa From NF',
            'nome_fantasia' => 'NF Item',
            'cnpj' => '00000000000791',
            'situacao' => 'ATIVA',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-NFITEM',
            'name' => 'Cadastro NF',
            'email' => 'nfitem@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['produto.ler', 'produto.escrever']);
        $this->user->empresas()->attach($this->empresa->id);

        $this->fornecedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-AVERY',
            'razao_social' => 'AVERY DENNISON DO BRASIL LTDA',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '43999630000124',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
        ]);
    }

    public function test_preview_sugere_grupo_sem_gravar(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson('/api/v1/produtos/from-nfe-item/preview', [
                'c_prod' => 'AAS029-EX4',
                'x_prod' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1000',
                'ncm' => '48114190',
                'u_com' => 'M2',
                'fornecedor_id' => $this->fornecedor->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.sugestao.grupo', 'MP-PAP')
            ->assertJsonPath('data.sugestao.programa_compra', 'EXACT 1000')
            ->assertJsonPath('data.fornecedor.codigo', 'PAR-AVERY');

        $this->assertSame(0, ProdutoFornecedorCodigo::query()->count());
    }

    public function test_create_sku_e_depara_atomico(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $res = $this->withHeaders($h)
            ->postJson('/api/v1/produtos/from-nfe-item', [
                'c_prod' => 'AAS029-EX4',
                'x_prod' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1000',
                'ncm' => '48114190',
                'u_com' => 'M2',
                'origem' => 0,
                'fornecedor_id' => $this->fornecedor->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.produto.familia', 'MP')
            ->assertJsonPath('data.produto.grupo', 'MP-PAP')
            ->assertJsonPath('data.produto.unidade_comercial', 'M2')
            ->assertJsonPath('data.produto.unidade_interna', 'M2')
            ->assertJsonPath('data.depara.c_prod', 'AAS029-EX4');

        $produtoId = $res->json('data.produto.id');
        $this->assertNotNull($produtoId);
        $this->assertSame('EXACT 1000', $res->json('data.produto.atributos.programa_compra'));

        $this->assertDatabaseHas('produto_fornecedor_codigos', [
            'empresa_id' => $this->empresa->id,
            'fornecedor_id' => $this->fornecedor->id,
            'produto_id' => $produtoId,
            'c_prod' => 'AAS029-EX4',
        ]);
    }

    public function test_create_sem_depara_quando_cprod_generico(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson('/api/v1/produtos/from-nfe-item', [
                'c_prod' => 'RETORNO',
                'x_prod' => 'FACA 135X80MM SANTA LUCIA',
                'ncm' => '84439199',
                'u_com' => 'PC',
                'fornecedor_id' => $this->fornecedor->id,
                'gravar_depara' => false,
            ])
            ->assertCreated()
            ->assertJsonPath('data.produto.grupo', 'FAC')
            ->assertJsonPath('data.depara', null);

        $this->assertSame(0, ProdutoFornecedorCodigo::query()->count());
    }

    public function test_create_recusa_depara_generico_sem_forcar(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson('/api/v1/produtos/from-nfe-item', [
                'c_prod' => 'RETORNO',
                'x_prod' => 'FACA 01',
                'ncm' => '84439199',
                'u_com' => 'UN',
                'fornecedor_id' => $this->fornecedor->id,
                'gravar_depara' => true,
            ])
            ->assertStatus(422);
    }
}
