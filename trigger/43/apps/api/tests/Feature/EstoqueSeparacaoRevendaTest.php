<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueSaldo;
use App\Models\Orcamento;
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
 * Porta A separar: lista física da revenda, sem OP e sem MOV.
 * A baixa continua na NF-e.
 */
class EstoqueSeparacaoRevendaTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private Produto $rev;

    private PedidoItem $item;

    private EstoqueLote $lote;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['estoque.ler', 'estoque.escrever', 'producao.ler', 'producao.escrever'] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-SEP1',
            'razao_social' => 'Separacao Revenda',
            'nome_fantasia' => 'Sep',
            'cnpj' => '22333444000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-SEP1',
            'razao_social' => 'CLIENTE REVENDA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        $this->rev = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'REV-SEP-01',
            'familia' => 'REV',
            'descricao_fiscal' => 'RIBBON REVENDA',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '2.000000',
            'controla_lote' => true,
        ]);

        $end = EstoqueEndereco::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'P02-C01-L01',
            'prateleira' => 2,
            'coluna' => 1,
            'vao' => 1,
            'largura_m' => EstoqueEndereco::LARGURA_M,
            'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
            'altura_m' => EstoqueEndereco::ALTURA_M,
            'ativo' => true,
        ]);

        $this->lote = EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->rev->id,
            'codigo' => 'VOL-REV-1',
            'qtde' => '10.0000',
            'unidade' => 'UN',
            'data_entrada' => '2026-04-01',
            'origem_tipo' => EstoqueLote::ORIGEM_VIRADA,
            'endereco_id' => $end->id,
        ]);

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->rev->id,
            'qtde' => '10.0000',
            'unidade' => 'UN',
            'custo_medio' => '2.000000',
        ]);

        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => 41,
            'codigo' => 'ORC-2026-00041',
            'versao' => 1,
            'parceiro_id' => $parceiro->id,
            'cliente_nome' => 'CLIENTE REVENDA',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [],
            'result_snapshot' => [],
            'tolerancia_qtd_pct' => 0,
        ]);

        $pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PED-2026-SEP01',
            'orcamento_id' => $orc->id,
            'parceiro_id' => $parceiro->id,
            'status' => Pedido::STATUS_LIBERADO,
            'tolerancia_qtd_pct' => '0',
        ]);

        $this->item = PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $pedido->id,
            'ordem' => 1,
            'descricao' => 'Ribbon',
            'necessidade' => PedidoItem::NEC_REVENDA,
            'familia_fiscal' => 'REV',
            'produto_pa_id' => $this->rev->id,
            'unidade' => 'UN',
            'qtde_pedida' => '4.0000',
            'status' => PedidoItem::STATUS_PENDENTE,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-SEP1',
            'name' => 'Almox',
            'email' => 'sep@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['estoque.ler', 'estoque.escrever']);
        $this->user->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    /** @return array<string, string> */
    private function h(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    public function test_fila_e_ficha_mostram_o_volume_sem_baixar_saldo(): void
    {
        Sanctum::actingAs($this->user);

        $fila = $this->withHeaders($this->h())->getJson('/api/v1/estoque/separacoes');
        $fila->assertOk();
        $fila->assertJsonPath('data.resumo.a_separar', 1);
        $fila->assertJsonPath('data.a_separar.0.pedido_item_id', $this->item->id);
        $fila->assertJsonPath('data.a_separar.0.primeiro_local', 'P02-C01-L01');

        $show = $this->withHeaders($this->h())->getJson('/api/v1/estoque/separacoes/'.$this->item->id);
        $show->assertOk();
        $show->assertJsonPath('data.pode_confirmar', true);
        $show->assertJsonPath('data.retirada.volumes.0.lote_id', $this->lote->id);
        $show->assertJsonPath('data.retirada.volumes.0.endereco.codigo', 'P02-C01-L01');
        $this->assertSame(0, EstoqueMovimento::query()->count());
    }

    public function test_confirmar_grava_a_lista_e_nao_move_estoque(): void
    {
        Sanctum::actingAs($this->user);

        $res = $this->withHeaders($this->h())->postJson(
            '/api/v1/estoque/separacoes/'.$this->item->id.'/confirmar',
            ['volumes' => [['lote_id' => $this->lote->id, 'qtde' => '4.0000']]],
        );
        $res->assertOk();
        $res->assertJsonPath('data.status', PedidoItem::STATUS_PRODUZIDO);
        $res->assertJsonPath('data.separacao.volumes.0.codigo', 'VOL-REV-1');
        $res->assertJsonPath('data.separacao.volumes.0.endereco', 'P02-C01-L01');
        $res->assertJsonPath('data.pode_confirmar', false);

        $this->item->refresh();
        $this->assertSame(PedidoItem::STATUS_PRODUZIDO, $this->item->status);
        $this->lote->refresh();
        $this->assertSame('10.0000', (string) $this->lote->qtde);
        $this->assertSame(0, EstoqueMovimento::query()->count());

        $fila = $this->withHeaders($this->h())->getJson('/api/v1/estoque/separacoes');
        $fila->assertJsonPath('data.resumo.a_separar', 0);
    }

    public function test_outra_empresa_nao_ve_a_separacao(): void
    {
        $outra = Empresa::query()->create([
            'codigo' => 'EMP-SEP2',
            'razao_social' => 'Outra Separacao',
            'nome_fantasia' => 'Out',
            'cnpj' => '33444555000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $this->user->empresas()->attach($outra->id, ['padrao' => false]);
        Sanctum::actingAs($this->user);

        $this->withHeaders(['X-Empresa-Id' => (string) $outra->id])
            ->getJson('/api/v1/estoque/separacoes/'.$this->item->id)
            ->assertNotFound();

        $this->withHeaders(['X-Empresa-Id' => (string) $outra->id])
            ->postJson('/api/v1/estoque/separacoes/'.$this->item->id.'/confirmar', [
                'volumes' => [['lote_id' => $this->lote->id, 'qtde' => '1.0000']],
            ])
            ->assertNotFound();

        $this->item->refresh();
        $this->assertSame(PedidoItem::STATUS_PENDENTE, $this->item->status);
    }

    public function test_recusa_confirmar_sem_volume_quando_ha_saldo(): void
    {
        Sanctum::actingAs($this->user);

        $this->withHeaders($this->h())
            ->postJson('/api/v1/estoque/separacoes/'.$this->item->id.'/confirmar', ['volumes' => []])
            ->assertStatus(422);

        $this->item->refresh();
        $this->assertSame(PedidoItem::STATUS_PENDENTE, $this->item->status);
        $this->assertSame(0, EstoqueMovimento::query()->count());
    }

    public function test_rejeita_volume_de_outro_produto_e_item_que_nao_e_revenda(): void
    {
        Sanctum::actingAs($this->user);

        $outro = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'REV-OUTRO',
            'familia' => 'REV',
            'descricao_fiscal' => 'OUTRO',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'controla_lote' => true,
        ]);
        $loteOutro = EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $outro->id,
            'codigo' => 'VOL-OUTRO',
            'qtde' => '3.0000',
            'unidade' => 'UN',
            'data_entrada' => '2026-04-02',
            'origem_tipo' => EstoqueLote::ORIGEM_VIRADA,
        ]);

        $this->withHeaders($this->h())
            ->postJson('/api/v1/estoque/separacoes/'.$this->item->id.'/confirmar', [
                'volumes' => [['lote_id' => $loteOutro->id, 'qtde' => '1.0000']],
            ])
            ->assertStatus(422);

        $this->item->necessidade = PedidoItem::NEC_PRODUCAO;
        $this->item->save();

        $this->withHeaders($this->h())
            ->getJson('/api/v1/estoque/separacoes/'.$this->item->id)
            ->assertStatus(422);
    }
}
