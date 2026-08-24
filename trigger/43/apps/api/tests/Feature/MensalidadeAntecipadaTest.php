<?php

namespace Tests\Feature;

use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\EmpresaAtivacao;
use App\Models\User;
use App\Services\Banking\Asaas\AsaasBillingGateway;
use App\Support\PlatformRbac;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MensalidadeAntecipadaTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    private ContaAtivacao $conta;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('empresas.gerir', 'web');
        $admin = Role::findOrCreate('ADMIN', 'web');
        $admin->givePermissionTo('empresas.gerir');

        $this->master = User::query()->create([
            'codigo' => 'USR-BILL1',
            'name' => 'Master Billing',
            'email' => 'billing@cliente.test',
            'password' => bcrypt('Admin@123'),
            'ativo' => true,
        ]);
        $this->master->assignRole('ADMIN');

        $this->conta = ContaAtivacao::query()->create([
            'user_id' => $this->master->id,
            'billing_status' => ContaAtivacao::BILLING_PENDENTE,
            'billing_provider' => 'mock',
        ]);
    }

    public function test_primeira_cobranca_hoje_sem_cortesia(): void
    {
        $gw = app(AsaasBillingGateway::class);
        $hoje = Carbon::parse('2026-08-21')->startOfDay();

        $this->assertSame(
            '2026-08-21',
            $gw->primeiraCobrancaEm(null, $hoje)->toDateString(),
        );
    }

    public function test_primeira_cobranca_no_fim_da_cortesia(): void
    {
        $gw = app(AsaasBillingGateway::class);
        $hoje = Carbon::parse('2026-08-21')->startOfDay();
        $ate = Carbon::parse('2026-09-15')->endOfDay();

        $this->assertSame(
            '2026-09-15',
            $gw->primeiraCobrancaEm($ate, $hoje)->toDateString(),
        );
    }

    public function test_fatura_cortesia_expõe_alerta_e_cobranca_antecipada(): void
    {
        $this->conta->cortesia_ate = now()->addDays(3)->endOfDay();
        $this->conta->cortesia_motivo = 'Piloto';
        $this->conta->cortesia_concedida_em = now();
        $this->conta->save();

        Sanctum::actingAs($this->master, ['*']);

        $at = $this->getJson('/api/v1/ativacao')->assertOk();

        $this->assertSame('cortesia', $at->json('data.conta.modo'));
        $this->assertTrue($at->json('data.conta.cobranca_antecipada'));
        $this->assertTrue($at->json('data.conta.alerta_cortesia'));
        $this->assertSame('warning', $at->json('data.conta.alerta_cortesia_nivel'));
        $this->assertSame(
            $this->conta->fresh()->cortesia_ate->toDateString(),
            $at->json('data.conta.primeira_cobranca_em'),
        );
        $this->assertFalse($at->json('data.pagamento_pendente'));
        $this->assertTrue($at->json('data.pode_enviar_orcamento'));
    }

    public function test_cortesia_encerrada_exige_pagamento_e_aviso(): void
    {
        $this->conta->cortesia_ate = now()->subDay()->endOfDay();
        $this->conta->cortesia_concedida_em = now()->subDays(20);
        $this->conta->cortesia_motivo = 'Piloto';
        $this->conta->save();

        Sanctum::actingAs($this->master, ['*']);

        $at = $this->getJson('/api/v1/ativacao')->assertOk();
        $this->assertSame('cortesia_encerrada', $at->json('data.conta.modo'));
        $this->assertSame('Cortesia encerrada', $at->json('data.conta.status_label'));
        $this->assertTrue($at->json('data.pagamento_pendente'));
        $this->assertFalse($at->json('data.conta.paga'));
        $this->assertFalse($at->json('data.conta.cortesia.vigente'));
        $this->assertSame(now()->toDateString(), $at->json('data.conta.primeira_cobranca_em'));

        $me = $this->getJson('/api/v1/auth/me')->assertOk();
        $this->assertSame('cortesia_encerrada', $me->json('billing_aviso.tipo'));
        $this->assertSame('autenticar', $me->json('billing_aviso.acao'));
        $this->assertSame('/conta/mensalidade', $me->json('billing_aviso.to'));
    }

    public function test_comando_abre_cobranca_pos_cortesia_sem_apagar_empresa(): void
    {
        $this->conta->cortesia_ate = now()->addDays(12)->endOfDay();
        $this->conta->cortesia_concedida_em = now();
        $this->conta->billing_status = ContaAtivacao::BILLING_ATIVA;
        $this->conta->billing_provider = 'mock';
        $this->conta->billing_metodo_em = now();
        $this->conta->save();

        $emp = Empresa::query()->create([
            'codigo' => 'EMP-POS1',
            'cnpj' => '34661762000150',
            'razao_social' => 'Grafica Pos Cortesia',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $this->master->empresas()->attach([$emp->id => ['padrao' => true]]);
        EmpresaAtivacao::query()->create([
            'empresa_id' => $emp->id,
            'billing_status' => EmpresaAtivacao::BILLING_ATIVA,
            'billing_provider' => 'mock',
            'billing_metodo_em' => now(),
        ]);

        $this->artisan('plataforma:abrir-cobranca-pos-cortesia', [
            'email' => $this->master->email,
            '--force' => true,
        ])->assertSuccessful();

        $this->conta->refresh();
        $this->assertTrue($this->conta->cortesiaEncerrada());
        $this->assertFalse($this->conta->acessoLiberado());
        $this->assertSame(ContaAtivacao::BILLING_PENDENTE, $this->conta->billing_status);
        $this->assertDatabaseHas('empresas', ['id' => $emp->id, 'codigo' => 'EMP-POS1']);
        $this->assertDatabaseHas('empresa_ativacoes', [
            'empresa_id' => $emp->id,
            'billing_status' => EmpresaAtivacao::BILLING_PENDENTE,
        ]);
    }

    public function test_webhook_overdue_suspende_conta_e_reativa_no_recebido(): void
    {
        $this->conta->billing_status = ContaAtivacao::BILLING_ATIVA;
        $this->conta->billing_provider = 'asaas';
        $this->conta->billing_metodo_em = now()->subMonth();
        $this->conta->save();

        $emp = Empresa::query()->create([
            'codigo' => 'EMP-BILL1',
            'cnpj' => '34661762000150',
            'razao_social' => 'Grafica Billing',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $this->master->empresas()->attach([$emp->id => ['padrao' => true]]);
        EmpresaAtivacao::query()->create([
            'empresa_id' => $emp->id,
            'billing_status' => EmpresaAtivacao::BILLING_ATIVA,
            'billing_provider' => 'asaas',
            'billing_metodo_em' => now()->subMonth(),
        ]);

        $this->postJson('/api/v1/webhooks/bancarios/asaas', [
            'event' => 'PAYMENT_OVERDUE',
            'payment' => [
                'id' => 'pay_over_1',
                'status' => 'OVERDUE',
                'externalReference' => 'FLEXORC-CONTA-'.$this->master->id,
                'value' => 297,
            ],
        ])->assertOk()->assertJsonPath('data.camada', 'billing');

        $this->assertDatabaseHas('conta_ativacoes', [
            'user_id' => $this->master->id,
            'billing_status' => ContaAtivacao::BILLING_SUSPENSA,
        ]);
        $this->assertDatabaseHas('empresa_ativacoes', [
            'empresa_id' => $emp->id,
            'billing_status' => EmpresaAtivacao::BILLING_SUSPENSA,
        ]);

        Sanctum::actingAs($this->master, ['*']);
        $this->withHeader('X-Empresa-Id', (string) $emp->id)
            ->getJson('/api/v1/ativacao')
            ->assertOk()
            ->assertJsonPath('data.conta.modo', 'suspensa')
            ->assertJsonPath('data.pagamento_pendente', true);

        $this->postJson('/api/v1/webhooks/bancarios/asaas', [
            'event' => 'PAYMENT_RECEIVED',
            'payment' => [
                'id' => 'pay_ok_2',
                'status' => 'RECEIVED',
                'externalReference' => 'FLEXORC-CONTA-'.$this->master->id,
                'value' => 297,
                'paymentDate' => now()->toDateString(),
            ],
        ])->assertOk();

        $this->assertDatabaseHas('conta_ativacoes', [
            'user_id' => $this->master->id,
            'billing_status' => ContaAtivacao::BILLING_ATIVA,
        ]);
    }

    public function test_comando_lista_cortesia_acabando_sem_meio(): void
    {
        $this->conta->cortesia_ate = now()->addDays(2)->endOfDay();
        $this->conta->cortesia_concedida_em = now();
        $this->conta->save();

        ContaAtivacao::query()->create([
            'user_id' => User::query()->create([
                'codigo' => 'USR-BILL2',
                'name' => 'Já autenticado',
                'email' => 'ok@cliente.test',
                'password' => bcrypt('Admin@123'),
                'ativo' => true,
            ])->id,
            'billing_status' => ContaAtivacao::BILLING_ATIVA,
            'billing_provider' => 'mock',
            'billing_metodo_em' => now(),
            'cortesia_ate' => now()->addDays(1)->endOfDay(),
            'cortesia_concedida_em' => now(),
        ]);

        $this->artisan('plataforma:avisar-cortesia-billing')
            ->assertSuccessful()
            ->expectsOutputToContain('USR-BILL1');
    }

    public function test_console_ainda_ve_mrr_so_autenticado(): void
    {
        PlatformRbac::ensure();
        $ops = User::query()->create([
            'codigo' => 'USR-OPSB',
            'name' => 'Ops',
            'email' => 'ops-bill@triggerti.com',
            'password' => bcrypt('Ops@12345'),
            'ativo' => true,
        ]);
        $ops->assignRole(PlatformRbac::ROLE);

        $this->conta->cortesia_ate = now()->addDays(10);
        $this->conta->cortesia_concedida_em = now();
        $this->conta->save();

        Sanctum::actingAs($ops, ['*']);
        $m = $this->getJson('/api/v1/plataforma/metricas')->assertOk()->json('data');
        $this->assertSame(0, $m['contas']['em_dia']);
        $this->assertGreaterThanOrEqual(1, $m['contas']['cortesia']);
    }
}
