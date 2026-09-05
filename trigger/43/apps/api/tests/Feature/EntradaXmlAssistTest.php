<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\NaturezaGerencial;
use App\Models\NfeEntrada;
use App\Models\NfeEntradaItem;
use App\Models\OrdemCompra;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\ProdutoFornecedorCodigo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class EntradaXmlAssistTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private Parceiro $fornecedor;

    private Produto $produto;

    private NaturezaGerencial $nat506;

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
            'codigo' => 'EMP-XML1',
            'razao_social' => 'Empresa XML',
            'nome_fantasia' => 'XML',
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
            'codigo' => 'PAR-XML1',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '11222333000181',
            'razao_social' => 'FORNECEDOR BOBINAS LTDA',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $this->produto = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-TUB-001',
            'familia' => 'EMB',
            'grupo' => 'EMB-TUB',
            'descricao_fiscal' => 'Tubete 76mm',
            'ncm' => '48229000',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-XML1',
            'name' => 'Operador XML',
            'email' => 'xml@test.local',
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
    }

    public function test_preview_xml_preenche_e_receber_persiste_cprod(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '100.0000',
                        'valor_unitario' => '2.500000',
                    ],
                ],
            ])
            ->assertCreated();

        $ocId = $oc->json('data.id');
        $ocItemId = $oc->json('data.itens.0.id');

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_tubete.xml'));
        $this->assertNotFalse($xml);

        $preview = $this->withHeaders($h)
            ->post("/api/v1/ordens-compra/{$ocId}/receber/xml/preview", [
                'file' => UploadedFile::fake()->createWithContent('nfe.xml', $xml),
            ])
            ->assertOk()
            ->assertJsonPath('data.nf.numero', '1001')
            ->assertJsonPath('data.nf.vencimento_sugerido', '2026-09-11')
            ->assertJsonPath('data.linhas.0.c_prod', 'FORN-TUB-76')
            ->assertJsonPath('data.linhas.0.match.ordem_compra_item_id', $ocItemId)
            ->assertJsonPath('data.sugerido_receber.itens.0.qtde_recebida', '100.0000');

        $this->assertSame('1001', $preview->json('data.sugerido_receber.nf_numero'));

        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'nf_chave' => $preview->json('data.nf.chave'),
                'nf_numero' => $preview->json('data.nf.numero'),
                'nf_data' => $preview->json('data.nf.data_emissao'),
                'vencimento' => $preview->json('data.nf.vencimento_sugerido'),
                'natureza_id' => $this->nat506->id,
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '100.0000',
                    ],
                ],
                'cprod_maps' => [
                    [
                        'c_prod' => 'FORN-TUB-76',
                        'produto_id' => $this->produto->id,
                        'x_prod' => 'TUBETE PAPELAO 76MM',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.tipo', EstoqueMovimento::TIPO_ENTRADA_COMPRA)
            ->assertJsonPath('data.titulo.natureza.codigo', '5.06');

        $this->assertDatabaseCount('nfe_entradas', 0);

        $this->assertDatabaseHas('produto_fornecedor_codigos', [
            'empresa_id' => $this->empresa->id,
            'fornecedor_id' => $this->fornecedor->id,
            'produto_id' => $this->produto->id,
            'c_prod' => 'FORN-TUB-76',
        ]);

        $this->assertSame(
            OrdemCompra::STATUS_RECEBIDA,
            OrdemCompra::query()->findOrFail($ocId)->status
        );

        // Segunda OC: match ALTA via de-para
        $oc2 = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '50.0000',
                        'valor_unitario' => '2.500000',
                    ],
                ],
            ])
            ->assertCreated();

        // XML qtde 100 ≠ 50 → ainda casa por cProd de-para
        $this->withHeaders($h)
            ->post("/api/v1/ordens-compra/{$oc2->json('data.id')}/receber/xml/preview", [
                'file' => UploadedFile::fake()->createWithContent('nfe2.xml', $xml),
            ])
            ->assertOk()
            ->assertJsonPath('data.linhas.0.match.confianca', 'ALTA')
            ->assertJsonPath('data.linhas.0.match.motivo', 'de-para cProd');

        $this->assertSame(1, ProdutoFornecedorCodigo::query()->count());
    }

    public function test_preview_multi_det_mesmo_cprod_agrega_um_item_oc(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->fornecedor->update([
            'cnpj_cpf' => '43999630000124',
            'razao_social' => 'AVERY DENNISON DO BRASIL LTDA',
        ]);
        $this->produto->update([
            'codigo' => 'MP-PAP-013',
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'FASSON ECOPRINT/S2045N/60G EXACT 1000',
            'ncm' => '48114190',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'controla_lote' => true,
        ]);

        ProdutoFornecedorCodigo::query()->create([
            'empresa_id' => $this->empresa->id,
            'fornecedor_id' => $this->fornecedor->id,
            'produto_id' => $this->produto->id,
            'c_prod' => 'AAS029-EX4',
            'x_prod' => 'FASSON ECOPRINT/S2045N/60G - EXACT 1000',
        ]);

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [[
                    'produto_id' => $this->produto->id,
                    'qtde_pedida' => '1240.0000',
                    'unidade' => 'M2',
                    'valor_unitario' => '2.580000',
                ]],
            ])
            ->assertCreated();

        $ocId = $oc->json('data.id');
        $ocItemId = $oc->json('data.itens.0.id');

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_exact_multidet.xml'));
        $this->assertNotFalse($xml);

        $preview = $this->withHeaders($h)
            ->post("/api/v1/ordens-compra/{$ocId}/receber/xml/preview", [
                'file' => UploadedFile::fake()->createWithContent('exact.xml', $xml),
            ])
            ->assertOk()
            ->assertJsonPath('data.linhas.0.match.motivo', 'de-para cProd')
            ->assertJsonPath('data.linhas.1.match.motivo', 'de-para cProd')
            ->assertJsonPath('data.linhas.0.match.ordem_compra_item_id', $ocItemId)
            ->assertJsonPath('data.linhas.1.match.ordem_compra_item_id', $ocItemId)
            ->assertJsonPath('data.sugerido_receber.itens.0.qtde_recebida', '1240.0000');

        $lotes = $preview->json('data.sugerido_receber.itens.0.lotes');
        $this->assertIsArray($lotes);
        $this->assertCount(6, $lotes);

        $warnings = collect($preview->json('data.warnings') ?? []);
        $this->assertNotNull(
            $warnings->first(fn ($w) => ($w['codigo'] ?? null) === 'MULTI_VOLUME'),
            'Deve avisar multi-volume dos rastros agregados'
        );
    }

    public function test_preview_e_receber_multi_titulos_das_parcelas_xml(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '100.0000',
                        'valor_unitario' => '2.500000',
                    ],
                ],
            ])
            ->assertCreated();

        $ocId = $oc->json('data.id');
        $ocItemId = $oc->json('data.itens.0.id');

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_tubete_3dup.xml'));
        $this->assertNotFalse($xml);

        $preview = $this->withHeaders($h)
            ->post("/api/v1/ordens-compra/{$ocId}/receber/xml/preview", [
                'file' => UploadedFile::fake()->createWithContent('nfe3.xml', $xml),
            ])
            ->assertOk()
            ->assertJsonPath('data.nf.valor_nf', '275.00')
            ->assertJsonPath('data.nf.parcelas.0.n_dup', '001')
            ->assertJsonPath('data.nf.parcelas.0.valor', '100.00')
            ->assertJsonPath('data.nf.parcelas.2.n_dup', '003')
            ->assertJsonPath('data.nf.parcelas.2.valor', '75.00')
            ->assertJsonPath('data.sugerido_receber.parcelas.1.vencimento', '2026-10-11');

        $warnings = $preview->json('data.warnings');
        $this->assertIsArray($warnings);
        $ipiInfo = collect($warnings)->first(
            fn ($w) => ($w['codigo'] ?? null) === 'PARCELAS_VS_OC_FISCAL_OK'
        );
        $this->assertNotNull($ipiInfo, 'Diferença IPI deve ser INFO fiscal, não erro.');
        $this->assertSame('INFO', $ipiInfo['nivel']);
        $this->assertStringContainsString('IPI', $ipiInfo['mensagem']);

        $receber = $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'nf_chave' => $preview->json('data.nf.chave'),
                'nf_numero' => $preview->json('data.nf.numero'),
                'nf_data' => $preview->json('data.nf.data_emissao'),
                'nf_valor' => $preview->json('data.nf.valor_nf'),
                'nf_totais' => $preview->json('data.nf.totais'),
                'parcelas' => $preview->json('data.sugerido_receber.parcelas'),
                'natureza_id' => $this->nat506->id,
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '100.0000',
                    ],
                ],
                'cprod_maps' => [
                    [
                        'c_prod' => 'FORN-TUB-76',
                        'produto_id' => $this->produto->id,
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.nf_valor', '275.00')
            ->assertJsonPath('data.titulo.valor', '100.00')
            ->assertJsonPath('data.titulos.0.n_dup', '001')
            ->assertJsonPath('data.titulos.1.n_dup', '002')
            ->assertJsonPath('data.titulos.2.n_dup', '003')
            ->assertJsonPath('data.titulos.2.valor', '75.00')
            ->assertJsonPath('data.titulos.0.natureza.codigo', '5.06');

        $this->assertCount(3, $receber->json('data.titulos'));
        $this->assertSame('250.00', $receber->json('data.itens.0.valor_total'));

        $this->assertDatabaseCount('titulos', 3);
        $this->assertDatabaseHas('estoque_movimentos', [
            'id' => $receber->json('data.id'),
            'nf_valor' => '275.00',
        ]);
    }

    public function test_preview_dest_cnpj_sugere_outra_emp(): void
    {
        Sanctum::actingAs($this->user);

        $udi = Empresa::query()->create([
            'codigo' => 'EMP-UDI',
            'razao_social' => 'ADESIVOS ETIQUETAS E ROTULOS UDI LTDA',
            'nome_fantasia' => 'UDI ETIQUETAS',
            'cnpj' => '58820046000137',
            'situacao' => 'ATIVA',
            'venda_ativa' => false,
            'estoque_ativo' => false,
        ]);
        $this->user->empresas()->attach([$udi->id]);

        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '1000.0000',
                        'valor_unitario' => '3.800000',
                    ],
                ],
            ])
            ->assertCreated();

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_colacril_udi.xml'));
        $this->assertNotFalse($xml);

        $preview = $this->withHeaders($h)
            ->post("/api/v1/ordens-compra/{$oc->json('data.id')}/receber/xml/preview", [
                'file' => UploadedFile::fake()->createWithContent('colacril.xml', $xml),
            ])
            ->assertOk();

        $dest = collect($preview->json('data.warnings'))->first(
            fn ($w) => ($w['codigo'] ?? null) === 'DEST_CNPJ_DIVERGENTE'
        );
        $this->assertNotNull($dest);
        $this->assertSame('ALERTA', $dest['nivel']);
        $this->assertStringContainsString('EMP-UDI', $dest['mensagem']);
        $this->assertStringContainsString('58.820.046/0001-37', $dest['mensagem']);

        $ipi = collect($preview->json('data.warnings'))->first(
            fn ($w) => ($w['codigo'] ?? null) === 'PARCELAS_VS_OC_FISCAL_OK'
        );
        $this->assertNotNull($ipi);
        $this->assertSame('INFO', $ipi['nivel']);
        $this->assertStringContainsString('370.50', $ipi['mensagem']);
        $this->assertSame('4170.50', $preview->json('data.nf.valor_nf'));
        $this->assertCount(4, $preview->json('data.nf.parcelas'));
        $this->assertSame('2', $preview->json('data.espelho.id_dest'));
        $this->assertSame('PR', $preview->json('data.espelho.emit_uf'));
        $this->assertSame('5', $preview->json('data.espelho.itens.0.orig'));
        $this->assertSame('00', $preview->json('data.espelho.itens.0.cst'));
        $this->assertSame('6101', $preview->json('data.espelho.itens.0.cfop'));
        $this->assertSame('12.00', $preview->json('data.espelho.itens.0.p_icms'));
        $this->assertSame('456.00', $preview->json('data.espelho.itens.0.v_icms'));
        $this->assertSame('370.50', $preview->json('data.espelho.itens.0.v_ipi'));
        $this->assertSame('55.18', $preview->json('data.espelho.itens.0.v_pis'));
        $this->assertSame('254.14', $preview->json('data.espelho.totais.v_cofins'));
    }

    public function test_preview_rejeita_oc_outra_empresa(): void
    {
        Sanctum::actingAs($this->user);
        $outra = Empresa::query()->create([
            'codigo' => 'EMP-XML2',
            'razao_social' => 'Outra',
            'cnpj' => '99888777000166',
            'situacao' => 'ATIVA',
        ]);

        $oc = OrdemCompra::query()->create([
            'empresa_id' => $outra->id,
            'codigo' => 'OC-2026-00999',
            'fornecedor_id' => $this->fornecedor->id,
            'origem' => OrdemCompra::ORIGEM_DIRETA,
            'status' => OrdemCompra::STATUS_ABERTA,
            'valor_total' => '0',
        ]);

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_tubete.xml'));
        $this->assertNotFalse($xml);

        $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->post("/api/v1/ordens-compra/{$oc->id}/receber/xml/preview", [
                'file' => UploadedFile::fake()->createWithContent('nfe.xml', $xml),
            ])
            ->assertNotFound();
    }

    public function test_receber_com_xml_persiste_espelho_fiscal(): void
    {
        Storage::fake('local');
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '1000.0000',
                        'valor_unitario' => '3.800000',
                    ],
                ],
            ])
            ->assertCreated();

        $ocId = $oc->json('data.id');
        $ocItemId = $oc->json('data.itens.0.id');
        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_colacril_udi.xml'));
        $this->assertNotFalse($xml);

        $receber = $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/receber", [
                'nf_chave' => '41260403514129000106550040005773061452788002',
                'nf_numero' => '577306',
                'nf_data' => '2026-04-10',
                'nf_valor' => '4170.50',
                'vencimento' => '2026-05-10',
                'natureza_id' => $this->nat506->id,
                'xml' => $xml,
                'itens' => [
                    [
                        'ordem_compra_item_id' => $ocItemId,
                        'qtde_recebida' => '1000.0000',
                    ],
                ],
                'cprod_maps' => [
                    [
                        'c_prod' => '301A4G12N',
                        'produto_id' => $this->produto->id,
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.nfe_entrada.chave', '41260403514129000106550040005773061452788002')
            ->assertJsonPath('data.nfe_entrada.xml_armazenado', true)
            ->assertJsonPath('data.nfe_entrada.serie', '4')
            ->assertJsonPath('data.nfe_entrada.espelho.itens.0.v_icms', '456.00')
            ->assertJsonPath('data.nfe_entrada.espelho.totais.v_ipi', '370.50');

        $this->assertDatabaseHas('nfe_entradas', [
            'empresa_id' => $this->empresa->id,
            'chave' => '41260403514129000106550040005773061452788002',
            'id_dest' => '2',
            'emit_uf' => 'PR',
            'emit_crt' => '3',
            'numero' => '577306',
        ]);
        $this->assertDatabaseHas('nfe_entrada_itens', [
            'c_prod' => '301A4G12N',
            'orig' => '5',
            'cst_icms' => '00',
            'cfop' => '6101',
            'v_icms' => '456.00',
            'v_ipi' => '370.50',
            'v_pis' => '55.18',
            'v_cofins' => '254.14',
            'produto_id' => $this->produto->id,
        ]);

        $entrada = NfeEntrada::query()->firstOrFail();
        $this->assertSame($receber->json('data.id'), $entrada->movimento_id);
        Storage::disk('local')->assertExists($entrada->xml_path);
        $this->assertSame(hash('sha256', $xml), $entrada->xml_sha256);
        $this->assertSame(1, NfeEntradaItem::query()->count());

        $this->withHeaders($h)
            ->getJson("/api/v1/ordens-compra/{$ocId}")
            ->assertOk()
            ->assertJsonPath('data.nfe_entradas.0.numero', '577306')
            ->assertJsonPath('data.nfe_entradas.0.espelho.itens.0.orig', '5')
            ->assertJsonPath('data.nfe_entradas.0.espelho.itens.0.v_pis', '55.18');
    }

    public function test_receber_xml_chave_divergente_nao_lanca(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '100.0000',
                        'valor_unitario' => '2.500000',
                    ],
                ],
            ])
            ->assertCreated();

        $xml = file_get_contents(base_path('tests/fixtures/nfe_entrada_tubete.xml'));
        $this->assertNotFalse($xml);

        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$oc->json('data.id')}/receber", [
                'nf_chave' => '35260800000000000000550010000000011000000099',
                'nf_numero' => '1001',
                'nf_data' => '2026-08-11',
                'vencimento' => '2026-09-11',
                'natureza_id' => $this->nat506->id,
                'xml' => $xml,
                'itens' => [
                    [
                        'ordem_compra_item_id' => $oc->json('data.itens.0.id'),
                        'qtde_recebida' => '100.0000',
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nf_chave']);

        $this->assertDatabaseCount('estoque_movimentos', 0);
        $this->assertDatabaseCount('nfe_entradas', 0);
    }
}
