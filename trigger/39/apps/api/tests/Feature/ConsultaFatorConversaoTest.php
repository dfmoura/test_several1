<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConsultaFatorConversaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_fator_mil_un_e_kg_m2(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-FAT1',
            'razao_social' => 'Empresa Fator',
            'nome_fantasia' => 'Fator',
            'cnpj' => '00000000000605',
            'situacao' => 'ATIVA',
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-FAT1',
            'name' => 'Consulta Fator',
            'email' => 'fator@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->empresas()->attach($empresa->id);

        Sanctum::actingAs($user);

        $mil = $this->getJson('/api/v1/consulta/fator-conversao?de=MIL&para=UN', [
            'X-Empresa-Id' => (string) $empresa->id,
        ]);
        $mil->assertOk()
            ->assertJsonPath('data.status', 'sugerido')
            ->assertJsonPath('data.fator', '1000.0000000000');

        $kg = $this->getJson(
            '/api/v1/consulta/fator-conversao?de=KG&para=M2&gramatura_g_m2=160',
            ['X-Empresa-Id' => (string) $empresa->id]
        );
        $kg->assertOk()
            ->assertJsonPath('data.status', 'sugerido')
            ->assertJsonPath('data.fator', '6.2500000000');

        $incomplete = $this->getJson('/api/v1/consulta/fator-conversao?de=KG&para=M2', [
            'X-Empresa-Id' => (string) $empresa->id,
        ]);
        $incomplete->assertOk()
            ->assertJsonPath('data.status', 'incompleto')
            ->assertJsonPath('data.faltando.0', 'gramatura_g_m2');
    }
}
