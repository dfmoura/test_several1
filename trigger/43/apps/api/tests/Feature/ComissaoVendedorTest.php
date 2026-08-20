<?php

namespace Tests\Feature;

use App\Models\Comissao;
use App\Models\ComissaoFechamento;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Entrega;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Financeiro\AdiantamentoService;
use App\Services\Financeiro\ComissaoService;
use App\Services\Financeiro\FaturamentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * BL-061 — vendedor no ORC + COM- sobre o recebido (estudo 32).
 */
class ComissaoVendedorTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmp;

    private User $comercial;

    private User $financeiro;

    private User $expedicao;

    private User $outsider;

    private Parceiro $parceiro;

    private Parceiro $vendedor;

    private Parceiro $transportadora;

    private EmpresaContaFinanceira $cfin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'orcamento.ler',
            'orcamento.escrever',
            'producao.ler',
            'financeiro.ler',
            'financeiro.escrever',
            'faturamento.ler',
            'faturamento.escrever',
            'expedicao.ler',
            'expedicao.escrever',
            'comissao.ler',
            'comissao.escrever',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        app(NaturezaGerencialService::class)->seedCatalog();
        $this->assertNotNull(NaturezaGerencial::query()->where('codigo', '3.01.05')->first()
            ?? NaturezaGerencial::query()->where('codigo_exibicao', '3.01.05')->first());

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-COM1',
            'razao_social' => 'RLP Comissao',
            'nome_fantasia' => 'RLP COM',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'logradouro' => 'Av. Anselmo Alves dos Santos',
            'numero' => '100',
            'bairro' => 'Santa Monica',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38408150',
        ]);
        $this->outraEmp = Empresa::query()->create([
            'codigo' => 'EMP-COM2',
            'razao_social' => 'Outra EMP',
            'nome_fantasia' => 'Outra',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);

        $this->cfin = EmpresaContaFinanceira::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'CFIN-00001',
            'tipo' => EmpresaContaFinanceira::TIPO_BANCO,
            'descricao' => 'Conta PIX',
            'banco_codigo' => '077',
            'principal' => true,
            'ativa' => true,
            'ordem' => 0,
        ]);

        $this->vendedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-VEN01',
            'razao_social' => 'VENDEDOR ALFA',
            'papel_vendedor' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'comissao_percentual' => '3.0000',
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-CLI01',
            'razao_social' => 'CLIENTE COMISSAO',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'limite_credito' => '10000.00',
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
            'vendedor_parceiro_id' => $this->vendedor->id,
            'logradouro' => 'Rua das Industrias',
            'numero' => '50',
            'bairro' => 'Distrito',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400000',
        ]);

        $this->transportadora = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-TRA01',
            'razao_social' => 'TRANSPORTADORA MG',
            'papel_transportadora' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-COM1',
            'name' => 'Comercial',
            'email' => 'comercial.com@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo([
            'orcamento.ler', 'orcamento.escrever',
            'faturamento.ler', 'faturamento.escrever',
            'comissao.ler', 'financeiro.ler',
        ]);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->financeiro = User::query()->create([
            'codigo' => 'USR-COM2',
            'name' => 'Financeiro',
            'email' => 'financeiro.com@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->financeiro->givePermissionTo([
            'financeiro.ler', 'financeiro.escrever',
            'faturamento.ler', 'faturamento.escrever',
            'comissao.ler', 'comissao.escrever',
            'expedicao.ler',
        ]);
        $this->financeiro->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->expedicao = User::query()->create([
            'codigo' => 'USR-COM3',
            'name' => 'Expedicao',
            'email' => 'expedicao.com@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->expedicao->givePermissionTo([
            'expedicao.ler', 'expedicao.escrever',
            'faturamento.ler', 'faturamento.escrever',
            'comissao.ler',
        ]);
        $this->expedicao->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->outsider = User::query()->create([
            'codigo' => 'USR-COM4',
            'name' => 'Outra EMP',
            'email' => 'outra.com@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->outraEmp->id,
        ]);
        $this->outsider->givePermissionTo(['comissao.ler', 'comissao.escrever', 'financeiro.ler']);
        $this->outsider->empresas()->attach($this->outraEmp->id, ['padrao' => true]);
    }

    private int $seq = 1;

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function criarPedidoProduzido(array $overrides = []): Pedido
    {
        $n = $this->seq++;
        $comVendedor = array_key_exists('vendedor', $overrides) ? (bool) $overrides['vendedor'] : true;
        $aliquota = $overrides['aliquota'] ?? '3';
        $etiqueta = $overrides['valor_etiqueta'] ?? '3500.00';
        $matriz = $overrides['valor_matriz'] ?? '0';
        $faca = $overrides['valor_faca'] ?? '0';
        $total = $overrides['valor_total']
            ?? bcadd(bcadd($etiqueta, $matriz, 2), $faca, 2);
        $qtde = $overrides['qtde'] ?? '10000.0000';
        $unit = bcdiv($etiqueta, '10000', 6);

        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => $n,
            'codigo' => 'ORC-2026-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'versao' => 1,
            'parceiro_id' => $this->parceiro->id,
            'vendedor_parceiro_id' => $comVendedor ? $this->vendedor->id : null,
            'cliente_nome' => 'CLIENTE COMISSAO',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [
                'condicao_pagamento' => $overrides['condicao'] ?? '28 DDL',
                'forma_pagamento' => $overrides['forma'] ?? 'PIX',
                'modo_entrega' => $overrides['modo'] ?? 'RETIRAR',
                'vendedor_parceiro_id' => $comVendedor ? $this->vendedor->id : null,
                'comissao_aliquota' => $comVendedor ? $aliquota : null,
                'faca_nova' => ((float) $faca) > 0,
                'valor_faca_nova' => $faca,
                'faixas' => [[
                    'quantidade' => 10000,
                    'comissao_pct' => $comVendedor ? (float) $aliquota : 0,
                ]],
            ],
            'result_snapshot' => ['faixas' => [[
                'quantidade' => 10000,
                'valor_etiqueta' => $etiqueta,
                'valor_matriz' => $matriz,
                'valor_total' => $total,
                'comissao_pct' => $comVendedor ? (float) $aliquota : 0,
            ]]],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        $pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PED-2026-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'orcamento_id' => $orc->id,
            'parceiro_id' => $this->parceiro->id,
            'vendedor_parceiro_id' => $comVendedor ? $this->vendedor->id : null,
            'status' => $overrides['status'] ?? Pedido::STATUS_PRODUZIDO,
            'faixa_index' => 0,
            'tolerancia_qtd_pct' => '20',
            'prazo_entrega_dias' => 10,
            'snapshot' => [
                'input' => [
                    'condicao_pagamento' => $overrides['condicao'] ?? '28 DDL',
                    'forma_pagamento' => $overrides['forma'] ?? 'PIX',
                    'modo_entrega' => $overrides['modo'] ?? 'RETIRAR',
                    'faca_nova' => ((float) $faca) > 0,
                    'valor_faca_nova' => $faca,
                    'vendedor_parceiro_id' => $comVendedor ? $this->vendedor->id : null,
                    'comissao_aliquota' => $comVendedor ? $aliquota : null,
                    'faixas' => [[
                        'quantidade' => 10000,
                        'comissao_pct' => $comVendedor ? (float) $aliquota : 0,
                    ]],
                ],
                'faixa' => [
                    'quantidade' => 10000,
                    'valor_etiqueta' => $etiqueta,
                    'valor_matriz' => $matriz,
                    'valor_total' => $total,
                    'comissao_pct' => $comVendedor ? (float) $aliquota : 0,
                ],
            ],
        ]);

        PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $pedido->id,
            'ordem' => 1,
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => 'PA-ETQ',
            'descricao' => 'Etiqueta teste',
            'qtde_pedida' => $qtde,
            'qtde_produzida' => $qtde,
            'qtde_faturavel' => $qtde,
            'unidade' => 'MIL',
            'preco_unitario' => $unit,
            'valor_total' => $etiqueta,
            'status' => PedidoItem::STATUS_PRODUZIDO,
        ]);

        if (! empty($overrides['sinal'])) {
            $this->criarSinal($orc, (string) $overrides['sinal'], Titulo::STATUS_QUITADO, '0.00');
        }
        if (! empty($overrides['sinal_aberto'])) {
            $this->criarSinal($orc, (string) $overrides['sinal_aberto'], Titulo::STATUS_ABERTO, (string) $overrides['sinal_aberto']);
        }

        return $pedido->fresh(['itens', 'orcamento.adiantamentoTitulo']);
    }

    private function criarSinal(Orcamento $orc, string $valor, string $status, string $saldo): Titulo
    {
        $nat = NaturezaGerencial::query()->where('codigo', '1.01.01')->firstOrFail();
        $tit = Titulo::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'TIT-2026-S'.str_pad((string) $orc->numero, 4, '0', STR_PAD_LEFT),
            'tipo' => Titulo::TIPO_RECEBER,
            'parceiro_id' => $this->parceiro->id,
            'natureza_id' => $nat->id,
            'orcamento_id' => $orc->id,
            'origem' => AdiantamentoService::ORIGEM_ADIANTAMENTO,
            'documento' => $orc->codigo,
            'emissao' => now()->toDateString(),
            'vencimento' => now()->toDateString(),
            'valor' => $valor,
            'saldo' => $saldo,
            'status' => $status,
            'observacao' => 'Sinal teste',
        ]);
        $orc->adiantamento_titulo_id = $tit->id;
        $orc->save();

        return $tit;
    }

    private function h(?Empresa $emp = null): array
    {
        return ['X-Empresa-Id' => (string) ($emp ?? $this->empresa)->id];
    }

    private function faturar(Pedido $ped): Pedido
    {
        Sanctum::actingAs($this->financeiro);
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();

        return $ped->fresh();
    }

    private function tituloFatura(Pedido $ped): Titulo
    {
        return Titulo::query()
            ->where('pedido_id', $ped->id)
            ->where('origem', FaturamentoService::ORIGEM_FATURA)
            ->orderBy('id')
            ->firstOrFail();
    }

    private function baixar(Titulo $tit, ?string $valor = null): void
    {
        Sanctum::actingAs($this->financeiro);
        $this->withHeaders($this->h())->postJson("/api/v1/titulos/{$tit->id}/baixar", [
            'conta_financeira_id' => $this->cfin->id,
            'valor' => $valor ?? $tit->fresh()->saldo,
            'pago_em' => now()->toDateString(),
        ])->assertCreated();
    }

    public function test_orcamento_grava_vendedor_da_emp(): void
    {
        Sanctum::actingAs($this->comercial);
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
        $payload = [
            'parceiro_id' => $this->parceiro->id,
            'vendedor_parceiro_id' => $this->vendedor->id,
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
                'comissao_pct' => 3,
            ], $fx['faixas']),
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ];

        $res = $this->withHeaders($this->h())->postJson('/api/v1/orcamentos', $payload);
        $res->assertCreated();
        $this->assertSame($this->vendedor->id, $res->json('data.vendedor_parceiro_id'));
        $this->assertSame($this->vendedor->codigo, $res->json('data.vendedor.codigo'));
        $this->assertSame($this->vendedor->id, $res->json('data.input_snapshot.vendedor_parceiro_id'));
    }

    public function test_recusa_vendedor_sem_papel_ou_de_outra_emp(): void
    {
        Sanctum::actingAs($this->comercial);
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
        $base = [
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
            'faixas' => [['quantidade' => 5000, 'comissao_pct' => 3]],
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ];

        $this->withHeaders($this->h())->postJson('/api/v1/orcamentos', $base + [
            'vendedor_parceiro_id' => $this->parceiro->id,
        ])->assertStatus(422);

        $outroVend = Parceiro::query()->create([
            'empresa_id' => $this->outraEmp->id,
            'codigo' => 'PAR-VEN99',
            'razao_social' => 'VENDEDOR OUTRA EMP',
            'papel_vendedor' => true,
            'situacao' => 'ATIVO',
        ]);
        $this->withHeaders($this->h())->postJson('/api/v1/orcamentos', $base + [
            'vendedor_parceiro_id' => $outroVend->id,
        ])->assertStatus(422);
    }

    public function test_faturar_sem_baixa_nao_gera_comissao(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        $this->assertSame(0, Comissao::query()->where('pedido_id', $ped->id)->count());
    }

    public function test_baixa_do_receber_gera_comissao_sobre_etiquetas(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        $this->baixar($this->tituloFatura($ped));

        $com = Comissao::query()->where('pedido_id', $ped->id)->firstOrFail();
        $this->assertSame(Comissao::STATUS_PREVISTA, $com->status);
        $this->assertSame(Comissao::ORIGEM_BAIXA, $com->origem_evento);
        $this->assertSame($this->vendedor->id, $com->vendedor_parceiro_id);
        $this->assertSame('105.00', (string) $com->valor);
        $this->assertSame('3500.00', (string) $com->base_valor);
        $this->assertEqualsWithDelta(3.0, (float) $com->aliquota, 0.0001);
    }

    public function test_matriz_nao_entra_na_base_da_comissao(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido([
            'valor_matriz' => '500.00',
            'valor_total' => '4000.00',
        ]));
        $fat = Faturamento::query()->where('pedido_id', $ped->id)->firstOrFail();
        $this->assertSame('4000.00', (string) $fat->valor_bruto);

        $this->baixar($this->tituloFatura($ped));
        $com = Comissao::query()->where('pedido_id', $ped->id)->firstOrFail();
        $this->assertSame('105.00', (string) $com->valor);
        $this->assertSame('3500.00', (string) $com->base_valor);
    }

    public function test_sem_vendedor_nao_gera_comissao(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido(['vendedor' => false]));
        $this->baixar($this->tituloFatura($ped));
        $this->assertSame(0, Comissao::query()->where('pedido_id', $ped->id)->count());
    }

    public function test_cadastro_do_par_nao_altera_aliquota_ja_travada(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        $this->vendedor->comissao_percentual = '10.0000';
        $this->vendedor->save();
        $this->baixar($this->tituloFatura($ped));

        $com = Comissao::query()->where('pedido_id', $ped->id)->firstOrFail();
        $this->assertSame('105.00', (string) $com->valor);
        $this->assertEqualsWithDelta(3.0, (float) $com->aliquota, 0.0001);
    }

    public function test_sinal_so_vira_comissao_na_apropriacao_do_faturar(): void
    {
        $ped = $this->criarPedidoProduzido([
            'condicao' => '50% sinal + 50% 28 DDL',
            'sinal_aberto' => '1750.00',
        ]);
        $sinal = Titulo::query()->where('orcamento_id', $ped->orcamento_id)
            ->where('origem', AdiantamentoService::ORIGEM_ADIANTAMENTO)
            ->firstOrFail();
        $this->baixar($sinal);
        $this->assertSame(0, Comissao::query()->count());

        $this->faturar($ped);
        $coms = Comissao::query()->where('pedido_id', $ped->id)->get();
        $this->assertCount(1, $coms);
        $this->assertSame(Comissao::ORIGEM_APROPRIACAO_SINAL, $coms[0]->origem_evento);
        $this->assertSame('52.50', (string) $coms[0]->valor);

        $this->baixar($this->tituloFatura($ped->fresh()));
        $coms = Comissao::query()->where('pedido_id', $ped->id)->orderBy('id')->get();
        $this->assertCount(2, $coms);
        $this->assertSame(Comissao::ORIGEM_BAIXA, $coms[1]->origem_evento);
        $this->assertSame('52.50', (string) $coms[1]->valor);
        $this->assertEqualsWithDelta(105.0, (float) $coms->sum('valor'), 0.001);
    }

    public function test_residual_na_ultima_baixa(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido([
            'valor_etiqueta' => '1000.00',
            'aliquota' => '1',
        ]));
        $tit = $this->tituloFatura($ped);
        $this->baixar($tit, '333.33');
        $this->baixar($tit->fresh(), '333.33');
        $this->baixar($tit->fresh(), '333.34');

        $vals = Comissao::query()->where('pedido_id', $ped->id)->orderBy('id')->pluck('valor')->all();
        $this->assertCount(3, $vals);
        $this->assertSame('3.33', (string) $vals[0]);
        $this->assertSame('3.33', (string) $vals[1]);
        $this->assertSame('3.34', (string) $vals[2]);
        $this->assertEqualsWithDelta(10.0, (float) array_sum($vals), 0.001);
    }

    public function test_fechamento_gera_titulo_pagar_e_baixa_marca_paga(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        $this->baixar($this->tituloFatura($ped));
        $com = Comissao::query()->where('pedido_id', $ped->id)->firstOrFail();

        Sanctum::actingAs($this->financeiro);
        $fec = $this->withHeaders($this->h())->postJson('/api/v1/comissoes/fechamentos', [
            'comissao_ids' => [$com->id],
            'vencimento' => now()->addDays(7)->toDateString(),
        ]);
        $fec->assertCreated();
        $this->assertSame(ComissaoFechamento::STATUS_ABERTO, $fec->json('data.status'));
        $this->assertSame(Comissao::STATUS_LIBERADA, $com->fresh()->status);

        $pag = $this->withHeaders($this->h())->postJson(
            '/api/v1/comissoes/fechamentos/'.$fec->json('data.id').'/gerar-pagamento'
        );
        $pag->assertOk();
        $this->assertSame(ComissaoFechamento::STATUS_TITULO_GERADO, $pag->json('data.status'));

        $titPagar = Titulo::query()
            ->where('origem', ComissaoService::ORIGEM_TITULO)
            ->where('tipo', Titulo::TIPO_PAGAR)
            ->firstOrFail();
        $this->assertSame($this->vendedor->id, $titPagar->parceiro_id);
        $this->assertSame('105.00', (string) $titPagar->valor);
        $nat = NaturezaGerencial::query()->findOrFail($titPagar->natureza_id);
        $this->assertTrue(in_array($nat->codigo, ['3.01.05'], true)
            || in_array($nat->codigo_exibicao, ['3.01.05'], true));

        $this->baixar($titPagar);
        $this->assertSame(Comissao::STATUS_PAGA, $com->fresh()->status);
        $this->assertSame(ComissaoFechamento::STATUS_PAGO, ComissaoFechamento::query()->find($fec->json('data.id'))->status);
    }

    public function test_estorno_fat_com_comissao_prevista_do_sinal(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido([
            'condicao' => '50% sinal + 50% 28 DDL',
            'sinal' => '1750.00',
        ]));
        $com = Comissao::query()->where('pedido_id', $ped->id)->firstOrFail();
        $this->assertSame(Comissao::STATUS_PREVISTA, $com->status);
        $this->assertSame(Comissao::ORIGEM_APROPRIACAO_SINAL, $com->origem_evento);

        $fat = Faturamento::query()->where('pedido_id', $ped->id)->firstOrFail();
        Sanctum::actingAs($this->financeiro);
        $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fat->id}/estornar", [
            'motivo' => 'condicao incorreta',
        ])->assertOk();
        $this->assertSame(Comissao::STATUS_ESTORNADA, $com->fresh()->status);
    }

    public function test_estorno_bloqueado_se_comissao_ja_liberada(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido([
            'condicao' => '50% sinal + 50% 28 DDL',
            'sinal' => '1750.00',
        ]));
        $com = Comissao::query()->where('pedido_id', $ped->id)->firstOrFail();

        Sanctum::actingAs($this->financeiro);
        $this->withHeaders($this->h())->postJson('/api/v1/comissoes/fechamentos', [
            'comissao_ids' => [$com->id],
        ])->assertCreated();

        $fat = Faturamento::query()->where('pedido_id', $ped->id)->firstOrFail();
        $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fat->id}/estornar", [
            'motivo' => 'quero refaturar',
        ])->assertStatus(422);
        $this->assertSame(Comissao::STATUS_LIBERADA, $com->fresh()->status);
    }

    public function test_entrega_no_transporte_nao_gera_comissao(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido(['modo' => 'ENTREGAR']));
        Sanctum::actingAs($this->expedicao);
        $exp = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir", [
            'tipo_saida' => Entrega::TIPO_TRANSPORTADORA,
            'transportadora_id' => $this->transportadora->id,
            'rastreio' => 'BR123456789MG',
        ]);
        $exp->assertCreated();
        $this->withHeaders($this->h())->postJson("/api/v1/entregas/{$exp->json('data.id')}/confirmar", [
            'prova_tipo' => Entrega::PROVA_RASTREIO,
            'prova_obs' => 'Entregue no destino',
        ])->assertOk();

        $this->assertSame(0, Comissao::query()->where('pedido_id', $ped->id)->count());
        $this->assertSame(Pedido::STATUS_ENTREGUE, $ped->fresh()->status);

        $this->baixar($this->tituloFatura($ped));
        $this->assertSame(1, Comissao::query()->where('pedido_id', $ped->id)->count());
    }

    public function test_sod_comercial_nao_fecha_e_financeiro_nao_confirma_entrega(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido(['modo' => 'ENTREGAR']));
        $this->baixar($this->tituloFatura($ped));
        $com = Comissao::query()->where('pedido_id', $ped->id)->firstOrFail();

        Sanctum::actingAs($this->comercial);
        $this->withHeaders($this->h())->postJson('/api/v1/comissoes/fechamentos', [
            'comissao_ids' => [$com->id],
        ])->assertForbidden();

        Sanctum::actingAs($this->expedicao);
        $exp = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/expedir", [
            'tipo_saida' => Entrega::TIPO_FROTA,
        ]);
        $exp->assertCreated();

        Sanctum::actingAs($this->financeiro);
        $this->withHeaders($this->h())->postJson("/api/v1/entregas/{$exp->json('data.id')}/confirmar", [
            'prova_tipo' => Entrega::PROVA_RASTREIO,
            'prova_obs' => 'tentativa indevida',
        ])->assertForbidden();
    }

    public function test_isolamento_emp(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        $this->baixar($this->tituloFatura($ped));

        Sanctum::actingAs($this->outsider);
        $this->withHeaders($this->h($this->outraEmp))->getJson('/api/v1/comissoes')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->withHeaders($this->h())->getJson('/api/v1/comissoes')->assertForbidden();
        $this->withHeaders($this->h())->postJson('/api/v1/comissoes/fechamentos', [])
            ->assertForbidden();
    }

    public function test_resumo_do_pedido(): void
    {
        $ped = $this->faturar($this->criarPedidoProduzido());
        Sanctum::actingAs($this->comercial);
        $antes = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/comissao");
        $antes->assertOk();
        $this->assertTrue($antes->json('data.elegivel'));
        $this->assertSame('105.00', $antes->json('data.comissao_potencial'));
        $this->assertSame('0.00', $antes->json('data.totais.PREVISTA'));

        $this->baixar($this->tituloFatura($ped));
        $depois = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/comissao");
        $depois->assertOk();
        $this->assertSame('105.00', $depois->json('data.totais.PREVISTA'));
        $this->assertCount(1, $depois->json('data.linhas'));
    }
}
