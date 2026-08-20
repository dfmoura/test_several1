<?php

namespace Tests\Feature;

use App\Models\Comissao;
use App\Models\ComissaoFechamento;
use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Entrega;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueSaldo;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Financeiro\ComissaoService;
use App\Services\Financeiro\FaturamentoService;
use App\Support\PadraoDecimal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Homologação da cadeia feliz ORC → caixa → COM PAGA, sem certificado A1 / hub Focus.
 *
 * Estudo 32 INDICE_FLUXO_OPERACIONAL + HOMOLOGACAO H0.1 / H0.2:
 * o fluxo comercial/financeiro não espera SEFAZ. Sem hub a NF fica PLANEJADA
 * (prévia). Comissão nasce na BX do receber, não no faturar nem no ENT-.
 */
class OrcamentoAteComissaoE2ETest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    private User $producao;

    private User $expedicao;

    private User $financeiro;

    private Parceiro $parceiro;

    private Parceiro $vendedor;

    private EmpresaContaFinanceira $cfin;

    private Produto $mp;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'orcamento.ler',
            'orcamento.escrever',
            'producao.ler',
            'producao.escrever',
            'produto.ler',
            'estoque.ler',
            'estoque.escrever',
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
            'codigo' => 'EMP-E2E1',
            'razao_social' => 'RLP ETIQUETAS AUTO ADESIVOS LTDA',
            'nome_fantasia' => 'RLP',
            'cnpj' => '01423183000110',
            'ie' => '7023251210034',
            'ie_status' => 'OK',
            'regime' => 'SIMPLES_NACIONAL',
            'crt' => 1,
            'cnae' => '1813099',
            'logradouro' => 'AVENIDA MARCOS DE FREITAS COSTA',
            'numero' => '385',
            'bairro' => 'Daniel Fonseca',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400328',
            'ibge' => '3170206',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
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
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '33014556000196',
            'razao_social' => 'BRAHVA INDUSTRIA E COMERCIO LTDA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'emite_documento_fiscal' => true,
            'finalidade' => 'USO_CONSUMO',
            'consumidor_final' => true,
            'ind_ie_dest' => 9,
            'email_xml' => 'xml@brahva.test',
            'logradouro' => 'Rua das Industrias',
            'numero' => '1200',
            'bairro' => 'Distrito Industrial',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38402100',
            'ibge' => '3170206',
            'limite_credito' => '80000.00',
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
            'vendedor_parceiro_id' => $this->vendedor->id,
            'whatsapp' => '34988887777',
            'contato_nome' => 'Ana Compras',
        ]);

        ParceiroContato::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'nome' => 'Ana Compras',
            'funcao' => 'Compras',
            'whatsapp' => '34988887777',
            'email' => 'ana@brahva.test',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);

        $this->mp = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-FLM-901',
            'familia' => 'MP',
            'descricao_fiscal' => 'BOPP PRATA AUTOADESIVO COLACRIL BXT',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '10.000000',
        ]);

        $tubete = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-TUB-003',
            'familia' => 'EMB',
            'descricao_fiscal' => 'TUBETE 3"',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '1.000000',
        ]);

        Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PA-ETQ-001',
            'familia' => 'PA',
            'descricao_fiscal' => 'ETIQUETAS BOPP',
            'unidade_comercial' => 'MIL',
            'unidade_interna' => 'MIL',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'custo_medio' => '0',
        ]);

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->mp->id,
            'qtde' => '500.0000',
            'unidade' => 'M2',
            'custo_medio' => '10.000000',
        ]);
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $tubete->id,
            'qtde' => '200.0000',
            'unidade' => 'UN',
            'custo_medio' => '1.000000',
        ]);

        $this->comercial = $this->usuario('USR-E2E1', 'Comercial E2E', 'comercial.e2e@test.local', [
            'orcamento.ler', 'orcamento.escrever',
            'faturamento.ler', 'faturamento.escrever',
            'producao.ler', 'comissao.ler', 'financeiro.ler',
        ]);
        $this->producao = $this->usuario('USR-E2E2', 'Producao E2E', 'producao.e2e@test.local', [
            'producao.ler', 'producao.escrever',
            'estoque.ler', 'estoque.escrever', 'produto.ler', 'faturamento.ler',
        ]);
        $this->expedicao = $this->usuario('USR-E2E3', 'Expedicao E2E', 'expedicao.e2e@test.local', [
            'expedicao.ler', 'expedicao.escrever',
            'faturamento.ler', 'producao.ler', 'comissao.ler',
        ]);
        $this->financeiro = $this->usuario('USR-E2E4', 'Financeiro E2E', 'financeiro.e2e@test.local', [
            'financeiro.ler', 'financeiro.escrever',
            'faturamento.ler', 'faturamento.escrever',
            'comissao.ler', 'comissao.escrever', 'expedicao.ler',
        ]);
    }

    /**
     * @param  list<string>  $perms
     */
    private function usuario(string $codigo, string $nome, string $email, array $perms): User
    {
        $u = User::query()->create([
            'codigo' => $codigo,
            'name' => $nome,
            'email' => $email,
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $u->givePermissionTo($perms);
        $u->empresas()->attach($this->empresa->id, ['padrao' => true]);

        return $u;
    }

    /** @return array<string, mixed> */
    private function payloadBrahva(): array
    {
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        return [
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
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
            'modo_entrega' => 'RETIRAR',
        ];
    }

    private function h(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    public function test_cadeia_feliz_orc_ate_comissao_paga_sem_hub_a1(): void
    {
        $h = $this->h();

        Sanctum::actingAs($this->comercial);
        $orcRes = $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $this->payloadBrahva())
            ->assertCreated();
        $orcId = (int) $orcRes->json('data.id');
        $this->assertSame($this->vendedor->id, $orcRes->json('data.vendedor_parceiro_id'));
        $this->assertSame('RETIRAR', $orcRes->json('data.input_snapshot.modo_entrega'));
        $this->assertSame(3.0, (float) $orcRes->json('data.input_snapshot.faixas.0.comissao_pct'));
        $this->assertGreaterThan(0, (float) ($orcRes->json('data.result_snapshot.faixas.0.valor_etiqueta') ?? 0));
        $this->assertGreaterThan(0, (float) ($orcRes->json('data.result_snapshot.faixas.0.valor_matriz') ?? 0));

        $dest = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$orcId}/destinatarios-aprovacao");
        $contatoId = $dest->json('data.destinatarios.0.parceiro_contato_id');
        $token = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$orcId}/enviar-aprovacao", [
            'parceiro_contato_id' => $contatoId,
        ])->json('data.token');

        $ok = $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'nome_cliente' => 'Ana Compras',
            'faixa_index' => 0,
        ]);
        $ok->assertOk();
        $this->assertSame('LIBERADO', $ok->json('data.financeiro_status'));

        $pedido = Pedido::query()->where('orcamento_id', $orcId)->first();
        $this->assertNotNull($pedido);
        $this->assertSame(Pedido::STATUS_LIBERADO, $pedido->status);
        $this->assertSame($this->vendedor->id, $pedido->vendedor_parceiro_id);
        $item = $pedido->itens()->firstOrFail();
        $pedida = (string) $item->qtde_pedida;

        Sanctum::actingAs($this->producao);
        $op = $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-op", [
            'pedido_item_id' => $item->id,
        ]);
        $op->assertCreated();
        $opId = (int) $op->json('data.id');
        $papel = collect($op->json('data.materiais'))->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($papel);
        $this->assertSame($this->mp->id, $papel['produto']['id']);

        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-producao/{$opId}/requisitar-pendentes")
            ->assertOk();

        $conc = $this->withHeaders($h)->postJson("/api/v1/ordens-producao/{$opId}/concluir", [
            'qtde_boa' => $pedida,
            'qtde_refugo' => '0',
        ]);
        $conc->assertOk();
        $this->assertSame('CONCLUIDA', $conc->json('data.status'));
        $this->assertTrue(
            EstoqueMovimento::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO)
                ->exists()
        );
        $this->assertTrue(
            EstoqueMovimento::query()
                ->where('empresa_id', $this->empresa->id)
                ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_PA)
                ->exists()
        );

        $pedido->refresh();
        $this->assertSame(Pedido::STATUS_PRODUZIDO, $pedido->status);

        Sanctum::actingAs($this->producao);
        $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/faturar")->assertForbidden();

        Sanctum::actingAs($this->comercial);
        $prev = $this->withHeaders($h)->getJson("/api/v1/pedidos/{$pedido->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertTrue($prev->json('data.apto'));
        $this->assertSame('NFE', $prev->json('data.fiscal.documentos.0.tipo'));
        $this->assertFalse($prev->json('data.fiscal.emissao_automatica'));
        $this->assertTrue(bccomp((string) $prev->json('data.valor_itens'), '0', 2) > 0);
        $this->assertTrue(bccomp((string) $prev->json('data.valor_matriz'), '0', 2) > 0);
        $this->assertTrue(bccomp(
            (string) $prev->json('data.valor_bruto'),
            (string) $prev->json('data.valor_itens'),
            2
        ) > 0);

        $fat = $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/faturar");
        $fat->assertCreated();
        $this->assertSame(Faturamento::STATUS_CONFIRMADO, $fat->json('data.status'));
        $this->assertSame('PENDENTE', $fat->json('data.nf_status'));
        $this->assertSame(DocumentoFiscalSaida::TIPO_NFE, $fat->json('data.documentos_fiscais.0.tipo'));
        $this->assertSame(DocumentoFiscalSaida::STATUS_PLANEJADO, $fat->json('data.documentos_fiscais.0.status'));
        $this->assertFalse($fat->json('data.documentos_fiscais.0.previa.oficial'));
        $this->assertNull($fat->json('data.documentos_fiscais.0.chave'));
        $this->assertNull($fat->json('data.documentos_fiscais.0.numero'));
        $this->assertSame(0, Comissao::query()->where('pedido_id', $pedido->id)->count());

        $baseEtq = (string) $fat->json('data.snapshot.valor_itens');
        $bruto = (string) $fat->json('data.valor_bruto');
        $this->assertTrue(bccomp($bruto, $baseEtq, PadraoDecimal::SCALE_MONEY) > 0);

        Sanctum::actingAs($this->expedicao);
        $exp = $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/expedir", [
            'volumes' => 1,
        ]);
        $exp->assertCreated();
        $this->assertSame(Entrega::STATUS_AGUARDA_RETIRADA, $exp->json('data.status'));
        $this->assertSame(0, Comissao::query()->where('pedido_id', $pedido->id)->count());

        $this->withHeaders($h)->postJson("/api/v1/entregas/{$exp->json('data.id')}/confirmar", [
            'prova_tipo' => Entrega::PROVA_ASSINATURA_BALCAO,
            'prova_nome' => 'Ana Compras',
            'prova_documento' => '12345678900',
        ])->assertOk();
        $this->assertSame(Pedido::STATUS_ENTREGUE, $pedido->fresh()->status);
        $this->assertSame(0, Comissao::query()->where('pedido_id', $pedido->id)->count());

        $tit = Titulo::query()
            ->where('pedido_id', $pedido->id)
            ->where('origem', FaturamentoService::ORIGEM_FATURA)
            ->firstOrFail();
        $natReceita = NaturezaGerencial::query()->findOrFail($tit->natureza_id);
        $this->assertTrue($natReceita->codigo === '1.01.01' || $natReceita->codigo_exibicao === '1.01.01');

        Sanctum::actingAs($this->financeiro);
        $this->withHeaders($h)->postJson("/api/v1/titulos/{$tit->id}/baixar", [
            'conta_financeira_id' => $this->cfin->id,
            'valor' => $tit->fresh()->saldo,
            'pago_em' => now()->toDateString(),
        ])->assertCreated();

        $com = Comissao::query()->where('pedido_id', $pedido->id)->firstOrFail();
        $this->assertSame(Comissao::STATUS_PREVISTA, $com->status);
        $this->assertSame(Comissao::ORIGEM_BAIXA, $com->origem_evento);
        $this->assertSame($this->vendedor->id, $com->vendedor_parceiro_id);
        $this->assertSame($baseEtq, (string) $com->base_valor);
        $this->assertNotSame($bruto, (string) $com->base_valor);

        $esperada = PadraoDecimal::roundHalfUp(
            bcdiv(
                bcmul($baseEtq, '3', PadraoDecimal::SCALE_PERCENT + 4),
                '100',
                PadraoDecimal::SCALE_MONEY + 4
            ),
            PadraoDecimal::SCALE_MONEY
        );
        $this->assertSame($esperada, (string) $com->valor);
        $this->assertEqualsWithDelta(3.0, (float) $com->aliquota, 0.0001);
        $this->assertSame(Pedido::STATUS_ENCERRADO, $pedido->fresh()->status);

        Sanctum::actingAs($this->comercial);
        $this->withHeaders($h)->postJson('/api/v1/comissoes/fechamentos', [
            'comissao_ids' => [$com->id],
        ])->assertForbidden();

        Sanctum::actingAs($this->financeiro);
        $fec = $this->withHeaders($h)->postJson('/api/v1/comissoes/fechamentos', [
            'comissao_ids' => [$com->id],
            'vencimento' => now()->addDays(7)->toDateString(),
        ]);
        $fec->assertCreated();
        $this->assertSame(ComissaoFechamento::STATUS_ABERTO, $fec->json('data.status'));
        $this->assertSame(Comissao::STATUS_LIBERADA, $com->fresh()->status);

        $pag = $this->withHeaders($h)->postJson(
            '/api/v1/comissoes/fechamentos/'.$fec->json('data.id').'/gerar-pagamento'
        );
        $pag->assertOk();
        $this->assertSame(ComissaoFechamento::STATUS_TITULO_GERADO, $pag->json('data.status'));

        $titPagar = Titulo::query()
            ->where('origem', ComissaoService::ORIGEM_TITULO)
            ->where('tipo', Titulo::TIPO_PAGAR)
            ->firstOrFail();
        $this->assertSame($this->vendedor->id, $titPagar->parceiro_id);
        $this->assertSame($esperada, (string) $titPagar->valor);
        $nat = NaturezaGerencial::query()->findOrFail($titPagar->natureza_id);
        $this->assertTrue(
            $nat->codigo === '3.01.05' || $nat->codigo_exibicao === '3.01.05'
        );

        $this->withHeaders($h)->postJson("/api/v1/titulos/{$titPagar->id}/baixar", [
            'conta_financeira_id' => $this->cfin->id,
            'valor' => $titPagar->fresh()->saldo,
            'pago_em' => now()->toDateString(),
        ])->assertCreated();

        $this->assertSame(Comissao::STATUS_PAGA, $com->fresh()->status);
        $this->assertSame(
            ComissaoFechamento::STATUS_PAGO,
            ComissaoFechamento::query()->find($fec->json('data.id'))?->status
        );

        $orc = Orcamento::query()->findOrFail($orcId);
        $this->assertSame(Orcamento::STATUS_APROVADO, $orc->status);
        $this->assertSame(1, DocumentoFiscalSaida::query()->where('status', DocumentoFiscalSaida::STATUS_PLANEJADO)->count());
        $this->assertSame(0, DocumentoFiscalSaida::query()->whereNotNull('chave')->count());
    }
}
