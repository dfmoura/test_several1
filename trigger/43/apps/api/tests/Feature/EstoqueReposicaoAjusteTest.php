<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueSaldo;
use App\Models\NaturezaGerencial;
use App\Models\OrdemCompra;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\Titulo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * BL-036 — reposição por mínimo + AJU SoD + regressão leve da espinha OC→receber→TIT.
 */
class EstoqueReposicaoAjusteTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $operador;

    private User $aprovador;

    private Parceiro $fornecedor;

    private Produto $produto;

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

        foreach ([...self::PERMS_OP, 'estoque.aprovar'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-REP1',
            'razao_social' => 'Empresa Reposicao',
            'nome_fantasia' => 'Reposicao',
            'cnpj' => '11222333000181',
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
            'codigo' => 'PAR-FOR2',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Fornecedor Insumos LTDA',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $this->produto = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-TUB-001',
            'familia' => 'EMB',
            'grupo' => 'EMB-TUB',
            'descricao_fiscal' => 'Tubete 76mm',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'estoque_minimo' => '100.0000',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
        ]);

        $this->operador = User::query()->create([
            'codigo' => 'USR-REP1',
            'name' => 'Operador Estoque',
            'email' => 'ops-estoque@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->operador->givePermissionTo(self::PERMS_OP);
        $this->operador->empresas()->attach([$this->empresa->id]);

        $this->aprovador = User::query()->create([
            'codigo' => 'USR-REP2',
            'name' => 'Aprovador Estoque',
            'email' => 'apr-estoque@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->aprovador->givePermissionTo(['estoque.ler', 'estoque.aprovar']);
        $this->aprovador->empresas()->attach([$this->empresa->id]);
    }

    public function test_reposicao_gera_oc_e_fluxo_receber_titulo(): void
    {
        Sanctum::actingAs($this->operador);
        $ano = (int) now()->year;
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $lista = $this->withHeaders($h)
            ->getJson('/api/v1/estoque/reposicao')
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $lista);
        $this->assertSame('100.0000', $lista[0]['faltante_comercial']);

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/reposicao/gerar-oc', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '100.0000',
                        'valor_unitario' => '2.500000',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.origem', OrdemCompra::ORIGEM_DIRETA)
            ->assertJsonPath('data.valor_total', '250.00');

        // Em trânsito cobre o mínimo → some da lista.
        $this->withHeaders($h)
            ->getJson('/api/v1/estoque/reposicao')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $ocId = $oc->json('data.id');
        $ocItemId = $oc->json('data.itens.0.id');

        $receber = $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'nf_numero' => '7788',
                'nf_data' => '2026-08-11',
                'vencimento' => '2026-09-11',
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '100.0000',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.tipo', EstoqueMovimento::TIPO_ENTRADA_COMPRA);

        $this->assertSame('5.06', $receber->json('data.titulo.natureza.codigo'));
        $this->assertSame(Titulo::STATUS_ABERTO, $receber->json('data.titulo.status'));

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->produto->id)
            ->firstOrFail();
        $this->assertSame('100.0000', (string) $saldo->qtde);
        $this->assertSame("OC-{$ano}-00001", $oc->json('data.codigo'));
    }

    public function test_ajuste_exige_sod_e_gera_mov(): void
    {
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'qtde' => '100.0000',
            'unidade' => 'UN',
            'custo_medio' => '2.500000',
        ]);

        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        $ano = (int) now()->year;

        $aju = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->produto->id,
                'motivo_codigo' => 'A01',
                'qtde_contada' => '95.0000',
                'checklist_confirmado' => true,
                'origem' => EstoqueAjuste::ORIGEM_CONTAGEM_AVULSA,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', EstoqueAjuste::STATUS_PENDENTE)
            ->assertJsonPath('data.qtde_diferenca', '-5.0000');

        $ajuId = $aju->json('data.id');

        // Operador não tem estoque.aprovar.
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar")
            ->assertForbidden();

        // Mesmo com permissão, solicitante não aprova (SoD).
        $this->operador->givePermissionTo('estoque.aprovar');
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar")
            ->assertStatus(422);

        Sanctum::actingAs($this->aprovador);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar")
            ->assertOk()
            ->assertJsonPath('data.ajuste.status', EstoqueAjuste::STATUS_APROVADO)
            ->assertJsonPath('data.movimento.tipo', EstoqueMovimento::TIPO_AJUSTE)
            ->assertJsonPath('data.movimento.codigo', "MOV-{$ano}-00001");

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->produto->id)
            ->firstOrFail();
        $this->assertSame('95.0000', (string) $saldo->qtde);
    }

    public function test_ajuste_pendente_pode_ser_cancelado_pelo_solicitante(): void
    {
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'qtde' => '100.0000',
            'unidade' => 'UN',
            'custo_medio' => '2.500000',
        ]);

        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $ajuId = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->produto->id,
                'motivo_codigo' => 'A01',
                'qtde_contada' => '98.0000',
                'checklist_confirmado' => true,
            ])
            ->assertCreated()
            ->json('data.id');

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/cancelar")
            ->assertOk()
            ->assertJsonPath('data.status', EstoqueAjuste::STATUS_CANCELADO);

        // Saldo intacto.
        $this->assertSame(
            '100.0000',
            (string) EstoqueSaldo::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('produto_id', $this->produto->id)
                ->value('qtde')
        );

        // Não cancela de novo.
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/cancelar")
            ->assertStatus(422);
    }
}
