<?php

namespace Tests\Feature;

use App\Models\Departamento;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Aceite automatizado §7.B de docs/MODELO_INSTALACAO_MULTI_EMPRESA.md:
 * vínculo, 403 sem acesso, troca de contexto, isolamento de listagens e CFIN por EMP.
 */
class MultiEmpresaAceiteTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empA;

    private Empresa $empB;

    private User $soA;

    private User $ambas;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('parceiro.ler', 'web');
        Permission::findOrCreate('empresas.gerir', 'web');
        Permission::findOrCreate('departamento.ler', 'web');
        Permission::findOrCreate('departamento.escrever', 'web');

        $this->empA = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP Operacional A',
            'nome_fantasia' => 'EMP A',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->empB = Empresa::query()->create([
            'codigo' => 'EMP-00002',
            'razao_social' => 'RLP Holding B',
            'nome_fantasia' => 'EMP B',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
            'venda_ativa' => false,
            'estoque_ativo' => false,
        ]);

        $this->soA = User::query()->create([
            'codigo' => 'USR-MEA1',
            'name' => 'Só EMP A',
            'email' => 'so.a@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empA->id,
        ]);
        $this->soA->givePermissionTo(['parceiro.ler', 'empresas.gerir', 'departamento.ler', 'departamento.escrever']);
        $this->soA->empresas()->attach($this->empA->id, ['padrao' => true]);

        $this->ambas = User::query()->create([
            'codigo' => 'USR-MEA2',
            'name' => 'Ambas EMPs',
            'email' => 'ambas@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empA->id,
        ]);
        $this->ambas->givePermissionTo(['parceiro.ler', 'empresas.gerir', 'departamento.ler', 'departamento.escrever']);
        $this->ambas->empresas()->attach([
            $this->empA->id => ['padrao' => true],
            $this->empB->id => ['padrao' => false],
        ]);
    }

    public function test_usuario_com_uma_emp_lista_somente_ela_e_usa_contexto_padrao(): void
    {
        Sanctum::actingAs($this->soA);

        // Sem header: middleware cai no default / pivot padrao.
        $me = $this->getJson('/api/v1/auth/me');
        $me->assertOk();
        $this->assertCount(1, $me->json('empresas'));
        $this->assertSame($this->empA->id, $me->json('empresas.0.id'));
        $this->assertSame($this->empA->id, $me->json('empresa_contexto.id'));
        $this->assertSame('EMP-00001', $me->json('empresa_contexto.codigo'));

        $list = $this->getJson('/api/v1/empresas');
        $list->assertOk();
        $this->assertCount(1, $list->json('data'));
        $this->assertSame('EMP-00001', $list->json('data.0.codigo'));
    }

    public function test_usuario_com_duas_emps_troca_contexto_pelo_header(): void
    {
        Sanctum::actingAs($this->ambas);

        $emA = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/auth/me');
        $emA->assertOk();
        $this->assertCount(2, $emA->json('empresas'));
        $this->assertSame($this->empA->id, $emA->json('empresa_contexto.id'));

        $emB = $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/auth/me');
        $emB->assertOk();
        $this->assertSame($this->empB->id, $emB->json('empresa_contexto.id'));
        $this->assertSame('EMP-00002', $emB->json('empresa_contexto.codigo'));

        $empBNoMe = collect($emB->json('empresas'))->firstWhere('id', $this->empB->id);
        $this->assertNotNull($empBNoMe);
        $this->assertFalse($empBNoMe['padrao']);

        // Flags de negócio da EMP-00002 permanecem no cadastro (não “somem” ao trocar contexto).
        $showB = $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/empresas/'.$this->empB->id);
        $showB->assertOk();
        $this->assertFalse($showB->json('data.venda_ativa'));
        $this->assertFalse($showB->json('data.estoque_ativo'));
    }

    public function test_sem_vinculo_header_de_outra_emp_retorna_403(): void
    {
        Sanctum::actingAs($this->soA);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/auth/me');

        $res->assertForbidden();
        $this->assertStringContainsString('Sem acesso à empresa', (string) $res->json('message'));
    }

    public function test_show_empresa_sem_vinculo_retorna_403_mesmo_com_contexto_valido(): void
    {
        Sanctum::actingAs($this->soA);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/empresas/'.$this->empB->id);

        $res->assertForbidden();
    }

    public function test_cadastro_em_emp_a_nao_aparece_na_listagem_de_emp_b(): void
    {
        Sanctum::actingAs($this->ambas);

        Parceiro::query()->create([
            'empresa_id' => $this->empA->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'Parceiro Só A',
            'situacao' => 'ATIVO',
        ]);
        Parceiro::query()->create([
            'empresa_id' => $this->empB->id,
            'codigo' => 'PAR-00002',
            'razao_social' => 'Parceiro Só B',
            'situacao' => 'ATIVO',
        ]);

        $listaA = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/parceiros');
        $listaA->assertOk();
        $razoesA = collect($listaA->json('data'))->pluck('razao_social')->all();
        $this->assertContains('Parceiro Só A', $razoesA);
        $this->assertNotContains('Parceiro Só B', $razoesA);

        $listaB = $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/parceiros');
        $listaB->assertOk();
        $razoesB = collect($listaB->json('data'))->pluck('razao_social')->all();
        $this->assertContains('Parceiro Só B', $razoesB);
        $this->assertNotContains('Parceiro Só A', $razoesB);
    }

    /**
     * Enumeração de URL (/parceiros/{id}): registro de outra EMP não vaza (404, não 403).
     * Mesmo com vínculo às duas EMPs, o contexto ativo delimita o livro.
     */
    public function test_show_e_update_parceiro_de_outra_emp_por_id_retorna_404(): void
    {
        Sanctum::actingAs($this->ambas);

        $parA = Parceiro::query()->create([
            'empresa_id' => $this->empA->id,
            'codigo' => 'PAR-IDORA',
            'razao_social' => 'Visível só em A',
            'situacao' => 'ATIVO',
        ]);
        $parB = Parceiro::query()->create([
            'empresa_id' => $this->empB->id,
            'codigo' => 'PAR-IDORB',
            'razao_social' => 'Segredo da EMP B',
            'situacao' => 'ATIVO',
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/parceiros/'.$parB->id)
            ->assertNotFound();

        $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->putJson('/api/v1/parceiros/'.$parB->id, ['razao_social' => 'Tentativa cruzada'])
            ->assertNotFound();

        $this->assertSame(
            'Segredo da EMP B',
            Parceiro::query()->findOrFail($parB->id)->razao_social
        );

        $ok = $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/parceiros/'.$parB->id);
        $ok->assertOk();
        $this->assertSame('Segredo da EMP B', $ok->json('data.razao_social'));
        $this->assertSame($this->empB->id, $ok->json('data.empresa_id'));

        $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/parceiros/'.$parA->id)
            ->assertOk()
            ->assertJsonPath('data.razao_social', 'Visível só em A');
    }

    public function test_usuario_de_uma_emp_nao_le_parceiro_alheio_por_enumeracao_de_id(): void
    {
        Sanctum::actingAs($this->soA);

        $parB = Parceiro::query()->create([
            'empresa_id' => $this->empB->id,
            'codigo' => 'PAR-IDORX',
            'razao_social' => 'Fora do vínculo',
            'situacao' => 'ATIVO',
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/parceiros/'.$parB->id)
            ->assertNotFound();

        $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/parceiros/'.$parB->id)
            ->assertForbidden();
    }

    public function test_contas_financeiras_sao_por_empresa(): void
    {
        Sanctum::actingAs($this->ambas);

        EmpresaContaFinanceira::query()->create([
            'empresa_id' => $this->empA->id,
            'codigo' => 'CFIN-00001',
            'tipo' => 'CAIXA',
            'descricao' => 'Caixa A',
            'ativa' => true,
        ]);
        EmpresaContaFinanceira::query()->create([
            'empresa_id' => $this->empB->id,
            'codigo' => 'CFIN-00002',
            'tipo' => 'CAIXA',
            'descricao' => 'Caixa B',
            'ativa' => true,
        ]);

        $showA = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/empresas/'.$this->empA->id);
        $showA->assertOk();
        $descA = collect($showA->json('data.contas_financeiras'))->pluck('descricao')->all();
        $this->assertContains('Caixa A', $descA);
        $this->assertNotContains('Caixa B', $descA);

        $showB = $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/empresas/'.$this->empB->id);
        $showB->assertOk();
        $descB = collect($showB->json('data.contas_financeiras'))->pluck('descricao')->all();
        $this->assertContains('Caixa B', $descB);
        $this->assertNotContains('Caixa A', $descB);
    }

    public function test_departamentos_sao_por_empresa(): void
    {
        Sanctum::actingAs($this->ambas);

        Departamento::query()->create([
            'empresa_id' => $this->empA->id,
            'codigo' => 'DEP-00001',
            'nome' => 'Comercial A',
            'ativo' => true,
        ]);
        Departamento::query()->create([
            'empresa_id' => $this->empB->id,
            'codigo' => 'DEP-00001',
            'nome' => 'Comercial B',
            'ativo' => true,
        ]);

        $listaA = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/departamentos');
        $listaA->assertOk();
        $nomesA = collect($listaA->json('data'))->pluck('nome')->all();
        $this->assertContains('Comercial A', $nomesA);
        $this->assertNotContains('Comercial B', $nomesA);

        $listaB = $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/departamentos');
        $listaB->assertOk();
        $nomesB = collect($listaB->json('data'))->pluck('nome')->all();
        $this->assertContains('Comercial B', $nomesB);
        $this->assertNotContains('Comercial A', $nomesB);
    }
}
