<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueSaldo;
use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Services\Comercial\PedidoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * BL-044 — ORC LIBERADO → PED → OP → SAIDA/SOBRA/PA → ±tolerância.
 */
class ProducaoPedOpEstoqueTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    private User $producao;

    private Parceiro $parceiro;

    private Produto $mp;

    private Produto $pa;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'orcamento.ler',
            'orcamento.escrever',
            'producao.ler',
            'producao.escrever',
            'produto.ler',
            'estoque.ler',
            'estoque.escrever',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-PRD1',
            'razao_social' => 'RLP Producao',
            'nome_fantasia' => 'RLP PRD',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-PRD01',
            'razao_social' => 'CLIENTE PRODUCAO',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'limite_credito' => '50000.00',
            'whatsapp' => '31977776666',
            'contato_nome' => 'Prod Cliente',
        ]);
        $this->completarParceiroParaProposta($this->parceiro);

        $this->seedParceiroRecorrenteLimpo($this->empresa, $this->parceiro);

        ParceiroContato::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'nome' => 'Prod Cliente',
            'whatsapp' => '31977776666',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);

        $this->mp = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-FLM-901',
            'familia' => 'MP',
            'descricao_fiscal' => 'BOPP PRATA AUTOADESIVO COLACRIL BXT',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '10.000000',
        ]);

        Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-TUB-003',
            'familia' => 'EMB',
            'descricao_fiscal' => 'TUBETE 3"',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '1.000000',
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
            'custo_medio' => '0',
        ]);

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->mp->id,
            'qtde' => '500.0000',
            'unidade' => 'M2',
            'custo_medio' => '10.000000',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-PRD1',
            'name' => 'Comercial PRD',
            'email' => 'comercial.prd@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever', 'producao.ler']);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->producao = User::query()->create([
            'codigo' => 'USR-PRD2',
            'name' => 'Producao PRD',
            'email' => 'producao.prd@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->producao->givePermissionTo(['producao.ler', 'producao.escrever', 'estoque.ler', 'estoque.escrever', 'produto.ler']);
        $this->producao->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        return [
            'parceiro_id' => $this->parceiro->id,
            'medida' => $fx['medida'],
            'largura_cm' => $fx['largura_cm'],
            'puxada_cm' => $fx['puxada_cm'],
            'cores' => $fx['cores'],
            'papel' => $fx['papel'],
            'acabamento' => $fx['acabamento'],
            'modelos' => $fx['modelos'],
            'colunas' => $fx['colunas'],
            'etiq_por_rolo' => $fx['etiq_por_rolo'],
            'tubete' => $fx['tubete'],
            'z' => $fx['z'],
            'maquina' => $fx['maquina'],
            'maquina_roda_servico' => $fx['maquina_roda_servico'],
            'imposto_pct' => $fx['imposto_pct'],
            'matriz' => $fx['matriz'],
            'coluna_rebobinacao' => $fx['coluna_rebobinacao'],
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'faixas' => array_map(static fn (array $f) => [
                'quantidade' => $f['quantidade'],
                'comissao_pct' => $f['comissao_pct'],
            ], $fx['faixas']),
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
            'saida_etiqueta' => 'PE',
            'formato_faca' => 'DESENHADA',
            'facas' => [[
                'principal' => true,
                'formato' => 'DESENHADA',
                'medida' => $fx['medida'],
                'faca_nova' => false,
            ]],
        ];
    }

    public function test_aprovacao_liberada_gera_pedido_e_ciclo_op_estoque(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $orcId = (int) $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $this->payload())
            ->assertCreated()
            ->json('data.id');

        $dest = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$orcId}/destinatarios-aprovacao");
        $contatoId = $dest->json('data.destinatarios.0.parceiro_contato_id');
        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$orcId}/enviar-aprovacao", [
            'parceiro_contato_id' => $contatoId,
        ]);
        $token = $env->json('data.token');

        $ok = $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'nome_cliente' => 'Prod Cliente',
            'faixa_index' => 0,
        ]);
        $ok->assertOk();
        $this->assertSame('LIBERADO', $ok->json('data.financeiro_status'));

        $orc = Orcamento::query()->findOrFail($orcId);
        $this->assertSame('LIBERADO', $orc->financeiro_status);

        $pedido = Pedido::query()->where('orcamento_id', $orcId)->first();
        $this->assertNotNull($pedido);
        $this->assertSame(Pedido::STATUS_LIBERADO, $pedido->status);
        $this->assertSame(1, $pedido->itens()->count());

        $itemId = (int) $pedido->itens()->first()->id;
        $qtdePedida = (string) $pedido->itens()->first()->qtde_pedida;

        Sanctum::actingAs($this->producao);
        $op = $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-op", [
            'pedido_item_id' => $itemId,
        ]);
        $op->assertCreated();
        $opId = (int) $op->json('data.id');
        $this->assertSame('ABERTA', $op->json('data.status'));
        $materiais = $op->json('data.materiais');
        $this->assertIsArray($materiais);
        $this->assertNotEmpty($materiais, 'OP deve nascer com materiais planejados do ORC');
        $papelLinha = collect($materiais)->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papelLinha);
        $this->assertTrue($papelLinha['pendente']);
        $this->assertSame($this->mp->id, $papelLinha['produto']['id']);

        $qtdePlanejada = (string) $papelLinha['qtde_planejada'];
        $this->assertTrue(bccomp($qtdePlanejada, '0', 4) > 0);

        $req = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papelLinha['id'],
        ]);
        $req->assertOk();
        $this->assertSame('EM_ANDAMENTO', $req->json('data.status'));
        $this->assertFalse(collect($req->json('data.materiais'))->firstWhere('id', $papelLinha['id'])['pendente']);

        $saldoMp = (string) EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->mp->id)
            ->value('qtde');
        $this->assertSame(bcsub('500.0000', $qtdePlanejada, 4), $saldoMp);

        // Dentro da tolerância: 90% da pedida (tol 20%)
        $qtdeBoa = bcmul($qtdePedida, '0.90', 4);
        $conc = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $qtdeBoa,
            'qtde_refugo' => '0',
            'materiais' => [
                [
                    'produto_id' => $this->mp->id,
                    'qtde_retorno' => '5.0000',
                    'qtde_perda' => '2.0000',
                ],
            ],
        ]);
        $conc->assertOk();
        $this->assertSame('CONCLUIDA', $conc->json('data.status'));
        $this->assertSame($qtdeBoa, $conc->json('data.qtde_boa'));

        $this->assertTrue(
            EstoqueMovimento::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO)
                ->exists()
        );
        $this->assertTrue(
            EstoqueMovimento::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_SOBRA)
                ->exists()
        );
        $this->assertTrue(
            EstoqueMovimento::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_PA)
                ->exists()
        );

        $saldoMpApos = (string) EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->mp->id)
            ->value('qtde');
        // 500 - planejada + 5 retorno
        $this->assertSame(bcadd(bcsub('500.0000', $qtdePlanejada, 4), '5.0000', 4), $saldoMpApos);

        $saldoPa = (string) EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->pa->id)
            ->value('qtde');
        $this->assertSame($qtdeBoa, $saldoPa);

        $pedido->refresh();
        $this->assertSame(Pedido::STATUS_PRODUZIDO, $pedido->status);
        $item = $pedido->itens()->first();
        $this->assertSame($qtdeBoa, (string) $item->qtde_faturavel);
        $this->assertArrayHasKey('readequacao', $pedido->snapshot ?? []);
    }

    public function test_conclusao_bloqueia_consumo_zero_sem_override(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [$pedido, , $opId] = $this->abrirOpAprovada($h);

        // Garante saldo folgado no papel (única linha baixada neste teste).
        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => $this->mp->id],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '50.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $req = (string) collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        )->firstWhere('id', $papel['id'])['qtde_requisitada'];

        $qtdeBoa = bcmul((string) $pedido->itens()->first()->qtde_pedida, '0.90', 4);
        $fail = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $qtdeBoa,
            'qtde_refugo' => '0',
            'materiais' => [
                [
                    'material_id' => $papel['id'],
                    'qtde_retorno' => '0',
                    'qtde_perda' => $req,
                ],
            ],
        ]);
        $fail->assertStatus(422);
        $this->assertStringContainsString(
            'Consumo zero',
            (string) $fail->json('message').json_encode($fail->json('errors'))
        );
        $this->assertSame('EM_ANDAMENTO', $pedido->ordensProducao()->find($opId)?->status);
        $this->assertFalse(
            EstoqueMovimento::query()
                ->where('ordem_producao_id', $opId)
                ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_PA)
                ->exists()
        );
    }

    public function test_conclusao_bloqueia_consumo_zero_mesmo_com_flags_antigas(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [$pedido, , $opId] = $this->abrirOpAprovada($h);

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => $this->mp->id],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '50.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $req = (string) collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        )->firstWhere('id', $papel['id'])['qtde_requisitada'];

        $qtdeBoa = bcmul((string) $pedido->itens()->first()->qtde_pedida, '0.90', 4);
        // Flags antigas de override devem ser ignoradas — bloqueio duro.
        $fail = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $qtdeBoa,
            'qtde_refugo' => '0',
            'aceitar_consumo_zero' => true,
            'motivo_consumo_zero' => 'Tentativa de bypass',
            'materiais' => [
                [
                    'material_id' => $papel['id'],
                    'qtde_retorno' => '0',
                    'qtde_perda' => $req,
                ],
            ],
        ]);
        $fail->assertStatus(422);
        $this->assertStringContainsString(
            'Consumo zero',
            (string) $fail->json('message').json_encode($fail->json('errors'))
        );
        $this->assertSame('EM_ANDAMENTO', $pedido->ordensProducao()->find($opId)?->status);
        $this->assertFalse(
            EstoqueMovimento::query()
                ->where('ordem_producao_id', $opId)
                ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_PA)
                ->exists()
        );
    }

    public function test_conclusao_bloqueia_perda_total_do_papel_mesmo_com_emb_consumindo(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [$pedido, , $opId] = $this->abrirOpAprovada($h);

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $tubete = collect($show->json('data.materiais'))->firstWhere('componente', 'TUBETE');
        $this->assertNotNull($papel);
        $this->assertNotNull($tubete, 'Fixture deve casar tubete para este cenário');

        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => (int) $papel['produto']['id']],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '50.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );
        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => (int) $tubete['produto']['id']],
            [
                'qtde' => bcadd((string) $tubete['qtde_planejada'], '50.0000', 4),
                'unidade' => 'UN',
                'custo_medio' => '1.000000',
            ],
        );

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();
        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $tubete['id'],
        ])->assertOk();

        $mats = collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        );
        $papelReq = (string) $mats->firstWhere('id', $papel['id'])['qtde_requisitada'];
        $tubeteReq = (string) $mats->firstWhere('id', $tubete['id'])['qtde_requisitada'];

        $qtdeBoa = bcmul((string) $pedido->itens()->first()->qtde_pedida, '0.90', 4);
        // Perda 100% no papel; tubete “consome” tudo (retorno/perda 0) — ainda deve bloquear.
        $fail = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $qtdeBoa,
            'qtde_refugo' => '0',
            'materiais' => [
                [
                    'material_id' => $papel['id'],
                    'qtde_retorno' => '0',
                    'qtde_perda' => $papelReq,
                ],
                [
                    'material_id' => $tubete['id'],
                    'qtde_retorno' => '0',
                    'qtde_perda' => '0',
                ],
            ],
        ]);
        $fail->assertStatus(422);
        $blob = (string) $fail->json('message').json_encode($fail->json('errors'));
        $this->assertTrue(
            str_contains($blob, 'MP/papel') || str_contains($blob, 'substrato') || str_contains($blob, 'material de produção'),
            $blob
        );
        $this->assertTrue(bccomp($tubeteReq, '0', 4) > 0);
        $this->assertFalse(
            EstoqueMovimento::query()
                ->where('ordem_producao_id', $opId)
                ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_PA)
                ->exists()
        );
    }

    public function test_conclusao_bloqueia_perda_alta_de_papel_insuficiente_para_qtde_boa(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [$pedido, , $opId] = $this->abrirOpAprovada($h);

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => $this->mp->id],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '50.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $req = (string) collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        )->firstWhere('id', $papel['id'])['qtde_requisitada'];

        // Perda alta (≈ 90% do requisitado) ainda deixa consumo > 0 — não cobre a qtde boa.
        $perda = bcmul($req, '0.90', 4);
        $qtdeBoa = bcmul((string) $pedido->itens()->first()->qtde_pedida, '0.90', 4);

        $fail = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $qtdeBoa,
            'qtde_refugo' => '0',
            'materiais' => [
                [
                    'material_id' => $papel['id'],
                    'qtde_retorno' => '0',
                    'qtde_perda' => $perda,
                ],
            ],
        ]);
        $fail->assertStatus(422);
        $this->assertStringContainsString(
            'Papel insuficiente',
            (string) $fail->json('message').json_encode($fail->json('errors'))
        );
        $this->assertFalse(
            EstoqueMovimento::query()
                ->where('ordem_producao_id', $opId)
                ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_PA)
                ->exists()
        );
    }

    public function test_requisicao_complementar_do_mesmo_papel_aumenta_requisitada(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [, , $opId] = $this->abrirOpAprovada($h);

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => $this->mp->id],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '200.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $req1 = (string) collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        )->firstWhere('id', $papel['id'])['qtde_requisitada'];

        $extra = '70.1400';
        $ok = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
            'qtde' => $extra,
            'complementar' => true,
        ]);
        $ok->assertOk();
        $req2 = (string) collect($ok->json('data.materiais'))->firstWhere('id', $papel['id'])['qtde_requisitada'];
        $this->assertSame(bcadd($req1, $extra, 4), $req2);
        $this->assertSame(
            2,
            EstoqueMovimento::query()
                ->where('ordem_producao_id', $opId)
                ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO)
                ->count()
        );
    }

    public function test_complementar_cobre_perda_e_libera_conclusao_pelo_empenho(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [$pedido, , $opId] = $this->abrirOpAprovada($h);

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => $this->mp->id],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '400.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $req1 = (string) collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        )->firstWhere('id', $papel['id'])['qtde_requisitada'];
        $perda = bcmul($req1, '0.90', 4);
        $extra = bcmul($req1, '0.70', 4);

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
            'qtde' => $extra,
            'complementar' => true,
        ])->assertOk();

        $qtdeBoa = bcmul((string) $pedido->itens()->first()->qtde_pedida, '0.90', 4);
        $ok = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $qtdeBoa,
            'qtde_refugo' => '0',
            'materiais' => [
                [
                    'material_id' => $papel['id'],
                    'qtde_retorno' => '0',
                    'qtde_perda' => $perda,
                ],
            ],
        ]);
        $ok->assertOk();
        $this->assertSame('CONCLUIDA', $ok->json('data.status'));
    }

    public function test_avaria_na_separacao_nao_escreve_saldo_e_bloqueia_conclusao_sem_reposicao(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [$pedido, , $opId] = $this->abrirOpAprovada($h);

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => $this->mp->id],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '400.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $req = (string) collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        )->firstWhere('id', $papel['id'])['qtde_requisitada'];
        $saldoAposSaida = (string) EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->mp->id)
            ->value('qtde');
        $movsAntes = EstoqueMovimento::query()->where('ordem_producao_id', $opId)->count();

        $avaria = bcmul($req, '0.90', 4);
        $okAvaria = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/avaria", [
            'material_id' => $papel['id'],
            'qtde' => $avaria,
            'motivo' => 'Bobina rasgada na mesa',
        ]);
        $okAvaria->assertOk();
        $linha = collect($okAvaria->json('data.materiais'))->firstWhere('id', $papel['id']);
        $this->assertSame($avaria, (string) $linha['qtde_avaria']);
        $this->assertSame('Bobina rasgada na mesa', $linha['motivo_avaria']);
        $this->assertSame($saldoAposSaida, (string) EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->mp->id)
            ->value('qtde'));
        $this->assertSame(
            $movsAntes,
            EstoqueMovimento::query()->where('ordem_producao_id', $opId)->count()
        );

        $qtdeBoa = bcmul((string) $pedido->itens()->first()->qtde_pedida, '0.90', 4);
        $fail = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $qtdeBoa,
            'qtde_refugo' => '0',
            'materiais' => [
                [
                    'material_id' => $papel['id'],
                    'qtde_retorno' => '0',
                    'qtde_perda' => '0',
                ],
            ],
        ]);
        $fail->assertStatus(422);
        $this->assertStringContainsString(
            'Papel insuficiente',
            (string) $fail->json('message').json_encode($fail->json('errors'))
        );
        $this->assertFalse(
            EstoqueMovimento::query()
                ->where('ordem_producao_id', $opId)
                ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_PA)
                ->exists()
        );
    }

    public function test_avaria_mais_complementar_libera_conclusao_sem_virar_perda_de_processo(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [$pedido, , $opId] = $this->abrirOpAprovada($h);

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => $this->mp->id],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '400.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $req1 = (string) collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        )->firstWhere('id', $papel['id'])['qtde_requisitada'];
        $avaria = bcmul($req1, '0.90', 4);

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/avaria", [
            'material_id' => $papel['id'],
            'qtde' => $avaria,
            'motivo' => 'Umidade na mesa',
        ])->assertOk();

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
            'qtde' => $avaria,
            'complementar' => true,
        ])->assertOk();

        $qtdeBoa = bcmul((string) $pedido->itens()->first()->qtde_pedida, '0.90', 4);
        $ok = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $qtdeBoa,
            'qtde_refugo' => '0',
            'materiais' => [
                [
                    'material_id' => $papel['id'],
                    'qtde_retorno' => '0',
                    'qtde_perda' => '0',
                ],
            ],
        ]);
        $ok->assertOk();
        $this->assertSame('CONCLUIDA', $ok->json('data.status'));
        $linha = collect($ok->json('data.materiais'))->firstWhere('id', $papel['id']);
        $this->assertSame($avaria, (string) $linha['qtde_avaria']);
        $this->assertSame('0.0000', (string) $linha['qtde_perda']);
        $this->assertTrue(bccomp((string) $linha['qtde_consumida'], '0', 4) > 0);
    }

    public function test_avaria_exige_saida_motivo_e_nao_excede_requisitado(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [, , $opId] = $this->abrirOpAprovada($h);

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);

        $semSaida = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/avaria", [
            'material_id' => $papel['id'],
            'qtde' => '1.0000',
            'motivo' => 'Rasgo na mesa',
        ]);
        $semSaida->assertStatus(422);

        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => $this->mp->id],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '50.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );
        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $req = (string) collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        )->firstWhere('id', $papel['id'])['qtde_requisitada'];

        $semMotivo = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/avaria", [
            'material_id' => $papel['id'],
            'qtde' => '1.0000',
        ]);
        $semMotivo->assertStatus(422);

        $acima = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/avaria", [
            'material_id' => $papel['id'],
            'qtde' => bcadd($req, '1.0000', 4),
            'motivo' => 'Acima do requisitado',
        ]);
        $acima->assertStatus(422);

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/avaria", [
            'material_id' => $papel['id'],
            'qtde' => '1.0000',
            'motivo' => 'Rasgo na mesa',
        ])->assertOk();

        $limpa = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/avaria", [
            'material_id' => $papel['id'],
            'qtde' => '0',
        ]);
        $limpa->assertOk();
        $this->assertSame(
            '0.0000',
            (string) collect($limpa->json('data.materiais'))->firstWhere('id', $papel['id'])['qtde_avaria']
        );
        $this->assertNull(collect($limpa->json('data.materiais'))->firstWhere('id', $papel['id'])['motivo_avaria']);
    }

    public function test_perda_de_processo_nao_pode_usar_quantidade_ja_apontada_como_avaria(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [, , $opId] = $this->abrirOpAprovada($h);

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        EstoqueSaldo::query()->updateOrCreate(
            ['empresa_id' => $this->empresa->id, 'produto_id' => $this->mp->id],
            [
                'qtde' => bcadd((string) $papel['qtde_planejada'], '50.0000', 4),
                'unidade' => 'M2',
                'custo_medio' => '10.000000',
            ],
        );
        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $req = (string) collect(
            $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}")->json('data.materiais')
        )->firstWhere('id', $papel['id'])['qtde_requisitada'];
        $avaria = bcmul($req, '0.40', 4);

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/avaria", [
            'material_id' => $papel['id'],
            'qtde' => $avaria,
            'motivo' => 'Cantos amassados',
        ])->assertOk();

        $fail = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => '1',
            'aceitar_fora_tolerancia' => true,
            'motivo_fora_tolerancia' => 'Só valida o teto avaria+processo',
            'materiais' => [
                [
                    'material_id' => $papel['id'],
                    'qtde_retorno' => '0',
                    'qtde_perda' => $req,
                ],
            ],
        ]);
        $fail->assertStatus(422);
        $this->assertStringContainsString(
            'avaria',
            mb_strtolower((string) $fail->json('message').json_encode($fail->json('errors')))
        );
    }

    public function test_nao_abre_op_sem_pedido_liberado_e_idempotente_ped(): void
    {
        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-2026-00001',
            'versao' => 1,
            'parceiro_id' => $this->parceiro->id,
            'cliente_nome' => 'CLIENTE PRODUCAO',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => 'AGUARDA_ADIANTAMENTO',
            'input_snapshot' => ['medida' => '10x10'],
            'result_snapshot' => ['faixas' => [['quantidade' => 1000, 'valor_etiqueta' => 1, 'valor_total' => 1000]]],
            'aceite_faixa_index' => 0,
            'tolerancia_qtd_pct' => 20,
        ]);

        $ped = app(PedidoService::class)->garantirDeOrcamentoLiberado($orc);
        $this->assertNull($ped);

        $orc->financeiro_status = 'LIBERADO';
        $orc->save();
        $p1 = app(PedidoService::class)->garantirDeOrcamentoLiberado($orc->fresh());
        $p2 = app(PedidoService::class)->garantirDeOrcamentoLiberado($orc->fresh());
        $this->assertNotNull($p1);
        $this->assertSame($p1->id, $p2->id);
        $this->assertSame(1, Pedido::query()->where('orcamento_id', $orc->id)->count());
    }

    public function test_show_orcamento_liberado_inclui_pedido_e_show_ped_com_ordens(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $orcId = (int) $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $this->payload())
            ->assertCreated()
            ->json('data.id');

        $dest = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$orcId}/destinatarios-aprovacao");
        $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$orcId}/enviar-aprovacao", [
            'parceiro_contato_id' => $dest->json('data.destinatarios.0.parceiro_contato_id'),
        ]);
        $token = OrcamentoLinkAprovacao::query()->where('orcamento_id', $orcId)->value('token');
        $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'nome_cliente' => 'Prod Cliente',
            'faixa_index' => 0,
        ])->assertOk();

        $showOrc = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$orcId}");
        $showOrc->assertOk();
        $this->assertSame('LIBERADO', $showOrc->json('data.financeiro_status'));
        $this->assertNotNull($showOrc->json('data.pedido'));
        $this->assertSame($showOrc->json('data.pedido.codigo'), Pedido::query()->where('orcamento_id', $orcId)->value('codigo'));
        $this->assertSame(Pedido::STATUS_LIBERADO, $showOrc->json('data.pedido.status'));

        $pedidoId = (int) $showOrc->json('data.pedido.id');
        $itemId = (int) Pedido::query()->findOrFail($pedidoId)->itens()->value('id');

        Sanctum::actingAs($this->producao);
        $opId = (int) $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedidoId}/abrir-op", [
            'pedido_item_id' => $itemId,
        ])->assertCreated()->json('data.id');

        $showPed = $this->withHeaders($h)->getJson("/api/v1/pedidos/{$pedidoId}");
        $showPed->assertOk();
        $this->assertSame($pedidoId, (int) $showPed->json('data.id'));
        $this->assertNotEmpty($showPed->json('data.ordens_producao'));
        $this->assertSame($opId, (int) $showPed->json('data.ordens_producao.0.id'));
        $this->assertArrayHasKey('materiais_resumo', $showPed->json('data.ordens_producao.0'));
        $this->assertGreaterThan(0, (int) $showPed->json('data.ordens_producao.0.materiais_resumo.total'));
        $this->assertArrayHasKey('entrega', $showPed->json('data'));
        $this->assertNull($showPed->json('data.entrega'));
        // Confirmação ao cliente — identidade comercial no detalhe (ADR_PED_CONFIRMACAO_CLIENTE).
        $this->assertSame($this->empresa->id, (int) $showPed->json('data.empresa.id'));
        $this->assertSame($this->empresa->cnpj, $showPed->json('data.empresa.cnpj'));
        $this->assertSame($this->parceiro->codigo, $showPed->json('data.parceiro.codigo'));
        $this->assertArrayHasKey('cnpj_cpf', $showPed->json('data.parceiro'));
        $this->assertArrayHasKey('preco_unitario', $showPed->json('data.itens.0'));
        $this->assertArrayHasKey('valor_total', $showPed->json('data.itens.0'));
    }

    public function test_conclusao_fora_tolerancia_exige_override(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $orcId = (int) $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $this->payload())
            ->json('data.id');
        $dest = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$orcId}/destinatarios-aprovacao");
        $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$orcId}/enviar-aprovacao", [
            'parceiro_contato_id' => $dest->json('data.destinatarios.0.parceiro_contato_id'),
        ]);
        $token = OrcamentoLinkAprovacao::query()->where('orcamento_id', $orcId)->value('token');
        $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'nome_cliente' => 'Prod Cliente',
            'faixa_index' => 0,
        ])->assertOk();

        $pedido = Pedido::query()->where('orcamento_id', $orcId)->firstOrFail();
        $itemId = (int) $pedido->itens()->first()->id;
        $pedida = (string) $pedido->itens()->first()->qtde_pedida;

        Sanctum::actingAs($this->producao);
        $opId = (int) $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-op", [
            'pedido_item_id' => $itemId,
        ])->json('data.id');

        // 50% da pedida — fora de ±20%
        $fora = bcmul($pedida, '0.50', 4);
        $fail = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $fora,
        ]);
        $fail->assertStatus(422);

        $ok = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $fora,
            'aceitar_fora_tolerancia' => true,
            'motivo_fora_tolerancia' => 'Cliente aceitou parcial',
        ]);
        $ok->assertOk();
        $this->assertTrue($ok->json('data.fora_tolerancia'));
    }

    public function test_op_sem_saida_pode_devolver_ao_pedido_e_reabrir(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [$pedido, $itemId, $opId] = $this->abrirOpAprovada($h);

        Sanctum::actingAs($this->producao);
        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $show->assertOk();
        $this->assertTrue($show->json('data.pode_devolver_ao_pedido'));

        $saldoAntes = (string) EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->mp->id)
            ->value('qtde');

        $dev = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/devolver-ao-pedido", [
            'motivo' => 'OP aberta por engano',
        ]);
        $dev->assertOk();
        $this->assertSame('CANCELADA', $dev->json('data.status'));
        $this->assertSame('OP aberta por engano', $dev->json('data.motivo_cancelamento'));
        $this->assertFalse($dev->json('data.pode_devolver_ao_pedido'));

        $pedido->refresh();
        $this->assertSame(Pedido::STATUS_LIBERADO, $pedido->status);
        $this->assertSame('PENDENTE', $pedido->itens()->first()->status);
        $this->assertSame($saldoAntes, (string) EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->mp->id)
            ->value('qtde'));
        $this->assertFalse(
            EstoqueMovimento::query()->where('ordem_producao_id', $opId)->exists()
        );

        $nova = $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-op", [
            'pedido_item_id' => $itemId,
        ]);
        $nova->assertCreated();
        $this->assertSame('ABERTA', $nova->json('data.status'));
        $this->assertNotSame($opId, (int) $nova->json('data.id'));
        $this->assertSame(Pedido::STATUS_EM_PRODUCAO, $pedido->fresh()->status);
    }

    public function test_op_com_saida_nao_pode_devolver_ao_pedido(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [$pedido, $itemId, $opId] = $this->abrirOpAprovada($h);

        Sanctum::actingAs($this->producao);
        $op = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papel = collect($op->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);

        $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar", [
            'material_id' => $papel['id'],
        ])->assertOk();

        $fail = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/devolver-ao-pedido", [
            'motivo' => 'Tentei devolver após a saída',
        ]);
        $fail->assertStatus(422);
        $this->assertSame('EM_ANDAMENTO', $pedido->ordensProducao()->find($opId)?->status);
        $this->assertSame(Pedido::STATUS_EM_PRODUCAO, $pedido->fresh()->status);
    }

    public function test_devolver_ao_pedido_exige_motivo(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [, , $opId] = $this->abrirOpAprovada($h);

        Sanctum::actingAs($this->producao);
        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-producao/{$opId}/devolver-ao-pedido", ['motivo' => 'ab'])
            ->assertStatus(422);
        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-producao/{$opId}/devolver-ao-pedido", [])
            ->assertStatus(422);
    }

    public function test_op_expoe_disponibilidade_de_saldo_nas_linhas(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [, , $opId] = $this->abrirOpAprovada($h);

        Sanctum::actingAs($this->producao);
        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $show->assertOk();

        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        $this->assertArrayHasKey('qtde_disponivel', $papel);
        $this->assertArrayHasKey('qtde_faltante', $papel);
        $this->assertArrayHasKey('aguardando_material', $papel);
        $this->assertSame('500.0000', $papel['qtde_disponivel']);
        $this->assertIsArray($show->json('data.disponibilidade.componentes_nao_casados'));

        // Abastece todos os SKUs da OP com folga sobre o planejado.
        foreach ($show->json('data.materiais') as $linha) {
            $pid = (int) ($linha['produto']['id'] ?? 0);
            if ($pid <= 0) {
                continue;
            }
            $need = bcadd((string) $linha['qtde_planejada'], '10.0000', 4);
            EstoqueSaldo::query()->updateOrCreate(
                ['empresa_id' => $this->empresa->id, 'produto_id' => $pid],
                ['qtde' => $need, 'unidade' => $linha['unidade'] ?? 'UN', 'custo_medio' => '1.000000'],
            );
        }

        $ok = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $papelOk = collect($ok->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertFalse($papelOk['aguardando_material']);
        $this->assertSame('0.0000', $papelOk['qtde_faltante']);
        $this->assertFalse($ok->json('data.disponibilidade.aguardando_material'));
        $this->assertSame(0, (int) $ok->json('data.disponibilidade.linhas_com_faltante'));
    }

    public function test_op_marca_aguardando_material_quando_saldo_insuficiente(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [, , $opId] = $this->abrirOpAprovada($h);

        EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->mp->id)
            ->update(['qtde' => '0.0000']);

        Sanctum::actingAs($this->producao);
        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $show->assertOk();

        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        $this->assertTrue($papel['aguardando_material']);
        $this->assertTrue(bccomp((string) $papel['qtde_faltante'], '0', 4) > 0);
        $this->assertTrue($show->json('data.disponibilidade.aguardando_material'));
        $this->assertGreaterThan(0, (int) $show->json('data.disponibilidade.linhas_com_faltante'));
    }

    public function test_requisitar_pendentes_nao_baixa_parcial_se_faltar_saldo(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        [, , $opId] = $this->abrirOpAprovada($h);

        EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->mp->id)
            ->update(['qtde' => '0.0000']);

        Sanctum::actingAs($this->producao);
        $fail = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/requisitar-pendentes");
        $fail->assertStatus(422);
        $this->assertStringContainsString(
            'Saldo insuficiente',
            (string) $fail->json('message').json_encode($fail->json('errors'))
        );

        $this->assertFalse(
            EstoqueMovimento::query()
                ->where('ordem_producao_id', $opId)
                ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO)
                ->exists()
        );

        $show = $this->withHeaders($h)->getJson("/api/v1/ordens-producao/{$opId}");
        $this->assertSame('ABERTA', $show->json('data.status'));
        $this->assertTrue(
            collect($show->json('data.materiais'))->every(fn ($m) => $m['pendente'] === true)
        );
    }

    /**
     * @param  array<string, string>  $h
     * @return array{0: Pedido, 1: int, 2: int}
     */
    private function abrirOpAprovada(array $h): array
    {
        $orcId = (int) $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $this->payload())
            ->assertCreated()
            ->json('data.id');
        $dest = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$orcId}/destinatarios-aprovacao");
        $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$orcId}/enviar-aprovacao", [
            'parceiro_contato_id' => $dest->json('data.destinatarios.0.parceiro_contato_id'),
        ]);
        $token = OrcamentoLinkAprovacao::query()->where('orcamento_id', $orcId)->value('token');
        $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'nome_cliente' => 'Prod Cliente',
            'faixa_index' => 0,
        ])->assertOk();

        $pedido = Pedido::query()->where('orcamento_id', $orcId)->firstOrFail();
        $itemId = (int) $pedido->itens()->first()->id;

        Sanctum::actingAs($this->producao);
        $opId = (int) $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-op", [
            'pedido_item_id' => $itemId,
        ])->assertCreated()->json('data.id');

        return [$pedido, $itemId, $opId];
    }
}
