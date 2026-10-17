<?php

namespace Tests\Feature;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\EstoqueSaldo;
use App\Models\FaturamentoItem;
use App\Models\FiscalHub;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\OrdemProducao;
use App\Models\OrdemProducaoMaterial;
use App\Models\PaEmbalagem;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Models\User;
use App\Services\Estoque\EstoqueSaidaVendaService;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Financeiro\AdiantamentoService;
use App\Services\Fiscal\FiscalHubCrypto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * BL-066 — SAIDA_VENDA só na NF-e Focus autorizada.
 */
class SaidaVendaNfAutorizadaTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    private Parceiro $parceiro;

    private Produto $pa;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'faturamento.ler',
            'faturamento.escrever',
            'financeiro.ler',
            'fiscal.hubs.gerir',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        app(NaturezaGerencialService::class)->seedCatalog();
        $this->assertNotNull(NaturezaGerencial::query()->where('codigo', '1.01.01')->first());

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-SVD1',
            'razao_social' => 'RLP ETIQUETAS AUTO ADESIVOS LTDA',
            'nome_fantasia' => 'RLP',
            'cnpj' => '01423183000110',
            'ie' => '7023251210034',
            'ie_status' => 'OK',
            'regime' => 'SIMPLES_NACIONAL',
            'crt' => 1,
            'cnae' => '1813099',
            'logradouro' => 'AVENIDA MARCOS DE FREITAS COSTA',
            'numero' => '385',
            'bairro' => 'Daniel Fonseca',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400328',
            'ibge' => '3170206',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'im_obrigatoria_nfse' => false,
        ]);

        EmpresaContaFinanceira::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'CFIN-00001',
            'tipo' => EmpresaContaFinanceira::TIPO_BANCO,
            'descricao' => 'Conta PIX',
            'banco_codigo' => '077',
            'principal' => true,
            'ativa' => true,
            'ordem' => 0,
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-SVD01',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '00000000000191',
            'razao_social' => 'CLIENTE NF',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'emite_documento_fiscal' => true,
            'finalidade' => 'USO_CONSUMO',
            'consumidor_final' => true,
            'ind_ie_dest' => 9,
            'email_xml' => 'xml@cliente.test',
            'logradouro' => 'Rua Cliente',
            'numero' => '10',
            'bairro' => 'Centro',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400000',
            'ibge' => '3170206',
            'limite_credito' => '10000.00',
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
        ]);

        $this->pa = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PA-ETQ-001',
            'familia' => 'PA',
            'descricao_fiscal' => 'ETIQUETAS BOPP',
            'unidade_comercial' => 'MIL',
            'unidade_interna' => 'MIL',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '0.120000',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-SVD1',
            'name' => 'Comercial',
            'email' => 'svd.fat@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['faturamento.ler', 'faturamento.escrever', 'financeiro.ler']);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);
        Sanctum::actingAs($this->comercial);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function criarPedidoProduzido(array $overrides = []): Pedido
    {
        $n = ++$this->seq;
        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => $n + 900,
            'codigo' => 'ORC-2026-S'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'versao' => 1,
            'parceiro_id' => $this->parceiro->id,
            'cliente_nome' => 'CLIENTE NF',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'faixa_index' => 0,
            'input_snapshot' => [
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
            ],
            'result_snapshot' => ['faixas' => [[
                'quantidade' => 10000,
                'valor_etiqueta' => '3500.00',
                'valor_matriz' => $overrides['valor_matriz'] ?? '0',
                'valor_total' => '3500.00',
            ]]],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        $pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PED-2026-S'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'orcamento_id' => $orc->id,
            'parceiro_id' => $this->parceiro->id,
            'status' => Pedido::STATUS_PRODUZIDO,
            'faixa_index' => 0,
            'tolerancia_qtd_pct' => '20',
            'prazo_entrega_dias' => 10,
            'snapshot' => [
                'input' => [
                    'condicao_pagamento' => '28 DDL',
                    'forma_pagamento' => 'PIX',
                ],
                'faixa' => [
                    'quantidade' => 10000,
                    'valor_etiqueta' => '3500.00',
                    'valor_matriz' => $overrides['valor_matriz'] ?? '0',
                    'valor_total' => '3500.00',
                    'valor_faca_nova' => $overrides['valor_faca_nova'] ?? '0',
                    'faca_nova' => (bool) ($overrides['faca_nova'] ?? false),
                ],
            ],
        ]);

        PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $pedido->id,
            'ordem' => 1,
            'necessidade' => $overrides['necessidade'] ?? PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => $overrides['familia_fiscal'] ?? 'PA-ETQ',
            'descricao' => $overrides['descricao'] ?? 'Etiqueta teste',
            'qtde_pedida' => '10000.0000',
            'qtde_produzida' => '10000.0000',
            'qtde_faturavel' => '10000.0000',
            'unidade' => 'MIL',
            'preco_unitario' => '0.350000',
            'valor_total' => '3500.00',
            'status' => PedidoItem::STATUS_PRODUZIDO,
            'produto_pa_id' => $overrides['sem_sku'] ?? false ? null : $this->pa->id,
        ]);

        return $pedido->fresh(['itens', 'parceiro', 'orcamento']) ?? $pedido;
    }

    private function creditarPa(string $qtde = '10000.0000'): void
    {
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->pa->id,
            'qtde' => $qtde,
            'unidade' => 'MIL',
            'custo_medio' => '0.120000',
        ]);
    }

    private function habilitarSefazFake(): void
    {
        config([
            'erp.nfe.driver' => 'fake',
            'erp.stage' => 'homolog',
            'erp.fiscal_emissor' => 'sefaz',
        ]);
    }

    private function habilitarHub(): void
    {
        $this->habilitarSefazFake();
    }

    private function fakeFocusAutorizado(): void
    {
        $this->habilitarSefazFake();
    }

    /**
     * @return array<string, string>
     */
    private function h(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    public function test_focus_autoriza_baixa_pa_na_qtde_faturada(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();

        $ped = $this->criarPedidoProduzido();
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('AUTORIZADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertSame('SEFAZ', $ok->json('data.documentos_fiscais.0.autorizacao_origem'));
        $this->assertNotNull($ok->json('data.documentos_fiscais.0.saida_estoque'));
        $this->assertSame('SAIDA_VENDA', $ok->json('data.documentos_fiscais.0.saida_estoque.tipo'));
        $this->assertSame('10000.0000', $ok->json('data.documentos_fiscais.0.saida_estoque.itens.0.qtde'));

        $this->assertSame(1, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
        $saldo = EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde');
        $this->assertSame('0.0000', (string) $saldo);
    }

    public function test_stub_e_previa_nao_baixam(): void
    {
        $this->creditarPa();
        $ped = $this->criarPedidoProduzido();
        $previa = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $previa->assertCreated();
        $this->assertSame('PLANEJADO', $previa->json('data.documentos_fiscais.0.status'));
        $this->assertSame(0, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());

        config(['erp.fiscal_emissor' => 'stub', 'erp.stage' => 'local']);
        $ped2 = $this->criarPedidoProduzido();
        $stub = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped2->id}/faturar");
        $stub->assertCreated();
        $this->assertSame('STUB', $stub->json('data.documentos_fiscais.0.autorizacao_origem'));
        $this->assertNull($stub->json('data.documentos_fiscais.0.saida_estoque'));
        $this->assertSame(0, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
        $this->assertSame('10000.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
    }

    public function test_nfse_nao_baixa(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();
        $ped = $this->criarPedidoProduzido([
            'necessidade' => PedidoItem::NEC_SERVICO,
            'familia_fiscal' => 'SVC',
            'descricao' => 'Serviço de impressão',
            'sem_sku' => true,
        ]);
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('NFSE', $ok->json('data.documentos_fiscais.0.tipo'));
        $this->assertSame('PLANEJADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertSame(0, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
    }

    public function test_retry_e_consultar_nao_duplicam_mov(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();

        $ped = $this->criarPedidoProduzido();
        $a = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $a->assertCreated();
        $this->assertSame(1, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
        $fatId = $a->json('data.id');

        $b = $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fatId}/emitir-nf");
        $b->assertOk();
        $this->assertSame(1, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());

        $c = $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fatId}/consultar-nf");
        $c->assertOk();
        $this->assertSame(1, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
        $this->assertSame('0.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
    }

    public function test_promocao_stub_baixa_so_no_focus(): void
    {
        $this->creditarPa();
        config(['erp.fiscal_emissor' => 'stub', 'erp.stage' => 'local']);
        $ped = $this->criarPedidoProduzido();
        $a = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $a->assertCreated();
        $this->assertSame(0, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());

        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $fatId = $a->json('data.id');
        $b = $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fatId}/emitir-nf");
        $b->assertOk();
        $this->assertSame('SEFAZ', $b->json('data.documentos_fiscais.0.autorizacao_origem'));
        $this->assertSame(1, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
        $this->assertSame('0.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
    }

    public function test_matriz_e_faca_nao_somam_quantidade(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa('10000.0000');
        $ped = $this->criarPedidoProduzido([
            'valor_matriz' => '150.00',
            'faca_nova' => true,
            'valor_faca_nova' => '80.00',
        ]);
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertGreaterThan(1, FaturamentoItem::query()->count());
        $this->assertSame('10000.0000', $ok->json('data.documentos_fiscais.0.saida_estoque.itens.0.qtde'));
        $this->assertSame('0.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
    }

    public function test_sem_sku_autoriza_sem_mov(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();
        $ped = $this->criarPedidoProduzido(['sem_sku' => true]);
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('AUTORIZADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertNull($ok->json('data.documentos_fiscais.0.saida_estoque'));
        $this->assertSame(0, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
        $this->assertSame('10000.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
    }

    public function test_saldo_insuficiente_bloqueia_emissao_nao_o_fat(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa('1.0000');
        $ped = $this->criarPedidoProduzido();
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('CONFIRMADO', $ok->json('data.status'));
        $this->assertSame('PLANEJADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertStringContainsString('Estoque insuficiente', (string) $ok->json('data.documentos_fiscais.0.mensagem'));
        $this->assertSame(0, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
        $this->assertSame('1.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
        Http::assertNothingSent();
    }

    public function test_preview_avisa_sem_sku_e_pendencia_sem_saldo(): void
    {
        $this->habilitarHub();
        $this->creditarPa('1.0000');
        $semSku = $this->criarPedidoProduzido(['sem_sku' => true]);
        $prev1 = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$semSku->id}/faturamento-preview");
        $prev1->assertOk();
        $this->assertTrue($prev1->json('data.apto'));
        $this->assertContains(
            'Produto acabado/revenda sem SKU no pedido — a NF-e não baixará estoque.',
            $prev1->json('data.fiscal.avisos')
        );

        $comSku = $this->criarPedidoProduzido();
        $prev2 = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$comSku->id}/faturamento-preview");
        $prev2->assertOk();
        $this->assertFalse($prev2->json('data.fiscal.apto_emissao'));
        $this->assertNotEmpty(array_filter(
            $prev2->json('data.fiscal.pendencias'),
            fn ($m) => is_string($m) && str_contains($m, 'Estoque insuficiente')
        ));
    }

    public function test_nf_oficial_baixa_a_caixa_escolhida_pelo_custo_medio(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();
        $ped = $this->criarPedidoProduzido();
        $caixa = $this->escolherCaixa($ped, 3, '10.0000', '2.500000');

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('3500.00', $ok->json('data.valor_a_cobrar'));
        $this->assertSame('0.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
        $this->assertSame('7.0000', (string) EstoqueSaldo::query()->where('produto_id', $caixa->id)->value('qtde'));

        $item = EstoqueMovimentoItem::query()->where('produto_id', $caixa->id)->first();
        $this->assertNotNull($item);
        $this->assertSame('3.0000', (string) $item->qtde);
        $this->assertSame('2.500000', (string) $item->valor_unitario);
        $this->assertSame('7.50', (string) $item->valor_total);

        $doc = DocumentoFiscalSaida::query()->where('empresa_id', $this->empresa->id)->firstOrFail();
        app(EstoqueSaidaVendaService::class)->estornaSeHouver($this->empresa, $doc);
        $this->assertSame('10.0000', (string) EstoqueSaldo::query()->where('produto_id', $caixa->id)->value('qtde'));
        $this->assertSame('10000.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
        $this->assertSame(1, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_ESTORNO_SAIDA_VENDA)->count());
    }

    public function test_caixa_ja_baixada_na_op_nao_sai_de_novo_na_nota(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();
        $ped = $this->criarPedidoProduzido();
        $caixa = $this->escolherCaixa($ped, 3, '10.0000', '2.500000');
        $this->marcarCaixaJaSaidaNaOp($ped, $caixa, '3.0000');

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('AUTORIZADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertSame('10.0000', (string) EstoqueSaldo::query()->where('produto_id', $caixa->id)->value('qtde'));
        $this->assertSame(0, EstoqueMovimentoItem::query()->where('produto_id', $caixa->id)->count());
        $this->assertSame('0.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
    }

    public function test_caixa_ja_baixada_em_outro_sku_nao_sai_de_novo(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();
        $ped = $this->criarPedidoProduzido();
        $escolhida = $this->escolherCaixa($ped, 3, '10.0000', '2.500000');
        $antiga = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-CX-ANT',
            'familia' => 'EMB',
            'descricao_fiscal' => 'CAIXA ANTIGA',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'preco_tabela' => '9.000000',
            'custo_medio' => '1.000000',
        ]);
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $antiga->id,
            'qtde' => '4.0000',
            'unidade' => 'UN',
            'custo_medio' => '1.000000',
        ]);
        $this->marcarCaixaJaSaidaNaOp($ped, $antiga, '3.0000');

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('10.0000', (string) EstoqueSaldo::query()->where('produto_id', $escolhida->id)->value('qtde'));
        $this->assertSame('4.0000', (string) EstoqueSaldo::query()->where('produto_id', $antiga->id)->value('qtde'));
    }

    public function test_diferenca_da_caixa_sai_na_nota(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();
        $ped = $this->criarPedidoProduzido();
        $caixa = $this->escolherCaixa($ped, 3, '10.0000', '2.500000');
        $this->marcarCaixaJaSaidaNaOp($ped, $caixa, '1.0000');

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('8.0000', (string) EstoqueSaldo::query()->where('produto_id', $caixa->id)->value('qtde'));
        $item = EstoqueMovimentoItem::query()
            ->where('produto_id', $caixa->id)
            ->whereHas('movimento', fn ($q) => $q->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA))
            ->first();
        $this->assertNotNull($item);
        $this->assertSame('2.0000', (string) $item->qtde);
    }

    public function test_embalagem_antiga_sem_sku_nao_bloqueia_nem_baixa_caixa(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();
        $ped = $this->criarPedidoProduzido();
        $item = PedidoItem::query()->where('pedido_id', $ped->id)->firstOrFail();
        $op = OrdemProducao::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'OP-SVD-SEM-SKU',
            'pedido_id' => $ped->id,
            'pedido_item_id' => $item->id,
            'status' => OrdemProducao::STATUS_CONCLUIDA,
            'qtde_planejada' => '10000.0000',
            'qtde_boa' => '10000.0000',
            'qtde_refugo' => '0.0000',
            'concluida_em' => now(),
        ]);
        PaEmbalagem::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMBPA-2026-SEMSKU',
            'pedido_id' => $ped->id,
            'pedido_item_id' => $item->id,
            'ordem_producao_id' => $op->id,
            'status' => PaEmbalagem::STATUS_CONFIRMADA,
            'qtde_etiquetas' => '10000.0000',
            'qtde_bobinas' => 1,
            'qtde_caixas' => 2,
            'origem' => PaEmbalagem::ORIGEM_MANUAL,
            'confirmada_em' => now(),
        ]);

        $prev = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertContains(
            'Embalagem confirmada sem caixa de estoque — a NF-e não baixará as caixas.',
            $prev->json('data.fiscal.avisos')
        );

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('AUTORIZADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertSame('3500.00', $ok->json('data.valor_a_cobrar'));
        $this->assertSame('0.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
    }

    public function test_saldo_de_caixa_insuficiente_bloqueia_a_emissao(): void
    {
        $this->habilitarHub();
        $this->fakeFocusAutorizado();
        $this->creditarPa();
        $ped = $this->criarPedidoProduzido();
        $caixa = $this->escolherCaixa($ped, 3, '1.0000', '2.500000');

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('PLANEJADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertStringContainsString('Estoque insuficiente', (string) $ok->json('data.documentos_fiscais.0.mensagem'));
        $this->assertSame(0, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
        $this->assertSame('10000.0000', (string) EstoqueSaldo::query()->where('produto_id', $this->pa->id)->value('qtde'));
        $this->assertSame('1.0000', (string) EstoqueSaldo::query()->where('produto_id', $caixa->id)->value('qtde'));
        $this->assertSame('3500.00', $ok->json('data.valor_a_cobrar'));
    }

    private function escolherCaixa(Pedido $ped, int $qtde, string $saldo, string $custo): Produto
    {
        $n = ++$this->seq;
        $caixa = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-CX-'.str_pad((string) $n, 3, '0', STR_PAD_LEFT),
            'familia' => 'EMB',
            'descricao_fiscal' => 'CAIXA PAPELAO',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'preco_tabela' => '99.000000',
            'custo_medio' => $custo,
        ]);
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $caixa->id,
            'qtde' => $saldo,
            'unidade' => 'UN',
            'custo_medio' => $custo,
        ]);

        $item = PedidoItem::query()->where('pedido_id', $ped->id)->firstOrFail();
        $op = OrdemProducao::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'OP-SVD-'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'pedido_id' => $ped->id,
            'pedido_item_id' => $item->id,
            'status' => OrdemProducao::STATUS_CONCLUIDA,
            'qtde_planejada' => '10000.0000',
            'qtde_boa' => '10000.0000',
            'qtde_refugo' => '0.0000',
            'concluida_em' => now(),
        ]);
        PaEmbalagem::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMBPA-2026-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'pedido_id' => $ped->id,
            'pedido_item_id' => $item->id,
            'ordem_producao_id' => $op->id,
            'status' => PaEmbalagem::STATUS_CONFIRMADA,
            'qtde_etiquetas' => '10000.0000',
            'qtde_bobinas' => 1,
            'qtde_caixas' => $qtde,
            'origem' => PaEmbalagem::ORIGEM_MANUAL,
            'caixa_produto_id' => $caixa->id,
            'confirmada_em' => now(),
        ]);

        return $caixa;
    }

    private function marcarCaixaJaSaidaNaOp(Pedido $ped, Produto $caixa, string $qtde): void
    {
        $op = OrdemProducao::query()->where('pedido_id', $ped->id)->firstOrFail();
        $mov = EstoqueMovimento::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MOV-OP-'.$op->codigo,
            'tipo' => EstoqueMovimento::TIPO_SAIDA_PRODUCAO,
            'pedido_id' => $ped->id,
            'ordem_producao_id' => $op->id,
            'conferido_em' => now(),
        ]);
        OrdemProducaoMaterial::query()->create([
            'empresa_id' => $this->empresa->id,
            'ordem_producao_id' => $op->id,
            'produto_id' => $caixa->id,
            'qtde_planejada' => $qtde,
            'qtde_requisitada' => $qtde,
            'qtde_consumida' => '0',
            'qtde_retorno' => '0',
            'qtde_perda' => '0',
            'unidade' => 'UN',
            'componente' => 'CAIXA',
            'saida_movimento_id' => $mov->id,
            'ordem' => 1,
        ]);
    }
}
