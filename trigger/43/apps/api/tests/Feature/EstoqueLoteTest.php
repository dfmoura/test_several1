<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimentoItem;
use App\Models\EstoqueSaldo;
use App\Models\NaturezaGerencial;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\User;
use App\Services\Estoque\EstoqueSaldoWriter;
use App\Services\Estoque\EstoqueViradaService;
use App\Support\ProdutoLotePolitica;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * BL-045 — lote / entrada / validade. SKU sem flag permanece como antes.
 */
class EstoqueLoteTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $operador;

    private User $aprovador;

    private Parceiro $fornecedor;

    private NaturezaGerencial $nat506;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'compras.ler', 'compras.escrever',
            'estoque.ler', 'estoque.escrever', 'estoque.aprovar',
            'financeiro.ler', 'financeiro.escrever',
        ] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-LOT1',
            'razao_social' => 'Empresa Lote',
            'nome_fantasia' => 'Lote',
            'cnpj' => '33444555000101',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->nat506 = NaturezaGerencial::query()->create([
            'codigo' => '5.06',
            'codigo_exibicao' => 'NAT-5.06',
            'grupo' => 5,
            'nivel' => 2,
            'nome' => 'Pagamento a fornecedor de estoque',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 506,
        ]);

        $this->fornecedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-LOT1',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Fornecedor Lotes',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $this->operador = User::query()->create([
            'name' => 'Op Lote',
            'email' => 'op.lote@test.local',
            'password' => 'secret',
            'codigo' => 'USR-LOT1',
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->operador->givePermissionTo([
            'compras.ler', 'compras.escrever',
            'estoque.ler', 'estoque.escrever',
            'financeiro.ler', 'financeiro.escrever',
        ]);
        $this->operador->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->aprovador = User::query()->create([
            'name' => 'Apr Lote',
            'email' => 'apr.lote@test.local',
            'password' => 'secret',
            'codigo' => 'USR-LOT2',
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->aprovador->givePermissionTo(['estoque.ler', 'estoque.escrever', 'estoque.aprovar']);
        $this->aprovador->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    public function test_politica_grupo_substrato_e_embalagem(): void
    {
        $pap = ProdutoLotePolitica::paraGrupo('MP-PAP');
        $this->assertTrue($pap['controla_lote']);
        $this->assertTrue($pap['controla_validade']);
        $this->assertSame(548, $pap['prazo_validade_dias']);

        $tub = ProdutoLotePolitica::paraGrupo('EMB-TUB');
        $this->assertFalse($tub['controla_lote']);
        $this->assertFalse($tub['controla_validade']);
    }

    public function test_sku_sem_lote_recebe_sem_exigir_codigo(): void
    {
        Sanctum::actingAs($this->operador);
        $produto = $this->criarProduto('EMB-CX-001', 'EMB', 'EMB-CX', false, false);
        $ocItemId = $this->abrirOc($produto, '10.0000', '5.000000');

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson("/api/v1/ordens-compra/{$this->ultimaOcId()}/receber", [
                'vencimento' => '2026-09-01',
                'itens' => [
                    ['ordem_compra_item_id' => $ocItemId, 'qtde_recebida' => '10.0000'],
                ],
            ])
            ->assertCreated();

        $this->assertSame(0, EstoqueLote::query()->where('produto_id', $produto->id)->count());
        $this->assertSame(
            '10.0000',
            (string) EstoqueSaldo::query()->where('produto_id', $produto->id)->value('qtde')
        );
    }

    public function test_sku_com_lote_exige_codigo_e_grava_entrada_validade(): void
    {
        Sanctum::actingAs($this->operador);
        $produto = $this->criarProduto('MP-PAP-004', 'MP', 'MP-PAP', true, true, 548);
        $ocItemId = $this->abrirOc($produto, '20.0000', '8.000000');

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson("/api/v1/ordens-compra/{$this->ultimaOcId()}/receber", [
                'vencimento' => '2026-09-01',
                'nf_data' => '2026-08-01',
                'itens' => [
                    ['ordem_compra_item_id' => $ocItemId, 'qtde_recebida' => '20.0000'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['itens.0.lote_codigo']);

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson("/api/v1/ordens-compra/{$this->ultimaOcId()}/receber", [
                'vencimento' => '2026-09-01',
                'nf_numero' => '9001',
                'nf_data' => '2026-08-01',
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '20.0000',
                        'lote_codigo' => 'COL-24081',
                        'lote_data_entrada' => '2026-08-01',
                        'lote_data_validade' => '2027-08-01',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.itens.0.lote.codigo', 'COL-24081');

        $lote = EstoqueLote::query()->where('produto_id', $produto->id)->firstOrFail();
        $this->assertSame('COL-24081', $lote->codigo);
        $this->assertSame('20.0000', (string) $lote->qtde);
        $this->assertSame('2026-08-01', $lote->data_entrada->format('Y-m-d'));
        $this->assertSame('2027-08-01', $lote->data_validade->format('Y-m-d'));
        $this->assertSame(
            '20.0000',
            (string) EstoqueSaldo::query()->where('produto_id', $produto->id)->value('qtde')
        );
    }

    public function test_saida_fefo_consome_lote_que_vence_primeiro(): void
    {
        $produto = $this->criarProduto('MP-TIN-001', 'MP', 'MP-TIN', true, true, 365);
        $writer = app(EstoqueSaldoWriter::class);

        $writer->aplicarEntrada($this->empresa, $produto, '8.0000', '80.00', [
            'codigo' => 'TIN-NOVO',
            'data_entrada' => '2026-07-01',
            'data_validade' => '2027-07-01',
        ]);
        $writer->aplicarEntrada($this->empresa, $produto, '5.0000', '50.00', [
            'codigo' => 'TIN-VELHO',
            'data_entrada' => '2026-01-01',
            'data_validade' => '2026-09-01',
        ]);

        $saida = $writer->aplicarSaida($this->empresa, $produto, '6.0000');
        $this->assertCount(2, $saida['alocacoes']);

        $velho = EstoqueLote::query()->where('codigo', 'TIN-VELHO')->firstOrFail();
        $novo = EstoqueLote::query()->where('codigo', 'TIN-NOVO')->firstOrFail();
        $this->assertSame('0.0000', (string) $velho->qtde);
        $this->assertSame('7.0000', (string) $novo->qtde);
        $this->assertSame(
            '7.0000',
            (string) EstoqueSaldo::query()->where('produto_id', $produto->id)->value('qtde')
        );
    }

    public function test_virada_gera_lotes_quando_sku_controla(): void
    {
        $this->criarProduto('MP-CLD-001', 'MP', 'MP-CLD', true, true, 730);

        $result = app(EstoqueViradaService::class)->popular(
            $this->empresa,
            $this->operador,
            $this->aprovador,
            ['incluir_demos' => false, 'set_minimos' => false]
        );

        $this->assertSame(0, $result['erros']);
        $this->assertGreaterThanOrEqual(1, $result['aplicados']);

        $produto = Produto::query()->where('codigo', 'MP-CLD-001')->firstOrFail();
        $lotes = EstoqueLote::query()->where('produto_id', $produto->id)->get();
        $this->assertGreaterThanOrEqual(1, $lotes->count());
        $soma = $lotes->reduce(
            fn (string $acc, EstoqueLote $l) => bcadd($acc, (string) $l->qtde, 4),
            '0'
        );
        $this->assertSame(
            (string) EstoqueSaldo::query()->where('produto_id', $produto->id)->value('qtde'),
            $soma
        );
    }

    public function test_backfill_amarra_lotes_sem_alterar_saldo_cm_nem_criar_mov(): void
    {
        $produto = $this->criarProduto('MP-PAP-002', 'MP', 'MP-PAP', false, false, null);
        app(EstoqueSaldoWriter::class)->aplicarEntrada($this->empresa, $produto, '60.0000', '120.00');

        $produto->controla_lote = true;
        $produto->controla_validade = true;
        $produto->prazo_validade_dias = 548;
        $produto->save();

        $saldoAntes = (string) EstoqueSaldo::query()->where('produto_id', $produto->id)->value('qtde');
        $cmAntes = (string) EstoqueSaldo::query()->where('produto_id', $produto->id)->value('custo_medio');
        $movsAntes = EstoqueMovimentoItem::query()->where('produto_id', $produto->id)->count();
        $this->assertSame(0, EstoqueLote::query()->where('produto_id', $produto->id)->count());

        $result = app(EstoqueViradaService::class)->popular(
            $this->empresa,
            $this->operador,
            $this->aprovador,
            ['incluir_demos' => false, 'set_minimos' => false]
        );

        $this->assertSame(0, $result['erros']);
        $linha = collect($result['itens'])->firstWhere('codigo', 'MP-PAP-002');
        $this->assertSame('aplicado', $linha['acao'] ?? null);
        $this->assertSame('backfill_lotes', $linha['fonte'] ?? null);

        $this->assertSame(
            $saldoAntes,
            (string) EstoqueSaldo::query()->where('produto_id', $produto->id)->value('qtde')
        );
        $this->assertSame(
            $cmAntes,
            (string) EstoqueSaldo::query()->where('produto_id', $produto->id)->value('custo_medio')
        );
        $this->assertSame(
            $movsAntes,
            EstoqueMovimentoItem::query()->where('produto_id', $produto->id)->count()
        );

        $lotes = EstoqueLote::query()->where('produto_id', $produto->id)->get();
        $this->assertGreaterThanOrEqual(1, $lotes->count());
        $soma = $lotes->reduce(
            fn (string $acc, EstoqueLote $l) => bcadd($acc, (string) $l->qtde, 4),
            '0'
        );
        $this->assertSame($saldoAntes, $soma);
        $this->assertTrue($lotes->every(
            fn (EstoqueLote $l) => $l->origem_tipo === EstoqueLote::ORIGEM_BACKFILL
        ));
    }

    public function test_consulta_lotes_isolada_por_emp(): void
    {
        Sanctum::actingAs($this->operador);
        $produto = $this->criarProduto('MP-PAP-001', 'MP', 'MP-PAP', true, true, 548);
        app(EstoqueSaldoWriter::class)->aplicarEntrada($this->empresa, $produto, '3.0000', '30.00', [
            'codigo' => 'EMP1-L1',
            'data_entrada' => '2026-08-01',
            'data_validade' => '2027-08-01',
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-LOT2',
            'razao_social' => 'Outra EMP',
            'cnpj' => '44555666000112',
            'situacao' => 'ATIVA',
        ]);
        $this->operador->empresas()->attach($outra->id);

        $this->withHeaders(['X-Empresa-Id' => (string) $outra->id])
            ->getJson('/api/v1/estoque/lotes')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->getJson('/api/v1/estoque/lotes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.codigo', 'EMP1-L1');
    }

    public function test_movimento_item_carrega_lote_id(): void
    {
        $produto = $this->criarProduto('MP-FLM-001', 'MP', 'MP-FLM', true, true, 548);
        $aplicado = app(EstoqueSaldoWriter::class)->aplicarEntrada(
            $this->empresa,
            $produto,
            '2.0000',
            '20.00',
            [
                'codigo' => 'BOPP-A',
                'data_entrada' => '2026-06-01',
                'data_validade' => '2027-12-01',
            ]
        );
        $this->assertNotNull($aplicado['lote_id']);
        $this->assertTrue(
            EstoqueLote::query()->where('id', $aplicado['lote_id'])->exists()
        );
        $this->assertSame(0, EstoqueMovimentoItem::query()->count());
    }

    private ?int $ocId = null;

    private function criarProduto(
        string $codigo,
        string $familia,
        string $grupo,
        bool $lote,
        bool $validade,
        ?int $prazo = null
    ): Produto {
        return Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => $codigo,
            'familia' => $familia,
            'grupo' => $grupo,
            'descricao_fiscal' => $codigo,
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
            'controla_lote' => $lote,
            'controla_validade' => $validade,
            'prazo_validade_dias' => $prazo,
        ]);
    }

    private function abrirOc(Produto $produto, string $qtde, string $valor): int
    {
        $res = $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $produto->id,
                        'qtde_pedida' => $qtde,
                        'valor_unitario' => $valor,
                    ],
                ],
            ])
            ->assertCreated();

        $this->ocId = (int) $res->json('data.id');

        return (int) $res->json('data.itens.0.id');
    }

    private function ultimaOcId(): int
    {
        return (int) $this->ocId;
    }
}
