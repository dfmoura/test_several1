<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\NaturezaGerencial;
use App\Models\Parceiro;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Support\TituloAging;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Carteira operacional TIT — aging, avulso, SoD, EMP (BL-064 / ADR_CARTEIRA_FINANCEIRA).
 */
class TituloCarteiraTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empA;

    private Empresa $empB;

    private User $financeiro;

    private User $comercial;

    private Parceiro $cliente;

    private Parceiro $fornecedor;

    private EmpresaContaFinanceira $cfin;

    private NaturezaGerencial $natJuros;

    private NaturezaGerencial $natDas;

    private NaturezaGerencial $natVenda;

    private NaturezaGerencial $natEstoque;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'financeiro.ler',
            'financeiro.escrever',
            'parceiro.ler',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        app(NaturezaGerencialService::class)->seedCatalog();

        $this->natJuros = NaturezaGerencial::query()->where('codigo', '1.03.01')->firstOrFail();
        $this->natDas = NaturezaGerencial::query()->where('codigo', '3.02.01')->firstOrFail();
        $this->natVenda = NaturezaGerencial::query()->where('codigo', '1.01.01')->firstOrFail();
        $this->natEstoque = NaturezaGerencial::query()->where('codigo', '5.06')->firstOrFail();

        $this->empA = Empresa::query()->create([
            'codigo' => 'EMP-FINA',
            'razao_social' => 'Empresa A',
            'nome_fantasia' => 'EMP A',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);
        $this->empB = Empresa::query()->create([
            'codigo' => 'EMP-FINB',
            'razao_social' => 'Empresa B',
            'nome_fantasia' => 'EMP B',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);

        $this->cfin = EmpresaContaFinanceira::query()->create([
            'empresa_id' => $this->empA->id,
            'codigo' => 'CFIN-00001',
            'tipo' => EmpresaContaFinanceira::TIPO_BANCO,
            'descricao' => 'Conta principal',
            'principal' => true,
            'ativa' => true,
            'ordem' => 0,
        ]);

        $this->cliente = $this->parceiro($this->empA, 'PAR-CLI', 'Cliente A', true, false);
        $this->fornecedor = $this->parceiro($this->empA, 'PAR-FOR', 'Fornecedor A', false, true);
        $this->parceiro($this->empB, 'PAR-B', 'Outra EMP', true, false);

        $this->financeiro = $this->user('fin@test.local', 'USR-FIN', [
            'financeiro.ler',
            'financeiro.escrever',
            'parceiro.ler',
        ], [$this->empA->id]);
        $this->comercial = $this->user('com@test.local', 'USR-COM', [], [$this->empA->id]);
    }

    public function test_aging_e_situacao_aberto_escondem_quitado(): void
    {
        $this->titulo($this->empA, Titulo::TIPO_RECEBER, 'TIT-2026-00001', now()->addDays(5), '100.00');
        $this->titulo($this->empA, Titulo::TIPO_RECEBER, 'TIT-2026-00002', now()->toDateString(), '50.00');
        $this->titulo($this->empA, Titulo::TIPO_RECEBER, 'TIT-2026-00003', now()->subDays(10), '80.00');
        $this->titulo($this->empA, Titulo::TIPO_RECEBER, 'TIT-2026-00004', now()->subDays(40), '20.00');
        $quitado = $this->titulo($this->empA, Titulo::TIPO_RECEBER, 'TIT-2026-00005', now()->subDays(2), '30.00');
        $quitado->status = Titulo::STATUS_QUITADO;
        $quitado->saldo = '0.00';
        $quitado->save();

        Sanctum::actingAs($this->financeiro);
        $h = ['X-Empresa-Id' => (string) $this->empA->id];

        $todos = $this->withHeaders($h)->getJson('/api/v1/titulos?tipo=RECEBER')->assertOk();
        $this->assertCount(5, $todos->json('data'));
        $this->assertSame('250.00', $todos->json('meta.aberto.saldo'));
        $this->assertSame(4, $todos->json('meta.aberto.count'));

        $aging = collect($todos->json('meta.aging'))->keyBy('id');
        $this->assertSame('100.00', $aging[TituloAging::A_VENCER]['saldo']);
        $this->assertSame('50.00', $aging[TituloAging::VENCE_HOJE]['saldo']);
        $this->assertSame('80.00', $aging[TituloAging::D_1_30]['saldo']);
        $this->assertSame('20.00', $aging[TituloAging::D_31_60]['saldo']);

        $aberto = $this->withHeaders($h)
            ->getJson('/api/v1/titulos?tipo=RECEBER&situacao=aberto')
            ->assertOk();
        $codigos = collect($aberto->json('data'))->pluck('codigo')->all();
        $this->assertNotContains('TIT-2026-00005', $codigos);
        $this->assertCount(4, $codigos);

        $vencidos = $this->withHeaders($h)
            ->getJson('/api/v1/titulos?tipo=RECEBER&faixa=VENCIDO')
            ->assertOk();
        $this->assertCount(2, $vencidos->json('data'));
        $this->assertTrue(collect($vencidos->json('data'))->every(fn ($r) => $r['vencido'] === true));

        $hoje = $this->withHeaders($h)
            ->getJson('/api/v1/titulos?tipo=RECEBER&faixa=VENCE_HOJE')
            ->assertOk();
        $this->assertCount(1, $hoje->json('data'));
        $this->assertSame('TIT-2026-00002', $hoje->json('data.0.codigo'));
        $this->assertSame(TituloAging::VENCE_HOJE, $hoje->json('data.0.faixa_aging'));
    }

    public function test_previsao_liquido_receber_menos_pagar(): void
    {
        $this->titulo($this->empA, Titulo::TIPO_RECEBER, 'TIT-2026-00010', now()->addDay(), '200.00');
        $this->titulo($this->empA, Titulo::TIPO_PAGAR, 'TIT-2026-00011', now()->addDay(), '50.00', $this->fornecedor);

        Sanctum::actingAs($this->financeiro);
        $res = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/titulos?tipo=RECEBER')
            ->assertOk();

        $this->assertSame('200.00', $res->json('meta.previsao.receber_saldo'));
        $this->assertSame('50.00', $res->json('meta.previsao.pagar_saldo'));
        $this->assertSame('150.00', $res->json('meta.previsao.liquido'));
        $this->assertStringContainsStringIgnoringCase('não é DRE', $res->json('meta.previsao.legenda'));
    }

    public function test_avulso_pagar_e_receber_e_baixa_com_forma(): void
    {
        Sanctum::actingAs($this->financeiro);
        $h = ['X-Empresa-Id' => (string) $this->empA->id];

        $pagar = $this->withHeaders($h)
            ->postJson('/api/v1/titulos', [
                'tipo' => Titulo::TIPO_PAGAR,
                'parceiro_id' => $this->fornecedor->id,
                'natureza_id' => $this->natDas->id,
                'valor' => '350.00',
                'emissao' => now()->toDateString(),
                'vencimento' => now()->addDays(7)->toDateString(),
                'documento' => 'DAS-08',
            ])
            ->assertCreated()
            ->assertJsonPath('data.origem', Titulo::ORIGEM_AVULSO)
            ->assertJsonPath('data.natureza.codigo', '3.02.01');

        $receber = $this->withHeaders($h)
            ->postJson('/api/v1/titulos', [
                'tipo' => Titulo::TIPO_RECEBER,
                'parceiro_id' => $this->cliente->id,
                'natureza_id' => $this->natJuros->id,
                'valor' => '12.50',
                'emissao' => now()->toDateString(),
                'vencimento' => now()->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.origem', Titulo::ORIGEM_AVULSO);

        $this->withHeaders($h)
            ->postJson('/api/v1/titulos/'.$receber->json('data.id').'/baixar', [
                'conta_financeira_id' => $this->cfin->id,
                'valor' => '12.50',
                'pago_em' => now()->toDateString(),
                'forma' => 'PIX',
                'observacao' => 'Juros recebidos',
            ])
            ->assertCreated()
            ->assertJsonPath('data.titulo.status', Titulo::STATUS_QUITADO)
            ->assertJsonPath('data.baixa.forma', 'PIX');

        $this->withHeaders($h)
            ->postJson('/api/v1/titulos/'.$pagar->json('data.id').'/cancelar', [
                'motivo' => 'Guia indevida',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', Titulo::STATUS_CANCELADO);
    }

    public function test_avulso_rejeita_natureza_da_espinha_e_grupo_errado(): void
    {
        Sanctum::actingAs($this->financeiro);
        $h = ['X-Empresa-Id' => (string) $this->empA->id];
        $base = [
            'parceiro_id' => $this->cliente->id,
            'valor' => '10.00',
            'emissao' => now()->toDateString(),
            'vencimento' => now()->toDateString(),
        ];

        $this->withHeaders($h)
            ->postJson('/api/v1/titulos', $base + [
                'tipo' => Titulo::TIPO_RECEBER,
                'natureza_id' => $this->natVenda->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['natureza_id']);

        $this->withHeaders($h)
            ->postJson('/api/v1/titulos', $base + [
                'tipo' => Titulo::TIPO_PAGAR,
                'parceiro_id' => $this->fornecedor->id,
                'natureza_id' => $this->natEstoque->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['natureza_id']);

        $this->withHeaders($h)
            ->postJson('/api/v1/titulos', $base + [
                'tipo' => Titulo::TIPO_RECEBER,
                'natureza_id' => $this->natDas->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['natureza_id']);
    }

    public function test_cancelar_nao_apaga_origem_fatura_e_sod(): void
    {
        $tit = $this->titulo($this->empA, Titulo::TIPO_RECEBER, 'TIT-2026-00020', now()->addDay(), '90.00');
        $tit->origem = 'FATURA';
        $tit->save();

        Sanctum::actingAs($this->financeiro);
        $h = ['X-Empresa-Id' => (string) $this->empA->id];

        $this->withHeaders($h)
            ->postJson("/api/v1/titulos/{$tit->id}/cancelar", ['motivo' => 'tentativa indevida'])
            ->assertStatus(422);

        $this->assertSame(Titulo::STATUS_ABERTO, $tit->fresh()->status);

        Sanctum::actingAs($this->comercial);
        $this->withHeaders($h)->getJson('/api/v1/titulos?tipo=RECEBER')->assertForbidden();
        $this->withHeaders($h)->postJson('/api/v1/titulos', [
            'tipo' => Titulo::TIPO_PAGAR,
            'parceiro_id' => $this->fornecedor->id,
            'natureza_id' => $this->natDas->id,
            'valor' => '1.00',
            'emissao' => now()->toDateString(),
            'vencimento' => now()->toDateString(),
        ])->assertForbidden();
    }

    public function test_isolamento_por_empresa(): void
    {
        $this->titulo($this->empA, Titulo::TIPO_RECEBER, 'TIT-2026-00030', now()->addDay(), '10.00');
        $parB = Parceiro::query()->where('empresa_id', $this->empB->id)->firstOrFail();
        $this->titulo($this->empB, Titulo::TIPO_RECEBER, 'TIT-2026-00031', now()->addDay(), '99.00', $parB);

        Sanctum::actingAs($this->financeiro);
        $res = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/titulos?tipo=RECEBER')
            ->assertOk();

        $codigos = collect($res->json('data'))->pluck('codigo')->all();
        $this->assertContains('TIT-2026-00030', $codigos);
        $this->assertNotContains('TIT-2026-00031', $codigos);

        $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/titulos?tipo=RECEBER')
            ->assertForbidden();
    }

    public function test_forma_invalida_na_baixa(): void
    {
        $tit = $this->titulo($this->empA, Titulo::TIPO_RECEBER, 'TIT-2026-00040', now()->addDay(), '10.00');
        Sanctum::actingAs($this->financeiro);

        $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->postJson("/api/v1/titulos/{$tit->id}/baixar", [
                'conta_financeira_id' => $this->cfin->id,
                'valor' => '10.00',
                'pago_em' => now()->toDateString(),
                'forma' => 'CHEQUE_SEM_FUNDO',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['forma']);
    }

    /**
     * @param  list<string>  $perms
     * @param  list<int>  $empIds
     */
    private function user(string $email, string $codigo, array $perms, array $empIds): User
    {
        $user = User::query()->create([
            'codigo' => $codigo,
            'name' => $codigo,
            'email' => $email,
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empIds[0],
        ]);
        if ($perms !== []) {
            $user->givePermissionTo($perms);
        }
        $sync = [];
        foreach ($empIds as $id) {
            $sync[$id] = ['padrao' => $id === $empIds[0]];
        }
        $user->empresas()->attach($sync);

        return $user;
    }

    private function parceiro(Empresa $emp, string $codigo, string $nome, bool $cliente, bool $fornecedor): Parceiro
    {
        return Parceiro::query()->create([
            'empresa_id' => $emp->id,
            'codigo' => $codigo,
            'razao_social' => $nome,
            'papel_cliente' => $cliente,
            'papel_fornecedor' => $fornecedor,
            'situacao' => 'ATIVO',
        ]);
    }

    private function titulo(
        Empresa $emp,
        string $tipo,
        string $codigo,
        mixed $vencimento,
        string $valor,
        ?Parceiro $parceiro = null,
    ): Titulo {
        $nat = $tipo === Titulo::TIPO_RECEBER ? $this->natJuros : $this->natDas;

        return Titulo::query()->create([
            'empresa_id' => $emp->id,
            'codigo' => $codigo,
            'tipo' => $tipo,
            'parceiro_id' => ($parceiro ?? $this->cliente)->id,
            'natureza_id' => $nat->id,
            'origem' => Titulo::ORIGEM_AVULSO,
            'documento' => $codigo,
            'emissao' => now()->toDateString(),
            'vencimento' => $vencimento,
            'valor' => $valor,
            'saldo' => $valor,
            'status' => Titulo::STATUS_ABERTO,
        ]);
    }
}
