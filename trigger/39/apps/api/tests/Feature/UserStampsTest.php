<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\User;
use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class UserStampsTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $autor;

    private User $editor;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'parceiro.ler', 'parceiro.escrever', 'parceiro.bancario', 'credito.escrever',
            'produto.ler', 'produto.escrever', 'produto.fiscal',
        ] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-STAMP',
            'razao_social' => 'Empresa Selos',
            'nome_fantasia' => 'Selos',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->autor = User::query()->create([
            'codigo' => 'USR-STAMP1',
            'name' => 'Autor Cadastro',
            'email' => 'autor.stamp@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->autor->givePermissionTo([
            'parceiro.ler', 'parceiro.escrever', 'parceiro.bancario', 'credito.escrever',
            'produto.ler', 'produto.escrever', 'produto.fiscal',
        ]);
        $this->autor->empresas()->attach($this->empresa->id);

        $this->editor = User::query()->create([
            'codigo' => 'USR-STAMP2',
            'name' => 'Editor Cadastro',
            'email' => 'editor.stamp@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->editor->givePermissionTo([
            'parceiro.ler', 'parceiro.escrever', 'parceiro.bancario', 'credito.escrever',
            'produto.ler', 'produto.escrever', 'produto.fiscal',
        ]);
        $this->editor->empresas()->attach($this->empresa->id);
    }

    public function test_criar_parceiro_selo_criado_por_e_ignora_forge(): void
    {
        Sanctum::actingAs($this->autor);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Cliente Com Selo',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'criado_por' => $this->editor->id,
                'atualizado_por' => $this->editor->id,
            ])
            ->assertCreated();

        $this->assertSame($this->autor->id, $res->json('data.criado_por.id'));
        $this->assertSame('Autor Cadastro', $res->json('data.criado_por.name'));
        $this->assertSame($this->autor->id, $res->json('data.atualizado_por.id'));

        $parceiro = Parceiro::query()->findOrFail($res->json('data.id'));
        $this->assertSame($this->autor->id, (int) $parceiro->criado_por);
        $this->assertSame($this->autor->id, (int) $parceiro->atualizado_por);
    }

    public function test_atualizar_parceiro_selo_atualizado_por(): void
    {
        Sanctum::actingAs($this->autor);

        $create = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Cliente Edicao',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
            ])
            ->assertCreated();

        $id = $create->json('data.id');

        Sanctum::actingAs($this->editor);

        $update = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->putJson('/api/v1/parceiros/'.$id, [
                'razao_social' => 'Cliente Editado',
                'criado_por' => $this->editor->id,
            ])
            ->assertOk();

        $this->assertSame($this->autor->id, $update->json('data.criado_por.id'));
        $this->assertSame($this->editor->id, $update->json('data.atualizado_por.id'));
        $this->assertSame('Editor Cadastro', $update->json('data.atualizado_por.name'));

        $parceiro = Parceiro::query()->findOrFail($id);
        $this->assertSame($this->autor->id, (int) $parceiro->criado_por);
        $this->assertSame($this->editor->id, (int) $parceiro->atualizado_por);
    }

    public function test_criar_produto_com_selos(): void
    {
        app(ProdutoGrupoService::class)->seedCatalog();

        Sanctum::actingAs($this->autor);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/produtos', [
                'familia' => 'MP',
                'grupo' => 'MP-PAP',
                'descricao_fiscal' => 'Papel teste selo',
                'unidade_comercial' => 'KG',
                'unidade_interna' => 'KG',
                'fator_conversao' => '1',
                'criado_por' => 999999,
            ])
            ->assertCreated();

        $this->assertSame($this->autor->id, $res->json('data.criado_por.id'));
        $this->assertSame($this->autor->id, $res->json('data.atualizado_por.id'));
    }
}
