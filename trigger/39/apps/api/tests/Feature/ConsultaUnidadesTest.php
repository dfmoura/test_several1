<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\User;
use App\Support\UnidadesMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ConsultaUnidadesTest extends TestCase
{
    use RefreshDatabase;

    public function test_consulta_unidades_retorna_catalogo_oficial(): void
    {
        Permission::findOrCreate('produto.ler', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-UNI1',
            'razao_social' => 'Empresa Unidades',
            'nome_fantasia' => 'Uni',
            'cnpj' => '00000000000515',
            'situacao' => 'ATIVA',
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-UNI1',
            'name' => 'Consulta Unidades',
            'email' => 'unidades@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo('produto.ler');
        $user->empresas()->attach($empresa->id);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/consulta/unidades', [
            'X-Empresa-Id' => (string) $empresa->id,
        ]);

        $response->assertOk();
        $data = $response->json('data');
        $this->assertIsArray($data);
        $this->assertCount(count(UnidadesMedida::codes()), $data);
        $this->assertSame(
            UnidadesMedida::codes(),
            array_column($data, 'codigo')
        );
        $this->assertArrayHasKey('descricao', $data[0]);
        $this->assertArrayHasKey('uso', $data[0]);
    }
}
