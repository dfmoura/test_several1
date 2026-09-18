<?php

namespace Tests\Feature;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Faturamento;
use App\Models\FiscalHub;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Financeiro\AdiantamentoService;
use App\Services\Fiscal\FiscalHubCrypto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * BL-051 — NF-e/NFS-e no faturar, hub Focus, IM opcional, isolamento EMP.
 */
class EmissaoFiscalSaidaTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmp;

    private User $comercial;

    private Parceiro $parceiro;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'faturamento.ler',
            'faturamento.escrever',
            'financeiro.ler',
            'fiscal.hubs.gerir',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        app(NaturezaGerencialService::class)->seedCatalog();
        $this->assertNotNull(NaturezaGerencial::query()->where('codigo', '1.01.01')->first());

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-NFE1',
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
        $this->outraEmp = Empresa::query()->create([
            'codigo' => 'EMP-NFE2',
            'razao_social' => 'Outra EMP',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
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
            'codigo' => 'PAR-NFE01',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '00000000000191',
            'razao_social' => 'CLIENTE NF',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'emite_documento_fiscal' => true,
            'finalidade' => 'USO_CONSUMO',
            'consumidor_final' => true,
            'ind_ie_dest' => 9,
            'email_xml' => 'xml@cliente.test',
            'logradouro' => 'Rua Cliente',
            'numero' => '10',
            'bairro' => 'Centro',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400000',
            'ibge' => '3170206',
            'limite_credito' => '10000.00',
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-NFE1',
            'name' => 'Fiscal FAT',
            'email' => 'fiscal.nfe@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['faturamento.ler', 'faturamento.escrever', 'financeiro.ler', 'fiscal.hubs.gerir']);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);
        Sanctum::actingAs($this->comercial);
    }

    /**
     * @return array<string, string>
     */
    private function h(?Empresa $emp = null): array
    {
        return ['X-Empresa-Id' => (string) ($emp ?? $this->empresa)->id];
    }

    private int $seq = 1;

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function criarPedidoProduzido(array $overrides = []): Pedido
    {
        $n = $this->seq++;
        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => $n + 800,
            'codigo' => 'ORC-2026-N'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'versao' => 1,
            'parceiro_id' => $this->parceiro->id,
            'cliente_nome' => 'CLIENTE NF',
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
            ],
            'result_snapshot' => ['faixas' => [[
                'quantidade' => 10000,
                'valor_etiqueta' => '3500.00',
                'valor_matriz' => '0',
                'valor_total' => '3500.00',
            ]]],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        $pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PED-2026-N'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'orcamento_id' => $orc->id,
            'parceiro_id' => $this->parceiro->id,
            'status' => Pedido::STATUS_PRODUZIDO,
            'faixa_index' => 0,
            'tolerancia_qtd_pct' => '20',
            'prazo_entrega_dias' => 10,
            'snapshot' => [
                'input' => [
                    'condicao_pagamento' => '28 DDL',
                    'forma_pagamento' => 'PIX',
                    'modo_entrega' => $overrides['modo_entrega'] ?? 'RETIRAR',
                ],
                'faixa' => [
                    'quantidade' => 10000,
                    'valor_etiqueta' => '3500.00',
                    'valor_matriz' => '0',
                    'valor_total' => '3500.00',
                ],
            ],
        ]);

        PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $pedido->id,
            'ordem' => 1,
            'necessidade' => $overrides['necessidade'] ?? PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => $overrides['familia_fiscal'] ?? 'PA-ETQ',
            'descricao' => $overrides['descricao'] ?? 'Etiqueta teste',
            'qtde_pedida' => '10000.0000',
            'qtde_produzida' => '10000.0000',
            'qtde_faturavel' => '10000.0000',
            'unidade' => 'MIL',
            'preco_unitario' => '0.350000',
            'valor_total' => '3500.00',
            'status' => PedidoItem::STATUS_PRODUZIDO,
        ]);

        return $pedido->fresh(['itens', 'parceiro', 'orcamento']) ?? $pedido;
    }

    private function habilitarHub(): FiscalHub
    {
        $crypto = app(FiscalHubCrypto::class);

        return FiscalHub::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'HUB-00001',
            'nome' => 'Focus Homolog',
            'provedor' => 'focusnfe',
            'ambiente_ativo' => 'homologacao',
            'padrao' => true,
            'ativo' => true,
            'emissao_habilitada' => true,
            'emissao_habilitada_em' => now(),
            'token_homologacao_criptografada' => $crypto->criptografar('tok-homolog-nfe-teste'),
            'token_homologacao_mascara' => 'tok-…este',
            'ultimo_teste_ok' => true,
            'ultimo_teste_ambiente' => 'homologacao',
            'ultimo_teste_em' => now(),
            'ultimo_teste_msg' => 'OK',
        ]);
    }

    public function test_sem_hub_fatura_e_deixa_nfe_planejada(): void
    {
        $ped = $this->criarPedidoProduzido();
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('PENDENTE', $ok->json('data.nf_status'));
        $this->assertSame('NFE', $ok->json('data.documentos_fiscais.0.tipo'));
        $this->assertSame('PLANEJADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertNull($ok->json('data.documentos_fiscais.0.chave'));
        $this->assertNull($ok->json('data.documentos_fiscais.0.numero'));
        $this->assertFalse($ok->json('data.documentos_fiscais.0.previa.oficial'));
        $this->assertNull($ok->json('data.documentos_fiscais.0.previa.chave'));
        $this->assertNull($ok->json('data.documentos_fiscais.0.previa.numero'));
        $this->assertSame('01423183000110', $ok->json('data.documentos_fiscais.0.envio_hub.cnpj_emitente'));
        $this->assertArrayNotHasKey('numero', $ok->json('data.documentos_fiscais.0.envio_hub'));
        $this->assertArrayNotHasKey('_meta', $ok->json('data.documentos_fiscais.0.envio_hub'));
        $this->assertNotEmpty($ok->json('data.documentos_fiscais.0.envio_hub.items'));
        $this->assertSame(1, Faturamento::query()->count());

        $payload = DocumentoFiscalSaida::query()->first()?->payload_json ?? [];
        $this->assertSame('01423183000110', $payload['cnpj_emitente'] ?? null);
        $this->assertArrayNotHasKey('numero', $payload);

        $fatId = $ok->json('data.id');
        $get = $this->withHeaders($this->h())->getJson("/api/v1/faturamentos/{$fatId}");
        $get->assertOk();
        $this->assertSame('PLANEJADO', $get->json('data.documentos_fiscais.0.status'));
        $this->assertFalse($get->json('data.documentos_fiscais.0.previa.oficial'));
        $this->assertSame('CLIENTE NF', $get->json('data.documentos_fiscais.0.previa.destinatario.nome'));
        $this->assertStringContainsString(
            'AVENIDA MARCOS DE FREITAS COSTA',
            (string) $get->json('data.documentos_fiscais.0.previa.emitente.endereco'),
        );
        $this->assertSame('55', $get->json('data.documentos_fiscais.0.previa.modelo'));
        $this->assertNull($get->json('data.documentos_fiscais.0.previa.numero'));
    }

    public function test_hub_ok_emite_nfe_produto_sem_inventar_numero(): void
    {
        $this->habilitarHub();
        Http::fake([
            'homologacao.focusnfe.com.br/v2/nfe*' => Http::response([
                'status' => 'autorizado',
                'chave' => '31260601423183000110550010000061121000000014',
                'numero' => 6112,
                'serie' => 1,
                'protocolo' => '131260000000001',
            ], 200),
        ]);

        $ped = $this->criarPedidoProduzido();
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('AUTORIZADA', $ok->json('data.nf_status'));
        $this->assertSame('AUTORIZADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertTrue($ok->json('data.documentos_fiscais.0.previa.oficial'));
        $this->assertSame('31260601423183000110550010000061121000000014', $ok->json('data.documentos_fiscais.0.previa.chave'));
        $this->assertSame('31260601423183000110550010000061121000000014', $ok->json('data.documentos_fiscais.0.chave'));
        $this->assertSame(6112, $ok->json('data.documentos_fiscais.0.numero'));
        $this->assertSame(1, DocumentoFiscalSaida::query()->count());

        $payload = DocumentoFiscalSaida::query()->first()?->payload_json ?? [];
        $this->assertArrayNotHasKey('numero', $payload);
        $this->assertSame('01423183000110', $payload['cnpj_emitente'] ?? null);
        $this->assertArrayNotHasKey('inscricao_municipal_prestador', $payload);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/v2/nfe?ref=')
                && ! array_key_exists('numero', $request->data());
        });
    }

    public function test_servico_emite_nfse_sem_exigir_im(): void
    {
        $this->habilitarHub();
        Http::fake([
            'homologacao.focusnfe.com.br/v2/nfsen*' => Http::response([
                'status' => 'autorizado',
                'chave' => 'NFSe3170206ABC',
                'numero' => 275,
                'serie' => 1,
            ], 200),
        ]);

        $ped = $this->criarPedidoProduzido([
            'necessidade' => PedidoItem::NEC_SERVICO,
            'familia_fiscal' => 'SVC',
            'descricao' => 'Serviço de impressão',
        ]);
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('NFSE', $ok->json('data.documentos_fiscais.0.tipo'));
        $this->assertSame('AUTORIZADO', $ok->json('data.documentos_fiscais.0.status'));

        $payload = DocumentoFiscalSaida::query()->first()?->payload_json ?? [];
        $this->assertArrayNotHasKey('inscricao_municipal_prestador', $payload);
        $this->assertArrayNotHasKey('numero_dps', $payload);
        $this->assertSame('01423183000110', $payload['cnpj_prestador'] ?? null);

        Http::assertSent(fn ($request) => str_contains($request->url(), '/v2/nfsen?ref='));
    }

    public function test_retry_usa_mesma_ref(): void
    {
        $this->habilitarHub();
        Http::fake([
            'homologacao.focusnfe.com.br/v2/nfe*' => Http::sequence()
                ->push(['status' => 'erro_autorizacao', 'mensagem' => 'Rejeicao teste'], 422)
                ->push([
                    'status' => 'autorizado',
                    'chave' => '31260601423183000110550010000061131000000011',
                    'numero' => 6113,
                    'serie' => 1,
                ], 200),
        ]);

        $ped = $this->criarPedidoProduzido();
        $a = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $a->assertCreated();
        $this->assertSame('REJEITADA', $a->json('data.nf_status'));
        $ref = $a->json('data.documentos_fiscais.0.ref');
        $fatId = $a->json('data.id');

        $b = $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fatId}/emitir-nf");
        $b->assertOk();
        $this->assertSame($ref, $b->json('data.documentos_fiscais.0.ref'));
        $this->assertSame('AUTORIZADA', $b->json('data.nf_status'));
        $this->assertSame(1, DocumentoFiscalSaida::query()->count());
    }

    public function test_outra_emp_nao_ve_documento(): void
    {
        $ped = $this->criarPedidoProduzido();
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $fatId = $ok->json('data.id');

        $outsider = User::query()->create([
            'codigo' => 'USR-NFE2',
            'name' => 'Outra',
            'email' => 'outra.nfe@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->outraEmp->id,
        ]);
        $outsider->givePermissionTo(['faturamento.ler', 'faturamento.escrever']);
        $outsider->empresas()->attach($this->outraEmp->id, ['padrao' => true]);
        Sanctum::actingAs($outsider);

        $this->withHeaders($this->h($this->outraEmp))
            ->getJson("/api/v1/faturamentos/{$fatId}")
            ->assertNotFound();
        $this->withHeaders($this->h($this->outraEmp))
            ->postJson("/api/v1/faturamentos/{$fatId}/emitir-nf")
            ->assertNotFound();
    }

    public function test_preview_mostra_plano_nfe(): void
    {
        $ped = $this->criarPedidoProduzido();
        $prev = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertTrue($prev->json('data.apto'));
        $this->assertSame('NFE', $prev->json('data.fiscal.documentos.0.tipo'));
        $this->assertFalse($prev->json('data.fiscal.emissao_automatica'));
    }

    public function test_sem_hub_previa_nfse_sem_im(): void
    {
        $ped = $this->criarPedidoProduzido([
            'necessidade' => PedidoItem::NEC_SERVICO,
            'familia_fiscal' => 'SVC',
            'descricao' => 'Serviço de impressão',
        ]);
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('NFSE', $ok->json('data.documentos_fiscais.0.tipo'));
        $this->assertSame('PLANEJADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertFalse($ok->json('data.documentos_fiscais.0.previa.oficial'));
        $this->assertSame('01423183000110', $ok->json('data.documentos_fiscais.0.envio_hub.cnpj_prestador'));
        $this->assertArrayNotHasKey('numero_dps', $ok->json('data.documentos_fiscais.0.envio_hub'));
        $this->assertArrayNotHasKey('inscricao_municipal_prestador', $ok->json('data.documentos_fiscais.0.envio_hub'));
        $this->assertNull($ok->json('data.documentos_fiscais.0.chave'));
    }

    public function test_stub_autoriza_fluxo_completo_sem_hub_sem_xml(): void
    {
        config(['erp.fiscal_emissor' => 'stub', 'erp.stage' => 'local']);
        Http::fake();

        $ped = $this->criarPedidoProduzido();
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('AUTORIZADA', $ok->json('data.nf_status'));
        $this->assertTrue($ok->json('data.nf_simulada'));
        $this->assertSame('AUTORIZADO', $ok->json('data.documentos_fiscais.0.status'));
        $this->assertSame('STUB', $ok->json('data.documentos_fiscais.0.autorizacao_origem'));
        $this->assertFalse($ok->json('data.documentos_fiscais.0.previa.oficial'));
        $this->assertTrue($ok->json('data.documentos_fiscais.0.previa.simulada'));
        $this->assertNotNull($ok->json('data.documentos_fiscais.0.chave'));
        $this->assertNotNull($ok->json('data.documentos_fiscais.0.numero'));
        $this->assertStringStartsWith('SIM-', (string) $ok->json('data.documentos_fiscais.0.protocolo'));
        $this->assertTrue($ok->json('data.pode_estornar'));
        $payload = DocumentoFiscalSaida::query()->first()?->payload_json ?? [];
        $this->assertArrayNotHasKey('numero', $payload);
        Http::assertNothingSent();

        $fatId = (int) $ok->json('data.id');
        $est = $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fatId}/estornar", [
            'motivo' => 'Refazer após autorização de teste',
        ]);
        $est->assertOk();
        $this->assertSame('ESTORNADO', $est->json('data.status'));
        $this->assertSame('CANCELADO', DocumentoFiscalSaida::query()->value('status'));
    }

    public function test_stub_ignorado_quando_hub_apto(): void
    {
        config(['erp.fiscal_emissor' => 'stub', 'erp.stage' => 'local']);
        $this->habilitarHub();
        Http::fake([
            'homologacao.focusnfe.com.br/v2/nfe*' => Http::response([
                'status' => 'autorizado',
                'chave' => '31260601423183000110550010000061121000000014',
                'numero' => 6112,
                'serie' => 1,
                'protocolo' => '131260000000001',
            ], 200),
        ]);

        $ped = $this->criarPedidoProduzido();
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();
        $this->assertSame('FOCUS', $ok->json('data.documentos_fiscais.0.autorizacao_origem'));
        $this->assertTrue($ok->json('data.documentos_fiscais.0.previa.oficial'));
        $this->assertFalse($ok->json('data.documentos_fiscais.0.previa.simulada'));
        $this->assertSame('31260601423183000110550010000061121000000014', $ok->json('data.documentos_fiscais.0.chave'));
        $this->assertFalse($ok->json('data.nf_simulada'));
        Http::assertSent(fn ($request) => str_contains($request->url(), '/v2/nfe?ref='));
    }

    public function test_stub_promove_para_focus_com_a_mesma_ref(): void
    {
        config(['erp.fiscal_emissor' => 'stub', 'erp.stage' => 'local']);
        $ped = $this->criarPedidoProduzido();
        $a = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $a->assertCreated();
        $ref = $a->json('data.documentos_fiscais.0.ref');
        $fatId = $a->json('data.id');
        $this->assertSame('STUB', $a->json('data.documentos_fiscais.0.autorizacao_origem'));

        $this->habilitarHub();
        Http::fake([
            'homologacao.focusnfe.com.br/v2/nfe*' => Http::response([
                'status' => 'autorizado',
                'chave' => '31260601423183000110550010000061131000000011',
                'numero' => 6113,
                'serie' => 1,
                'protocolo' => '131260000000002',
            ], 200),
        ]);

        $b = $this->withHeaders($this->h())->postJson("/api/v1/faturamentos/{$fatId}/emitir-nf");
        $b->assertOk();
        $this->assertSame($ref, $b->json('data.documentos_fiscais.0.ref'));
        $this->assertSame('FOCUS', $b->json('data.documentos_fiscais.0.autorizacao_origem'));
        $this->assertTrue($b->json('data.documentos_fiscais.0.previa.oficial'));
        $this->assertSame('31260601423183000110550010000061131000000011', $b->json('data.documentos_fiscais.0.chave'));
        $this->assertSame(1, DocumentoFiscalSaida::query()->count());
        $this->assertFalse($b->json('data.pode_estornar'));
    }

    public function test_stub_morto_em_homolog_e_producao(): void
    {
        config(['erp.fiscal_emissor' => 'stub', 'erp.stage' => 'homolog']);
        $ped = $this->criarPedidoProduzido();
        $hml = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $hml->assertCreated();
        $this->assertSame('PLANEJADO', $hml->json('data.documentos_fiscais.0.status'));
        $this->assertNull($hml->json('data.documentos_fiscais.0.chave'));

        config(['erp.stage' => 'production']);
        $ped2 = $this->criarPedidoProduzido();
        $prod = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped2->id}/faturar");
        $prod->assertCreated();
        $this->assertSame('PLANEJADO', $prod->json('data.documentos_fiscais.0.status'));
        $this->assertNull($prod->json('data.documentos_fiscais.0.chave'));
    }

    public function test_preview_stub_liga_emissao_automatica_de_teste(): void
    {
        config(['erp.fiscal_emissor' => 'stub', 'erp.stage' => 'local']);
        $ped = $this->criarPedidoProduzido();
        $prev = $this->withHeaders($this->h())->getJson("/api/v1/pedidos/{$ped->id}/faturamento-preview");
        $prev->assertOk();
        $this->assertTrue($prev->json('data.fiscal.emissor_teste.ativo'));
        $this->assertTrue($prev->json('data.fiscal.emissao_automatica'));
        $this->assertTrue($prev->json('data.fiscal.apto_cadastro'));
    }

    public function test_retirar_grava_mod_frete_9_sem_transportador(): void
    {
        $ped = $this->criarPedidoProduzido([
            'modo_entrega' => 'RETIRAR',
        ]);
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated()
            ->assertJsonPath('data.mod_frete', '9')
            ->assertJsonPath('data.transportador_id', null);

        $payload = DocumentoFiscalSaida::query()->first()?->payload_json ?? [];
        $this->assertSame(9, $payload['modalidade_frete'] ?? null);
        $this->assertArrayNotHasKey('nome_transportador', $payload);
    }

    public function test_entrega_propria_mod_frete_0_sem_transportador(): void
    {
        $ped = $this->criarPedidoProduzido([
            'modo_entrega' => 'ENTREGA_PROPRIA',
        ]);
        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated()
            ->assertJsonPath('data.mod_frete', '0')
            ->assertJsonPath('data.transportador_id', null);

        $payload = DocumentoFiscalSaida::query()->first()?->payload_json ?? [];
        $this->assertSame(0, $payload['modalidade_frete'] ?? null);
        $this->assertArrayNotHasKey('cnpj_transportador', $payload);
    }

    public function test_terceiros_exige_transportador_e_preenche_focus(): void
    {
        $transp = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-TRN01',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '11222333000181',
            'razao_social' => 'TRANSPORTADORA SUL LTDA',
            'papel_transportadora' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'logradouro' => 'Rua Frete',
            'numero' => '100',
            'bairro' => 'Centro',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400000',
            'ie' => '123456789',
        ]);

        $ped = $this->criarPedidoProduzido([
            'modo_entrega' => 'ENTREGA_TERCEIROS',
        ]);

        $sem = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar", [
            'mod_frete' => '0',
        ]);
        $sem->assertStatus(422)->assertJsonValidationErrors(['transportador_id']);

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar", [
            'mod_frete' => '0',
            'transportador_id' => $transp->id,
        ]);
        $ok->assertCreated()
            ->assertJsonPath('data.mod_frete', '0')
            ->assertJsonPath('data.transportador_id', $transp->id)
            ->assertJsonPath('data.transportador.razao_social', 'TRANSPORTADORA SUL LTDA');

        $payload = DocumentoFiscalSaida::query()->first()?->payload_json ?? [];
        $this->assertSame(0, $payload['modalidade_frete'] ?? null);
        $this->assertSame('TRANSPORTADORA SUL LTDA', $payload['nome_transportador'] ?? null);
        $this->assertSame('11222333000181', $payload['cnpj_transportador'] ?? null);
        $this->assertSame('MG', $payload['uf_transportador'] ?? null);
    }

    public function test_volumes_caixas_na_nfe_quando_embalagem_confirmada(): void
    {
        $ped = $this->criarPedidoProduzido();
        $item = $ped->itens->first();
        $op = \App\Models\OrdemProducao::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'OP-2026-NFE-VOL',
            'pedido_id' => $ped->id,
            'pedido_item_id' => $item->id,
            'status' => \App\Models\OrdemProducao::STATUS_CONCLUIDA,
            'qtde_planejada' => '10000.0000',
            'qtde_boa' => '10000.0000',
            'qtde_refugo' => '0.0000',
            'concluida_em' => now(),
        ]);
        \App\Models\PaEmbalagem::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-NFE-1',
            'pedido_id' => $ped->id,
            'pedido_item_id' => $item->id,
            'ordem_producao_id' => $op->id,
            'status' => \App\Models\PaEmbalagem::STATUS_CONFIRMADA,
            'qtde_etiquetas' => '10000.0000',
            'qtde_bobinas' => 10,
            'qtde_caixas' => 3,
            'etiq_por_rolo' => 1000,
            'rolos_por_caixa' => 4,
            'origem' => \App\Models\PaEmbalagem::ORIGEM_MANUAL,
            'confirmada_em' => now(),
        ]);

        $ok = $this->withHeaders($this->h())->postJson("/api/v1/pedidos/{$ped->id}/faturar");
        $ok->assertCreated();

        $payload = DocumentoFiscalSaida::query()->first()?->payload_json ?? [];
        $this->assertSame([
            ['quantidade' => '3', 'especie' => 'CAIXA'],
        ], $payload['volumes'] ?? null);
    }
}
