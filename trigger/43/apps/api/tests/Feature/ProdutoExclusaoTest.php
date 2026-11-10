<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueSaldo;
use App\Models\OrcCatalogoPapel;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\ProdutoFornecedorCodigo;
use App\Models\ProdutoGrupo;
use App\Models\User;
use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Exclusão de SKU órfão — preflight + soft-delete (espelho Empresa).
 */
class ProdutoExclusaoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmpresa;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('produto.ler', 'web');
        Permission::findOrCreate('produto.escrever', 'web');
        app(ProdutoGrupoService::class)->seedCatalog();

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-PEX',
            'razao_social' => 'Empresa Produto Exclusao',
            'nome_fantasia' => 'PEX',
            'cnpj' => '00000000000794',
            'situacao' => 'ATIVA',
        ]);

        $this->outraEmpresa = Empresa::query()->create([
            'codigo' => 'EMP-PEX2',
            'razao_social' => 'Outra EMP',
            'nome_fantasia' => 'PEX2',
            'cnpj' => '00000000000875',
            'situacao' => 'ATIVA',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-PEX',
            'name' => 'Escritor',
            'email' => 'pex@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['produto.ler', 'produto.escrever']);
        $this->user->empresas()->attach([$this->empresa->id, $this->outraEmpresa->id]);

        Sanctum::actingAs($this->user);
    }

    private function criarProduto(Empresa $empresa, string $codigo = 'MP-PAP-901'): Produto
    {
        $grupoId = ProdutoGrupo::query()->where('codigo', 'MP-PAP')->value('id');

        return Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'familia' => 'MP',
            'grupo_id' => $grupoId,
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'SKU TESTE EXCLUSAO',
            'descricao_comercial' => 'SKU TESTE',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'ncm' => '48114190',
            'tipo_item_sped' => '01',
            'situacao' => 'ATIVO',
            'atributos' => [],
        ]);
    }

    private function criarParceiro(Empresa $empresa, string $codigo = 'PAR-PEX-001'): Parceiro
    {
        return Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'razao_social' => 'Parceiro PEX',
            'papel_cliente' => true,
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
        ]);
    }

    public function test_preflight_permite_sku_orfao(): void
    {
        $produto = $this->criarProduto($this->empresa);

        $res = $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->getJson("/api/v1/produtos/{$produto->id}/exclusao-preflight")
            ->assertOk();

        $this->assertTrue($res->json('data.pode_excluir'));
        $this->assertSame([], $res->json('data.bloqueios'));
    }

    public function test_exclui_orfao_soft_delete_purge_catalogo_e_depara_codigo_reservado(): void
    {
        $produto = $this->criarProduto($this->empresa);
        $grupoId = (int) $produto->grupo_id;
        $fornecedor = $this->criarParceiro($this->empresa, 'PAR-FORN-PEX');

        OrcCatalogoPapel::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $produto->id,
            'nome' => $produto->codigo,
            'grupo_id' => $grupoId,
            'preco_m2' => null,
            'ativo' => true,
            'ordem' => 0,
        ]);

        ProdutoFornecedorCodigo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $produto->id,
            'fornecedor_id' => $fornecedor->id,
            'c_prod' => 'FORN-1',
            'x_prod' => 'DESC FORN',
        ]);

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->deleteJson("/api/v1/produtos/{$produto->id}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertSoftDeleted('produtos', ['id' => $produto->id]);
        $this->assertDatabaseMissing('orc_catalogo_papeis', ['produto_id' => $produto->id]);
        $this->assertDatabaseMissing('produto_fornecedor_codigos', ['produto_id' => $produto->id]);

        $fantasma = Produto::withTrashed()
            ->where('empresa_id', $this->empresa->id)
            ->where('codigo', 'MP-PAP-901')
            ->first();
        $this->assertNotNull($fantasma);
        $this->assertTrue($fantasma->trashed());
        $this->assertSame('INATIVO', $fantasma->situacao);
    }

    public function test_bloqueia_exclusao_com_saldo_estoque(): void
    {
        $produto = $this->criarProduto($this->empresa);

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $produto->id,
            'qtde' => '0.0000',
            'unidade' => 'M2',
            'custo_medio' => '0',
        ]);

        $pre = $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->getJson("/api/v1/produtos/{$produto->id}/exclusao-preflight")
            ->assertOk();

        $this->assertFalse($pre->json('data.pode_excluir'));
        $this->assertNotEmpty($pre->json('data.bloqueios'));

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->deleteJson("/api/v1/produtos/{$produto->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('produtos', [
            'id' => $produto->id,
            'deleted_at' => null,
        ]);
    }

    public function test_bloqueia_exclusao_com_snapshot_orcamento(): void
    {
        $produto = $this->criarProduto($this->empresa);
        $parceiro = $this->criarParceiro($this->empresa);

        DB::table('orcamentos')->insert([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-PEX-001',
            'versao' => 1,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => 'Cliente Teste',
            'status' => 'RASCUNHO',
            'input_snapshot' => json_encode([
                'papel_produto_id' => $produto->id,
                'necessidade' => 'PRODUCAO',
            ]),
            'result_snapshot' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $pre = $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->getJson("/api/v1/produtos/{$produto->id}/exclusao-preflight")
            ->assertOk();

        $this->assertFalse($pre->json('data.pode_excluir'));
        $this->assertStringContainsString('orçamento', mb_strtolower($pre->json('data.mensagem')));
    }

    public function test_isolamento_multi_empresa_404(): void
    {
        $produtoOutra = $this->criarProduto($this->outraEmpresa, 'MP-PAP-902');

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->getJson("/api/v1/produtos/{$produtoOutra->id}/exclusao-preflight")
            ->assertNotFound();

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->deleteJson("/api/v1/produtos/{$produtoOutra->id}")
            ->assertNotFound();
    }

    public function test_catalogo_espelho_nao_bloqueia_exclusao_orfao(): void
    {
        $produto = $this->criarProduto($this->empresa);

        OrcCatalogoPapel::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $produto->id,
            'nome' => $produto->codigo,
            'grupo_id' => $produto->grupo_id,
            'preco_m2' => '1.5000',
            'ativo' => true,
            'ordem' => 0,
        ]);

        $pre = $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->getJson("/api/v1/produtos/{$produto->id}/exclusao-preflight")
            ->assertOk();

        $this->assertTrue($pre->json('data.pode_excluir'));
    }
}
