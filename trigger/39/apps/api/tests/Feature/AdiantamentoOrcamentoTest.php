<?php

namespace Tests\Feature;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Aceite + adiantamento PIX (estudo 32 §5.1 / ADR_ORC_ADIANTAMENTO_PIX).
 */
class AdiantamentoOrcamentoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    private User $financeiro;

    private Parceiro $parceiro;

    private EmpresaContaFinanceira $cfin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'orcamento.ler',
            'orcamento.escrever',
            'financeiro.ler',
            'financeiro.escrever',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        app(NaturezaGerencialService::class)->seedCatalog();
        $this->assertNotNull(NaturezaGerencial::query()->where('codigo', '1.01.01')->first());

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-ADI1',
            'razao_social' => 'RLP Adiantamento',
            'nome_fantasia' => 'RLP ADI',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);

        $this->cfin = EmpresaContaFinanceira::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'CFIN-00001',
            'tipo' => EmpresaContaFinanceira::TIPO_BANCO,
            'descricao' => 'Conta PIX teste',
            'banco_codigo' => '077',
            'banco_nome' => 'Inter',
            'principal' => true,
            'ativa' => true,
            'ordem' => 0,
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-ADI01',
            'razao_social' => 'CLIENTE NOVO LIMITE ZERO',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'limite_credito' => '0.00',
            'whatsapp' => '31988887777',
            'contato_nome' => 'Ana Nova',
        ]);

        ParceiroContato::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'nome' => 'Ana Nova',
            'whatsapp' => '31988887777',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-ADI1',
            'name' => 'Comercial ADI',
            'email' => 'comercial.adi@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever']);
        $this->comercial->empresas()->attach($this->empresa->id);

        $this->financeiro = User::query()->create([
            'codigo' => 'USR-ADI2',
            'name' => 'Financeiro ADI',
            'email' => 'fin.adi@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->financeiro->givePermissionTo(['financeiro.ler', 'financeiro.escrever']);
        $this->financeiro->empresas()->attach($this->empresa->id);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        return [
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
            'faixas' => array_map(static fn (array $f) => [
                'quantidade' => $f['quantidade'],
                'comissao_pct' => $f['comissao_pct'],
            ], $fx['faixas']),
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ];
    }

    private function criarEEnviar(): string
    {
        Sanctum::actingAs($this->comercial);
        $create = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/orcamentos', $this->payload());
        $create->assertCreated();
        $id = (int) $create->json('data.id');

        $contatoId = ParceiroContato::query()->where('parceiro_id', $this->parceiro->id)->value('id');
        $env = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao", [
                'parceiro_contato_id' => $contatoId,
            ]);
        $env->assertOk();

        return (string) $env->json('data.token');
    }

    public function test_aprovacao_primeiro_pedido_emite_pix_e_aguarda_adiantamento(): void
    {
        $token = $this->criarEEnviar();

        $ok = $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'faixa_index' => 0,
            'nome_cliente' => 'Ana Nova',
        ]);
        $ok->assertOk();
        $this->assertSame('APROVADO', $ok->json('data.status'));
        $this->assertSame('AGUARDA_ADIANTAMENTO', $ok->json('data.financeiro_status'));
        $this->assertNotEmpty($ok->json('data.adiantamento.pix_copia_cola'));
        $this->assertGreaterThan(0, (float) $ok->json('data.adiantamento.valor'));

        $orc = Orcamento::query()->where('codigo', $ok->json('data.codigo'))->firstOrFail();
        $this->assertSame('AGUARDA_ADIANTAMENTO', $orc->financeiro_status);
        $this->assertNotNull($orc->adiantamento_titulo_id);

        $tit = Titulo::query()->findOrFail($orc->adiantamento_titulo_id);
        $this->assertSame(Titulo::TIPO_RECEBER, $tit->tipo);
        $this->assertSame('ADIANTAMENTO', $tit->origem);

        $cob = Cobranca::query()->where('titulo_id', $tit->id)->firstOrFail();
        $this->assertSame('mock', $cob->provider);
        $this->assertNotEmpty($cob->pix_copia_cola);

        // GET público pós-aceite = modo pagamento
        $show = $this->getJson("/api/v1/publico/orcamentos/{$token}");
        $show->assertOk();
        $this->assertSame('pagamento', $show->json('data.modo'));
        $this->assertNotEmpty($show->json('data.adiantamento.pix_copia_cola'));

        // Contas a receber lista o TIT
        Sanctum::actingAs($this->financeiro);
        $list = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/titulos?tipo=RECEBER');
        $list->assertOk();
        $this->assertTrue(collect($list->json('data'))->contains(fn ($r) => $r['codigo'] === $tit->codigo));
    }

    public function test_webhook_mock_baixa_idempotente_e_libera_orcamento(): void
    {
        $token = $this->criarEEnviar();
        $ok = $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'faixa_index' => 0,
            'nome_cliente' => 'Ana Nova',
        ]);
        $ok->assertOk();

        $orc = Orcamento::query()->where('codigo', $ok->json('data.codigo'))->firstOrFail();
        $cob = Cobranca::query()->where('titulo_id', $orc->adiantamento_titulo_id)->firstOrFail();
        $tit = Titulo::query()->findOrFail($orc->adiantamento_titulo_id);

        $payload = [
            'event_id' => 'evt-1',
            'provider_ref' => $cob->provider_ref,
            'txid' => $cob->txid,
            'status' => 'PAGA',
            'valor' => (string) $tit->valor,
            'pago_em' => now()->toDateString(),
        ];

        $w1 = $this->postJson('/api/v1/webhooks/bancarios/mock', $payload);
        $w1->assertOk();
        $this->assertSame('PROCESSADO', $w1->json('data.resultado'));

        $orc->refresh();
        $tit->refresh();
        $this->assertSame(Titulo::STATUS_QUITADO, $tit->status);
        $this->assertSame('LIBERADO', $orc->financeiro_status);

        $w2 = $this->postJson('/api/v1/webhooks/bancarios/mock', $payload);
        $w2->assertOk();
        $this->assertSame('DUPLICADO', $w2->json('data.resultado'));
        $this->assertSame(1, $tit->baixas()->count());
    }

    public function test_simular_pagamento_pix_baixa_e_libera(): void
    {
        $token = $this->criarEEnviar();
        $ok = $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'faixa_index' => 0,
            'nome_cliente' => 'Ana Nova',
        ]);
        $ok->assertOk();
        $this->assertSame('AGUARDANDO_PAGAMENTO', $ok->json('data.status_exibicao'));

        $sim = $this->postJson("/api/v1/publico/orcamentos/{$token}/simular-pagamento-pix");
        $sim->assertOk();
        $this->assertTrue($sim->json('data.ok'));
        $this->assertSame('APROVADO', $sim->json('data.status_exibicao'));
        $this->assertTrue($sim->json('data.adiantamento.pago'));

        $orc = Orcamento::query()->where('codigo', $ok->json('data.codigo'))->firstOrFail();
        $this->assertSame('LIBERADO', $orc->financeiro_status);
        $tit = Titulo::query()->findOrFail($orc->adiantamento_titulo_id);
        $this->assertSame(Titulo::STATUS_QUITADO, $tit->status);
        $this->assertSame(1, $tit->baixas()->count());
    }

    public function test_cliente_com_credito_nao_exige_pix(): void
    {
        $this->parceiro->update(['limite_credito' => '50000.00']);
        $token = $this->criarEEnviar();

        $ok = $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'faixa_index' => 0,
            'nome_cliente' => 'Ana Nova',
        ]);
        $ok->assertOk();
        $this->assertSame('APROVADO', $ok->json('data.status'));
        $this->assertSame('LIBERADO', $ok->json('data.financeiro_status'));
        $this->assertNull($ok->json('data.adiantamento'));
        $this->assertSame(0, Titulo::query()->where('tipo', Titulo::TIPO_RECEBER)->count());
    }
}
