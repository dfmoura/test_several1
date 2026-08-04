<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FacasMapaTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

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
}
