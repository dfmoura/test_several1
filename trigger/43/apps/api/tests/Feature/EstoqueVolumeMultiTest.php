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

    public function test_seed_enderecos_e_vinculo_etiqueta(): void
    {
        $out = app(EstoqueEnderecoService::class)->seedGabarito($this->empresa);
        $this->assertSame(96, $out['total']);
        $this->assertSame(96, EstoqueEndereco::query()->where('empresa_id', $this->empresa->id)->count());

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
            ->where('codigo', 'P01-C01-V01')
            ->firstOrFail();

        $this->withHeaders($this->h)
            ->postJson("/api/v1/estoque/lotes/{$lote->id}/endereco", [
                'endereco_id' => $end->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.endereco.codigo', 'P01-C01-V01');

        $this->withHeaders($this->h)
            ->getJson("/api/v1/estoque/lotes/{$lote->id}/etiqueta")
            ->assertOk()
            ->assertJsonPath('data.codigo', 'LOT-ETQ-1')
            ->assertJsonStructure(['data' => ['qr_payload', 'produto']]);
    }

    public function test_catalogo_exact_tem_4_insumos(): void
    {
        $this->assertCount(4, ProdutoCadastroExactData::insumos());
        $this->assertSame(4, ProdutoCadastroExactData::TOTAL);
    }
}
