<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Entrega;
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
 * BL-060 — PED FATURADO → ENT- (balcão × transporte) → confirmação; TIT intactos.
 */
class EntregaPedidoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmp;

    private User $expedicao;

    private User $financeiro;

    private User $outsider;

    private Parceiro $parceiro;

    private Parceiro $transportadora;

    private EmpresaContaFinanceira $cfin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'orcamento.ler',
            'producao.ler',
            'financeiro.ler',
            'financeiro.escrever',
            'faturamento.ler',
            'faturamento.escrever',
            'expedicao.ler',
            'expedicao.escrever',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        app(NaturezaGerencialService::class)->seedCatalog();
        $this->assertNotNull(NaturezaGerencial::query()->where('codigo', '1.01.01')->first());

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-ENT1',
            'razao_social' => 'RLP Expedicao',
            'nome_fantasia' => 'RLP ENT',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'logradouro' => 'Av. Anselmo Alves dos Santos',
            'numero' => '100',
            'bairro' => 'Santa Monica',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38408150',
        ]);
        $this->outraEmp = Empresa::query()->create([
            'codigo' => 'EMP-ENT2',
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
            'codigo' => 'PAR-ENT01',
            'razao_social' => 'CLIENTE ENTREGA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'limite_credito' => '10000.00',
            'logradouro' => 'Rua das Industrias',
            'numero' => '50',
            'bairro' => 'Distrito',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400000',
        ]);

        $this->transportadora = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-ENT02',
            'razao_social' => 'TRANSPORTADORA MG',
            'papel_transportadora' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        $this->expedicao = User::query()->create([
            'codigo' => 'USR-ENT1',
            'name' => 'Expedicao',
            'email' => 'expedicao.ent@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->expedicao->givePermissionTo([
            'expedicao.ler', 'expedicao.escrever', 'faturamento.ler', 'faturamento.escrever',
            'producao.ler', 'financeiro.ler',
        ]);
        $this->expedicao->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->financeiro = User::query()->create([
            'codigo' => 'USR-ENT2',
            'name' => 'Financeiro',
            'email' => 'financeiro.ent@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->financeiro->givePermissionTo([
            'financeiro.ler', 'financeiro.escrever', 'expedicao.ler', 'faturamento.ler',
        ]);
        $this->financeiro->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->outsider = User::query()->create([
            'codigo' => 'USR-ENT3',
            'name' => 'Outra EMP',
            'email' => 'outra.ent@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->outraEmp->id,
        ]);
        $this->outsider->givePermissionTo(['expedicao.ler', 'expedicao.escrever']);
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
            'cliente_nome' => 'CLIENTE ENTREGA',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [
                'condicao_pagamento' => $overrides['condicao'] ?? '28 DDL',
                'forma_pagamento' => $overrides['forma'] ?? 'PIX',
                'modo_entrega' => $overrides['modo'] ?? 'RETIRAR',
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
                    'modo_entrega' => $overrides['modo'] ?? 'RETIRAR',
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
            'qtde_pedida' => '10000',
            'qtde_produzida' => '10000',
            'qtde_faturavel' => '10000',
            'unidade' => 'MIL',
            'preco_unitario' => '0.350000',
            'valor_total' => '3500.00',
            'status' => PedidoItem::STATUS_PRODUZIDO,
        ]);

        if (! empty($overrides['sinal'])) {
            $tit = Titulo::query()->create([
                'empresa_id' => $this->empresa->id,
                'codigo' => 'TIT-2026-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT).'S',
                'parceiro_id' => $this->parceiro->id,
                'orcamento_id' => $orc->id,
                'tipo' => Titulo::TIPO_RECEBER,
                'origem' => AdiantamentoService::ORIGEM_ADIANTAMENTO,
                'natureza_id' => NaturezaGerencial::query()->where('codigo', '1.01.01')->value('id'),
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

    private function h(?Empresa $emp = null): array
    {
        return ['X-Empresa-Id' => (string) ($emp ?? $this->empresa)->id];
    }

    private function faturar(Pedido $ped): Pedido
    {
        Sanctum::actingAs($this->expedicao);
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();

        return $ped->fresh();
    }

    public function test_retirada_no_balcao_confirma_e_nao_baixa_titulo(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido(['modo' => 'RETIRAR']));

        Sanctum::actingAs($this->expedicao);
        $prev = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/entrega-preview");
        $prev->assertOk();
        $this->assertTrue($prev->json('data.apto'));
        $this->assertSame('RETIRAR', $prev->json('data.modo'));
        $this->assertSame('BALCAO', $prev->json('data.tipo_saida_sugerido'));
        $this->assertSame('expedir', $prev->json('data.acao'));

        $exp = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir", [
            'volumes' => 2,
        ]);
        $exp->assertCreated();
        $this->assertSame(Entrega::STATUS_AGUARDA_RETIRADA, $exp->json('data.status'));
        $this->assertSame(Entrega::TIPO_BALCAO, $exp->json('data.tipo_saida'));
        $this->assertSame(Pedido::STATUS_EM_ENTREGA, $ped->fresh()->status);

        $id = $exp->json('data.id');
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/entregas/{$id}/confirmar", [
            'prova_tipo' => Entrega::PROVA_ASSINATURA_BALCAO,
            'prova_nome' => 'Maria Silva',
            'prova_documento' => '12345678900',
        ]);
        $ok->assertOk();
        $this->assertSame(Entrega::STATUS_ENTREGUE, $ok->json('data.status'));
        $this->assertSame(Pedido::STATUS_ENTREGUE, $ped->fresh()->status);

        $abertos = Titulo::query()
            ->where('pedido_id', $ped->id)
            ->where('origem', FaturamentoService::ORIGEM_FATURA)
            ->where('status', Titulo::STATUS_ABERTO)
            ->count();
        $this->assertSame(1, $abertos);
        $this->assertNotEmpty($ok->json('data.titulos_abertos'));
    }

    public function test_transporte_com_rastreio_e_confirmacao(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido(['modo' => 'ENTREGAR']));

        Sanctum::actingAs($this->expedicao);
        $exp = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir", [
            'tipo_saida' => Entrega::TIPO_TRANSPORTADORA,
            'transportadora_id' => $this->transportadora->id,
            'rastreio' => 'BR123456789MG',
            'volumes' => 1,
        ]);
        $exp->assertCreated();
        $this->assertSame(Entrega::STATUS_EM_TRANSITO, $exp->json('data.status'));
        $this->assertSame('BR123456789MG', $exp->json('data.rastreio'));
        $this->assertSame($this->transportadora->id, $exp->json('data.transportadora.id'));

        $id = $exp->json('data.id');
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/entregas/{$id}/confirmar", [
            'prova_tipo' => Entrega::PROVA_RASTREIO,
            'prova_obs' => 'Protocolo transportadora: entregue no destino',
        ]);
        $ok->assertOk();
        $this->assertSame(Entrega::STATUS_ENTREGUE, $ok->json('data.status'));
        $this->assertSame(Pedido::STATUS_ENTREGUE, $ped->fresh()->status);
    }

    public function test_sinal_cobre_saldo_e_confirmar_encerra_pedido(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido([
            'modo' => 'RETIRAR',
            'condicao' => '50% sinal + 50% 28 DDL',
            'sinal' => '3500.00',
        ]));

        Sanctum::actingAs($this->expedicao);
        $exp = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir");
        $exp->assertCreated();
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/entregas/{$exp->json('data.id')}/confirmar", [
            'prova_tipo' => Entrega::PROVA_ASSINATURA_BALCAO,
            'prova_nome' => 'Joao Retira',
        ]);
        $ok->assertOk();
        $this->assertSame(Pedido::STATUS_ENCERRADO, $ped->fresh()->status);
    }

    public function test_baixa_do_saldo_apos_entrega_encerra(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido(['modo' => 'RETIRAR', 'forma' => 'TRANSFERENCIA']));

        Sanctum::actingAs($this->expedicao);
        $exp = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir");
        $exp->assertCreated();
        $this->withHeaders($this->h())->postJson("/api/v1/entregas/{$exp->json('data.id')}/confirmar", [
            'prova_tipo' => Entrega::PROVA_ASSINATURA_BALCAO,
            'prova_nome' => 'Cliente Balcao',
        ])->assertOk();
        $this->assertSame(Pedido::STATUS_ENTREGUE, $ped->fresh()->status);

        $tit = Titulo::query()
            ->where('pedido_id', $ped->id)
            ->where('origem', FaturamentoService::ORIGEM_FATURA)
            ->firstOrFail();

        Sanctum::actingAs($this->financeiro);
        $this->withHeaders($this->h())->postJson("/api/v1/titulos/{$tit->id}/baixar", [
            'conta_financeira_id' => $this->cfin->id,
            'valor' => $tit->saldo,
            'pago_em' => now()->toDateString(),
        ])->assertCreated();

        $this->assertSame(Pedido::STATUS_ENCERRADO, $ped->fresh()->status);
    }

    public function test_financeiro_nao_expede(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        Sanctum::actingAs($this->financeiro);
        $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir")
            ->assertForbidden();
    }

    public function test_nao_expede_sem_faturar(): void
    {
        $ped = $this->criarPedidoProduzido();
        Sanctum::actingAs($this->expedicao);
        $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir")
            ->assertStatus(422);
    }

    public function test_estorno_fat_bloqueado_apos_expedir(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        Sanctum::actingAs($this->expedicao);
        $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir")->assertCreated();

        $fat = Faturamento::query()->where('pedido_id', $ped->id)->firstOrFail();
        $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fat->id}/estornar", [
            'motivo' => 'quero refaturar',
        ])->assertStatus(422);
    }

    public function test_recusa_volta_pedido_a_faturado_e_permite_novo_ent(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido(['modo' => 'ENTREGAR']));
        Sanctum::actingAs($this->expedicao);
        $exp = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir", [
            'tipo_saida' => Entrega::TIPO_FROTA,
        ]);
        $exp->assertCreated();
        $this->withHeaders($this->h())->postJson("/api/v1/entregas/{$exp->json('data.id')}/recusar", [
            'motivo' => 'Cliente ausente no destino',
        ])->assertOk();

        $this->assertSame(Pedido::STATUS_FATURADO, $ped->fresh()->status);
        $this->assertSame(Entrega::STATUS_RECUSADA, Entrega::query()->find($exp->json('data.id'))->status);

        $novo = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir", [
            'tipo_saida' => Entrega::TIPO_FROTA,
        ]);
        $novo->assertCreated();
        $this->assertNotSame($exp->json('data.id'), $novo->json('data.id'));
        $this->assertSame(2, Entrega::query()->where('pedido_id', $ped->id)->count());
    }

    public function test_isolamento_emp(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        Sanctum::actingAs($this->expedicao);
        $exp = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir");
        $exp->assertCreated();

        Sanctum::actingAs($this->outsider);
        $this->withHeaders($this->h($this->outraEmp))
            ->getJson('/api/v1/entregas/fila')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->withHeaders($this->h($this->outraEmp))
            ->getJson('/api/v1/entregas/'.$exp->json('data.id'))
            ->assertNotFound();
    }

    public function test_idempotente_expedir_devolve_vigente(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        Sanctum::actingAs($this->expedicao);
        $a = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir");
        $b = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir");
        $a->assertCreated();
        $b->assertCreated();
        $this->assertSame($a->json('data.id'), $b->json('data.id'));
        $this->assertSame(1, Entrega::query()->where('pedido_id', $ped->id)->count());
    }
}
