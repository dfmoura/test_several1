<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Feriado;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FeriadoTest extends TestCase
{
    use RefreshDatabase;

    public function test_crud_feriado_por_emp_e_isolamento(): void
    {
        Permission::findOrCreate('feriado.ler', 'web');
        Permission::findOrCreate('feriado.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-FER1',
            'razao_social' => 'Empresa Feriados',
            'nome_fantasia' => 'Feriados',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-FER2',
            'razao_social' => 'Outra Empresa',
            'nome_fantasia' => 'Outra',
            'cnpj' => '44555666000199',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-FER1',
            'name' => 'Admin FER',
            'email' => 'fer@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['feriado.ler', 'feriado.escrever']);
        $user->empresas()->attach([$empresa->id, $outra->id]);

        Sanctum::actingAs($user);

        $create = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/feriados', [
                'data' => '2026-12-25',
                'nome' => 'Natal',
                'tipo' => 'NACIONAL',
                'recorrente_anual' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.nome', 'Natal');

        $feriadoId = (int) $create->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/feriados?ano=2026')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        Feriado::query()->create([
            'empresa_id' => $outra->id,
            'data' => '2026-01-01',
            'nome' => 'Outro',
            'tipo' => 'EMPRESA',
            'ativo' => true,
        ]);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/feriados')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson("/api/v1/feriados/{$feriadoId}")
            ->assertOk();

        $this->withHeader('X-Empresa-Id', (string) $outra->id)
            ->getJson("/api/v1/feriados/{$feriadoId}")
            ->assertNotFound();

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/feriados', [
                'data' => '2026-12-25',
                'nome' => 'Duplicado',
            ])
            ->assertStatus(422);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/feriados/seed-nacionais', ['ano' => 2026])
            ->assertOk()
            ->assertJsonPath('data.criados', 8);
    }

    public function test_previsao_entrega_respeita_feriado(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-FER3',
            'razao_social' => 'Empresa Calendario',
            'nome_fantasia' => 'Cal',
            'cnpj' => '55666777000144',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-FER3',
            'name' => 'User Cal',
            'email' => 'cal@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->empresas()->attach($empresa->id);

        Feriado::query()->create([
            'empresa_id' => $empresa->id,
            'data' => '2026-09-08',
            'nome' => 'Feriado teste',
            'tipo' => 'EMPRESA',
            'ativo' => true,
        ]);

        Sanctum::actingAs($user);

        // Seg 2026-09-07 + 1 d.útil; ter 08/09 é feriado → quarta 09/09
        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/calendario/previsao-entrega?dias=1&referencia=2026-09-07')
            ->assertOk()
            ->assertJsonPath('data.data_entrega_prevista', '2026-09-09');
    }
}
