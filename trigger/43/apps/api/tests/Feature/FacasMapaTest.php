<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\OrcMapaFaca;
use App\Models\Parceiro;
use App\Models\User;
use App\Services\Comercial\FacasMapaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FacasMapaTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private User $comercial;

    private User $consulta;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('orcamento.ler', 'web');
        Permission::findOrCreate('orcamento.escrever', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-FAC1',
            'razao_social' => 'Empresa Facas',
            'nome_fantasia' => 'Facas',
            'cnpj' => '00000000000353',
            'situacao' => 'ATIVA',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-FAC1',
            'name' => 'User Facas',
            'email' => 'facas@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->empresas()->attach($this->empresa->id);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-FAC2',
            'name' => 'Comercial Facas',
            'email' => 'comercial-facas@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->empresas()->attach($this->empresa->id);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever']);

        $this->consulta = User::query()->create([
            'codigo' => 'USR-FAC3',
            'name' => 'Consulta Facas',
            'email' => 'consulta-facas@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->consulta->empresas()->attach($this->empresa->id);
        $this->consulta->givePermissionTo('orcamento.ler');
    }

    public function test_lista_facas_completas_e_filtra_por_q(): void
    {
        Sanctum::actingAs($this->user);

        $all = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/facas?so_completas=1');

        $all->assertOk();
        $this->assertGreaterThan(100, $all->json('total'));
        $this->assertNotEmpty($all->json('formatos'));
        $this->assertArrayHasKey('medida', $all->json('items.0'));
        $this->assertIsArray($all->json('maquinas'));
        $this->assertNotEmpty($all->json('formatos'));

        $q = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/facas?formato=REDONDA&so_completas=1');

        $q->assertOk();
        $this->assertGreaterThan(0, $q->json('total'));
        foreach ($q->json('items') as $item) {
            $blob = strtoupper(($item['formato'] ?? '').' '.($item['faca'] ?? ''));
            $this->assertStringContainsString('REDOND', $blob);
        }

        $texto = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/facas?q=8,0X12&so_completas=1');
        $texto->assertOk();
        $this->assertGreaterThan(0, $texto->json('total'));
    }

    public function test_seed_create_e_inativar(): void
    {
        Sanctum::actingAs($this->comercial);
        $hdr = ['X-Empresa-Id' => (string) $this->empresa->id];

        $seed = $this->withHeaders($hdr)->postJson('/api/v1/facas/seed', ['force' => false]);
        $seed->assertOk();
        $this->assertGreaterThan(100, $seed->json('resumo.ativas'));

        $create = $this->withHeaders($hdr)->postJson('/api/v1/facas', [
            'medida' => '9,9X9,9',
            'formato' => 'RETA',
            'maquina_catalogo' => 'BETA',
            'puxada' => 9.9,
            'z' => 99,
            'repeticao' => 1.5,
            'largura_faca' => 9.9,
            'cliente_nota' => 'TESTE MAPA',
        ]);
        $create->assertCreated();
        $id = (int) $create->json('data.id');
        $this->assertTrue($create->json('data.ativo'));
        $this->assertTrue($create->json('data.completa'));
        $this->assertStringContainsString('9,9X9,9', (string) $create->json('data.label'));

        $inativar = $this->withHeaders($hdr)->patchJson("/api/v1/facas/{$id}/ativo", ['ativo' => false]);
        $inativar->assertOk();
        $this->assertFalse($inativar->json('data.ativo'));

        $listaAtivas = $this->withHeaders($hdr)->getJson('/api/v1/facas?q=9,9X9,9');
        $listaAtivas->assertOk();
        $this->assertSame(0, $listaAtivas->json('total'));

        $listaTodas = $this->withHeaders($hdr)->getJson('/api/v1/facas?q=9,9X9,9&incluir_inativas=1');
        $listaTodas->assertOk();
        $this->assertSame(1, $listaTodas->json('total'));
        $this->assertFalse($listaTodas->json('items.0.ativo'));
    }

    public function test_store_requires_escrever(): void
    {
        Sanctum::actingAs($this->consulta);
        app(FacasMapaService::class)->seedFromJson();

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/facas', [
                'medida' => '1X1',
                'formato' => 'RETA',
                'maquina_catalogo' => 'BETA',
                'puxada' => 1,
                'z' => 40,
            ]);

        $res->assertForbidden();
    }

    public function test_nao_permite_duplicata_ativa(): void
    {
        Sanctum::actingAs($this->comercial);
        app(FacasMapaService::class)->seedFromJson();
        $hdr = ['X-Empresa-Id' => (string) $this->empresa->id];

        $payload = [
            'medida' => '7,7X2,2',
            'formato' => 'OVAL',
            'maquina_catalogo' => '160',
            'puxada' => 2.2,
            'z' => 55,
        ];

        $this->withHeaders($hdr)->postJson('/api/v1/facas', $payload)->assertCreated();
        $dup = $this->withHeaders($hdr)->postJson('/api/v1/facas', $payload);
        $dup->assertStatus(422);
        $this->assertArrayHasKey('medida', $dup->json('errors'));
    }

    public function test_atualiza_metadados_sem_alterar_geometria(): void
    {
        Sanctum::actingAs($this->comercial);
        app(FacasMapaService::class)->seedFromJson();
        $hdr = ['X-Empresa-Id' => (string) $this->empresa->id];

        $create = $this->withHeaders($hdr)->postJson('/api/v1/facas', [
            'medida' => '3,3X3,3',
            'formato' => 'RETA',
            'maquina_catalogo' => 'BETA',
            'puxada' => 3.3,
            'z' => 33,
        ])->assertCreated();
        $id = (int) $create->json('data.id');
        $puxada = $create->json('data.puxada');

        $patch = $this->withHeaders($hdr)->patchJson("/api/v1/facas/{$id}", [
            'cliente_nota' => 'PAR-CASA A',
            'fornecedor' => 'Ferramental X',
            'n_facas' => 2,
        ]);
        $patch->assertOk();
        $this->assertSame('PAR-CASA A', $patch->json('data.cliente_nota'));
        $this->assertSame('Ferramental X', $patch->json('data.fornecedor'));
        $this->assertSame(2, $patch->json('data.n_facas'));
        $this->assertEquals($puxada, $patch->json('data.puxada'));
        $this->assertSame('3,3X3,3', $patch->json('data.medida'));
    }

    public function test_alinha_rotulo_legado_ao_parceiro_fornecedor_unico(): void
    {
        Sanctum::actingAs($this->comercial);
        $hdr = ['X-Empresa-Id' => (string) $this->empresa->id];

        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-FACF',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'PERFIL INDUSTRIA DE FACAS ROTATIVAS LTDA',
            'nome_fantasia' => 'PERFIL FACAS',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
        ]);

        $perfil = OrcMapaFaca::query()->create([
            'empresa_id' => $this->empresa->id,
            'medida' => '4,4X4,4',
            'formato' => 'RETA',
            'faca' => 'RETA',
            'maquina_catalogo' => 'BETA',
            'puxada' => 4.4,
            'z' => 44,
            'fornecedor' => 'PERFIL',
            'completa' => true,
            'ativo' => true,
            'label' => '4,4X4,4 · RETA',
        ]);
        $resina = OrcMapaFaca::query()->create([
            'empresa_id' => $this->empresa->id,
            'medida' => '5,5X5,5',
            'formato' => 'RETA',
            'faca' => 'RETA',
            'maquina_catalogo' => 'BETA',
            'puxada' => 5.5,
            'z' => 55,
            'fornecedor' => 'RESINA',
            'completa' => true,
            'ativo' => true,
            'label' => '5,5X5,5 · RETA',
        ]);

        $res = $this->withHeaders($hdr)->postJson('/api/v1/facas/alinhar-fornecedores');
        $res->assertOk();
        $this->assertSame(1, $res->json('data.atualizados'));
        $this->assertSame('PERFIL', $res->json('data.mapa.0.de'));
        $this->assertSame('PERFIL FACAS', $res->json('data.mapa.0.para'));
        $this->assertSame('RESINA', $res->json('data.sem_match.0.rotulo'));

        $this->assertSame('PERFIL FACAS', $perfil->fresh()->fornecedor);
        $this->assertSame('RESINA', $resina->fresh()->fornecedor);
        $this->assertEquals(4.4, (float) $perfil->fresh()->puxada);
        $this->assertFalse($res->json('data.materializado'));
        $this->assertSame(0, $res->json('data.materializados'));
    }

    public function test_alinhar_materializa_mapa_da_emp_antes_de_atualizar_rotulos(): void
    {
        Sanctum::actingAs($this->comercial);
        $hdr = ['X-Empresa-Id' => (string) $this->empresa->id];

        // Template compartilhado (sem cópia da EMP) — cenário pós-limpeza / EMP antiga.
        OrcMapaFaca::query()->create([
            'empresa_id' => null,
            'medida' => '6,6X6,6',
            'formato' => 'RETA',
            'faca' => 'RETA',
            'maquina_catalogo' => 'BETA',
            'puxada' => 6.6,
            'z' => 66,
            'fornecedor' => 'PERFIL',
            'completa' => true,
            'ativo' => true,
            'label' => '6,6X6,6 · RETA',
        ]);

        Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-PERF2',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'PERFIL INDUSTRIA DE FACAS ROTATIVAS LTDA',
            'nome_fantasia' => 'PERFIL FACAS',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
        ]);

        $this->assertSame(0, OrcMapaFaca::query()->where('empresa_id', $this->empresa->id)->count());

        $res = $this->withHeaders($hdr)->postJson('/api/v1/facas/alinhar-fornecedores');
        $res->assertOk();
        $this->assertTrue($res->json('data.materializado'));
        $this->assertGreaterThan(0, $res->json('data.materializados'));
        $this->assertSame(0, OrcMapaFaca::query()->whereNull('empresa_id')->where('fornecedor', 'PERFIL FACAS')->count());
        $this->assertGreaterThan(
            0,
            OrcMapaFaca::query()->where('empresa_id', $this->empresa->id)->where('fornecedor', 'PERFIL FACAS')->count(),
        );
    }

    public function test_seed_por_empresa_nao_emite_alter_table_dentro_de_transacao(): void
    {
        $sqls = [];
        \Illuminate\Support\Facades\DB::listen(static function ($query) use (&$sqls) {
            $sqls[] = $query->sql;
        });

        \Illuminate\Support\Facades\DB::transaction(function () {
            app(FacasMapaService::class)->seedFromJson(null, false, $this->empresa->id);
        });

        $this->assertFalse(
            collect($sqls)->contains(fn (string $sql) => str_contains(strtolower($sql), 'alter table')),
            'ALTER TABLE no seed do mapa quebra a alta da empresa no MySQL (commit implícito).',
        );
    }
}
