<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\User;
use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProdutoDescricaoSugestaoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $escritor;

    private User $somenteLeitura;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('produto.ler', 'web');
        Permission::findOrCreate('produto.escrever', 'web');

        app(ProdutoGrupoService::class)->seedCatalog();

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-PDS',
            'razao_social' => 'Empresa PDS',
            'nome_fantasia' => 'PDS',
            'cnpj' => '00000000000515',
            'situacao' => 'ATIVA',
        ]);

        $this->escritor = User::query()->create([
            'codigo' => 'USR-PDS1',
            'name' => 'Escritor Produto',
            'email' => 'prod.write@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->escritor->givePermissionTo(['produto.ler', 'produto.escrever']);
        $this->escritor->empresas()->attach($this->empresa->id);

        $this->somenteLeitura = User::query()->create([
            'codigo' => 'USR-PDS2',
            'name' => 'Leitor Produto',
            'email' => 'prod.read@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->somenteLeitura->givePermissionTo(['produto.ler']);
        $this->somenteLeitura->empresas()->attach($this->empresa->id);
    }

    public function test_sugerir_descricao_ok(): void
    {
        Sanctum::actingAs($this->escritor);
        $grupoId = \App\Models\ProdutoGrupo::query()->where('codigo', 'REV-RIB')->value('id');

        $res = $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson('/api/v1/produtos/sugerir-descricao', [
                'grupo_id' => $grupoId,
                'texto_livre' => 'ribbon resina 110x74',
            ]);

        $res->assertOk()
            ->assertJsonPath('data.origem', 'regra')
            ->assertJsonPath('data.descricao_fiscal', 'RIBBON RESINA 110x74');
        $this->assertNotSame('', $res->json('data.descricao_comercial'));
    }

    public function test_sugerir_exige_grupo(): void
    {
        Sanctum::actingAs($this->escritor);

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson('/api/v1/produtos/sugerir-descricao', [
                'texto_livre' => 'bopp',
            ])
            ->assertStatus(422);
    }

    public function test_sugerir_exige_produto_escrever(): void
    {
        Sanctum::actingAs($this->somenteLeitura);
        $grupoId = \App\Models\ProdutoGrupo::query()->where('codigo', 'PA-ETQ')->value('id');

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson('/api/v1/produtos/sugerir-descricao', [
                'grupo_id' => $grupoId,
            ])
            ->assertForbidden();
    }
}
