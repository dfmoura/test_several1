<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\OrdemProducao;
use App\Models\PaEmbalagem;
use App\Models\PaEmbalagemBobina;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
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
                'tubete' => '3"',
                'etiq_por_rolo' => 1000,
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
        $this->assertSame(5, $plano['qtde_bobinas']);
        $this->assertSame(1, $plano['qtde_caixas']);
        $this->assertSame('5000.0000', $plano['qtde_etiquetas']);
        $this->assertCount(5, $plano['bobinas']);
    }

    public function test_confirmar_grava_bobinas_caixas_e_qr(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeaders($this->h())
            ->postJson("/api/v1/ordens-producao/{$this->op->id}/embalar", []);

        $res->assertOk();
        $this->assertSame(PaEmbalagem::STATUS_CONFIRMADA, $res->json('data.status'));
        $this->assertSame(5, $res->json('data.qtde_bobinas'));
        $this->assertSame(1, $res->json('data.qtde_caixas'));
        $this->assertCount(5, $res->json('data.bobinas'));
        $this->assertCount(1, $res->json('data.caixas'));
        $this->assertStringStartsWith('BOB:', $res->json('data.bobinas.0.qr_payload'));
        $this->assertStringStartsWith('CX:', $res->json('data.caixas.0.qr_payload'));

        $this->assertSame(5, PaEmbalagemBobina::query()->where('empresa_id', $this->empresa->id)->count());

        $show = $this->withHeaders($this->h())
            ->getJson("/api/v1/ordens-producao/{$this->op->id}");
        $show->assertOk();
        $this->assertNotNull($show->json('data.embalagem'));
        $this->assertSame(5, $show->json('data.embalagem.qtde_bobinas'));
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
        $this->assertSame(4, $plano['qtde_bobinas']); // 1000+1000+1000+200
        $soma = '0';
        foreach ($plano['bobinas'] as $b) {
            $soma = bcadd($soma, $b['qtde_etiquetas'], 4);
        }
        $this->assertSame('3200.0000', $soma);
    }
}
