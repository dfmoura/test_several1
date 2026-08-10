<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Master flag OFF: produto congelado, código intacto.
 */
class RelatorioCongeladoTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_retorna_404_quando_congelado(): void
    {
        config(['erp.relatorio_ia_habilitado' => false]);

        foreach (['relatorio.ler', 'relatorio.escrever'] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-FZ01',
            'razao_social' => 'Empresa Freeze',
            'nome_fantasia' => 'Freeze',
            'cnpj' => '00000000000515',
            'situacao' => 'ATIVA',
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-FZ01',
            'name' => 'Freeze User',
            'email' => 'freeze.rel@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['relatorio.ler', 'relatorio.escrever']);
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/relatorios')
            ->assertNotFound();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/relatorios', [
                'prompt' => 'Liste parceiros ativos da empresa',
                'orientacao' => 'retrato',
            ])
            ->assertNotFound();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/relatorios/catalogo')
            ->assertNotFound();
    }
}
