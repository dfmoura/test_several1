<?php

namespace Tests\Feature;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Financeiro\AdiantamentoService;
use App\Services\Financeiro\FaturamentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * BL-049/050 — PED PRODUZIDO → FAT + TIT/COB do saldo; estorno com NF pendente.
 */
class FaturamentoPedidoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmp;

    private User $comercial;

    private User $producao;

    private User $outsider;

    private Parceiro $parceiro;

    private EmpresaContaFinanceira $cfin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'orcamento.ler',
            'producao.ler',
            'producao.escrever',
            'financeiro.ler',
            'faturamento.ler',
            'faturamento.escrever',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        app(NaturezaGerencialService::class)->seedCatalog();
        $this->assertNotNull(NaturezaGerencial::query()->where('codigo', '1.01.01')->first());

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-FAT1',
            'razao_social' => 'RLP Faturamento',
            'nome_fantasia' => 'RLP FAT',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);
        $this->outraEmp = Empresa::query()->create([
            'codigo' => 'EMP-FAT2',
            'razao_social' => 'Outra EMP',
            'nome_fantasia' => 'Outra',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);

        $this->cfin = EmpresaContaFinanceira::query()->create([
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
            'codigo' => 'PAR-FAT01',
            'razao_social' => 'CLIENTE FATURA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'limite_credito' => '10000.00',
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-FAT1',
            'name' => 'Comercial FAT',
            'email' => 'comercial.fat@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['faturamento.ler', 'faturamento.escrever', 'producao.ler', 'financeiro.ler']);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->producao = User::query()->create([
            'codigo' => 'USR-FAT2',
            'name' => 'Producao FAT',
            'email' => 'producao.fat@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->producao->givePermissionTo(['producao.ler', 'producao.escrever', 'faturamento.ler']);
        $this->producao->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->outsider = User::query()->create([
            'codigo' => 'USR-FAT3',
            'name' => 'Outra EMP',
            'email' => 'outra.fat@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->outraEmp->id,
        ]);
        $this->outsider->givePermissionTo(['faturamento.ler', 'faturamento.escrever']);
        $this->outsider->empresas()->attach($this->outraEmp->id, ['padrao' => true]);
    }

    private int $seq = 1;

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function criarPedidoProduzido(array $overrides = []): Pedido
    {
        $n = $this->seq++;
        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => $n,
            'codigo' => 'ORC-2026-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'versao' => 1,
            'parceiro_id' => $this->parceiro->id,
            'cliente_nome' => 'CLIENTE FATURA',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [
                'condicao_pagamento' => $overrides['condicao'] ?? '28 DDL',
                'forma_pagamento' => $overrides['forma'] ?? 'PIX',
            ],
            'result_snapshot' => ['faixas' => [[
                'quantidade' => 10000,
                'valor_etiqueta' => '3500.00',
                'valor_matriz' => '0',
                'valor_total' => '3500.00',
            ]]],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        $pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PED-2026-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'orcamento_id' => $orc->id,
            'parceiro_id' => $this->parceiro->id,
            'status' => $overrides['status'] ?? Pedido::STATUS_PRODUZIDO,
            'faixa_index' => 0,
            'tolerancia_qtd_pct' => '20',
            'prazo_entrega_dias' => 10,
            'snapshot' => [
                'input' => [
                    'condicao_pagamento' => $overrides['condicao'] ?? '28 DDL',
                    'forma_pagamento' => $overrides['forma'] ?? 'PIX',
                    'faca_nova' => $overrides['faca_nova'] ?? false,
                    'valor_faca_nova' => $overrides['valor_faca'] ?? '0',
                ],
                'faixa' => [
                    'quantidade' => 10000,
                    'valor_etiqueta' => '3500.00',
                    'valor_matriz' => '0',
                    'valor_total' => '3500.00',
                ],
            ],
        ]);

        PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $pedido->id,
            'ordem' => 1,
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => 'PA-ETQ',
            'descricao' => 'Etiqueta teste',
            'qtde_pedida' => '10000.0000',
            'qtde_produzida' => $overrides['qtde'] ?? '10000.0000',
            'qtde_faturavel' => $overrides['qtde'] ?? '10000.0000',
            'unidade' => 'MIL',
            'preco_unitario' => '0.350000',
            'valor_total' => '3500.00',
            'status' => PedidoItem::STATUS_PRODUZIDO,
        ]);

        if (! empty($overrides['sinal'])) {
            $nat = NaturezaGerencial::query()->where('codigo', '1.01.01')->firstOrFail();
            $tit = Titulo::query()->create([
                'empresa_id' => $this->empresa->id,
                'codigo' => 'TIT-2026-S'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
                'tipo' => Titulo::TIPO_RECEBER,
                'parceiro_id' => $this->parceiro->id,
                'natureza_id' => $nat->id,
                'orcamento_id' => $orc->id,
                'origem' => AdiantamentoService::ORIGEM_ADIANTAMENTO,
                'documento' => $orc->codigo,
                'emissao' => now()->toDateString(),
                'vencimento' => now()->toDateString(),
                'valor' => $overrides['sinal'],
                'saldo' => '0.00',
                'status' => Titulo::STATUS_QUITADO,
                'observacao' => 'Sinal teste',
            ]);
            $orc->adiantamento_titulo_id = $tit->id;
            $orc->save();
        }

        return $pedido->fresh(['itens', 'orcamento.adiantamentoTitulo']);
    }

    private function h(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    public function test_preview_e_fatura_sem_sinal_emite_um_tit_e_cob(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido(['condicao' => '28 DDL', 'forma' => 'PIX']);

        $prev = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertTrue($prev->json('data.apto'));
        $this->assertSame('3500.00', $prev->json('data.valor_bruto'));
        $this->assertSame('0.00', $prev->json('data.valor_adiantamento'));
        $this->assertSame('3500.00', $prev->json('data.valor_a_cobrar'));
        $this->assertCount(1, $prev->json('data.parcelas'));

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('3500.00', $ok->json('data.valor_a_cobrar'));
        $this->assertSame('PENDENTE', $ok->json('data.nf_status'));
        $this->assertCount(1, $ok->json('data.titulos'));
        $this->assertNotEmpty($ok->json('data.titulos.0.cobrancas.0.pix_copia_cola'));

        $ped->refresh();
        $this->assertSame(Pedido::STATUS_FATURADO, $ped->status);
        $this->assertSame(1, Faturamento::query()->where('pedido_id', $ped->id)->count());
        $this->assertSame(1, Titulo::query()->where('origem', FaturamentoService::ORIGEM_FATURA)->count());
        $this->assertSame(1, Cobranca::query()->count());
    }

    public function test_sinal_quitado_e_apropriado_e_nao_gera_segunda_cobranca_do_sinal(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido([
            'condicao' => '50% sinal + 50% 28 DDL',
            'forma' => 'PIX',
            'sinal' => '1750.00',
        ]);

        $prev = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertSame('3500.00', $prev->json('data.valor_bruto'));
        $this->assertSame('1750.00', $prev->json('data.valor_adiantamento'));
        $this->assertSame('1750.00', $prev->json('data.valor_a_cobrar'));
        $this->assertCount(1, $prev->json('data.parcelas'));
        $this->assertSame(28, $prev->json('data.parcelas.0.dias'));

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertCount(1, $ok->json('data.titulos'));
        $this->assertSame('1750.00', $ok->json('data.titulos.0.valor'));
        $this->assertSame('FATURA', $ok->json('data.titulos.0.origem'));

        $sinals = Titulo::query()->where('origem', AdiantamentoService::ORIGEM_ADIANTAMENTO)->get();
        $this->assertCount(1, $sinals);
        $this->assertSame(Titulo::STATUS_QUITADO, $sinals[0]->status);
        $this->assertSame(2, Titulo::query()->where('tipo', Titulo::TIPO_RECEBER)->count());
    }

    public function test_parcelas_14_28_42_geram_tres_titulos(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido(['condicao' => '14/28/42', 'forma' => 'PIX']);

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertCount(3, $ok->json('data.titulos'));
        $soma = '0.00';
        foreach ($ok->json('data.titulos') as $t) {
            $soma = bcadd($soma, $t['valor'], 2);
            $this->assertNotEmpty($t['cobrancas']);
        }
        $this->assertSame('3500.00', $soma);
    }

    public function test_idempotente_nao_duplica_fatura(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido();

        $a = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $a->assertCreated();
        $b = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $b->assertCreated();
        $this->assertSame($a->json('data.id'), $b->json('data.id'));
        $this->assertSame(1, Faturamento::query()->count());
        $this->assertSame(1, Titulo::query()->where('origem', FaturamentoService::ORIGEM_FATURA)->count());
    }

    public function test_recusa_pedido_nao_produzido_e_producao_nao_fatura(): void
    {
        $ped = $this->criarPedidoProduzido(['status' => Pedido::STATUS_LIBERADO]);
        $ped->itens()->update(['status' => PedidoItem::STATUS_PENDENTE, 'qtde_faturavel' => '0']);

        Sanctum::actingAs($this->comercial);
        $this->withHeaders($this->h())
            ->postJson("/api/v1/pedidos/{$ped->id}/faturar")
            ->assertStatus(422);

        $ok = $this->criarPedidoProduzido();
        Sanctum::actingAs($this->producao);
        $this->withHeaders($this->h())
            ->postJson("/api/v1/pedidos/{$ok->id}/faturar")
            ->assertForbidden();
    }

    public function test_isolamento_por_empresa(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido();
        $fat = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $fat->assertCreated();
        $id = (int) $fat->json('data.id');

        Sanctum::actingAs($this->outsider);
        $this->withHeader('X-Empresa-Id', (string) $this->outraEmp->id)
            ->getJson("/api/v1/faturamentos/{$id}")
            ->assertNotFound();
        $this->withHeader('X-Empresa-Id', (string) $this->outraEmp->id)
            ->getJson('/api/v1/faturamentos')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_qtde_faturavel_readequada_usa_preco_travado(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido(['qtde' => '9000.0000']);

        $prev = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertSame('3150.00', $prev->json('data.valor_bruto'));
        $this->assertSame('0.350000', $prev->json('data.preco_unitario'));
        $this->assertSame('3150.00', $prev->json('data.valor_itens'));
    }

    public function test_valor_etiqueta_do_motor_nao_e_multiplicado_pela_quantidade(): void
    {
        Sanctum::actingAs($this->comercial);
        $n = $this->seq++;
        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => $n,
            'codigo' => 'ORC-2026-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'versao' => 1,
            'parceiro_id' => $this->parceiro->id,
            'cliente_nome' => 'CLIENTE FATURA',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [
                'condicao_pagamento' => '50% sinal + 50% à vista',
                'forma_pagamento' => 'PIX',
            ],
            'result_snapshot' => ['faixas' => [[
                'quantidade' => 20000,
                'valor_etiqueta' => 1930,
                'valor_matriz' => 340,
                'valor_total' => 2270,
            ]]],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);
        $pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PED-2026-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'orcamento_id' => $orc->id,
            'parceiro_id' => $this->parceiro->id,
            'status' => Pedido::STATUS_PRODUZIDO,
            'faixa_index' => 0,
            'tolerancia_qtd_pct' => '20',
            'prazo_entrega_dias' => 10,
            'snapshot' => [
                'input' => [
                    'condicao_pagamento' => '50% sinal + 50% à vista',
                    'forma_pagamento' => 'PIX',
                    'faca_nova' => false,
                ],
                'faixa' => [
                    'quantidade' => 20000,
                    'valor_etiqueta' => 1930,
                    'valor_matriz' => 340,
                    'valor_total' => 2270,
                ],
            ],
        ]);
        PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $pedido->id,
            'ordem' => 1,
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => 'PA-ETQ',
            'descricao' => 'Etiqueta motor',
            'qtde_pedida' => '20000.0000',
            'qtde_produzida' => '20000.0000',
            'qtde_faturavel' => '20000.0000',
            'unidade' => 'MIL',
            'preco_unitario' => '1930.000000',
            'valor_total' => '2270.00',
            'status' => PedidoItem::STATUS_PRODUZIDO,
        ]);
        $nat = NaturezaGerencial::query()->where('codigo', '1.01.01')->firstOrFail();
        $tit = Titulo::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'TIT-2026-S'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'tipo' => Titulo::TIPO_RECEBER,
            'parceiro_id' => $this->parceiro->id,
            'natureza_id' => $nat->id,
            'orcamento_id' => $orc->id,
            'origem' => AdiantamentoService::ORIGEM_ADIANTAMENTO,
            'documento' => $orc->codigo,
            'emissao' => now()->toDateString(),
            'vencimento' => now()->toDateString(),
            'valor' => '1135.00',
            'saldo' => '0.00',
            'status' => Titulo::STATUS_QUITADO,
            'observacao' => 'Sinal 50%',
        ]);
        $orc->adiantamento_titulo_id = $tit->id;
        $orc->save();

        $prev = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$pedido->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertSame('1930.00', $prev->json('data.valor_itens'));
        $this->assertSame('340.00', $prev->json('data.valor_matriz'));
        $this->assertSame('2270.00', $prev->json('data.valor_bruto'));
        $this->assertSame('1135.00', $prev->json('data.valor_adiantamento'));
        $this->assertSame('1135.00', $prev->json('data.valor_a_cobrar'));
        $this->assertSame('0.096500', $prev->json('data.preco_unitario'));
        $this->assertNotSame('38598865.00', $prev->json('data.valor_a_cobrar'));
    }

    public function test_transferencia_gera_tit_sem_cobranca(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido(['forma' => 'Transferência', 'condicao' => 'À vista']);

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertCount(1, $ok->json('data.titulos'));
        $this->assertSame([], $ok->json('data.titulos.0.cobrancas'));
        $this->assertSame(0, Cobranca::query()->count());
    }

    public function test_sinal_que_cobre_o_valor_nao_emite_titulo_novo(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido([
            'condicao' => 'À vista',
            'forma' => 'PIX',
            'sinal' => '3500.00',
        ]);

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('0.00', $ok->json('data.valor_a_cobrar'));
        $this->assertSame([], $ok->json('data.titulos'));
        $this->assertSame(Pedido::STATUS_FATURADO, $ped->fresh()->status);
        $this->assertSame(0, Titulo::query()->where('origem', FaturamentoService::ORIGEM_FATURA)->count());
    }

    public function test_estorna_nf_pendente_cancela_tit_cob_e_devolve_pedido(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido(['sinal' => '1750.00', 'condicao' => '50% sinal + 50% 28 DDL']);
        $fat = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $fat->assertCreated();
        $fatId = (int) $fat->json('data.id');
        $this->assertTrue($fat->json('data.pode_estornar'));

        $this->withHeaders($this->h())
            ->postJson("/api/v1/faturamentos/{$fatId}/estornar", ['motivo' => 'ab'])
            ->assertStatus(422);

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fatId}/estornar", [
            'motivo' => 'Condição de pagamento errada',
        ]);
        $ok->assertOk();
        $this->assertSame(Faturamento::STATUS_ESTORNADO, $ok->json('data.status'));
        $this->assertSame('PENDENTE', $ok->json('data.nf_status'));
        $this->assertSame('Condição de pagamento errada', $ok->json('data.motivo_estorno'));
        $this->assertFalse($ok->json('data.pode_estornar'));
        $this->assertSame(Titulo::STATUS_CANCELADO, $ok->json('data.titulos.0.status'));
        $this->assertSame(Cobranca::STATUS_CANCELADA, $ok->json('data.titulos.0.cobrancas.0.status'));

        $this->assertSame(Pedido::STATUS_PRODUZIDO, $ped->fresh()->status);
        $sinal = Titulo::query()->where('origem', AdiantamentoService::ORIGEM_ADIANTAMENTO)->first();
        $this->assertNotNull($sinal);
        $this->assertSame(Titulo::STATUS_QUITADO, $sinal->status);

        $again = $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fatId}/estornar", [
            'motivo' => 'Condição de pagamento errada',
        ]);
        $again->assertOk();
        $this->assertSame($fatId, (int) $again->json('data.id'));
        $this->assertSame(Pedido::STATUS_PRODUZIDO, $ped->fresh()->status);
    }

    public function test_apos_estorno_pode_faturar_de_novo(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido();
        $a = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $a->assertCreated();

        $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$a->json('data.id')}/estornar", [
            'motivo' => 'Refaturar com outra forma',
        ])->assertOk();

        $prev = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertFalse($prev->json('data.ja_faturado'));
        $this->assertTrue($prev->json('data.apto'));

        $b = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $b->assertCreated();
        $this->assertNotSame($a->json('data.id'), $b->json('data.id'));
        $this->assertSame(Faturamento::STATUS_CONFIRMADO, $b->json('data.status'));
        $this->assertSame(Pedido::STATUS_FATURADO, $ped->fresh()->status);
        $this->assertSame(2, Faturamento::query()->where('pedido_id', $ped->id)->count());
        $this->assertSame(1, Faturamento::query()->where('pedido_id', $ped->id)->where('status', Faturamento::STATUS_CONFIRMADO)->count());
        $this->assertSame(2, Titulo::query()->where('origem', FaturamentoService::ORIGEM_FATURA)->count());
        $this->assertSame(1, Titulo::query()->where('origem', FaturamentoService::ORIGEM_FATURA)->where('status', Titulo::STATUS_ABERTO)->count());
    }

    public function test_estorno_recusa_tit_pago_nf_autorizada_e_producao(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido();
        $fat = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $fat->assertCreated();
        $fatId = (int) $fat->json('data.id');
        $titId = (int) $fat->json('data.titulos.0.id');

        Titulo::query()->whereKey($titId)->update([
            'status' => Titulo::STATUS_QUITADO,
            'saldo' => '0.00',
        ]);
        $this->withHeaders($this->h())
            ->postJson("/api/v1/faturamentos/{$fatId}/estornar", ['motivo' => 'Cliente pagou o boleto'])
            ->assertStatus(422);

        Titulo::query()->whereKey($titId)->update([
            'status' => Titulo::STATUS_ABERTO,
            'saldo' => Titulo::query()->whereKey($titId)->value('valor'),
        ]);
        Faturamento::query()->whereKey($fatId)->update(['nf_status' => Faturamento::NF_AUTORIZADA]);
        $this->withHeaders($this->h())
            ->postJson("/api/v1/faturamentos/{$fatId}/estornar", ['motivo' => 'Tentar após autorizar'])
            ->assertStatus(422);

        Faturamento::query()->whereKey($fatId)->update(['nf_status' => Faturamento::NF_PENDENTE]);
        Sanctum::actingAs($this->producao);
        $this->withHeaders($this->h())
            ->postJson("/api/v1/faturamentos/{$fatId}/estornar", ['motivo' => 'Produção não estorna'])
            ->assertForbidden();
    }

    public function test_estorno_isolamento_por_empresa(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido();
        $fat = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $fatId = (int) $fat->json('data.id');

        Sanctum::actingAs($this->outsider);
        $this->withHeader('X-Empresa-Id', (string) $this->outraEmp->id)
            ->postJson("/api/v1/faturamentos/{$fatId}/estornar", ['motivo' => 'Outra EMP não vê'])
            ->assertNotFound();

        $this->assertSame(Faturamento::STATUS_CONFIRMADO, Faturamento::query()->find($fatId)?->status);
    }

    public function test_estorna_fatura_sem_titulo_quando_sinal_cobre(): void
    {
        Sanctum::actingAs($this->comercial);
        $ped = $this->criarPedidoProduzido([
            'condicao' => 'À vista',
            'forma' => 'PIX',
            'sinal' => '3500.00',
        ]);
        $fat = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $fat->assertCreated();
        $this->assertSame([], $fat->json('data.titulos'));

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fat->json('data.id')}/estornar", [
            'motivo' => 'Refazer faturamento',
        ]);
        $ok->assertOk();
        $this->assertSame(Faturamento::STATUS_ESTORNADO, $ok->json('data.status'));
        $this->assertSame(Pedido::STATUS_PRODUZIDO, $ped->fresh()->status);
        $this->assertSame(Titulo::STATUS_QUITADO, Titulo::query()->where('origem', AdiantamentoService::ORIGEM_ADIANTAMENTO)->value('status'));
    }
}
