<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\OrcCatalogoPapel;
use App\Models\User;
use App\Services\Comercial\Orcamento\OrcamentoCatalogo;
use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OrcamentoCatalogoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $admin;

    private User $comercial;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('orcamento.catalogo.gerir', 'web');
        Permission::findOrCreate('orcamento.ler', 'web');
        Permission::findOrCreate('orcamento.escrever', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-CAT1',
            'razao_social' => 'Empresa Catálogo',
            'nome_fantasia' => 'Cat',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);

        $this->admin = User::query()->create([
            'codigo' => 'USR-CAT1',
            'name' => 'Admin Catálogo',
            'email' => 'admin.cat@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->admin->givePermissionTo('orcamento.catalogo.gerir');
        $this->admin->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-CAT2',
            'name' => 'Comercial Catálogo',
            'email' => 'comercial.cat@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever']);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    private function asAdmin()
    {
        Sanctum::actingAs($this->admin);

        return $this->withHeader('X-Empresa-Id', (string) $this->empresa->id);
    }

    private function asComercial()
    {
        Sanctum::actingAs($this->comercial);

        return $this->withHeader('X-Empresa-Id', (string) $this->empresa->id);
    }

    public function test_seed_from_json_and_motor_uses_db_prices(): void
    {
        $service = app(OrcamentoCatalogoAdminService::class);
        $result = $service->seedFromJson();

        $this->assertGreaterThan(0, $result['criados']['papeis']);
        $this->assertGreaterThan(0, $result['criados']['acabamentos']);
        $this->assertGreaterThan(0, $result['criados']['tipos_troca']);
        $this->assertGreaterThan(0, $result['criados']['maquinas']);

        $papel = OrcCatalogoPapel::query()->where('nome', 'BOPP BRILHO')->firstOrFail();
        $service->updatePapel($papel, ['preco_m2' => 99.99]);

        $cat = OrcamentoCatalogo::load();
        $this->assertSame(99.99, $cat->precoPapel('BOPP BRILHO'));
        $this->assertContains('BOPP BRILHO', $cat->metaForUi()['papeis']);
        $this->assertSame('database', $service->resumo()['fonte']);
    }

    public function test_inactive_papel_hidden_from_ui_but_lookup_still_works(): void
    {
        $service = app(OrcamentoCatalogoAdminService::class);
        $service->seedFromJson();

        $papel = OrcCatalogoPapel::query()->where('nome', 'BOPP BRILHO')->firstOrFail();
        $service->updatePapel($papel, ['ativo' => false]);

        $cat = OrcamentoCatalogo::load();
        $this->assertSame(7.2, $cat->precoPapel('BOPP BRILHO'));
        $this->assertNotContains('BOPP BRILHO', $cat->metaForUi()['papeis']);
    }

    public function test_http_crud_requires_permission(): void
    {
        $this->asComercial()->getJson('/api/v1/orcamento-catalogo/papeis')->assertForbidden();

        app(OrcamentoCatalogoAdminService::class)->seedFromJson();

        $this->asAdmin()
            ->getJson('/api/v1/orcamento-catalogo/resumo')
            ->assertOk()
            ->assertJsonPath('data.fonte', 'database');

        $list = $this->asAdmin()->getJson('/api/v1/orcamento-catalogo/papeis')->assertOk();
        $id = $list->json('data.0.id');
        $this->assertNotNull($id);

        $this->asAdmin()
            ->putJson("/api/v1/orcamento-catalogo/papeis/{$id}", ['preco_m2' => 8.5])
            ->assertOk()
            ->assertJsonPath('data.preco_m2', 8.5);

        $this->asAdmin()
            ->postJson('/api/v1/orcamento-catalogo/papeis', [
                'nome' => 'PAPEL TESTE NOVO',
                'preco_m2' => 1.25,
            ])
            ->assertCreated()
            ->assertJsonPath('data.nome', 'PAPEL TESTE NOVO');

        $this->asAdmin()
            ->putJson('/api/v1/orcamento-catalogo/tipos-troca/1', ['tempo_min' => 10])
            ->assertOk();

        $this->asAdmin()
            ->getJson('/api/v1/orcamento-catalogo/maquinas')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'nome', 'tarifas', 'ativo']]]);
    }

    public function test_json_fallback_when_tables_empty(): void
    {
        $cat = OrcamentoCatalogo::load();
        $this->assertGreaterThan(0, count($cat->papel));
        $this->assertSame(7.2, $cat->precoPapel('BOPP BRILHO'));
        $this->assertSame('json_fallback', app(OrcamentoCatalogoAdminService::class)->resumo()['fonte']);
    }

    public function test_seed_is_idempotent_and_preserves_edits(): void
    {
        $service = app(OrcamentoCatalogoAdminService::class);
        $service->seedFromJson();
        $papel = OrcCatalogoPapel::query()->where('nome', 'BOPP BRILHO')->firstOrFail();
        $service->updatePapel($papel, ['preco_m2' => 12.34]);

        $again = $service->seedFromJson();
        $this->assertSame(0, $again['criados']['papeis']);
        $this->assertSame(12.34, (float) $papel->fresh()->preco_m2);
    }
}
