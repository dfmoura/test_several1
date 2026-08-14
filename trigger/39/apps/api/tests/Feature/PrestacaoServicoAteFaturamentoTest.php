<?php

namespace Tests\Feature;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\EstoqueMovimento;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\OrdemProducao;
use App\Models\OrdemServico;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Financeiro\FaturamentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Prestação de serviço ponta a ponta até o FAT (estudo 32 ORDEM_SERVICO + FATURAMENTO).
 *
 * ORC tipo SERVICO → aceite → PED → OS (não OP, sem PA) → preview → FAT + TIT 1.01.03 + NFS-e planejada.
 */
class PrestacaoServicoAteFaturamentoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    private User $producao;

    private Parceiro $parceiro;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'orcamento.ler',
            'orcamento.escrever',
            'producao.ler',
            'producao.escrever',
            'faturamento.ler',
            'faturamento.escrever',
            'financeiro.ler',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        app(NaturezaGerencialService::class)->seedCatalog();
        $this->assertNotNull(NaturezaGerencial::query()->where('codigo', '1.01.03')->first());

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-SVC1',
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
            'im_obrigatoria_nfse' => false,
        ]);

        EmpresaContaFinanceira::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'CFIN-00001',
            'tipo' => EmpresaContaFinanceira::TIPO_BANCO,
            'descricao' => 'Conta PIX',
            'banco_codigo' => '077',
            'principal' => true,
            'ativa' => true,
            'ordem' => 0,
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-SVC01',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '33014556000196',
            'razao_social' => 'BOMBONIERE DOCE LAR LTDA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'emite_documento_fiscal' => true,
            'finalidade' => 'USO_CONSUMO',
            'consumidor_final' => true,
            'ind_ie_dest' => 9,
            'email_xml' => 'xml@docelar.test',
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
            'whatsapp' => '34988887777',
            'contato_nome' => 'Ana Compras',
        ]);

        ParceiroContato::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'nome' => 'Ana Compras',
            'funcao' => 'Compras',
            'whatsapp' => '34988887777',
            'email' => 'ana@docelar.test',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-SVC1',
            'name' => 'Comercial SVC',
            'email' => 'comercial.svc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo([
            'orcamento.ler',
            'orcamento.escrever',
            'producao.ler',
            'faturamento.ler',
            'faturamento.escrever',
            'financeiro.ler',
        ]);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->producao = User::query()->create([
            'codigo' => 'USR-SVC2',
            'name' => 'Producao SVC',
            'email' => 'producao.svc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->producao->givePermissionTo(['producao.ler', 'producao.escrever', 'faturamento.ler']);
        $this->producao->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    /** @return array<string, mixed> */
    private function payloadServico(): array
    {
        return [
            'parceiro_id' => $this->parceiro->id,
            'necessidade' => PedidoItem::NEC_SERVICO,
            'medida' => '10,0X5,0',
            'largura_cm' => 11.0,
            'puxada_cm' => 5.2,
            'cores' => 1,
            'papel' => 'BOPP BRILHO',
            'acabamento' => 'SEM ACABAMENTO',
            'modelos' => 1,
            'colunas' => 1,
            'etiq_por_rolo' => 2000,
            'tubete' => '1"',
            'z' => 80.0,
            'maquina' => 'MODULAR',
            'maquina_roda_servico' => 'MODULAR',
            'imposto_pct' => 16.0,
            'matriz' => 'NAO',
            'coluna_rebobinacao' => 2,
            'tipo_troca_produto' => 'SEM PARADA',
            'rpm' => 1000.0,
            'faixas' => [
                ['quantidade' => 50000, 'comissao_pct' => 0],
            ],
            'prazo_entrega_dias' => 5,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
            'observacao' => 'Rebobinação / acerto de bobina do cliente. Material do cliente — sem PA próprio.',
        ];
    }

    private function h(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    public function test_rebobinacao_orc_os_fat_nfse_sem_estoque_pa(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = $this->h();

        $orcRes = $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $this->payloadServico())
            ->assertCreated();
        $orcId = (int) $orcRes->json('data.id');

        $orc = Orcamento::query()->findOrFail($orcId);
        $this->assertSame(PedidoItem::NEC_SERVICO, $orc->input_snapshot['necessidade'] ?? null);
        $this->assertGreaterThan(0, (float) ($orc->result_snapshot['faixas'][0]['valor_etiqueta'] ?? 0));
        $this->assertSame(0.0, (float) ($orc->result_snapshot['valor_matriz'] ?? -1));

        $dest = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$orcId}/destinatarios-aprovacao");
        $contatoId = $dest->json('data.destinatarios.0.parceiro_contato_id');
        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$orcId}/enviar-aprovacao", [
            'parceiro_contato_id' => $contatoId,
        ]);
        $token = $env->json('data.token');

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

        $item = $pedido->itens()->first();
        $this->assertNotNull($item);
        $this->assertSame(PedidoItem::NEC_SERVICO, $item->necessidade);
        $this->assertSame('SVC', $item->familia_fiscal);
        $this->assertNull($item->produto_pa_id);
        $this->assertSame('50000.0000', (string) $item->qtde_pedida);

        $itemId = (int) $item->id;
        $pedida = (string) $item->qtde_pedida;

        Sanctum::actingAs($this->producao);

        $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-op", [
            'pedido_item_id' => $itemId,
        ])->assertStatus(422);

        $os = $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-os", [
            'pedido_item_id' => $itemId,
        ]);
        $os->assertCreated();
        $osId = (int) $os->json('data.id');
        $this->assertSame(OrdemServico::STATUS_ABERTA, $os->json('data.status'));
        $this->assertSame(1, OrdemServico::query()->count());
        $this->assertSame(0, OrdemProducao::query()->count());

        $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-os", [
            'pedido_item_id' => $itemId,
        ])->assertStatus(422);

        $pedido->refresh();
        $this->assertSame(Pedido::STATUS_EM_PRODUCAO, $pedido->status);

        Sanctum::actingAs($this->comercial);
        $prevCedo = $this->withHeaders($h)->getJson("/api/v1/pedidos/{$pedido->id}/faturamento-preview");
        $prevCedo->assertOk();
        $this->assertFalse($prevCedo->json('data.apto'));

        Sanctum::actingAs($this->producao);
        $this->withHeaders($h)
            ->postJson("/api/v1/pedidos/{$pedido->id}/faturar")
            ->assertForbidden();

        $qtdeExec = bcmul($pedida, '0.96', 4);
        $conc = $this->withHeaders($h)->postJson("/api/v1/ordens-servico/{$osId}/concluir", [
            'qtde_executada' => $qtdeExec,
        ]);
        $conc->assertOk();
        $this->assertSame(OrdemServico::STATUS_CONCLUIDA, $conc->json('data.status'));
        $this->assertFalse((bool) $conc->json('data.fora_tolerancia'));

        $this->assertSame(0, EstoqueMovimento::query()->count());
        $this->assertSame(0, OrdemProducao::query()->count());

        $pedido->refresh();
        $item->refresh();
        $this->assertSame(Pedido::STATUS_PRODUZIDO, $pedido->status);
        $this->assertSame(PedidoItem::STATUS_PRODUZIDO, $item->status);
        $this->assertSame($qtdeExec, (string) $item->qtde_faturavel);
        $this->assertNotSame($pedida, (string) $item->qtde_faturavel);

        Sanctum::actingAs($this->comercial);
        $prev = $this->withHeaders($h)->getJson("/api/v1/pedidos/{$pedido->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertTrue($prev->json('data.apto'));
        $this->assertSame('NFSE', $prev->json('data.fiscal.documentos.0.tipo'));
        $this->assertTrue($prev->json('data.fiscal.precisa_nfse'));
        $this->assertFalse($prev->json('data.fiscal.precisa_nfe'));
        $this->assertFalse($prev->json('data.fiscal.emissao_automatica'));
        $this->assertSame('0.00', $prev->json('data.valor_adiantamento'));
        $this->assertSame($prev->json('data.valor_bruto'), $prev->json('data.valor_a_cobrar'));
        $this->assertTrue(bccomp((string) $prev->json('data.valor_a_cobrar'), '0', 2) > 0);

        $fat = $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/faturar");
        $fat->assertCreated();
        $this->assertSame(Faturamento::STATUS_CONFIRMADO, $fat->json('data.status'));
        $this->assertSame('PENDENTE', $fat->json('data.nf_status'));
        $this->assertSame($prev->json('data.valor_bruto'), $fat->json('data.valor_bruto'));
        $this->assertSame($prev->json('data.valor_a_cobrar'), $fat->json('data.valor_a_cobrar'));
        $this->assertSame($qtdeExec, $fat->json('data.itens.0.qtde'));
        $this->assertCount(1, $fat->json('data.itens'));
        $this->assertSame('SVC', (string) Faturamento::query()->first()?->itens()->value('familia_fiscal'));

        $this->assertSame('NFSE', $fat->json('data.documentos_fiscais.0.tipo'));
        $this->assertSame('PLANEJADO', $fat->json('data.documentos_fiscais.0.status'));
        $this->assertFalse($fat->json('data.documentos_fiscais.0.previa.oficial'));
        $this->assertNull($fat->json('data.documentos_fiscais.0.chave'));
        $this->assertNull($fat->json('data.documentos_fiscais.0.numero'));
        $this->assertSame('01423183000110', $fat->json('data.documentos_fiscais.0.envio_hub.cnpj_prestador'));
        $this->assertArrayNotHasKey('numero_dps', $fat->json('data.documentos_fiscais.0.envio_hub'));
        $this->assertArrayNotHasKey('inscricao_municipal_prestador', $fat->json('data.documentos_fiscais.0.envio_hub'));

        $this->assertCount(1, $fat->json('data.titulos'));
        $this->assertSame(FaturamentoService::ORIGEM_FATURA, $fat->json('data.titulos.0.origem'));
        $this->assertSame('1.01.03', $fat->json('data.titulos.0.natureza.codigo'));
        $this->assertSame($fat->json('data.valor_a_cobrar'), $fat->json('data.titulos.0.valor'));
        $this->assertNotEmpty($fat->json('data.titulos.0.cobrancas'));

        $pedido->refresh();
        $this->assertSame(Pedido::STATUS_FATURADO, $pedido->status);
        $this->assertSame(1, Faturamento::query()->count());
        $this->assertSame(1, DocumentoFiscalSaida::query()->count());
        $this->assertSame(1, Titulo::query()->where('origem', FaturamentoService::ORIGEM_FATURA)->count());
        $this->assertSame(0, EstoqueMovimento::query()->count());
        $this->assertSame(
            0,
            Titulo::query()->where('natureza_id', NaturezaGerencial::query()->where('codigo', '1.01.01')->value('id'))->count()
        );
    }
}
