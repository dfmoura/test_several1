<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\EstoqueSaldo;
use App\Models\Orcamento;
use App\Models\OrdemProducao;
use App\Models\OrdemProducaoMaterial;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Models\User;
use App\Services\Financeiro\AdiantamentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * ADR_PRODUCAO_COLETA_DIRIGIDA — Fase A: preview FEFO + volumes explícitos.
 */
class ProducaoColetaDirigidaTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private Produto $mp;

    private Produto $emb;

    private OrdemProducao $op;

    private OrdemProducaoMaterial $matPapel;

    private OrdemProducaoMaterial $matTubete;

    private EstoqueLote $loteVencido;

    private EstoqueLote $loteVigente;

    private EstoqueLote $loteSemValidade;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['producao.ler', 'producao.escrever', 'estoque.ler'] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-COL1',
            'razao_social' => 'Coleta Dirigida',
            'nome_fantasia' => 'Coleta',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-COL1',
            'razao_social' => 'CLIENTE COLETA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        $this->mp = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-PAP-COL',
            'familia' => 'MP',
            'descricao_fiscal' => 'PAPEL COLETA FEFO',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '8.000000',
            'controla_lote' => true,
            'controla_validade' => true,
        ]);

        $this->emb = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-TUB-COL',
            'familia' => 'EMB',
            'descricao_fiscal' => 'TUBETE 3"',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '1.000000',
            'controla_lote' => false,
        ]);

        $endA = $this->endereco('P01-C02-L01', 1, 2, 1);
        $endB = $this->endereco('P03-C01-L02', 3, 1, 2);
        $endC = $this->endereco('P01-C01-L01', 1, 1, 1);

        $this->loteVencido = $this->lote('LOT-VENC', '100.0000', '2025-01-10', '2025-06-01', $endA, '210', '476.1905');
        $this->loteVigente = $this->lote('LOT-VIG', '120.0000', '2026-03-01', '2027-06-01', $endB, '250', '480.0000');
        $this->loteSemValidade = $this->lote('LOT-SEM', '80.0000', '2026-01-01', null, $endC, '210', '381.0000');

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->mp->id,
            'qtde' => '300.0000',
            'unidade' => 'M2',
            'custo_medio' => '8.000000',
        ]);
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->emb->id,
            'qtde' => '50.0000',
            'unidade' => 'UN',
            'custo_medio' => '1.000000',
        ]);

        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => 88,
            'codigo' => 'ORC-2026-00088',
            'versao' => 1,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => 'CLIENTE COLETA',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [],
            'result_snapshot' => [],
            'tolerancia_qtd_pct' => 20,
        ]);

        $pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PED-2026-COL01',
            'orcamento_id' => $orc->id,
            'parceiro_id' => $parceiro->id,
            'status' => Pedido::STATUS_EM_PRODUCAO,
            'tolerancia_qtd_pct' => '20',
        ]);

        $item = PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $pedido->id,
            'ordem' => 1,
            'descricao' => 'Etiqueta coleta',
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => 'PA-ETQ',
            'unidade' => 'UN',
            'qtde_pedida' => '1000.0000',
            'status' => PedidoItem::STATUS_EM_PRODUCAO,
        ]);

        $this->op = OrdemProducao::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'OP-2026-COL01',
            'pedido_id' => $pedido->id,
            'pedido_item_id' => $item->id,
            'status' => OrdemProducao::STATUS_ABERTA,
            'qtde_planejada' => '1000.0000',
        ]);

        $this->matPapel = OrdemProducaoMaterial::query()->create([
            'empresa_id' => $this->empresa->id,
            'ordem_producao_id' => $this->op->id,
            'produto_id' => $this->mp->id,
            'qtde_planejada' => '150.0000',
            'qtde_requisitada' => '0',
            'qtde_consumida' => '0',
            'qtde_retorno' => '0',
            'qtde_perda' => '0',
            'unidade' => 'M2',
            'componente' => 'PAPEL',
            'ordem' => 1,
        ]);

        $this->matTubete = OrdemProducaoMaterial::query()->create([
            'empresa_id' => $this->empresa->id,
            'ordem_producao_id' => $this->op->id,
            'produto_id' => $this->emb->id,
            'qtde_planejada' => '4.0000',
            'qtde_requisitada' => '0',
            'qtde_consumida' => '0',
            'qtde_retorno' => '0',
            'qtde_perda' => '0',
            'unidade' => 'UN',
            'componente' => 'TUBETE',
            'ordem' => 2,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-COL1',
            'name' => 'Op Coleta',
            'email' => 'coleta@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['producao.ler', 'producao.escrever', 'estoque.ler']);
        $this->user->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    /** @return array<string, string> */
    private function h(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    private function endereco(string $codigo, int $p, int $c, int $v): EstoqueEndereco
    {
        return EstoqueEndereco::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => $codigo,
            'prateleira' => $p,
            'coluna' => $c,
            'vao' => $v,
            'largura_m' => EstoqueEndereco::LARGURA_M,
            'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
            'altura_m' => EstoqueEndereco::ALTURA_M,
            'ativo' => true,
        ]);
    }

    private function lote(
        string $codigo,
        string $qtde,
        string $entrada,
        ?string $validade,
        EstoqueEndereco $end,
        string $largura,
        string $comprimento,
    ): EstoqueLote {
        return EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->mp->id,
            'codigo' => $codigo,
            'qtde' => $qtde,
            'unidade' => 'M2',
            'data_entrada' => $entrada,
            'data_validade' => $validade,
            'origem_tipo' => EstoqueLote::ORIGEM_VIRADA,
            'largura_mm' => $largura,
            'comprimento_m' => $comprimento,
            'endereco_id' => $end->id,
        ]);
    }

    public function test_show_expoe_preview_fefo_com_local_e_validade(): void
    {
        Sanctum::actingAs($this->user);

        $show = $this->withHeaders($this->h())->getJson("/api/v1/ordens-producao/{$this->op->id}");
        $show->assertOk();

        $papel = collect($show->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertTrue($papel['produto']['controla_lote']);
        $this->assertSame('FEFO_FIFO', $papel['retirada']['politica']);
        $this->assertTrue($papel['retirada']['suficiente']);
        $this->assertSame('150.0000', $papel['retirada']['qtde']);

        $ids = collect($papel['retirada']['volumes'])->pluck('lote_id')->all();
        $this->assertSame([$this->loteVencido->id, $this->loteVigente->id], $ids);
        $this->assertSame('100.0000', $papel['retirada']['volumes'][0]['qtde_retirar']);
        $this->assertSame('50.0000', $papel['retirada']['volumes'][1]['qtde_retirar']);
        $this->assertSame('VENCIDO', $papel['retirada']['volumes'][0]['status']);
        $this->assertSame('P01-C02-L01', $papel['retirada']['volumes'][0]['endereco']['codigo']);
        $this->assertEqualsWithDelta(210.0, (float) $papel['retirada']['volumes'][0]['largura_mm'], 0.01);

        $candidatoIds = collect($papel['retirada']['candidatos'])->pluck('lote_id')->all();
        $this->assertContains($this->loteSemValidade->id, $candidatoIds);

        $tubete = collect($show->json('data.materiais'))->firstWhere('componente', 'TUBETE');
        $this->assertFalse($tubete['retirada']['controla_lote']);
        $this->assertSame([], $tubete['retirada']['volumes']);
    }

    public function test_requisitar_com_volumes_da_sugestao_debita_exato(): void
    {
        Sanctum::actingAs($this->user);

        $req = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/requisitar",
            [
                'material_id' => $this->matPapel->id,
                'qtde' => '150.0000',
                'volumes' => [
                    ['lote_id' => $this->loteVencido->id, 'qtde' => '100.0000'],
                    ['lote_id' => $this->loteVigente->id, 'qtde' => '50.0000'],
                ],
            ]
        );
        $req->assertOk();

        $this->assertSame('0.0000', (string) $this->loteVencido->fresh()->qtde);
        $this->assertSame('70.0000', (string) $this->loteVigente->fresh()->qtde);
        $this->assertSame('80.0000', (string) $this->loteSemValidade->fresh()->qtde);
        $this->assertSame('150.0000', (string) EstoqueSaldo::query()
            ->where('produto_id', $this->mp->id)
            ->value('qtde'));

        $papel = collect($req->json('data.materiais'))->firstWhere('id', $this->matPapel->id);
        $this->assertFalse($papel['pendente']);
        $baixados = collect($papel['retirada']['volumes_baixados'])->pluck('lote_id')->all();
        $this->assertSame([$this->loteVencido->id, $this->loteVigente->id], $baixados);
    }

    public function test_override_sem_motivo_recusado_e_com_motivo_grava_outro_volume(): void
    {
        Sanctum::actingAs($this->user);

        $fail = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/requisitar",
            [
                'material_id' => $this->matPapel->id,
                'qtde' => '80.0000',
                'volumes' => [
                    ['lote_id' => $this->loteSemValidade->id, 'qtde' => '80.0000'],
                ],
            ]
        );
        $fail->assertStatus(422);
        $this->assertArrayHasKey('volumes_motivo', $fail->json('errors'));
        $this->assertSame('80.0000', (string) $this->loteSemValidade->fresh()->qtde);

        $ok = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/requisitar",
            [
                'material_id' => $this->matPapel->id,
                'qtde' => '80.0000',
                'volumes' => [
                    ['lote_id' => $this->loteSemValidade->id, 'qtde' => '80.0000'],
                ],
                'volumes_motivo' => 'Rolo já na máquina',
            ]
        );
        $ok->assertOk();
        $this->assertSame('0.0000', (string) $this->loteSemValidade->fresh()->qtde);
        $this->assertSame('100.0000', (string) $this->loteVencido->fresh()->qtde);

        $mov = EstoqueMovimento::query()
            ->where('ordem_producao_id', $this->op->id)
            ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO)
            ->first();
        $this->assertNotNull($mov);
        $this->assertStringContainsString('Rolo já na máquina', (string) $mov->observacao);
        $this->assertTrue(
            EstoqueMovimentoItem::query()
                ->where('movimento_id', $mov->id)
                ->where('lote_id', $this->loteSemValidade->id)
                ->exists()
        );
    }

    public function test_requisitar_sem_volumes_continua_fefo_compativel(): void
    {
        Sanctum::actingAs($this->user);

        $req = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/requisitar",
            ['material_id' => $this->matPapel->id]
        );
        $req->assertOk();

        $this->assertSame('0.0000', (string) $this->loteVencido->fresh()->qtde);
        $this->assertSame('70.0000', (string) $this->loteVigente->fresh()->qtde);
        $this->assertSame('80.0000', (string) $this->loteSemValidade->fresh()->qtde);
    }

    public function test_preview_endpoint_respeita_qtde_informada(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeaders($this->h())->getJson(
            "/api/v1/ordens-producao/{$this->op->id}/retirada?material_id={$this->matPapel->id}&qtde=80"
        );
        $res->assertOk();
        $this->assertSame('80.0000', $res->json('data.qtde'));
        $this->assertCount(1, $res->json('data.volumes'));
        $this->assertSame($this->loteVencido->id, (int) $res->json('data.volumes.0.lote_id'));
        $this->assertSame('80.0000', $res->json('data.volumes.0.qtde_retirar'));
    }

    public function test_sku_sem_lote_rejeita_volumes(): void
    {
        Sanctum::actingAs($this->user);

        $fail = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/requisitar",
            [
                'material_id' => $this->matTubete->id,
                'volumes' => [
                    ['lote_id' => $this->loteVencido->id, 'qtde' => '4.0000'],
                ],
            ]
        );
        $fail->assertStatus(422);
    }

    public function test_fila_estoque_confirmar_qr_e_handoff(): void
    {
        Sanctum::actingAs($this->user);

        $fila = $this->withHeaders($this->h())->getJson('/api/v1/estoque/retiradas');
        $fila->assertOk();
        $this->assertSame(1, (int) $fila->json('data.resumo.a_retirar'));
        $this->assertSame(0, (int) $fila->json('data.resumo.a_entregar'));
        $this->assertSame($this->op->id, (int) $fila->json('data.a_retirar.0.id'));

        $this->loteVencido->ensureQrToken();
        $qr = $this->withHeaders($this->h())->getJson(
            '/api/v1/estoque/retiradas/'.$this->op->id.'/volume?payload='.urlencode($this->loteVencido->qrPayload())
        );
        $qr->assertOk();
        $this->assertSame($this->loteVencido->id, (int) $qr->json('data.lote_id'));

        $ok = $this->withHeaders($this->h())->postJson(
            "/api/v1/estoque/retiradas/{$this->op->id}/confirmar",
            [
                'linhas' => [
                    [
                        'material_id' => $this->matPapel->id,
                        'qtde' => '150.0000',
                        'volumes' => [
                            ['lote_id' => $this->loteVencido->id, 'qtde' => '100.0000'],
                            ['lote_id' => $this->loteVigente->id, 'qtde' => '50.0000'],
                        ],
                    ],
                    ['material_id' => $this->matTubete->id],
                ],
            ]
        );
        $ok->assertOk();
        $this->assertFalse(
            collect($ok->json('data.materiais'))->firstWhere('id', $this->matPapel->id)['pendente']
        );
        $this->assertTrue($ok->json('data.pode_entregar_insumos'));
        $this->assertFalse($ok->json('data.handoff.entregue'));

        $fila2 = $this->withHeaders($this->h())->getJson('/api/v1/estoque/retiradas');
        $this->assertSame(0, (int) $fila2->json('data.resumo.a_retirar'));
        $this->assertSame(1, (int) $fila2->json('data.resumo.a_entregar'));

        $painel = $this->withHeaders($this->h())->getJson('/api/v1/painel');
        $painel->assertOk();
        $ids = collect($painel->json('data.filas'))->pluck('id');
        $this->assertTrue($ids->contains('op_separacao'));

        $ent = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/entregar-insumos",
            ['recebido_por' => 'João da máquina']
        );
        $ent->assertOk();
        $this->assertTrue($ent->json('data.handoff.entregue'));
        $this->assertSame('João da máquina', $ent->json('data.handoff.recebidos_nome'));
        $this->assertFalse($ent->json('data.pode_entregar_insumos'));

        $fila3 = $this->withHeaders($this->h())->getJson('/api/v1/estoque/retiradas');
        $this->assertSame(0, (int) $fila3->json('data.resumo.total'));

        $comp = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/requisitar",
            [
                'material_id' => $this->matPapel->id,
                'qtde' => '20.0000',
                'complementar' => true,
                'volumes' => [
                    ['lote_id' => $this->loteVigente->id, 'qtde' => '20.0000'],
                ],
            ]
        );
        $comp->assertOk();
        $this->assertFalse($comp->json('data.handoff.entregue'));
        $this->assertTrue($comp->json('data.pode_entregar_insumos'));
    }

    public function test_ficha_confronta_ciclo_avaria_e_reposicao_no_chao(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders($this->h())->postJson(
            "/api/v1/estoque/retiradas/{$this->op->id}/confirmar",
            [
                'linhas' => [
                    [
                        'material_id' => $this->matPapel->id,
                        'qtde' => '150.0000',
                        'volumes' => [
                            ['lote_id' => $this->loteVencido->id, 'qtde' => '100.0000'],
                            ['lote_id' => $this->loteVigente->id, 'qtde' => '50.0000'],
                        ],
                    ],
                    ['material_id' => $this->matTubete->id],
                ],
            ]
        )->assertOk();

        $ficha = $this->withHeaders($this->h())->getJson('/api/v1/estoque/retiradas/'.$this->op->id);
        $ficha->assertOk();
        $this->assertCount(2, $ficha->json('data.ficha_retirada.linhas'));
        $this->assertCount(2, $ficha->json('data.ficha_retirada.ciclos'));
        $papel = collect($ficha->json('data.ficha_retirada.linhas'))->firstWhere('material_id', $this->matPapel->id);
        $this->assertSame('150.0000', $papel['requisitado']);
        $this->assertFalse($papel['pendente']);
        $this->assertSame('MOV-', substr((string) $ficha->json('data.ficha_retirada.ciclos.0.movimento_codigo'), 0, 4));

        $av = $this->withHeaders($this->h())->postJson(
            "/api/v1/estoque/retiradas/{$this->op->id}/avaria",
            [
                'material_id' => $this->matPapel->id,
                'qtde' => '20.0000',
                'motivo' => 'Rolo rasgado na mesa',
            ]
        );
        $av->assertOk();
        $this->assertSame('20.0000', collect($av->json('data.materiais'))->firstWhere('id', $this->matPapel->id)['qtde_avaria']);

        $prev = $this->withHeaders($this->h())->getJson(
            '/api/v1/estoque/retiradas/'.$this->op->id.'/preview?material_id='.$this->matPapel->id.'&qtde=20'
        );
        $prev->assertOk();
        $this->assertTrue($prev->json('data.controla_lote'));

        $repo = $this->withHeaders($this->h())->postJson(
            "/api/v1/estoque/retiradas/{$this->op->id}/confirmar",
            [
                'linhas' => [
                    [
                        'material_id' => $this->matPapel->id,
                        'qtde' => '20.0000',
                        'complementar' => true,
                        'volumes' => [
                            ['lote_id' => $this->loteVigente->id, 'qtde' => '20.0000'],
                        ],
                    ],
                ],
            ]
        );
        $repo->assertOk();
        $this->assertCount(3, $repo->json('data.ficha_retirada.ciclos'));
        $this->assertTrue($repo->json('data.ficha_retirada.ciclos.2.complementar'));
        $this->assertSame(
            '170.0000',
            collect($repo->json('data.ficha_retirada.linhas'))->firstWhere('material_id', $this->matPapel->id)['requisitado']
        );
    }

    public function test_chao_confirma_extra_por_produto_id(): void
    {
        Sanctum::actingAs($this->user);

        $extra = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-CX-COL',
            'familia' => 'EMB',
            'descricao_fiscal' => 'Caixa extra',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '2.000000',
            'controla_lote' => false,
        ]);
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $extra->id,
            'qtde' => '12.0000',
            'unidade' => 'UN',
            'custo_medio' => '2.000000',
        ]);

        $ok = $this->withHeaders($this->h())->postJson(
            "/api/v1/estoque/retiradas/{$this->op->id}/confirmar",
            [
                'linhas' => [
                    ['produto_id' => $extra->id, 'qtde' => '2.0000'],
                ],
            ]
        );
        $ok->assertOk();
        $linha = collect($ok->json('data.materiais'))->firstWhere('produto.codigo', 'EMB-CX-COL');
        $this->assertNotNull($linha);
        $this->assertFalse($linha['pendente']);
        $this->assertSame('2.0000', $linha['qtde_requisitada']);
    }

    public function test_entregar_sem_saida_recusado(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/entregar-insumos", [
                'recebido_por' => 'Ninguém',
            ])
            ->assertStatus(422);
    }
}
