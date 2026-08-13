<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueInventario;
use App\Models\EstoqueInventarioItem;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueSaldo;
use App\Models\NaturezaGerencial;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * BL-042 — inventário cego → AJU + alçada + congelamento + extrato.
 */
class EstoqueInventarioAjusteTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmp;

    private User $contador1;

    private User $contador2;

    private User $aprovador;

    private User $gestor;

    private Produto $produto;

    private Parceiro $fornecedor;

    private NaturezaGerencial $nat506;

    /** @var list<string> */
    private const PERMS_OP = [
        'compras.ler',
        'compras.escrever',
        'estoque.ler',
        'estoque.escrever',
        'financeiro.ler',
        'financeiro.escrever',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([...self::PERMS_OP, 'estoque.aprovar', 'estoque.aprovar_gestor'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-INV1',
            'razao_social' => 'Empresa Inventario',
            'nome_fantasia' => 'Inventario',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->outraEmp = Empresa::query()->create([
            'codigo' => 'EMP-INV2',
            'razao_social' => 'Outra Empresa',
            'nome_fantasia' => 'Outra',
            'cnpj' => '22333444000192',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->nat506 = NaturezaGerencial::query()->create([
            'codigo' => '5.06',
            'codigo_exibicao' => 'NAT-5.06',
            'grupo' => 5,
            'nivel' => 2,
            'parent_id' => null,
            'nome' => 'Pagamento a fornecedor de estoque',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 506,
        ]);

        $this->fornecedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-INV1',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Fornecedor INV',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $this->produto = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-INV-001',
            'familia' => 'EMB',
            'grupo' => 'EMB-TUB',
            'descricao_fiscal' => 'Tubete inventário',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'estoque_minimo' => '10.0000',
            'custo_medio' => '10.000000',
            'situacao' => 'ATIVO',
        ]);

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'qtde' => '100.0000',
            'unidade' => 'UN',
            'custo_medio' => '10.000000',
        ]);

        $this->contador1 = $this->makeUser('USR-C1', 'c1@test.local', self::PERMS_OP);
        $this->contador2 = $this->makeUser('USR-C2', 'c2@test.local', self::PERMS_OP);
        $this->aprovador = $this->makeUser('USR-AP', 'ap@test.local', ['estoque.ler', 'estoque.aprovar']);
        $this->gestor = $this->makeUser('USR-GE', 'ge@test.local', [
            'estoque.ler',
            'estoque.aprovar',
            'estoque.aprovar_gestor',
        ]);
    }

    /**
     * @param  list<string>  $perms
     */
    private function makeUser(string $codigo, string $email, array $perms): User
    {
        $user = User::query()->create([
            'codigo' => $codigo,
            'name' => $codigo,
            'email' => $email,
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $user->givePermissionTo($perms);
        $user->empresas()->attach([$this->empresa->id, $this->outraEmp->id]);

        return $user;
    }

    private function headers(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    public function test_inventario_cego_recontagem_gera_aju_e_extrato(): void
    {
        Sanctum::actingAs($this->contador1);
        $h = $this->headers();
        $ano = (int) now()->year;

        $inv = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/inventarios', [
                'tipo' => EstoqueInventario::TIPO_ROTATIVO,
                'produto_ids' => [$this->produto->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', "INV-{$ano}-00001")
            ->assertJsonPath('data.status', EstoqueInventario::STATUS_ABERTO);

        $invId = $inv->json('data.id');
        $itemId = $inv->json('data.itens.0.id');

        // Contagem cega: item pendente sem saldo do sistema.
        $showCego = $this->withHeaders($h)
            ->getJson("/api/v1/estoque/inventarios/{$invId}")
            ->assertOk();
        $this->assertArrayNotHasKey('qtde_sistema_corte', $showCego->json('data.itens.0'));

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/itens/{$itemId}/contar-1", [
                'qtde' => '95.0000',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', EstoqueInventarioItem::STATUS_DIVERGENTE);

        // Mesma pessoa não reconta.
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/itens/{$itemId}/contar-2", [
                'qtde' => '95.0000',
            ])
            ->assertStatus(422);

        Sanctum::actingAs($this->contador2);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/itens/{$itemId}/contar-2", [
                'qtde' => '95.0000',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', EstoqueInventarioItem::STATUS_RECONTADO);

        $aju = $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/itens/{$itemId}/gerar-ajuste", [
                'checklist_confirmado' => true,
                'motivo_codigo' => 'A01',
            ])
            ->assertCreated()
            ->assertJsonPath('data.ajuste.origem', EstoqueAjuste::ORIGEM_INV_ROTATIVO)
            ->assertJsonPath('data.ajuste.qtde_diferenca', '-5.0000')
            ->assertJsonPath('data.ajuste.valor_ajuste', '50.00')
            ->assertJsonPath('data.ajuste.alcada', EstoqueAjuste::ALCADA_LIDER);

        $ajuId = $aju->json('data.ajuste.id');

        // Contador não aprova (SoD — contou o item).
        $this->contador2->givePermissionTo('estoque.aprovar');
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar")
            ->assertStatus(422);

        Sanctum::actingAs($this->aprovador);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar")
            ->assertOk()
            ->assertJsonPath('data.ajuste.status', EstoqueAjuste::STATUS_APROVADO)
            ->assertJsonPath('data.movimento.tipo', EstoqueMovimento::TIPO_AJUSTE);

        $this->assertSame(
            '95.0000',
            (string) EstoqueSaldo::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('produto_id', $this->produto->id)
                ->value('qtde')
        );

        Sanctum::actingAs($this->contador1);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/encerrar")
            ->assertOk()
            ->assertJsonPath('data.status', EstoqueInventario::STATUS_ENCERRADO)
            ->assertJsonPath('data.acuracidade_pct', '0.0000');

        $extrato = $this->withHeaders($h)
            ->getJson("/api/v1/estoque/produtos/{$this->produto->id}/extrato")
            ->assertOk()
            ->json('data');

        $this->assertSame('95.0000', $extrato['saldo']['qtde']);
        $this->assertGreaterThanOrEqual(1, $extrato['movimentos_count']);
    }

    public function test_congelamento_bloqueia_aju_avulso_e_receber(): void
    {
        Sanctum::actingAs($this->contador1);
        $h = $this->headers();

        $inv = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/inventarios', [
                'tipo' => 'ROTATIVO',
                'produto_ids' => [$this->produto->id],
            ])
            ->assertCreated();

        $invId = $inv->json('data.id');
        $itemId = $inv->json('data.itens.0.id');

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/itens/{$itemId}/contar-1", [
                'qtde' => '90.0000',
            ])
            ->assertOk();

        $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->produto->id,
                'motivo_codigo' => 'A01',
                'qtde_contada' => '99.0000',
                'checklist_confirmado' => true,
            ])
            ->assertStatus(422);

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '10.0000',
                        'valor_unitario' => '1.000000',
                    ],
                ],
            ])
            ->assertCreated();

        $ocId = $oc->json('data.id');
        $ocItemId = $oc->json('data.itens.0.id');

        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'nf_numero' => '999',
                'nf_data' => '2026-08-12',
                'vencimento' => '2026-09-12',
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '10.0000',
                    ],
                ],
            ])
            ->assertStatus(422);
    }

    public function test_alcada_gestor_bloqueia_aprovador_lider(): void
    {
        // Δ 100 × CM 10 = R$ 1.000 → alçada GESTOR (> 500).
        EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->produto->id)
            ->update(['qtde' => '200.0000', 'custo_medio' => '10.000000']);

        Sanctum::actingAs($this->contador1);
        $h = $this->headers();

        $aju = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->produto->id,
                'motivo_codigo' => 'A01',
                'qtde_contada' => '100.0000',
                'checklist_confirmado' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.alcada', EstoqueAjuste::ALCADA_GESTOR)
            ->assertJsonPath('data.valor_ajuste', '1000.00')
            ->assertJsonPath('data.divergencia_relevante', true);

        $ajuId = $aju->json('data.id');

        Sanctum::actingAs($this->aprovador);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar", [
                'causa_raiz' => 'Erro de apontamento de sobra',
            ])
            ->assertStatus(422);

        Sanctum::actingAs($this->gestor);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar", [
                'causa_raiz' => 'Erro de apontamento de sobra',
            ])
            ->assertOk()
            ->assertJsonPath('data.ajuste.status', EstoqueAjuste::STATUS_APROVADO);
    }

    public function test_multi_empresa_inventario_isolado(): void
    {
        Sanctum::actingAs($this->contador1);
        $h = $this->headers();

        $inv = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/inventarios', [
                'tipo' => 'ROTATIVO',
                'produto_ids' => [$this->produto->id],
            ])
            ->assertCreated();

        $invId = $inv->json('data.id');

        $this->withHeaders(['X-Empresa-Id' => (string) $this->outraEmp->id])
            ->getJson("/api/v1/estoque/inventarios/{$invId}")
            ->assertNotFound();
    }

    public function test_contagem_igual_encerra_item_sem_aju(): void
    {
        Sanctum::actingAs($this->contador1);
        $h = $this->headers();

        $inv = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/inventarios', [
                'tipo' => 'ROTATIVO',
                'produto_ids' => [$this->produto->id],
            ])
            ->assertCreated();

        $invId = $inv->json('data.id');
        $itemId = $inv->json('data.itens.0.id');

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/itens/{$itemId}/contar-1", [
                'qtde' => '100.0000',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', EstoqueInventarioItem::STATUS_OK);

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/encerrar")
            ->assertOk()
            ->assertJsonPath('data.acuracidade_pct', '100.0000');
    }
}
