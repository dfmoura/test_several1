<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\NaturezaGerencial;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\User;
use App\Services\Cadastros\ProdutoCadastroExactData;
use App\Services\Estoque\EstoqueEnderecoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * ADR_CADASTRO_INSUMO_VOLUME F2–F4 — multi-volume + endereço + etiqueta.
 */
class EstoqueVolumeMultiTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private Parceiro $fornecedor;

    private Produto $produto;

    private NaturezaGerencial $nat506;

    /** @var array{X-Empresa-Id: string} */
    private array $h;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'compras.ler', 'compras.escrever',
            'estoque.ler', 'estoque.escrever',
            'financeiro.ler', 'financeiro.escrever',
        ] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-VOL1',
            'razao_social' => 'Empresa Volume',
            'nome_fantasia' => 'VOL',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->nat506 = NaturezaGerencial::query()->create([
            'codigo' => '5.06',
            'codigo_exibicao' => 'NAT-5.06',
            'grupo' => 5,
            'nivel' => 2,
            'parent_id' => null,
            'nome' => 'Pagamento a fornecedor de estoque',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 506,
        ]);

        $this->fornecedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-VOL1',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '43999630000124',
            'razao_social' => 'AVERY DENNISON DO BRASIL LTDA',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $exact = ProdutoCadastroExactData::insumos()[0];
        $this->produto = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => $exact['codigo'],
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => $exact['descricao_fiscal'],
            'ncm' => $exact['ncm'],
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'controla_lote' => true,
            'controla_validade' => true,
            'prazo_validade_dias' => 548,
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
            'atributos' => ['programa_compra' => 'EXACT 1000', 'camada_cadastro' => 'A'],
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-VOL1',
            'name' => 'Operador Volume',
            'email' => 'vol@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo([
            'compras.ler', 'compras.escrever',
            'estoque.ler', 'estoque.escrever',
            'financeiro.ler', 'financeiro.escrever',
        ]);
        $this->user->empresas()->attach([$this->empresa->id]);

        $this->h = ['X-Empresa-Id' => (string) $this->empresa->id];
        Sanctum::actingAs($this->user);
    }

    public function test_receber_multi_volume_cria_n_lotes_com_dimensao(): void
    {
        $oc = $this->withHeaders($this->h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [[
                    'produto_id' => $this->produto->id,
                    'qtde_pedida' => '424.2000',
                    'valor_unitario' => '10.000000',
                ]],
            ])
            ->assertCreated();

        $ocId = $oc->json('data.id');
        $this->enviarOrdemCompra($this->h, (int) $ocId);
        $ocItemId = $oc->json('data.itens.0.id');

        $this->withHeaders($this->h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'natureza_id' => $this->nat506->id,
                'nf_numero' => '889523',
                'nf_data' => '2026-09-01',
                'vencimento' => '2026-09-15',
                'itens' => [[
                    'ordem_compra_item_id' => $ocItemId,
                    'qtde_recebida' => '424.2000',
                    'lotes' => [
                        [
                            'codigo' => '00081111-01-0034',
                            'qtde' => '210.0000',
                            'data_entrada' => '2026-09-01',
                            'largura_mm' => '210',
                        ],
                        [
                            'codigo' => '00081111-01-0014',
                            'qtde' => '214.2000',
                            'data_entrada' => '2026-09-01',
                            'largura_mm' => '210',
                        ],
                    ],
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.tipo', EstoqueMovimento::TIPO_ENTRADA_COMPRA);

        $lotes = EstoqueLote::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->produto->id)
            ->get()
            ->keyBy('codigo');

        $this->assertCount(2, $lotes);
        $this->assertSame('210.0000', (string) $lotes['00081111-01-0034']->qtde);
        $this->assertSame('214.2000', (string) $lotes['00081111-01-0014']->qtde);
        $this->assertNotNull($lotes['00081111-01-0034']->largura_mm);
        $this->assertNotNull($lotes['00081111-01-0034']->comprimento_m);
        $this->assertNotNull($lotes['00081111-01-0034']->qr_token);
        $this->assertSame('1000.00', (string) $lotes['00081111-01-0034']->comprimento_m);
    }

    public function test_receber_mesmo_nlote_cria_volumes_distintos_com_qr(): void
    {
        $oc = $this->withHeaders($this->h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [[
                    'produto_id' => $this->produto->id,
                    'qtde_pedida' => '240.0000',
                    'valor_unitario' => '10.000000',
                ]],
            ])
            ->assertCreated();

        $ocId = $oc->json('data.id');
        $this->enviarOrdemCompra($this->h, (int) $ocId);
        $ocItemId = $oc->json('data.itens.0.id');

        $mov = $this->withHeaders($this->h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'natureza_id' => $this->nat506->id,
                'nf_numero' => '173837',
                'nf_data' => '2026-09-01',
                'vencimento' => '2026-09-15',
                'itens' => [[
                    'ordem_compra_item_id' => $ocItemId,
                    'qtde_recebida' => '240.0000',
                    'lotes' => [
                        [
                            'codigo' => 'OCCE9921',
                            'qtde' => '60.0000',
                            'data_entrada' => '2026-09-01',
                            'largura_mm' => '60',
                        ],
                        [
                            'codigo' => 'OCCE9921',
                            'qtde' => '80.0000',
                            'data_entrada' => '2026-09-01',
                            'largura_mm' => '80',
                        ],
                        [
                            'codigo' => 'OCCE9921',
                            'qtde' => '100.0000',
                            'data_entrada' => '2026-09-01',
                            'largura_mm' => '100',
                        ],
                    ],
                ]],
            ])
            ->assertCreated();

        $movId = (int) $mov->json('data.id');
        $lotes = EstoqueLote::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->produto->id)
            ->orderBy('id')
            ->get();

        $this->assertCount(3, $lotes);
        $this->assertSame('OCCE9921', (string) $lotes[0]->codigo);
        $this->assertSame('OCCE9921#2', (string) $lotes[1]->codigo);
        $this->assertSame('OCCE9921#3', (string) $lotes[2]->codigo);
        $this->assertSame('60.0000', (string) $lotes[0]->qtde);
        $this->assertSame('80.0000', (string) $lotes[1]->qtde);
        $this->assertSame('100.0000', (string) $lotes[2]->qtde);

        $tokens = $lotes->pluck('qr_token')->filter()->unique();
        $this->assertCount(3, $tokens);

        $ficha = $this->withHeaders($this->h)
            ->getJson("/api/v1/estoque/movimentos/{$movId}/ficha-entrada")
            ->assertOk()
            ->json('data');

        $this->assertSame(3, $ficha['volumes_count']);
        $payloads = collect($ficha['volumes'])->pluck('qr_payload')->unique();
        $this->assertCount(3, $payloads);
        foreach ($ficha['volumes'] as $vol) {
            $this->assertStringStartsWith('VOL:'.$this->empresa->id.':', $vol['qr_payload']);
        }

        $etq = $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/lotes/etiquetas?movimento_id='.$movId)
            ->assertOk()
            ->json('data');

        $this->assertSame(3, $etq['volumes_count']);
        $this->assertSame($movId, $etq['filtro']['movimento_id']);
        $this->assertCount(3, $etq['volumes']);
        foreach ($etq['volumes'] as $vol) {
            $this->assertStringStartsWith('VOL:'.$this->empresa->id.':', $vol['qr_payload']);
        }

        $outroMov = EstoqueMovimento::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MOV-ETQ-VAZIO',
            'tipo' => EstoqueMovimento::TIPO_ENTRADA_COMPRA,
            'conferido_em' => now(),
        ]);
        $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/lotes/etiquetas?movimento_id='.$outroMov->id)
            ->assertOk()
            ->assertJsonPath('data.volumes_count', 0);
    }

    public function test_seed_enderecos_e_vinculo_etiqueta(): void
    {
        $out = app(EstoqueEnderecoService::class)->seedGabarito($this->empresa);
        $this->assertSame(72, $out['total']);
        $this->assertSame(72, EstoqueEndereco::query()->where('empresa_id', $this->empresa->id)->where('ativo', true)->count());
        $this->assertSame(0, $out['desativados']);

        $lote = EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'codigo' => 'LOT-ETQ-1',
            'data_entrada' => now()->toDateString(),
            'qtde' => '10.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
            'qr_token' => bin2hex(random_bytes(8)),
        ]);

        $end = EstoqueEndereco::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('codigo', 'P01-C01-L01')
            ->firstOrFail();

        $this->withHeaders($this->h)
            ->postJson("/api/v1/estoque/lotes/{$lote->id}/endereco", [
                'endereco_id' => $end->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.endereco.codigo', 'P01-C01-L01');

        $this->withHeaders($this->h)
            ->getJson("/api/v1/estoque/lotes/{$lote->id}/etiqueta")
            ->assertOk()
            ->assertJsonPath('data.codigo', 'LOT-ETQ-1')
            ->assertJsonStructure(['data' => ['qr_payload', 'produto']]);

        $volPayload = 'VOL:'.$this->empresa->id.':'.$lote->id.':'.$lote->fresh()->qr_token;
        $endPayload = $end->qrPayload();

        $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/volumes/por-qr?payload='.urlencode($volPayload))
            ->assertOk()
            ->assertJsonPath('data.lote_id', $lote->id);

        $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/enderecos/por-qr?payload='.urlencode($endPayload))
            ->assertOk()
            ->assertJsonPath('data.codigo', 'P01-C01-L01');

        // QR legado Vxx ainda resolve após migração Lxx (mesmo id/slot).
        $legadoPayload = 'END:'.$this->empresa->id.':'.$end->id.':'.EstoqueEndereco::codigoLegadoDe(1, 1, 1);
        $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/enderecos/por-qr?payload='.urlencode($legadoPayload))
            ->assertOk()
            ->assertJsonPath('data.codigo', 'P01-C01-L01');

        $lote2 = EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'codigo' => 'LOT-ETQ-2',
            'data_entrada' => now()->toDateString(),
            'qtde' => '5.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
            'qr_token' => bin2hex(random_bytes(8)),
        ]);

        $end2 = EstoqueEndereco::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('codigo', 'P02-C03-L03')
            ->firstOrFail();

        $this->withHeaders($this->h)
            ->postJson('/api/v1/estoque/guardar', [
                'volume_qr' => 'VOL:'.$this->empresa->id.':'.$lote2->id.':'.$lote2->qr_token,
                'endereco_qr' => $end2->qrPayload(),
            ])
            ->assertOk()
            ->assertJsonPath('data.endereco.codigo', 'P02-C03-L03');

        $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/lotes/etiquetas?sem_endereco=1')
            ->assertOk()
            ->assertJsonPath('data.volumes_count', 0);

        // Extensão legada V04 permanece ativa; o seed só alinha o código no mesmo id.
        $ext = EstoqueEndereco::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'P01-C01-V04',
            'prateleira' => 1,
            'coluna' => 1,
            'vao' => 4,
            'largura_m' => EstoqueEndereco::LARGURA_M,
            'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
            'altura_m' => EstoqueEndereco::ALTURA_M,
            'ativo' => true,
        ]);
        $realinhado = app(EstoqueEnderecoService::class)->seedGabarito($this->empresa);
        $this->assertSame(0, $realinhado['desativados']);
        $this->assertSame(1, $realinhado['renomeados']);
        $ext->refresh();
        $this->assertTrue($ext->ativo);
        $this->assertSame('P01-C01-L04', $ext->codigo);
        $this->assertSame(
            73,
            EstoqueEndereco::query()->where('empresa_id', $this->empresa->id)->where('ativo', true)->count()
        );

        $legadoExt = 'END:'.$this->empresa->id.':'.$ext->id.':P01-C01-V04';
        $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/enderecos/por-qr?payload='.urlencode($legadoExt))
            ->assertOk()
            ->assertJsonPath('data.id', $ext->id)
            ->assertJsonPath('data.codigo', 'P01-C01-L04');
    }

    public function test_mapa_ocupacao_agrega_volumes_por_local(): void
    {
        app(EstoqueEnderecoService::class)->seedGabarito($this->empresa);

        $end = EstoqueEndereco::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('codigo', 'P01-C01-L01')
            ->firstOrFail();

        EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'codigo' => 'LOT-MAPA-1',
            'data_entrada' => now()->toDateString(),
            'qtde' => '12.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
            'endereco_id' => $end->id,
            'qr_token' => bin2hex(random_bytes(8)),
        ]);
        EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'codigo' => 'LOT-MAPA-2',
            'data_entrada' => now()->toDateString(),
            'qtde' => '5.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
            'endereco_id' => $end->id,
            'qr_token' => bin2hex(random_bytes(8)),
        ]);
        EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'codigo' => 'LOT-MAPA-SEM',
            'data_entrada' => now()->toDateString(),
            'qtde' => '3.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
            'qr_token' => bin2hex(random_bytes(8)),
        ]);
        EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'codigo' => 'LOT-MAPA-ZERO',
            'data_entrada' => now()->toDateString(),
            'qtde' => '0.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
            'endereco_id' => $end->id,
            'qr_token' => bin2hex(random_bytes(8)),
        ]);

        $mapa = $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/mapa')
            ->assertOk()
            ->json('data');

        $this->assertSame(72, $mapa['resumo']['total_locais']);
        $this->assertSame(1, $mapa['resumo']['ocupados']);
        $this->assertSame(71, $mapa['resumo']['vazios']);
        $this->assertSame(2, $mapa['resumo']['volumes_guardados']);
        $this->assertSame(1, $mapa['resumo']['volumes_sem_local']);
        $this->assertSame(1, $mapa['resumo']['skus_distintos']);

        $cell = collect($mapa['locais'])->firstWhere('codigo', 'P01-C01-L01');
        $this->assertNotNull($cell);
        $this->assertSame(2, $cell['volumes_count']);
        $this->assertSame(1, $cell['skus_count']);

        $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/lotes?endereco_id='.$end->id.'&com_qtde=1')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_cadastra_local_alem_do_gabarito_sem_apagar_no_seed(): void
    {
        app(EstoqueEnderecoService::class)->seedGabarito($this->empresa);

        $l04 = $this->withHeaders($this->h)
            ->postJson('/api/v1/estoque/enderecos', [
                'prateleira' => 1,
                'coluna' => 1,
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'P01-C01-L04')
            ->assertJsonPath('data.vao', 4)
            ->json('data');

        $this->withHeaders($this->h)
            ->postJson('/api/v1/estoque/enderecos', [
                'prateleira' => 1,
                'coluna' => 1,
                'vao' => 4,
            ])
            ->assertStatus(422);

        $p07 = $this->withHeaders($this->h)
            ->postJson('/api/v1/estoque/enderecos', [
                'prateleira' => 7,
                'coluna' => 1,
                'vao' => 1,
                'largura_m' => '1.200',
            ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'P07-C01-L01')
            ->json('data');

        $mapa = $this->withHeaders($this->h)
            ->getJson('/api/v1/estoque/mapa')
            ->assertOk()
            ->json('data');
        $this->assertSame(74, $mapa['resumo']['total_locais']);
        $this->assertNotNull(collect($mapa['locais'])->firstWhere('codigo', 'P01-C01-L04'));
        $this->assertNotNull(collect($mapa['locais'])->firstWhere('codigo', 'P07-C01-L01'));

        $this->withHeaders($this->h)
            ->patchJson('/api/v1/estoque/enderecos/'.$l04['id'], ['ativo' => false])
            ->assertOk()
            ->assertJsonPath('data.ativo', false)
            ->assertJsonPath('data.codigo', 'P01-C01-L04');

        $peloProximo = $this->withHeaders($this->h)
            ->postJson('/api/v1/estoque/enderecos', [
                'prateleira' => 1,
                'coluna' => 1,
            ])
            ->assertCreated()
            ->json('data');
        $this->assertSame($l04['id'], $peloProximo['id']);
        $this->assertSame('P01-C01-L04', $peloProximo['codigo']);
        $this->assertTrue($peloProximo['ativo']);

        $this->withHeaders($this->h)
            ->patchJson('/api/v1/estoque/enderecos/'.$l04['id'], ['ativo' => false])
            ->assertOk();

        $this->assertSame(
            $l04['id'],
            EstoqueEndereco::query()->where('codigo', 'P01-C01-L04')->where('empresa_id', $this->empresa->id)->value('id')
        );

        app(EstoqueEnderecoService::class)->seedGabarito($this->empresa);

        $this->assertFalse(
            (bool) EstoqueEndereco::query()->whereKey($l04['id'])->value('ativo')
        );
        $this->assertTrue(
            (bool) EstoqueEndereco::query()->whereKey($p07['id'])->value('ativo')
        );
        $this->assertSame('P07-C01-L01', EstoqueEndereco::query()->whereKey($p07['id'])->value('codigo'));
        $this->assertSame(
            73,
            EstoqueEndereco::query()->where('empresa_id', $this->empresa->id)->where('ativo', true)->count()
        );

        $reativado = $this->withHeaders($this->h)
            ->postJson('/api/v1/estoque/enderecos', [
                'prateleira' => 1,
                'coluna' => 1,
                'vao' => 4,
            ])
            ->assertCreated()
            ->json('data');
        $this->assertSame($l04['id'], $reativado['id']);
        $this->assertTrue($reativado['ativo']);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-VOL2',
            'razao_social' => 'Outra Empresa',
            'nome_fantasia' => 'OUT',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->withHeaders(['X-Empresa-Id' => (string) $outra->id])
            ->postJson('/api/v1/estoque/enderecos', [
                'prateleira' => 1,
                'coluna' => 1,
                'vao' => 1,
            ])
            ->assertStatus(403);

        $this->withHeaders($this->h)
            ->patchJson('/api/v1/estoque/enderecos/999999', ['ativo' => false])
            ->assertNotFound();

        EstoqueEndereco::query()->create([
            'empresa_id' => $outra->id,
            'codigo' => 'P01-C01-L01',
            'prateleira' => 1,
            'coluna' => 1,
            'vao' => 1,
            'largura_m' => EstoqueEndereco::LARGURA_M,
            'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
            'altura_m' => EstoqueEndereco::ALTURA_M,
            'ativo' => true,
        ]);

        $ids = collect($this->withHeaders($this->h)->getJson('/api/v1/estoque/enderecos')->assertOk()->json('data'))
            ->pluck('id');
        $this->assertFalse(
            $ids->contains(
                EstoqueEndereco::query()->where('empresa_id', $outra->id)->value('id')
            )
        );

        $leitor = User::query()->create([
            'codigo' => 'USR-VOL-LER',
            'name' => 'Leitor Volume',
            'email' => 'vol-ler@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $leitor->givePermissionTo(['estoque.ler']);
        $leitor->empresas()->attach([$this->empresa->id]);
        Sanctum::actingAs($leitor);

        $this->withHeaders($this->h)
            ->postJson('/api/v1/estoque/enderecos', [
                'prateleira' => 1,
                'coluna' => 2,
                'vao' => 4,
            ])
            ->assertStatus(403);
    }

    public function test_catalogo_exact_tem_4_insumos(): void
    {
        $this->assertCount(4, ProdutoCadastroExactData::insumos());
        $this->assertSame(4, ProdutoCadastroExactData::TOTAL);
    }
}
