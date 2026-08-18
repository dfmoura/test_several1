<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueSaldo;
use App\Models\FaturamentoItem;
use App\Models\FiscalHub;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Models\User;
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

    private function habilitarHub(): FiscalHub
    {
        $crypto = app(FiscalHubCrypto::class);

        return FiscalHub::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'HUB-00001',
            'nome' => 'Focus Homolog',
            'provedor' => 'focusnfe',
            'ambiente_ativo' => 'homologacao',
            'padrao' => true,
            'ativo' => true,
            'emissao_habilitada' => true,
            'emissao_habilitada_em' => now(),
            'token_homologacao_criptografada' => $crypto->criptografar('tok-homolog-nfe-teste'),
            'token_homologacao_mascara' => 'tok-…este',
            'ultimo_teste_ok' => true,
            'ultimo_teste_ambiente' => 'homologacao',
            'ultimo_teste_em' => now(),
            'ultimo_teste_msg' => 'OK',
        ]);
    }

    private function fakeFocusAutorizado(): void
    {
        Http::fake([
            'homologacao.focusnfe.com.br/v2/nfe*' => Http::response([
                'status' => 'autorizado',
                'chave' => '31260601423183000110550010000061121000000014',
                'numero' => 6112,
                'serie' => 1,
                'protocolo' => '131260000000001',
            ], 200),
            'homologacao.focusnfe.com.br/v2/nfsen*' => Http::response([
                'status' => 'autorizado',
                'chave' => 'NFSe3170206ABC',
                'numero' => 275,
                'serie' => 1,
            ], 200),
        ]);
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
        $this->assertSame('FOCUS', $ok->json('data.documentos_fiscais.0.autorizacao_origem'));
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
        $this->assertSame('AUTORIZADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertSame(0, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
    }

    public function test_retry_e_consultar_nao_duplicam_mov(): void
    {
        $this->habilitarHub();
        $this->creditarPa();
        Http::fake([
            'homologacao.focusnfe.com.br/v2/nfe*' => Http::sequence()
                ->push(['status' => 'erro_autorizacao', 'mensagem' => 'Rejeicao teste'], 422)
                ->push([
                    'status' => 'autorizado',
                    'chave' => '31260601423183000110550010000061131000000011',
                    'numero' => 6113,
                    'serie' => 1,
                ], 200)
                ->push([
                    'status' => 'autorizado',
                    'chave' => '31260601423183000110550010000061131000000011',
                    'numero' => 6113,
                    'serie' => 1,
                ], 200),
        ]);

        $ped = $this->criarPedidoProduzido();
        $a = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $a->assertCreated();
        $this->assertSame(0, EstoqueMovimento::query()->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)->count());
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
        $this->assertSame('FOCUS', $b->json('data.documentos_fiscais.0.autorizacao_origem'));
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
}
