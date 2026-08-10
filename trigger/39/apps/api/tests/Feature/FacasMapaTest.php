<?php

namespace Tests\Feature;

use App\Models\Empresa;
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
}
