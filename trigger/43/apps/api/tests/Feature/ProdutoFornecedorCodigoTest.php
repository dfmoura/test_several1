<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\ProdutoFornecedorCodigo;
use App\Models\User;
use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProdutoFornecedorCodigoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $escritor;

    private Produto $produto;

    private Parceiro $fornecedor;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('produto.ler', 'web');
        Permission::findOrCreate('produto.escrever', 'web');

        app(ProdutoGrupoService::class)->seedCatalog();

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-PFC',
            'razao_social' => 'Empresa PFC',
            'nome_fantasia' => 'PFC',
            'cnpj' => '00000000000612',
            'situacao' => 'ATIVA',
        ]);

        $this->escritor = User::query()->create([
            'codigo' => 'USR-PFC1',
            'name' => 'Escritor Produto',
            'email' => 'pfc.write@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->escritor->givePermissionTo(['produto.ler', 'produto.escrever']);
        $this->escritor->empresas()->attach($this->empresa->id);

        $grupoId = \App\Models\ProdutoGrupo::query()->where('codigo', 'MP-PAP')->value('id');

        $this->produto = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-PAP-001',
            'familia' => 'MP',
            'grupo_id' => $grupoId,
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'PAPEL TESTE EXACT',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'situacao' => 'ATIVO',
        ]);

        $this->fornecedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-FORN-1',
            'razao_social' => 'Fornecedor Avery Teste',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '61380873000155',
            'papel_fornecedor' => true,
            'papel_cliente' => false,
            'situacao' => 'ATIVO',
        ]);
    }

    public function test_show_produto_inclui_fornecedor_codigos(): void
    {
        Sanctum::actingAs($this->escritor);

        ProdutoFornecedorCodigo::query()->create([
            'empresa_id' => $this->empresa->id,
            'fornecedor_id' => $this->fornecedor->id,
            'produto_id' => $this->produto->id,
            'c_prod' => 'AAS029-EX4',
            'x_prod' => 'FASSON ECOPRINT EXACT 1000',
        ]);

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->getJson('/api/v1/produtos/'.$this->produto->id)
            ->assertOk()
            ->assertJsonPath('data.fornecedor_codigos.0.c_prod', 'AAS029-EX4')
            ->assertJsonPath('data.fornecedor_codigos.0.fornecedor.codigo', 'PAR-FORN-1');
    }

    public function test_crud_de_para_cprod(): void
    {
        Sanctum::actingAs($this->escritor);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $created = $this->withHeaders($h)
            ->postJson('/api/v1/produtos/'.$this->produto->id.'/fornecedor-codigos', [
                'fornecedor_id' => $this->fornecedor->id,
                'c_prod' => 'AAS029-EX4',
                'x_prod' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1000',
            ])
            ->assertCreated()
            ->assertJsonPath('data.c_prod', 'AAS029-EX4');

        $mapId = $created->json('data.id');

        $this->withHeaders($h)
            ->getJson('/api/v1/produtos/'.$this->produto->id.'/fornecedor-codigos')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->withHeaders($h)
            ->putJson('/api/v1/produtos/'.$this->produto->id.'/fornecedor-codigos/'.$mapId, [
                'c_prod' => 'AAS029-EX3',
                'x_prod' => 'Atualizado',
            ])
            ->assertOk()
            ->assertJsonPath('data.c_prod', 'AAS029-EX3');

        $this->withHeaders($h)
            ->deleteJson('/api/v1/produtos/'.$this->produto->id.'/fornecedor-codigos/'.$mapId)
            ->assertNoContent();

        $this->assertDatabaseMissing('produto_fornecedor_codigos', ['id' => $mapId]);
    }

    public function test_cprod_duplicado_no_mesmo_fornecedor_falha(): void
    {
        Sanctum::actingAs($this->escritor);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $outro = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-PAP-002',
            'familia' => 'MP',
            'grupo_id' => $this->produto->grupo_id,
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'OUTRO',
            'unidade_comercial' => 'M2',
            'situacao' => 'ATIVO',
        ]);

        ProdutoFornecedorCodigo::query()->create([
            'empresa_id' => $this->empresa->id,
            'fornecedor_id' => $this->fornecedor->id,
            'produto_id' => $outro->id,
            'c_prod' => 'AAS029-EX4',
            'x_prod' => 'Já usado',
        ]);

        $this->withHeaders($h)
            ->postJson('/api/v1/produtos/'.$this->produto->id.'/fornecedor-codigos', [
                'fornecedor_id' => $this->fornecedor->id,
                'c_prod' => 'AAS029-EX4',
            ])
            ->assertStatus(422);
    }
}
