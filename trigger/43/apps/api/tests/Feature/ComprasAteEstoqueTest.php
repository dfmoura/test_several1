<?php

namespace Tests\Feature;

use App\Models\CompraNecessidade;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
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

class ComprasAteEstoqueTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private Parceiro $fornecedor;

    private Produto $produto;

    private NaturezaGerencial $nat506;

    private NaturezaGerencial $nat201;

    private EmpresaContaFinanceira $cfin;

    /** @var list<string> */
    private const PERMS = [
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

        foreach (self::PERMS as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-CPR1',
            'razao_social' => 'Empresa Compras',
            'nome_fantasia' => 'Compras',
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
            'nome' => 'Pagamento a fornecedor de estoque (MP/EMB/REV)',
            'descricao' => 'TIT de compra que entra estoque',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 506,
        ]);

        $this->nat201 = NaturezaGerencial::query()->create([
            'codigo' => '2.01',
            'codigo_exibicao' => 'NAT-2.01',
            'grupo' => 2,
            'nivel' => 2,
            'parent_id' => null,
            'nome' => 'Material consumido',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 201,
        ]);

        $this->fornecedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-FOR1',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Fornecedor Bobinas LTDA',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $this->produto = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-PAP-001',
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'Bobina kraft 80g',
            'unidade_comercial' => 'KG',
            'unidade_interna' => 'KG',
            'fator_conversao' => '1',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
        ]);

        $this->cfin = EmpresaContaFinanceira::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'CFIN-00001',
            'tipo' => EmpresaContaFinanceira::TIPO_BANCO,
            'descricao' => 'Conta principal',
            'banco_codigo' => '756',
            'banco_nome' => 'Sicoob',
            'principal' => true,
            'ativa' => true,
            'ordem' => 0,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-CPR1',
            'name' => 'Operador Compras',
            'email' => 'compras@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(self::PERMS);
        $this->user->empresas()->attach([$this->empresa->id]);
    }

    public function test_fluxo_cotacao_receber_e_baixar(): void
    {
        Sanctum::actingAs($this->user);
        $ano = (int) now()->year;
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $nec = $this->withHeaders($h)
            ->postJson('/api/v1/compra-necessidades', [
                'produto_id' => $this->produto->id,
                'qtde' => '100.0000',
                'unidade' => 'KG',
                'motivo' => 'Falta estoque',
                'prioridade' => 'NORMAL',
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', "NEC-{$ano}-00001")
            ->assertJsonPath('data.status', CompraNecessidade::STATUS_ABERTA);

        $necId = $nec->json('data.id');

        $cot = $this->withHeaders($h)
            ->postJson('/api/v1/cotacoes', [
                'necessidade_id' => $necId,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde' => '100.0000',
                        'unidade' => 'KG',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', "COT-{$ano}-00001");

        $cotId = $cot->json('data.id');
        $itemId = $cot->json('data.itens.0.id');

        $prop = $this->withHeaders($h)
            ->postJson("/api/v1/cotacoes/{$cotId}/propostas", [
                'cotacao_item_id' => $itemId,
                'fornecedor_id' => $this->fornecedor->id,
                'valor_unitario' => '12.500000',
                'prazo_dias' => 7,
            ])
            ->assertCreated();

        $propostaId = $prop->json('data.propostas.0.id');

        $decidir = $this->withHeaders($h)
            ->postJson("/api/v1/cotacoes/{$cotId}/decidir", [
                'proposta_ids' => [$propostaId],
            ])
            ->assertOk();

        $this->assertSame("OC-{$ano}-00001", $decidir->json('data.ordem_compra.codigo'));
        $this->assertSame(OrdemCompra::ORIGEM_COTACAO, $decidir->json('data.ordem_compra.origem'));
        $this->assertSame('1250.00', $decidir->json('data.ordem_compra.valor_total'));
        $this->assertSame(
            CompraNecessidade::STATUS_ATENDIDA,
            CompraNecessidade::query()->findOrFail($necId)->status
        );

        $ocId = $decidir->json('data.ordem_compra.id');
        $ocItemId = $decidir->json('data.ordem_compra.itens.0.id');

        $receber = $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'nf_numero' => '12345',
                'nf_data' => '2026-08-10',
                'vencimento' => '2026-09-10',
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '100.0000',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', "MOV-{$ano}-00001")
            ->assertJsonPath('data.tipo', EstoqueMovimento::TIPO_ENTRADA_COMPRA);

        $this->assertSame("TIT-{$ano}-00001", $receber->json('data.titulo.codigo'));
        $this->assertSame('1250.00', $receber->json('data.titulo.valor'));
        $this->assertSame('1250.00', $receber->json('data.titulo.saldo'));
        $this->assertSame(Titulo::STATUS_ABERTO, $receber->json('data.titulo.status'));
        $this->assertSame($this->nat506->id, $receber->json('data.titulo.natureza_id'));
        $this->assertSame('5.06', $receber->json('data.titulo.natureza.codigo'));

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->produto->id)
            ->firstOrFail();
        $this->assertSame('100.0000', (string) $saldo->qtde);
        $this->assertSame('12.500000', (string) $saldo->custo_medio);

        $this->produto->refresh();
        $this->assertSame('12.500000', (string) $this->produto->custo_medio);

        $this->assertSame(
            OrdemCompra::STATUS_RECEBIDA,
            OrdemCompra::query()->findOrFail($ocId)->status
        );

        $tituloId = $receber->json('data.titulo.id');

        $this->withHeaders($h)
            ->postJson("/api/v1/titulos/{$tituloId}/baixar", [
                'conta_financeira_id' => $this->cfin->id,
                'valor' => '1250.00',
                'pago_em' => '2026-08-15',
                'forma' => 'PIX',
            ])
            ->assertCreated()
            ->assertJsonPath('data.titulo.status', Titulo::STATUS_QUITADO)
            ->assertJsonPath('data.titulo.saldo', '0.00')
            ->assertJsonPath('data.baixa.codigo', "BX-{$ano}-00001");
    }

    public function test_ordem_compra_direta_e_rejeita_natureza_2_01(): void
    {
        Sanctum::actingAs($this->user);
        $ano = (int) now()->year;
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '50.0000',
                        'valor_unitario' => '10.000000',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', "OC-{$ano}-00001")
            ->assertJsonPath('data.origem', OrdemCompra::ORIGEM_DIRETA)
            ->assertJsonPath('data.valor_total', '500.00');

        $ocId = $oc->json('data.id');
        $ocItemId = $oc->json('data.itens.0.id');

        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'natureza_id' => $this->nat201->id,
                'vencimento' => '2026-09-01',
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '50.0000',
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['natureza_id']);

        $natInativa = NaturezaGerencial::query()->create([
            'codigo' => '5.99',
            'codigo_exibicao' => 'NAT-5.99',
            'grupo' => 5,
            'nivel' => 2,
            'nome' => 'Inativa teste',
            'aceita_lancamento' => true,
            'ativo' => false,
            'ordenacao' => 599,
        ]);

        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'natureza_id' => $natInativa->id,
                'vencimento' => '2026-09-01',
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '50.0000',
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['natureza_id']);

        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'vencimento' => '2026-09-01',
                'nf_chave' => '',
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '50.0000',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.nf_chave', null)
            ->assertJsonPath('data.titulo.natureza.codigo', '5.06');
    }

    public function test_sem_permissao_retorna_403(): void
    {
        $user = User::query()->create([
            'codigo' => 'USR-CPR2',
            'name' => 'Sem Permissão',
            'email' => 'sem-compras@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $user->empresas()->attach([$this->empresa->id]);

        Sanctum::actingAs($user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)->getJson('/api/v1/compra-necessidades')->assertForbidden();
        $this->withHeaders($h)->getJson('/api/v1/ordens-compra')->assertForbidden();
        $this->withHeaders($h)->getJson('/api/v1/estoque/saldos')->assertForbidden();
        $this->withHeaders($h)->getJson('/api/v1/titulos')->assertForbidden();
    }
}
