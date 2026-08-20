<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Services\Comercial\PedidoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * BL-054 — genealogia OP → lote → NF/fornecedor (estudo 32 CONTROLE_ESTOQUE §6).
 */
class RastreioInsumosTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $operador;

    private Parceiro $fornecedor;

    private Parceiro $cliente;

    private Produto $mp;

    private Produto $emb;

    private ?int $ocId = null;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'compras.ler', 'compras.escrever',
            'estoque.ler', 'estoque.escrever',
            'financeiro.ler', 'financeiro.escrever',
            'producao.ler', 'producao.escrever',
            'orcamento.ler', 'orcamento.escrever',
            'produto.ler',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-RST1',
            'razao_social' => 'RLP Rastreio',
            'nome_fantasia' => 'RLP RST',
            'cnpj' => '55666777000123',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        NaturezaGerencial::query()->create([
            'codigo' => '5.06',
            'codigo_exibicao' => 'NAT-5.06',
            'grupo' => 5,
            'nivel' => 2,
            'nome' => 'Pagamento a fornecedor de estoque',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 506,
        ]);

        $this->fornecedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-FORN1',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'COLACRIL INDUSTRIA',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $this->cliente = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-CLI1',
            'razao_social' => 'CLIENTE RASTREIO',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'limite_credito' => '50000.00',
        ]);

        $this->mp = $this->criarProduto('MP-PAP-RST', 'MP', 'MP-PAP', true, true, 548);
        $this->emb = $this->criarProduto('EMB-TUB-RST', 'EMB', 'EMB-TUB', false, false);

        Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PA-ETQ-RST',
            'familia' => 'PA',
            'descricao_fiscal' => 'ETIQUETAS',
            'unidade_comercial' => 'MIL',
            'unidade_interna' => 'MIL',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '0',
        ]);

        $this->operador = User::query()->create([
            'codigo' => 'USR-RST1',
            'name' => 'Op Rastreio',
            'email' => 'rastreio@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->operador->givePermissionTo([
            'compras.ler', 'compras.escrever',
            'estoque.ler', 'estoque.escrever',
            'financeiro.ler', 'financeiro.escrever',
            'producao.ler', 'producao.escrever',
            'orcamento.ler', 'produto.ler',
        ]);
        $this->operador->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    public function test_op_rastreia_lote_nf_e_fornecedor(): void
    {
        Sanctum::actingAs($this->operador);
        $this->receberLote($this->mp, '50.0000', 'COL-24081', '9001', '2026-08-01', '2027-08-01');

        $opId = $this->abrirOpERequisitar($this->mp, '10.0000');

        $res = $this->h()->getJson("/api/v1/rastreio/ordens-producao/{$opId}")
            ->assertOk();

        $res->assertJsonPath('data.tipo', 'OP')
            ->assertJsonPath('data.resumo.pronto_para_fornecedor', true)
            ->assertJsonPath('data.insumos.0.produto.codigo', 'MP-PAP-RST')
            ->assertJsonPath('data.insumos.0.rastreavel_fornecedor', true)
            ->assertJsonPath('data.insumos.0.lotes.0.lote.codigo', 'COL-24081')
            ->assertJsonPath('data.insumos.0.lotes.0.origens.0.nf_numero', '9001')
            ->assertJsonPath('data.insumos.0.lotes.0.origens.0.fornecedor.razao_social', 'COLACRIL INDUSTRIA');

        $this->assertNotEmpty($res->json('data.insumos.0.lotes.0.origens.0.oc.codigo'));

        $this->h()->getJson("/api/v1/ordens-producao/{$opId}")
            ->assertOk()
            ->assertJsonPath('data.rastreio.resumo.notas', 1);
    }

    public function test_nf_posterior_do_mesmo_lote_nao_entra_na_op(): void
    {
        Sanctum::actingAs($this->operador);
        $this->receberLote($this->mp, '20.0000', 'COL-MESMO', '100', '2026-07-01', '2027-07-01');
        $opId = $this->abrirOpERequisitar($this->mp, '5.0000');

        $this->receberLote($this->mp, '20.0000', 'COL-MESMO', '200', '2026-08-13', '2027-08-13');

        $origens = $this->h()->getJson("/api/v1/rastreio/ordens-producao/{$opId}")
            ->assertOk()
            ->json('data.insumos.0.lotes.0.origens');

        $nfs = collect($origens)->pluck('nf_numero')->all();
        $this->assertContains('100', $nfs);
        $this->assertNotContains('200', $nfs);
    }

    public function test_lote_misto_lista_as_duas_notas_anteriores(): void
    {
        Sanctum::actingAs($this->operador);
        $this->receberLote($this->mp, '10.0000', 'COL-MIX', '111', '2026-06-01', '2027-06-01');
        $this->receberLote($this->mp, '10.0000', 'COL-MIX', '222', '2026-07-01', '2027-07-01');
        $opId = $this->abrirOpERequisitar($this->mp, '5.0000');

        $linha = $this->h()->getJson("/api/v1/rastreio/ordens-producao/{$opId}")
            ->assertOk()
            ->json('data.insumos.0.lotes.0');

        $this->assertTrue($linha['lote_misto']);
        $nfs = collect($linha['origens'])->pluck('nf_numero')->all();
        $this->assertContains('111', $nfs);
        $this->assertContains('222', $nfs);
    }

    public function test_emb_sem_lote_nao_inventa_fornecedor(): void
    {
        Sanctum::actingAs($this->operador);
        $ocItemId = $this->abrirOc($this->emb, '30.0000', '1.000000');
        $this->h()->postJson("/api/v1/ordens-compra/{$this->ocId}/receber", [
            'vencimento' => '2026-09-01',
            'nf_numero' => '777',
            'itens' => [
                ['ordem_compra_item_id' => $ocItemId, 'qtde_recebida' => '30.0000'],
            ],
        ])->assertCreated();

        $opId = $this->abrirOpERequisitar($this->emb, '4.0000');
        $ins = $this->h()->getJson("/api/v1/rastreio/ordens-producao/{$opId}")
            ->assertOk()
            ->json('data.insumos.0');

        $this->assertTrue($ins['sem_lote']);
        $this->assertFalse($ins['rastreavel_fornecedor']);
        $this->assertStringContainsString('não é unívoca', (string) $ins['observacao']);
    }

    public function test_busca_por_op_ped_lote_nf_e_cliente(): void
    {
        Sanctum::actingAs($this->operador);
        $this->receberLote($this->mp, '15.0000', 'LOT-BUSCA', '5555', '2026-08-01', '2027-08-01');
        $opId = $this->abrirOpERequisitar($this->mp, '3.0000');

        $op = \App\Models\OrdemProducao::query()->findOrFail($opId);
        $pedCodigo = $op->pedido->codigo;
        $loteId = (int) EstoqueLote::query()->where('codigo', 'LOT-BUSCA')->value('id');

        $this->h()->getJson('/api/v1/rastreio?q='.$op->codigo)
            ->assertOk()
            ->assertJsonPath('data.hits.0.tipo', 'OP');

        $this->h()->getJson('/api/v1/rastreio?q='.$pedCodigo)
            ->assertOk()
            ->assertJsonFragment(['tipo' => 'PED', 'codigo' => $pedCodigo]);

        $this->h()->getJson('/api/v1/rastreio?q=LOT-BUSCA')
            ->assertOk()
            ->assertJsonFragment(['tipo' => 'LOTE', 'codigo' => 'LOT-BUSCA']);

        $this->h()->getJson('/api/v1/rastreio?q=5555')
            ->assertOk()
            ->assertJsonFragment(['tipo' => 'NF']);

        $this->h()->getJson('/api/v1/rastreio?q=CLIENTE RASTREIO')
            ->assertOk()
            ->assertJsonFragment(['tipo' => 'PED']);

        $this->h()->getJson("/api/v1/rastreio/lotes/{$loteId}")
            ->assertOk()
            ->assertJsonPath('data.tipo', 'LOTE')
            ->assertJsonPath('data.lote.codigo', 'LOT-BUSCA')
            ->assertJsonPath('data.consumos.0.op.id', $opId);

        $this->h()->getJson("/api/v1/rastreio/pedidos/{$op->pedido_id}")
            ->assertOk()
            ->assertJsonPath('data.tipo', 'PED')
            ->assertJsonPath('data.resumo.pronto_para_fornecedor', true);
    }

    public function test_isolamento_emp_e_permissao(): void
    {
        Sanctum::actingAs($this->operador);
        $this->receberLote($this->mp, '8.0000', 'EMP1-L', '1', '2026-08-01', '2027-08-01');
        $opId = $this->abrirOpERequisitar($this->mp, '2.0000');

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-RST2',
            'razao_social' => 'Outra',
            'cnpj' => '66777888000134',
            'situacao' => 'ATIVA',
        ]);
        $this->operador->empresas()->attach($outra->id);

        $this->withHeaders(['X-Empresa-Id' => (string) $outra->id])
            ->getJson("/api/v1/rastreio/ordens-producao/{$opId}")
            ->assertNotFound();

        $semPerm = User::query()->create([
            'codigo' => 'USR-RSTX',
            'name' => 'Sem',
            'email' => 'sem.rastreio@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $semPerm->empresas()->attach($this->empresa->id, ['padrao' => true]);
        Sanctum::actingAs($semPerm);
        $this->h()->getJson("/api/v1/rastreio/ordens-producao/{$opId}")
            ->assertForbidden();
    }

    private function h(): self
    {
        return $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id]);
    }

    private function receberLote(
        Produto $produto,
        string $qtde,
        string $lote,
        string $nf,
        string $entrada,
        string $validade
    ): void {
        $ocItemId = $this->abrirOc($produto, $qtde, '8.000000');
        $this->h()->postJson("/api/v1/ordens-compra/{$this->ocId}/receber", [
            'vencimento' => '2026-09-01',
            'nf_numero' => $nf,
            'nf_data' => $entrada,
            'itens' => [[
                'ordem_compra_item_id' => $ocItemId,
                'qtde_recebida' => $qtde,
                'lote_codigo' => $lote,
                'lote_data_entrada' => $entrada,
                'lote_data_validade' => $validade,
            ]],
        ])->assertCreated();
    }

    private function abrirOpERequisitar(Produto $produto, string $qtde): int
    {
        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => (int) Orcamento::query()->where('empresa_id', $this->empresa->id)->max('numero') + 1,
            'codigo' => 'ORC-RST-'.uniqid(),
            'versao' => 1,
            'parceiro_id' => $this->cliente->id,
            'cliente_nome' => 'CLIENTE RASTREIO',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => 'LIBERADO',
            'input_snapshot' => ['medida' => '10x10', 'necessidade' => 'PRODUCAO'],
            'result_snapshot' => ['faixas' => [['quantidade' => 1000, 'valor_etiqueta' => 1, 'valor_total' => 1000]]],
            'aceite_faixa_index' => 0,
            'tolerancia_qtd_pct' => 20,
        ]);
        $ped = app(PedidoService::class)->garantirDeOrcamentoLiberado($orc->fresh());
        $this->assertInstanceOf(Pedido::class, $ped);
        $itemId = (int) $ped->itens()->first()->id;

        $op = $this->h()->postJson("/api/v1/pedidos/{$ped->id}/abrir-op", [
            'pedido_item_id' => $itemId,
        ])->assertCreated();
        $opId = (int) $op->json('data.id');

        $this->h()->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'produto_id' => $produto->id,
            'qtde' => $qtde,
        ])->assertOk();

        return $opId;
    }

    private function abrirOc(Produto $produto, string $qtde, string $valor): int
    {
        $res = $this->h()->postJson('/api/v1/ordens-compra', [
            'fornecedor_id' => $this->fornecedor->id,
            'itens' => [[
                'produto_id' => $produto->id,
                'qtde_pedida' => $qtde,
                'valor_unitario' => $valor,
            ]],
        ])->assertCreated();

        $this->ocId = (int) $res->json('data.id');

        return (int) $res->json('data.itens.0.id');
    }

    private function criarProduto(
        string $codigo,
        string $familia,
        string $grupo,
        bool $lote,
        bool $validade,
        ?int $prazo = null
    ): Produto {
        return Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => $codigo,
            'familia' => $familia,
            'grupo' => $grupo,
            'descricao_fiscal' => $codigo,
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
            'controla_lote' => $lote,
            'controla_validade' => $validade,
            'prazo_validade_dias' => $prazo,
        ]);
    }
}
