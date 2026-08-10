<?php

namespace Tests\Feature;

use App\Models\BemPatrimonial;
use App\Models\Empresa;
use App\Models\OrcCatalogoMaquina;
use App\Models\ParametroEmpresa;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class BemPatrimonialTest extends TestCase
{
    use RefreshDatabase;

    public function test_crud_bem_com_vinculo_opcional_ao_grupo_orc(): void
    {
        Permission::findOrCreate('patrimonio.ler', 'web');
        Permission::findOrCreate('patrimonio.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BEM1',
            'razao_social' => 'Empresa Patrimônio',
            'nome_fantasia' => 'Patrimônio',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        ParametroEmpresa::query()->create([
            'empresa_id' => $empresa->id,
            'chave' => 'valor_minimo_capitalizar_bem',
            'valor' => '1000',
            'status' => 'APROVADO',
            'versao' => 1,
        ]);

        $grupo = OrcCatalogoMaquina::query()->create([
            'nome' => 'BETA',
            'ativo' => true,
            'ordem' => 1,
        ]);

        $fornecedor = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-BEM1',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Fornecedor Máquinas',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-BEM1',
            'name' => 'Admin Patrimônio',
            'email' => 'patrimonio@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['patrimonio.ler', 'patrimonio.escrever']);
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        $create = $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/bens', [
                'descricao' => 'Impressora flexográfica demo',
                'categoria' => 'MAQUINA_GRAFICA',
                'marca' => 'Betaflex',
                'local' => 'Produção',
                'responsavel' => 'Produção',
                'valor_aquisicao' => 85000,
                'fornecedor_id' => $fornecedor->id,
                'orc_catalogo_maquina_id' => $grupo->id,
                'capitalizado' => true,
                'status' => 'ATIVO',
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'BEM-00001')
            ->assertJsonPath('data.categoria', 'MAQUINA_GRAFICA')
            ->assertJsonPath('data.grupo_hora_maquina.nome', 'BETA')
            ->assertJsonPath('data.capitalizacao.abaixo_do_minimo', false);

        $id = $create->json('data.id');

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/bens')
            ->assertOk()
            ->assertJsonPath('data.0.codigo', 'BEM-00001')
            ->assertJsonPath('meta.capitalizacao.valor_minimo', 1000);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->putJson("/api/v1/bens/{$id}", [
                'status' => 'EM_MANUTENCAO',
                'observacao' => 'Parada programada',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'EM_MANUTENCAO');

        // Abaixo do mínimo → aviso, sem bloquear.
        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/bens', [
                'descricao' => 'Cadeira ergonômica',
                'categoria' => 'MOVEL',
                'valor_aquisicao' => 450,
                'status' => 'ATIVO',
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'BEM-00002')
            ->assertJsonPath('data.capitalizacao.abaixo_do_minimo', true);

        // Grupo ORC só para máquina gráfica.
        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->postJson('/api/v1/bens', [
                'descricao' => 'Notebook inválido',
                'categoria' => 'INFORMATICA',
                'orc_catalogo_maquina_id' => $grupo->id,
            ])
            ->assertStatus(422);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->deleteJson("/api/v1/bens/{$id}")
            ->assertOk();

        $this->assertSoftDeleted('bens_patrimoniais', ['id' => $id]);
        $this->assertSame(
            BemPatrimonial::STATUS_BAIXADO,
            BemPatrimonial::withTrashed()->findOrFail($id)->status
        );

        // Catálogo ORC intacto.
        $this->assertDatabaseHas('orc_catalogo_maquinas', [
            'id' => $grupo->id,
            'nome' => 'BETA',
            'ativo' => 1,
        ]);
    }

    public function test_sem_permissao_retorna_403(): void
    {
        Permission::findOrCreate('patrimonio.ler', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BEM2',
            'razao_social' => 'Empresa Sem Permissão',
            'nome_fantasia' => 'Sem',
            'cnpj' => '44555666000199',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-BEM2',
            'name' => 'Sem Permissão',
            'email' => 'sem@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->empresas()->attach([$empresa->id]);

        Sanctum::actingAs($user);

        $this->withHeader('X-Empresa-Id', (string) $empresa->id)
            ->getJson('/api/v1/bens')
            ->assertForbidden();
    }
}
