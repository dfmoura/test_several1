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
            ->assertJsonStructure([
                'data' => [['id', 'nome', 'tarifas', 'ativo', 'bens_vinculados']],
            ]);
    }

    public function test_http_nao_cria_maquina_pelo_catalogo(): void
    {
        $this->asAdmin()
            ->postJson('/api/v1/orcamento-catalogo/maquinas', [
                'nome' => 'ORFA',
                'tarifas' => [],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nome']);
    }

    public function test_list_maquinas_inclui_bens_vinculados_da_empresa(): void
    {
        Permission::findOrCreate('patrimonio.ler', 'web');
        Permission::findOrCreate('patrimonio.escrever', 'web');

        $service = app(OrcamentoCatalogoAdminService::class);
        $service->seedFromJson(null, false, $this->empresa->id);

        $grupo = \App\Models\OrcCatalogoMaquina::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('nome', 'BETA')
            ->firstOrFail();

        \App\Models\BemPatrimonial::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'BEM-ORC1',
            'descricao' => 'Impressora ligada ao BETA',
            'categoria' => 'MAQUINA_GRAFICA',
            'status' => 'ATIVO',
            'orc_catalogo_maquina_id' => $grupo->id,
            'capitalizado' => true,
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-CAT2',
            'razao_social' => 'Outra Empresa',
            'nome_fantasia' => 'Outra',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
        ]);

        \App\Models\BemPatrimonial::query()->create([
            'empresa_id' => $outra->id,
            'codigo' => 'BEM-ORC2',
            'descricao' => 'Bem de outra EMP — não deve aparecer',
            'categoria' => 'MAQUINA_GRAFICA',
            'status' => 'ATIVO',
            'orc_catalogo_maquina_id' => $grupo->id,
            'capitalizado' => true,
        ]);

        $res = $this->asAdmin()
            ->getJson('/api/v1/orcamento-catalogo/maquinas')
            ->assertOk();

        $beta = collect($res->json('data'))->firstWhere('nome', 'BETA');
        $this->assertNotNull($beta);
        $this->assertCount(1, $beta['bens_vinculados']);
        $this->assertSame('BEM-ORC1', $beta['bens_vinculados'][0]['codigo']);
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

    public function test_matriz_cm2_overlay_and_meta_for_ui(): void
    {
        $service = app(OrcamentoCatalogoAdminService::class);
        $service->seedFromJson();

        $this->assertSame(0.28, OrcamentoCatalogo::load()->matrizCm2);
        $this->assertSame(0.28, OrcamentoCatalogo::load()->metaForUi()['matriz_cm2']);
        $this->assertSame('database', $service->resumo()['matriz_cm2_fonte']);
        $this->assertSame(0.28, $service->resumo()['matriz_cm2']);

        $service->updateParametro('matriz_cm2', ['valor' => 0.35]);
        $cat = OrcamentoCatalogo::load();
        $this->assertSame(0.35, $cat->matrizCm2);
        $this->assertSame(0.35, $cat->metaForUi()['matriz_cm2']);

        $motor = app(\App\Services\Comercial\Orcamento\OrcamentoMotor::class);
        $bruto = $motor->calcularMatriz(60.0, 10.0, 1, 1, $cat);
        $this->assertEqualsWithDelta(((((60 * 3.175) / 10) + 4) * 14 * 1 * 0.35), $bruto, 0.0001);
    }

    public function test_inactive_matriz_falls_back_to_json(): void
    {
        $service = app(OrcamentoCatalogoAdminService::class);
        $service->seedFromJson();
        $service->updateParametro('matriz_cm2', ['valor' => 0.99, 'ativo' => false]);

        $cat = OrcamentoCatalogo::load();
        $this->assertSame(0.28, $cat->matrizCm2);
        $this->assertSame('json_fallback', $service->resumo()['matriz_cm2_fonte']);
    }

    public function test_http_parametro_matriz_requires_permission_and_updates(): void
    {
        app(OrcamentoCatalogoAdminService::class)->seedFromJson(null, false, $this->empresa->id);

        $this->asComercial()->getJson('/api/v1/orcamento-catalogo/parametros')->assertForbidden();

        $this->asAdmin()
            ->getJson('/api/v1/orcamento-catalogo/parametros')
            ->assertOk()
            ->assertJsonFragment(['chave' => 'matriz_cm2']);

        $this->asAdmin()
            ->putJson('/api/v1/orcamento-catalogo/parametros/matriz_cm2', ['valor' => 0.42])
            ->assertOk()
            ->assertJsonPath('data.valor', 0.42);

        $this->asAdmin()
            ->getJson('/api/v1/orcamento-catalogo/resumo')
            ->assertOk()
            ->assertJsonPath('data.matriz_cm2', 0.42)
            ->assertJsonPath('data.matriz_cm2_fonte', 'database');

        $this->asComercial()
            ->getJson('/api/v1/orcamentos/catalogo')
            ->assertOk()
            ->assertJsonPath('data.matriz_cm2', 0.42);
    }

    public function test_escalares_motor_overlay_e_regras_endpoint(): void
    {
        $service = app(OrcamentoCatalogoAdminService::class);
        $service->seedFromJson(null, false, $this->empresa->id);

        $this->assertGreaterThanOrEqual(
            20,
            \App\Models\OrcCatalogoParametro::query()->where('empresa_id', $this->empresa->id)->count(),
        );

        \App\Models\OrcCatalogoParametro::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('chave', 'setup_horas')
            ->update(['valor' => 1.5, 'ativo' => true]);
        \App\Models\OrcCatalogoParametro::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('chave', 'ceiling_etiqueta')
            ->update(['valor' => 5, 'ativo' => true]);

        $cat = OrcamentoCatalogo::load(null, $this->empresa->id);
        $this->assertSame(1.5, $cat->setupHoras);
        $this->assertSame(5.0, $cat->ceilingEtiqueta);
        $this->assertSame(1.5, $cat->metaForUi()['setup_horas']);

        $this->asComercial()
            ->getJson('/api/v1/orcamento-catalogo/regras')
            ->assertOk()
            ->assertJsonPath('data.motor_version', 2)
            ->assertJsonFragment(['id' => 'R1_metragem'])
            ->assertJsonFragment(['id' => 'FECHAMENTO']);

        $this->asAdmin()
            ->putJson('/api/v1/orcamento-catalogo/parametros/setup_horas', ['valor' => 2])
            ->assertOk()
            ->assertJsonPath('data.valor', 2)
            ->assertJsonPath('data.grupo', 'motor');
    }

    public function test_escalares_isolados_por_empresa(): void
    {
        $empB = Empresa::query()->create([
            'codigo' => 'EMP-CAT2',
            'razao_social' => 'Empresa Catálogo B',
            'nome_fantasia' => 'Cat B',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);

        $service = app(OrcamentoCatalogoAdminService::class);
        $service->seedFromJson(null, false, $this->empresa->id);
        $service->seedFromJson(null, false, $empB->id);

        \App\Models\OrcCatalogoParametro::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('chave', 'setup_horas')
            ->update(['valor' => 3, 'ativo' => true]);
        \App\Models\OrcCatalogoParametro::query()
            ->where('empresa_id', $empB->id)
            ->where('chave', 'setup_horas')
            ->update(['valor' => 1, 'ativo' => true]);

        $catA = OrcamentoCatalogo::load(null, $this->empresa->id);
        $catB = OrcamentoCatalogo::load(null, $empB->id);
        $this->assertSame(3.0, $catA->setupHoras);
        $this->assertSame(1.0, $catB->setupHoras);
    }

    public function test_estruturas_rv4_editaveis_e_motor_usa_db(): void
    {
        $service = app(OrcamentoCatalogoAdminService::class);
        $service->seedFromJson(null, false, $this->empresa->id);

        $this->asAdmin()
            ->getJson('/api/v1/orcamento-catalogo/estruturas')
            ->assertOk()
            ->assertJsonFragment(['chave' => 'tinta_matriz'])
            ->assertJsonFragment(['chave' => 'perda_troca_m2_fator'])
            ->assertJsonFragment(['chave' => 'caixa_empacotamento']);

        $payloadTinta = [
            'thresholds' => [20.0, 30.0],
            'rates' => [
                '1' => [0.8, 0.7],
                '2' => [0.9, 0.8],
                '3' => [1.0, 0.9],
                '4' => [2.0, 1.6],
            ],
        ];

        $this->asAdmin()
            ->putJson('/api/v1/orcamento-catalogo/estruturas/tinta_matriz', ['payload' => $payloadTinta])
            ->assertOk()
            ->assertJsonPath('data.chave', 'tinta_matriz');

        $cat = OrcamentoCatalogo::load(null, $this->empresa->id);
        $this->assertTrue($cat->usaTintaMatriz());
        $this->assertSame(0.7, $cat->tintaMatrizRate(25.0, 1));

        $this->asAdmin()
            ->putJson('/api/v1/orcamento-catalogo/estruturas/perda_troca_m2_fator', [
                'payload' => ['1' => 0.99, '2' => 1.5],
            ])
            ->assertOk();

        $cat2 = OrcamentoCatalogo::load(null, $this->empresa->id);
        $this->assertSame(0.99, $cat2->perdaTrocaM2Fator(1));

        $this->asAdmin()
            ->putJson('/api/v1/orcamento-catalogo/estruturas/caixa_empacotamento', [
                'payload' => [
                    '3"' => ['medida' => '500x300', 'rolos_por_caixa' => 10, 'caixa_id' => 6],
                ],
            ])
            ->assertOk();

        $cat3 = OrcamentoCatalogo::load(null, $this->empresa->id);
        $this->assertSame(10, $cat3->rolosPorCaixa('3"'));
    }
}
