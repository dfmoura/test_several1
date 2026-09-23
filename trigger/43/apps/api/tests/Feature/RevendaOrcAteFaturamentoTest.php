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
use App\Models\Produto;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Financeiro\FaturamentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Revenda ponta a ponta: ORC SKU REV → PED sem OP → separar → FAT + TIT 1.01.02.
 */
class RevendaOrcAteFaturamentoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    private User $producao;

    private Parceiro $parceiro;

    private Produto $sku;

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
        $this->assertNotNull(NaturezaGerencial::query()->where('codigo', '1.01.02')->first());

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-REV1',
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
            'codigo' => 'PAR-REV01',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '33014556000196',
            'razao_social' => 'BOMBONIERE DOCE LAR LTDA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'emite_documento_fiscal' => true,
            'finalidade' => 'REVENDA',
            'consumidor_final' => false,
            'ind_ie_dest' => 1,
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

        $this->seedParceiroRecorrenteLimpo($this->empresa, $this->parceiro);

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

        $this->sku = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'REV-RIB-001',
            'familia' => 'REV',
            'grupo' => 'REV-RIB',
            'descricao_fiscal' => 'RIBBON CERA 110MM',
            'descricao_comercial' => 'Ribbon cera 110 mm',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'preco_tabela' => '37.500000',
            'situacao' => 'ATIVO',
            'custo_medio' => '12.000000',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-REV1',
            'name' => 'Comercial REV',
            'email' => 'comercial.rev@test.local',
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
            'codigo' => 'USR-REV2',
            'name' => 'Producao REV',
            'email' => 'producao.rev@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->producao->givePermissionTo(['producao.ler', 'producao.escrever', 'faturamento.ler']);
        $this->producao->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    /** @return array<string, mixed> */
    private function payloadRevenda(): array
    {
        return [
            'parceiro_id' => $this->parceiro->id,
            'tipo_operacao' => 'INDUSTRIALIZACAO',
            'necessidade' => PedidoItem::NEC_REVENDA,
            'produto_id' => $this->sku->id,
            'descricao_comercial' => 'Ribbon cera 110 mm',
            'unidade' => 'UN',
            'faixas' => [
                ['quantidade' => 4, 'valor_unitario' => 37.5, 'comissao_pct' => 0],
            ],
            'prazo_entrega_dias' => 5,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 0,
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
        ];
    }

    /** @return array<string, string> */
    private function h(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    public function test_revenda_orc_separar_fat_sem_op(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = $this->h();

        $calc = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $this->payloadRevenda());
        $calc->assertOk();
        $this->assertSame(150.0, (float) $calc->json('data.faixas.0.valor_etiqueta'));
        $this->assertSame(0.0, (float) $calc->json('data.valor_matriz'));
        $this->assertArrayNotHasKey('medida', $calc->json('data'));

        $orcRes = $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $this->payloadRevenda())
            ->assertCreated();
        $orcId = (int) $orcRes->json('data.id');

        $orc = Orcamento::query()->findOrFail($orcId);
        $this->assertSame(PedidoItem::NEC_REVENDA, $orc->input_snapshot['necessidade'] ?? null);
        $this->assertSame($this->sku->id, (int) ($orc->input_snapshot['produto_id'] ?? 0));
        $this->assertArrayNotHasKey('medida', $orc->input_snapshot);
        $this->assertSame(150.0, (float) ($orc->result_snapshot['faixas'][0]['valor_etiqueta'] ?? 0));

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
        $this->assertSame('0.0000', (string) $pedido->tolerancia_qtd_pct);

        $item = $pedido->itens()->first();
        $this->assertNotNull($item);
        $this->assertSame(PedidoItem::NEC_REVENDA, $item->necessidade);
        $this->assertSame('REV-RIB', $item->familia_fiscal);
        $this->assertSame($this->sku->id, (int) $item->produto_pa_id);
        $this->assertSame('4.0000', (string) $item->qtde_pedida);
        $this->assertSame('UN', $item->unidade);

        $itemId = (int) $item->id;

        Sanctum::actingAs($this->producao);

        $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-op", [
            'pedido_item_id' => $itemId,
        ])->assertStatus(422);

        $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/abrir-os", [
            'pedido_item_id' => $itemId,
        ])->assertStatus(422);

        $this->assertSame(0, OrdemProducao::query()->count());
        $this->assertSame(0, OrdemServico::query()->count());

        Sanctum::actingAs($this->comercial);
        $prevCedo = $this->withHeaders($h)->getJson("/api/v1/pedidos/{$pedido->id}/faturamento-preview");
        $prevCedo->assertOk();
        $this->assertFalse($prevCedo->json('data.apto'));

        Sanctum::actingAs($this->producao);
        $sep = $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/separar-revenda", [
            'pedido_item_id' => $itemId,
        ]);
        $sep->assertOk();
        $this->assertSame(Pedido::STATUS_PRODUZIDO, $sep->json('data.status'));
        $this->assertSame(PedidoItem::STATUS_PRODUZIDO, $sep->json('data.itens.0.status'));
        $this->assertSame('4.0000', $sep->json('data.itens.0.qtde_faturavel'));

        $this->assertSame(0, OrdemProducao::query()->count());
        $this->assertSame(0, EstoqueMovimento::query()->count());

        Sanctum::actingAs($this->comercial);
        $prev = $this->withHeaders($h)->getJson("/api/v1/pedidos/{$pedido->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertTrue($prev->json('data.apto'));
        $this->assertSame('NFE', $prev->json('data.fiscal.documentos.0.tipo'));
        $this->assertTrue($prev->json('data.fiscal.precisa_nfe'));
        $this->assertFalse($prev->json('data.fiscal.precisa_nfse'));

        $fat = $this->withHeaders($h)->postJson("/api/v1/pedidos/{$pedido->id}/faturar");
        $fat->assertCreated();
        $this->assertSame(Faturamento::STATUS_CONFIRMADO, $fat->json('data.status'));
        $this->assertSame('4.0000', $fat->json('data.itens.0.qtde'));
        $this->assertCount(1, $fat->json('data.itens'));
        $this->assertSame('REV-RIB', (string) Faturamento::query()->first()?->itens()->value('familia_fiscal'));

        $this->assertCount(1, $fat->json('data.titulos'));
        $this->assertSame(FaturamentoService::ORIGEM_FATURA, $fat->json('data.titulos.0.origem'));
        $this->assertSame('1.01.02', $fat->json('data.titulos.0.natureza.codigo'));

        $pedido->refresh();
        $this->assertSame(Pedido::STATUS_FATURADO, $pedido->status);
        $this->assertSame(1, Faturamento::query()->count());
        $this->assertSame(1, DocumentoFiscalSaida::query()->count());
        $this->assertSame(1, Titulo::query()->where('origem', FaturamentoService::ORIGEM_FATURA)->count());
        $this->assertSame(0, EstoqueMovimento::query()->count());
    }

    public function test_orcamento_recusa_sku_que_nao_e_rev(): void
    {
        Sanctum::actingAs($this->comercial);
        $mp = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-PAP-001',
            'familia' => 'MP',
            'descricao_fiscal' => 'PAPEL',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        $payload = $this->payloadRevenda();
        $payload['produto_id'] = $mp->id;

        $this->withHeaders($this->h())
            ->postJson('/api/v1/orcamentos/calcular', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['produto_id']);
    }
}
