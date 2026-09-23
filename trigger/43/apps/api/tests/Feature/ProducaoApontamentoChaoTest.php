<?php

namespace Tests\Feature;

use App\Models\Empresa;
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
 * ADR_PRODUCAO_APONTAMENTO — fila do chão + mesmo concluir.
 */
class ProducaoApontamentoChaoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private OrdemProducao $op;

    private OrdemProducaoMaterial $matTubete;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['producao.ler', 'producao.escrever', 'estoque.ler'] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-APT1',
            'razao_social' => 'Apontamento Chao',
            'nome_fantasia' => 'Apontar',
            'cnpj' => '44555666000172',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-APT1',
            'razao_social' => 'CLIENTE APONTAR',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        $emb = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-TUB-APT',
            'familia' => 'EMB',
            'descricao_fiscal' => 'TUBETE APONTAR',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '1.000000',
            'controla_lote' => false,
        ]);

        Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PA-ETQ-APT',
            'familia' => 'PA',
            'descricao_fiscal' => 'ETIQUETA APONTAR',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '0',
        ]);

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $emb->id,
            'qtde' => '20.0000',
            'unidade' => 'UN',
            'custo_medio' => '1.000000',
        ]);

        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => 77,
            'codigo' => 'ORC-2026-00077',
            'versao' => 1,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => 'CLIENTE APONTAR',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [],
            'result_snapshot' => [],
            'tolerancia_qtd_pct' => 20,
        ]);

        $pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PED-2026-APT01',
            'orcamento_id' => $orc->id,
            'parceiro_id' => $parceiro->id,
            'status' => Pedido::STATUS_EM_PRODUCAO,
            'tolerancia_qtd_pct' => '20',
        ]);

        $item = PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $pedido->id,
            'ordem' => 1,
            'descricao' => 'Etiqueta apontar',
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => 'PA-ETQ',
            'unidade' => 'UN',
            'qtde_pedida' => '100.0000',
            'status' => PedidoItem::STATUS_EM_PRODUCAO,
        ]);

        $this->op = OrdemProducao::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'OP-2026-APT01',
            'pedido_id' => $pedido->id,
            'pedido_item_id' => $item->id,
            'status' => OrdemProducao::STATUS_ABERTA,
            'qtde_planejada' => '100.0000',
        ]);

        $this->matTubete = OrdemProducaoMaterial::query()->create([
            'empresa_id' => $this->empresa->id,
            'ordem_producao_id' => $this->op->id,
            'produto_id' => $emb->id,
            'qtde_planejada' => '4.0000',
            'qtde_requisitada' => '0',
            'qtde_consumida' => '0',
            'qtde_retorno' => '0',
            'qtde_perda' => '0',
            'unidade' => 'UN',
            'componente' => 'TUBETE',
            'ordem' => 1,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-APT1',
            'name' => 'Op Apontar',
            'email' => 'apontar@test.local',
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

    public function test_fila_vazia_sem_saida_e_403_sem_permissao(): void
    {
        Sanctum::actingAs($this->user);
        $fila = $this->withHeaders($this->h())->getJson('/api/v1/ordens-producao/apontamentos');
        $fila->assertOk();
        $this->assertSame(0, (int) $fila->json('data.resumo.total'));

        $outro = User::query()->create([
            'codigo' => 'USR-APT0',
            'name' => 'Sem Prod',
            'email' => 'semprod@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $outro->empresas()->attach($this->empresa->id, ['padrao' => true]);
        Sanctum::actingAs($outro);
        $this->withHeaders($this->h())->getJson('/api/v1/ordens-producao/apontamentos')->assertForbidden();
    }

    public function test_fila_receber_apontar_concluir_e_painel(): void
    {
        Sanctum::actingAs($this->user);

        $req = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/requisitar",
            ['material_id' => $this->matTubete->id]
        );
        $req->assertOk();

        $fila = $this->withHeaders($this->h())->getJson('/api/v1/ordens-producao/apontamentos');
        $fila->assertOk();
        $this->assertSame(1, (int) $fila->json('data.resumo.a_receber'));
        $this->assertSame(0, (int) $fila->json('data.resumo.a_apontar'));
        $this->assertSame($this->op->id, (int) $fila->json('data.a_receber.0.id'));

        $show = $this->withHeaders($this->h())->getJson(
            "/api/v1/ordens-producao/apontamentos/{$this->op->id}"
        );
        $show->assertOk();
        $this->assertSame($this->op->codigo, $show->json('data.codigo'));
        $this->assertTrue($show->json('data.pode_entregar_insumos'));

        $painel = $this->withHeaders($this->h())->getJson('/api/v1/painel');
        $painel->assertOk();
        $curso = collect($painel->json('data.filas'))->firstWhere('id', 'op_curso');
        $this->assertNotNull($curso);
        $this->assertSame('/ordens-producao/apontamentos', $curso['to']);
        $this->assertSame(1, (int) $curso['count']);

        $ent = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/entregar-insumos",
            ['recebido_por' => 'Maria da máquina']
        );
        $ent->assertOk();

        $fila2 = $this->withHeaders($this->h())->getJson('/api/v1/ordens-producao/apontamentos');
        $this->assertSame(0, (int) $fila2->json('data.resumo.a_receber'));
        $this->assertSame(1, (int) $fila2->json('data.resumo.a_apontar'));

        $conc = $this->withHeaders($this->h())->postJson(
            "/api/v1/ordens-producao/{$this->op->id}/concluir",
            [
                'qtde_boa' => '100.0000',
                'qtde_refugo' => '0',
                'materiais' => [
                    [
                        'material_id' => $this->matTubete->id,
                        'qtde_retorno' => '0',
                        'qtde_perda' => '0',
                    ],
                ],
            ]
        );
        $conc->assertOk();
        $this->assertSame('CONCLUIDA', $conc->json('data.status'));

        $fila3 = $this->withHeaders($this->h())->getJson('/api/v1/ordens-producao/apontamentos');
        $this->assertSame(0, (int) $fila3->json('data.resumo.total'));
    }

    public function test_show_de_outra_empresa_404(): void
    {
        Sanctum::actingAs($this->user);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-APT9',
            'razao_social' => 'Outra',
            'nome_fantasia' => 'Outra',
            'cnpj' => '55666777000120',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $opAlheia = OrdemProducao::query()->create([
            'empresa_id' => $outra->id,
            'codigo' => 'OP-2026-X999',
            'pedido_id' => $this->op->pedido_id,
            'pedido_item_id' => $this->op->pedido_item_id,
            'status' => OrdemProducao::STATUS_ABERTA,
            'qtde_planejada' => '10.0000',
        ]);

        $this->withHeaders($this->h())
            ->getJson("/api/v1/ordens-producao/apontamentos/{$opAlheia->id}")
            ->assertNotFound();
    }
}
