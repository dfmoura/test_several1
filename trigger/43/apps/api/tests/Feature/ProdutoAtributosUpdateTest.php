<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
use App\Models\User;
use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Regressão: update do formulário não apaga programa_compra / camada_cadastro.
 */
class ProdutoAtributosUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_update_parcial_do_form_preserva_metadados_e_atualiza_programa(): void
    {
        Permission::findOrCreate('produto.ler', 'web');
        Permission::findOrCreate('produto.escrever', 'web');
        app(ProdutoGrupoService::class)->seedCatalog();

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-ATTR',
            'razao_social' => 'Empresa Attr',
            'nome_fantasia' => 'Attr',
            'cnpj' => '00000000000613',
            'situacao' => 'ATIVA',
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-ATTR',
            'name' => 'Escritor',
            'email' => 'attr@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['produto.ler', 'produto.escrever']);
        $user->empresas()->attach($empresa->id);

        $grupoId = ProdutoGrupo::query()->where('codigo', 'MP-PAP')->value('id');

        $produto = Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'MP-PAP-013',
            'familia' => 'MP',
            'grupo_id' => $grupoId,
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1000',
            'descricao_comercial' => 'ECOPRINT / S2045N / SCK 60',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'ncm' => '48114190',
            'tipo_item_sped' => '01',
            'situacao' => 'ATIVO',
            'atributos' => [
                'camada_cadastro' => 'A',
                'programa_compra' => 'EXACT 1000',
                'grupo_estoque' => '11',
            ],
        ]);

        Sanctum::actingAs($user);

        $this->withHeaders(['X-Empresa-Id' => (string) $empresa->id])
            ->putJson('/api/v1/produtos/'.$produto->id, [
                'descricao_comercial' => 'ECOPRINT / S2045N / SCK 60',
                'descricao_fiscal' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1000',
                'unidade_comercial' => 'M2',
                'unidade_interna' => 'M2',
                'atributos' => [
                    'programa_compra' => 'EXACT 1000',
                    'grupo_estoque' => '11',
                    'gramatura_g_m2' => '160',
                ],
            ])
            ->assertOk();

        $produto->refresh();
        $this->assertSame('A', $produto->atributos['camada_cadastro'] ?? null);
        $this->assertSame('EXACT 1000', $produto->atributos['programa_compra'] ?? null);
        $this->assertSame('11', $produto->atributos['grupo_estoque'] ?? null);
        $this->assertEquals(160, (float) ($produto->atributos['gramatura_g_m2'] ?? 0));
    }
}
