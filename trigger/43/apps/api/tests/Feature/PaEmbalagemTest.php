<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueSaldo;
use App\Models\Orcamento;
use App\Models\OrdemProducao;
use App\Models\PaEmbalagem;
use App\Models\PaEmbalagemBobina;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Models\User;
use App\Services\Financeiro\AdiantamentoService;
use App\Services\Producao\PaEmbalagemService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * ADR_PA_EMBALAGEM_BOBINA_CAIXA — bobina → caixa sem mexer no saldo PA.
 */
class PaEmbalagemTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private OrdemProducao $op;

    private Pedido $pedido;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['producao.ler', 'producao.escrever'] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-EMB1',
            'razao_social' => 'RLP Embalagem',
            'nome_fantasia' => 'RLP EMB',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-EMB01',
            'razao_social' => 'CLIENTE EMB',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => 88001,
            'codigo' => 'ORC-2026-88001',
            'versao' => 1,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => 'CLIENTE EMB',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [
                'etiq_por_rolo' => 1000,
                'tubete' => '3"',
            ],
            'result_snapshot' => ['faixas' => [[
                'quantidade' => 5000,
                'rolos' => 5,
                'qtde_caixas' => 1,
                'rolos_por_caixa' => 12,
            ]]],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        $this->pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PED-2026-EMB01',
            'orcamento_id' => $orc->id,
            'parceiro_id' => $parceiro->id,
            'status' => Pedido::STATUS_PRODUZIDO,
            'tolerancia_qtd_pct' => '20',
            'snapshot' => [
                'input' => [
                    'etiq_por_rolo' => 1000,
                    'tubete' => '3"',
                    'saida_etiqueta' => 'ESQUERDA',
                ],
                'faixa' => [
                    'quantidade' => 5000,
                    'rolos' => 5,
                    'qtde_caixas' => 1,
                    'rolos_por_caixa' => 12,
                    'caixa_medida' => '500x300',
                ],
            ],
        ]);

        $item = PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $this->pedido->id,
            'ordem' => 1,
            'descricao' => 'Etiqueta teste embalagem',
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => 'PA-ETQ',
            'unidade' => 'UN',
            'qtde_pedida' => '5000.0000',
            'qtde_produzida' => '5000.0000',
            'qtde_faturavel' => '5000.0000',
            'status' => PedidoItem::STATUS_PRODUZIDO,
            'especificacao' => [
                'medida' => '100X50',
                'papel' => 'Couchê Brilho',
                'cores' => 4,
                'acabamento' => 'Verniz UV',
                'tubete' => '3"',
                'etiq_por_rolo' => 1000,
                'saida_etiqueta' => 'ESQUERDA',
                'modelos_composicao' => [
                    ['nome' => 'Frente A'],
                    ['nome' => 'Verso B'],
                ],
            ],
        ]);

        $this->op = OrdemProducao::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'OP-2026-EMB01',
            'pedido_id' => $this->pedido->id,
            'pedido_item_id' => $item->id,
            'status' => OrdemProducao::STATUS_CONCLUIDA,
            'qtde_planejada' => '5000.0000',
            'qtde_boa' => '5000.0000',
            'qtde_refugo' => '0.0000',
            'concluida_em' => now(),
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-EMB1',
            'name' => 'Prod Emb',
            'email' => 'emb@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['producao.ler', 'producao.escrever']);
        $this->user->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    /** @return array<string, string> */
    private function h(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    public function test_sugerir_distribui_bobinas_e_caixas(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeaders($this->h())
            ->getJson("/api/v1/ordens-producao/{$this->op->id}/embalagem-sugerir");

        $res->assertOk();
        $plano = $res->json('data.plano');
        // 2 modelos × 2500 etiq → 3+3 rolos (1 bobina = 1 modelo).
        $this->assertSame(6, $plano['qtde_bobinas']);
        $this->assertSame(1, $plano['qtde_caixas']);
        $this->assertSame('5000.0000', $plano['qtde_etiquetas']);
        $this->assertCount(6, $plano['bobinas']);
        $this->assertSame('Frente A', $plano['bobinas'][0]['modelo_nome']);
        $this->assertSame('Verso B', $plano['bobinas'][3]['modelo_nome']);
        $this->assertCount(2, $plano['modelos_resumo']);
        $this->assertSame('Frente A', $plano['modelos_resumo'][0]['nome']);
        $this->assertSame(3, $plano['modelos_resumo'][0]['bobinas']);
        $this->assertSame('Verso B', $plano['modelos_resumo'][1]['nome']);
        $this->assertSame(3, $plano['modelos_resumo'][1]['bobinas']);
        $this->assertNull($plano['encaixe']['texto']);
    }

    public function test_encaixe_avisa_sem_mudar_quantidade_nem_bloquear_confirmacao(): void
    {
        Sanctum::actingAs($this->user);

        Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-CX-002',
            'familia' => 'EMB',
            'descricao_fiscal' => 'CAIXA PAPELAO 250X200X200',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'atributos' => ['comp_mm' => '250', 'larg_mm' => '200', 'alt_mm' => '200'],
        ]);

        $snap = $this->pedido->snapshot;
        $snap['input']['largura_cm'] = 30;
        $snap['faixa']['caixa_medida'] = '250x200x200';
        $this->pedido->snapshot = $snap;
        $this->pedido->save();

        $res = $this->withHeaders($this->h())
            ->getJson("/api/v1/ordens-producao/{$this->op->id}/embalagem-sugerir");

        $res->assertOk();
        $this->assertSame('nao_cabe', $res->json('data.plano.encaixe.status'));
        $this->assertSame(1, $res->json('data.plano.qtde_caixas'));

        $ok = $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", []);

        $ok->assertOk();
        $this->assertSame(1, $ok->json('data.qtde_caixas'));
        $this->assertSame(6, $ok->json('data.qtde_bobinas'));
    }

    public function test_confirmar_grava_bobinas_caixas_e_qr(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", []);

        $res->assertOk();
        $this->assertSame(PaEmbalagem::STATUS_CONFIRMADA, $res->json('data.status'));
        $this->assertSame(6, $res->json('data.qtde_bobinas'));
        $this->assertSame(1, $res->json('data.qtde_caixas'));
        $this->assertCount(6, $res->json('data.bobinas'));
        $this->assertCount(1, $res->json('data.caixas'));
        $this->assertStringStartsWith('BOB:', $res->json('data.bobinas.0.qr_payload'));
        $this->assertStringStartsWith('CX:', $res->json('data.caixas.0.qr_payload'));
        $this->assertSame('Frente A', $res->json('data.bobinas.0.modelo_nome'));
        $this->assertSame(1, $res->json('data.bobinas.0.modelo_ordem'));

        $this->assertSame(6, PaEmbalagemBobina::query()->where('empresa_id', $this->empresa->id)->count());

        $show = $this->withHeaders($this->h())
            ->getJson("/api/v1/ordens-producao/{$this->op->id}");
        $show->assertOk();
        $this->assertNotNull($show->json('data.embalagem'));
        $this->assertSame(6, $show->json('data.embalagem.qtde_bobinas'));
    }

    public function test_soma_bobinas_deve_igualar_qtde_boa(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'bobinas' => [
                    ['qtde_etiquetas' => '1000'],
                    ['qtde_etiquetas' => '1000'],
                ],
            ]);

        $res->assertStatus(422);
        $this->assertArrayHasKey('bobinas', $res->json('errors'));
    }

    public function test_distribuicao_com_resto(): void
    {
        $svc = app(PaEmbalagemService::class);
        $this->op->qtde_boa = '3200.0000';
        $this->op->save();

        $sug = $svc->sugerir($this->empresa, $this->op->fresh(['pedido', 'pedidoItem']));
        $plano = $sug['plano'];
        // 2 modelos × 1600 → 1000+600 cada = 4 rolos.
        $this->assertSame(4, $plano['qtde_bobinas']);
        $soma = '0';
        foreach ($plano['bobinas'] as $b) {
            $soma = bcadd($soma, $b['qtde_etiquetas'], 4);
        }
        $this->assertSame('3200.0000', $soma);
        $this->assertSame('Frente A', $plano['bobinas'][0]['modelo_nome']);
        $this->assertSame('Verso B', $plano['bobinas'][2]['modelo_nome']);
    }

    public function test_texto_fiscal_prioriza_bobinas_e_composicao(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [])
            ->assertOk();

        $emb = app(PaEmbalagemService::class)->vigenteDaOp($this->empresa, $this->op->fresh());
        $this->assertNotNull($emb);

        $texto = app(PaEmbalagemService::class)->textoFiscal($emb);
        $this->assertNotNull($texto);
        $this->assertStringContainsString('6 BOB', $texto);
        $this->assertStringContainsString('med 100X50', $texto);
        $this->assertStringContainsString('Couchê Brilho', $texto);
        $this->assertStringContainsString('4 cor(es)', $texto);
        $this->assertStringContainsString('Verniz UV', $texto);
        $this->assertStringContainsString('modelo Frente A/Verso B', $texto);
        $this->assertStringContainsString('1 CX', $texto);
        $this->assertStringContainsString('tubete 3"', $texto);
        $this->assertStringContainsString('saida ESQUERDA', $texto);
        $this->assertStringContainsString('comp: 4x1000UN+2x500UN', $texto);
        $this->assertStringNotContainsString('etiquetas', $texto);

        $ui = $emb->resumoTexto();
        $this->assertStringContainsString('etiquetas', $ui);

        $rolo = app(PaEmbalagemService::class)->textoFiscalModo($emb, 'ROLO');
        $this->assertNotNull($rolo);
        $this->assertStringContainsString('5.000 UN', $rolo);
        $this->assertStringContainsString('med 100X50', $rolo);
        $this->assertStringContainsString('modelo Frente A/Verso B', $rolo);
        $this->assertStringContainsString('comp: 4x1000UN+2x500UN', $rolo);
        $this->assertStringNotContainsString('BOB', $rolo);
    }

    public function test_texto_fiscal_agrega_resto_na_composicao(): void
    {
        Sanctum::actingAs($this->user);

        $this->op->qtde_boa = '3200.0000';
        $this->op->save();

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [])
            ->assertOk();

        $emb = app(PaEmbalagemService::class)->vigenteDaOp($this->empresa, $this->op->fresh());
        $texto = app(PaEmbalagemService::class)->textoFiscal($emb);
        $this->assertNotNull($texto);
        $this->assertStringContainsString('4 BOB', $texto);
        $this->assertStringContainsString('comp: 2x1000UN+2x600UN', $texto);
    }

    public function test_rolos_e_caixas_reais_repartem_a_quantidade_boa(): void
    {
        Sanctum::actingAs($this->user);

        $igual = $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_bobinas' => 5,
                'qtde_caixas' => 1,
            ]);
        $igual->assertOk();
        $this->assertSame(5, $igual->json('data.qtde_bobinas'));
        $this->assertSame(1, $igual->json('data.qtde_caixas'));
        // 5 rolos × 2 modelos (2500/2500) → 3+2; primeiro modelo reparte em 3.
        $this->assertSame('Frente A', $igual->json('data.bobinas.0.modelo_nome'));
        $this->assertSame('833.3333', $igual->json('data.bobinas.0.qtde_etiquetas'));
        $this->assertSame(PaEmbalagem::ORIGEM_MANUAL, $igual->json('data.origem'));

        $real = $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_bobinas' => 3,
                'qtde_caixas' => 2,
            ]);
        $real->assertOk();
        $this->assertSame(3, $real->json('data.qtde_bobinas'));
        $this->assertSame(2, $real->json('data.qtde_caixas'));
        $soma = '0';
        foreach ($real->json('data.bobinas') as $bobina) {
            $soma = bcadd($soma, (string) $bobina['qtde_etiquetas'], 4);
            $this->assertNotNull($bobina['modelo_nome']);
        }
        $this->assertSame('5000.0000', $soma);
        $this->assertSame(2, (int) $real->json('data.caixas.0.qtde_bobinas'));
        $this->assertSame(1, (int) $real->json('data.caixas.1.qtde_bobinas'));

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_bobinas' => 2,
                'qtde_caixas' => 3,
            ])
            ->assertStatus(422);
    }

    public function test_caixa_escolhida_grava_o_sku_sem_mover_saldo(): void
    {
        Sanctum::actingAs($this->user);

        $caixa = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-CX-007',
            'familia' => 'EMB',
            'descricao_fiscal' => 'CAIXA PAPELAO 500X300X300',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'atributos' => ['comp_mm' => '500', 'larg_mm' => '300', 'alt_mm' => '300'],
        ]);
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $caixa->id,
            'qtde' => '40',
            'unidade' => 'UN',
            'custo_medio' => '1',
        ]);

        $res = $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_bobinas' => 5,
                'qtde_caixas' => 2,
                'caixa_produto_id' => $caixa->id,
            ]);

        $res->assertOk();
        $this->assertSame($caixa->id, $res->json('data.caixa_produto_id'));
        $this->assertSame('EMB-CX-007', $res->json('data.caixa_produto_codigo'));
        $this->assertSame(2, $res->json('data.qtde_caixas'));
        $this->assertSame('40.0000', EstoqueSaldo::query()->where('produto_id', $caixa->id)->value('qtde'));
    }

    public function test_etiquetas_expoe_modelo_e_produto(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_bobinas' => 5,
                'qtde_caixas' => 1,
            ])
            ->assertOk();

        $emb = app(PaEmbalagemService::class)->vigenteDaOp($this->empresa, $this->op->fresh());
        $this->assertNotNull($emb);

        $res = $this->withHeaders($this->h())
            ->getJson('/api/v1/pa-embalagens/'.$emb->id.'/etiquetas');

        $res->assertOk();
        $bob = $res->json('data.bobinas.0');
        $cx = $res->json('data.caixas.0');
        $this->assertSame('Frente A', $bob['modelo']);
        $this->assertSame('Frente A', $bob['modelo_nome']);
        $this->assertSame(1, $bob['modelo_ordem']);
        $this->assertSame(5, $bob['total_bobinas']);
        $this->assertSame(1, $bob['caixa_seq']);
        $this->assertSame('100X50 · Couchê Brilho · 4 cor(es) · Verniz UV', $bob['produto']);
        $this->assertSame('Etiqueta teste embalagem', $bob['descricao']);
        $this->assertSame('Frente A / Verso B', $bob['modelos_item']);
        $this->assertTrue($cx['mista']);
        $this->assertCount(2, $cx['conteudo']);
        $this->assertNull($cx['modelo_nome']);
        $this->assertSame($bob['produto'], $cx['produto']);
        $this->assertNotEmpty($res->json('data.faces'));
        $this->assertSame('CAIXA', $res->json('data.faces.0.tipo'));
    }

    public function test_etiquetas_modelo_por_bobina_e_caixa_mista(): void
    {
        Sanctum::actingAs($this->user);

        $this->op->resultado_modelos = [
            ['ordem' => 1, 'nome' => 'Frente A', 'qtde_planejada' => '3000', 'qtde_boa' => '3000.0000', 'qtde_refugo' => '0'],
            ['ordem' => 2, 'nome' => 'Verso B', 'qtde_planejada' => '2000', 'qtde_boa' => '2000.0000', 'qtde_refugo' => '0'],
        ];
        $this->op->save();

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_caixas' => 1,
            ])
            ->assertOk();

        $emb = app(PaEmbalagemService::class)->vigenteDaOp($this->empresa, $this->op->fresh());
        $this->assertNotNull($emb);
        // 3000→3 rolos + 2000→2 rolos.
        $this->assertSame(5, $emb->qtde_bobinas);

        $res = $this->withHeaders($this->h())
            ->getJson('/api/v1/pa-embalagens/'.$emb->id.'/etiquetas');
        $res->assertOk();

        $nomes = array_column($res->json('data.bobinas'), 'modelo_nome');
        $this->assertSame(['Frente A', 'Frente A', 'Frente A', 'Verso B', 'Verso B'], $nomes);

        $cx0 = $res->json('data.caixas.0');
        $this->assertTrue($cx0['mista']);
        $this->assertCount(2, $cx0['conteudo']);
        $this->assertSame('Frente A', $cx0['conteudo'][0]['modelo']);
        $this->assertSame(3, $cx0['conteudo'][0]['bobinas']);
        $this->assertSame('Verso B', $cx0['conteudo'][1]['modelo']);
        $this->assertSame(2, $cx0['conteudo'][1]['bobinas']);
        $this->assertNull($cx0['modelo_nome']);
        $this->assertStringContainsString('Frente A', (string) ($cx0['hero'] ?? ''));
    }

    public function test_etiquetas_sem_modelos_fallback_produto(): void
    {
        Sanctum::actingAs($this->user);

        $item = $this->op->pedidoItem;
        $spec = $item->especificacao;
        unset($spec['modelos_composicao']);
        $item->especificacao = $spec;
        $item->save();
        $this->op->resultado_modelos = null;
        $this->op->save();

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_bobinas' => 5,
                'qtde_caixas' => 1,
            ])
            ->assertOk();

        $emb = app(PaEmbalagemService::class)->vigenteDaOp($this->empresa, $this->op->fresh());
        $res = $this->withHeaders($this->h())
            ->getJson('/api/v1/pa-embalagens/'.$emb->id.'/etiquetas');
        $res->assertOk();

        $bob = $res->json('data.bobinas.0');
        $this->assertNull($bob['modelo_nome']);
        $this->assertNull($bob['modelo']);
        $this->assertSame('100X50 · Couchê Brilho · 4 cor(es) · Verniz UV', $bob['produto']);
        $this->assertSame(5, $bob['total_bobinas']);
        $this->assertFalse($res->json('data.caixas.0.mista'));
    }

    public function test_etiquetas_truncamento_modelos_com_mais(): void
    {
        Sanctum::actingAs($this->user);

        $item = $this->op->pedidoItem;
        $spec = $item->especificacao;
        $spec['modelos_composicao'] = [
            ['ordem' => 1, 'nome' => 'A1', 'percentual' => 20],
            ['ordem' => 2, 'nome' => 'A2', 'percentual' => 20],
            ['ordem' => 3, 'nome' => 'A3', 'percentual' => 20],
            ['ordem' => 4, 'nome' => 'A4', 'percentual' => 20],
            ['ordem' => 5, 'nome' => 'A5', 'percentual' => 20],
        ];
        $item->especificacao = $spec;
        $item->save();
        $this->op->resultado_modelos = [
            ['ordem' => 1, 'nome' => 'A1', 'qtde_boa' => '1000.0000', 'qtde_refugo' => '0', 'qtde_planejada' => '1000'],
            ['ordem' => 2, 'nome' => 'A2', 'qtde_boa' => '1000.0000', 'qtde_refugo' => '0', 'qtde_planejada' => '1000'],
            ['ordem' => 3, 'nome' => 'A3', 'qtde_boa' => '1000.0000', 'qtde_refugo' => '0', 'qtde_planejada' => '1000'],
            ['ordem' => 4, 'nome' => 'A4', 'qtde_boa' => '1000.0000', 'qtde_refugo' => '0', 'qtde_planejada' => '1000'],
            ['ordem' => 5, 'nome' => 'A5', 'qtde_boa' => '1000.0000', 'qtde_refugo' => '0', 'qtde_planejada' => '1000'],
        ];
        $this->op->save();

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_caixas' => 1,
            ])
            ->assertOk();

        $emb = app(PaEmbalagemService::class)->vigenteDaOp($this->empresa, $this->op->fresh());
        $res = $this->withHeaders($this->h())
            ->getJson('/api/v1/pa-embalagens/'.$emb->id.'/etiquetas');
        $res->assertOk();
        $this->assertSame('A1 / A2 / A3 / A4 +1', $res->json('data.bobinas.0.modelos_item'));
        $this->assertSame('A1', $res->json('data.bobinas.0.modelo_nome'));
        $this->assertTrue($res->json('data.caixas.0.mista'));
        $this->assertCount(5, $res->json('data.caixas.0.conteudo'));
    }

    public function test_resumo_pedido_unica_inclui_embalagens_com_id(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_bobinas' => 5,
                'qtde_caixas' => 1,
            ])
            ->assertOk();

        $resumo = app(PaEmbalagemService::class)->resumoPedido($this->empresa, $this->pedido->fresh());
        $this->assertIsArray($resumo);
        $this->assertArrayHasKey('id', $resumo);
        $this->assertTrue(($resumo['id'] ?? 0) > 0);
        $this->assertCount(1, $resumo['embalagens'] ?? []);
        $this->assertSame($resumo['id'], $resumo['embalagens'][0]['id']);
        $this->assertSame($resumo['codigo'], $resumo['embalagens'][0]['codigo']);
    }

    public function test_resumo_pedido_multipla_lista_ids_sem_id_no_topo(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", [
                'qtde_bobinas' => 5,
                'qtde_caixas' => 1,
            ])
            ->assertOk();

        $item2 = PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $this->pedido->id,
            'ordem' => 2,
            'descricao' => 'Etiqueta segunda embalagem',
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => 'PA-ETQ',
            'unidade' => 'UN',
            'qtde_pedida' => '2000.0000',
            'qtde_produzida' => '2000.0000',
            'qtde_faturavel' => '2000.0000',
            'status' => PedidoItem::STATUS_PRODUZIDO,
            'especificacao' => [
                'medida' => '80X40',
                'papel' => 'Couchê Brilho',
                'cores' => 1,
                'tubete' => '3"',
                'etiq_por_rolo' => 1000,
            ],
        ]);

        $op2 = OrdemProducao::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'OP-2026-EMB02',
            'pedido_id' => $this->pedido->id,
            'pedido_item_id' => $item2->id,
            'status' => OrdemProducao::STATUS_CONCLUIDA,
            'qtde_planejada' => '2000.0000',
            'qtde_boa' => '2000.0000',
            'qtde_refugo' => '0.0000',
            'concluida_em' => now(),
        ]);

        $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$op2->id}/embalar", [
                'qtde_bobinas' => 2,
                'qtde_caixas' => 1,
            ])
            ->assertOk();

        $resumo = app(PaEmbalagemService::class)->resumoPedido($this->empresa, $this->pedido->fresh());
        $this->assertIsArray($resumo);
        $this->assertTrue($resumo['multipla'] ?? false);
        $this->assertArrayNotHasKey('id', $resumo);
        $this->assertCount(2, $resumo['embalagens'] ?? []);
        foreach ($resumo['embalagens'] as $linha) {
            $this->assertTrue(($linha['id'] ?? 0) > 0);
            $this->assertNotSame('', $linha['codigo'] ?? '');
            $etiquetas = $this->withHeaders($this->h())
                ->getJson('/api/v1/pa-embalagens/'.$linha['id'].'/etiquetas');
            $etiquetas->assertOk();
            $this->assertNotEmpty($etiquetas->json('data.bobinas'));
        }
        $ids = array_column($resumo['embalagens'], 'id');
        $this->assertSame($ids, array_values(array_unique($ids)));
        $this->assertSame($ids, collect($ids)->sort()->values()->all());

        $lote = $this->withHeaders($this->h())
            ->getJson('/api/v1/pedidos/'.$this->pedido->id.'/embalagem/etiquetas');
        $lote->assertOk();
        $this->assertCount(2, $lote->json('data.embalagens'));
        $this->assertCount(2, $lote->json('data.caixas'));
        $this->assertCount(7, $lote->json('data.bobinas'));
        $this->assertSame($this->pedido->codigo, $lote->json('data.pedido.codigo'));
        $this->assertNull($lote->json('data.embalagem'));
        $faces = $lote->json('data.faces');
        $this->assertNotEmpty($faces);
        // Manuseio: CX do item 1, bobinas dele, CX do item 2, bobinas dele.
        $this->assertSame('CAIXA', $faces[0]['tipo']);
        $this->assertSame(1, $faces[0]['item']['ordem']);
        $bobDoItem1 = array_values(array_filter(
            $faces,
            static fn ($f) => ($f['tipo'] ?? '') === 'BOBINA' && ($f['item']['ordem'] ?? null) === 1
        ));
        $this->assertNotEmpty($bobDoItem1);
        $this->assertSame('Frente A', $bobDoItem1[0]['modelo_nome']);
        $item2Face = null;
        foreach ($faces as $f) {
            if (($f['item']['ordem'] ?? null) === 2) {
                $item2Face = $f;
                break;
            }
        }
        $this->assertNotNull($item2Face);
        $this->assertSame('Etiqueta segunda embalagem', $item2Face['item']['descricao']);
    }
}

