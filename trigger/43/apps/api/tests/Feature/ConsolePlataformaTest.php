<?php

namespace Tests\Feature;

use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ConsolePlataformaTest extends TestCase
{
    use RefreshDatabase;

    private User $operador;

    private User $masterPago;

    private User $masterPendente;

    private User $adminConta;

    protected function setUp(): void
    {
        parent::setUp();

        PlatformRbac::ensure();
        Permission::findOrCreate('usuarios.gerir', 'web');
        Role::findOrCreate('ADMIN', 'web');
        Role::findOrCreate('COMERCIAL', 'web');

        $this->operador = User::query()->create([
            'codigo' => 'USR-OPS1',
            'name' => 'Operação TRIGGER',
            'email' => 'ops@triggerti.com',
            'password' => bcrypt('Ops@12345'),
            'ativo' => true,
        ]);
        $this->operador->assignRole(PlatformRbac::ROLE);

        $emp = Empresa::query()->create([
            'codigo' => 'EMP-00091',
            'cnpj' => '00000000000191',
            'razao_social' => 'Grafica Paga LTDA',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->masterPago = User::query()->create([
            'codigo' => 'USR-PAY1',
            'name' => 'Master Pago',
            'email' => 'pago@cliente.test',
            'password' => bcrypt('Admin@123'),
            'ativo' => true,
            'empresa_default_id' => $emp->id,
        ]);
        $this->masterPago->assignRole('ADMIN');
        $this->masterPago->givePermissionTo('usuarios.gerir');
        $this->masterPago->empresas()->attach([$emp->id => ['padrao' => true]]);
        ContaAtivacao::query()->create([
            'user_id' => $this->masterPago->id,
            'billing_status' => ContaAtivacao::BILLING_ATIVA,
            'billing_provider' => 'mock',
            'billing_metodo_em' => now(),
        ]);

        $this->masterPendente = User::query()->create([
            'codigo' => 'USR-PEN1',
            'name' => 'Master Pendente',
            'email' => 'pendente@cliente.test',
            'password' => bcrypt('Admin@123'),
            'ativo' => true,
        ]);
        $this->masterPendente->assignRole('ADMIN');
        ContaAtivacao::query()->create([
            'user_id' => $this->masterPendente->id,
            'billing_status' => ContaAtivacao::BILLING_PENDENTE,
            'billing_provider' => 'mock',
        ]);

        $this->adminConta = $this->masterPago;
    }

    public function test_admin_da_conta_nao_acessa_console(): void
    {
        Sanctum::actingAs($this->adminConta, ['*']);

        $this->getJson('/api/v1/plataforma/contas')
            ->assertForbidden();
        $this->getJson('/api/v1/plataforma/metricas')
            ->assertForbidden();
    }

    public function test_operador_lista_contas_e_metricas_sem_empresa(): void
    {
        Sanctum::actingAs($this->operador, ['*']);

        $metricas = $this->getJson('/api/v1/plataforma/metricas')
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $metricas['contas']['total']);
        $this->assertSame(1, $metricas['contas']['em_dia']);
        $this->assertSame(0, $metricas['contas']['cortesia']);
        $this->assertSame(1, $metricas['contas']['pendente']);

        $lista = $this->getJson('/api/v1/plataforma/contas?saude=em_dia')
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $lista);
        $this->assertSame('USR-PAY1', $lista[0]['master']['codigo']);
        $this->assertSame('em_dia', $lista[0]['saude']);
    }

    public function test_operador_ve_detalhe_com_empresas_e_usuarios(): void
    {
        Sanctum::actingAs($this->operador, ['*']);

        $contaId = ContaAtivacao::query()->where('user_id', $this->masterPago->id)->value('id');

        $detalhe = $this->getJson('/api/v1/plataforma/contas/'.$contaId)
            ->assertOk()
            ->json('data');

        $this->assertSame('Grafica Paga LTDA', $detalhe['empresas'][0]['razao_social']);
        $this->assertContains('USR-PAY1', array_column($detalhe['usuarios'], 'codigo'));

        $this->getJson('/api/v1/plataforma/auditoria')
            ->assertOk()
            ->assertJsonPath('data.0.acao', 'PLATAFORMA_CONTA_VER');
    }

    public function test_conta_nao_atribui_papel_plataforma(): void
    {
        Sanctum::actingAs($this->adminConta, ['*']);

        $colab = User::query()->create([
            'codigo' => 'USR-COL9',
            'name' => 'Colaborador',
            'email' => 'colab@cliente.test',
            'password' => bcrypt('Demo@1234'),
            'ativo' => true,
        ]);

        $colab->empresas()->attach([$this->adminConta->empresa_default_id => ['padrao' => true]]);
        $colab->assignRole('COMERCIAL');

        $this->putJson('/api/v1/usuarios/'.$colab->id, [
            'roles' => ['PLATAFORMA'],
            'empresa_ids' => [$this->adminConta->empresa_default_id],
        ])->assertStatus(422);
    }

    public function test_cli_cria_operador_sem_emp(): void
    {
        $this->artisan('plataforma:criar-operador', [
            'email' => 'nova.ops@triggerti.com',
            '--name' => 'Ops Nova',
            '--password' => 'SenhaForte@123',
        ])->assertSuccessful();

        $user = User::query()->where('email', 'nova.ops@triggerti.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasRole(PlatformRbac::ROLE));
        $this->assertSame(0, $user->empresas()->count());
        $this->assertNull($user->contaAtivacao);
    }

    public function test_cli_cria_conta_master_sem_alta_publica(): void
    {
        $this->artisan('plataforma:criar-conta', [
            'email' => 'master.novo@cliente.test',
            '--name' => 'Master Novo',
            '--password' => 'SenhaForte1',
        ])->assertSuccessful();

        $user = User::query()->where('email', 'master.novo@cliente.test')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasRole('ADMIN'));
        $this->assertNotNull($user->contaAtivacao);
        $this->assertSame(0, $user->empresas()->count());
    }

    public function test_cli_recusa_converter_pagador(): void
    {
        $this->artisan('plataforma:criar-operador', [
            'email' => 'pago@cliente.test',
            '--password' => 'SenhaForte@123',
        ])->assertFailed();
    }

    public function test_me_marca_console_so_no_operador(): void
    {
        Sanctum::actingAs($this->operador, ['*']);
        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('console_plataforma', true);

        Sanctum::actingAs($this->adminConta, ['*']);
        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('console_plataforma', false);
    }

    public function test_operador_provisiona_master_com_cortesia(): void
    {
        Sanctum::actingAs($this->operador, ['*']);

        $res = $this->postJson('/api/v1/plataforma/contas', [
            'name' => 'Master Cortesia',
            'email' => 'cortesia@cliente.test',
            'cortesia_dias' => 30,
            'cortesia_motivo' => 'Piloto',
        ])->assertCreated()->json('data');

        $this->assertSame('cortesia', $res['saude']);
        $this->assertTrue($res['acesso_liberado']);
        $this->assertFalse($res['pagamento_autenticado']);
        $this->assertTrue($res['cortesia']['vigente']);
        $this->assertNotEmpty($res['senha_temporaria']);

        $user = User::query()->where('email', 'cortesia@cliente.test')->firstOrFail();
        Sanctum::actingAs($user, ['*']);
        $at = $this->getJson('/api/v1/ativacao')->assertOk()->json('data');
        $this->assertFalse($at['pagamento_pendente']);
        $this->assertSame('PENDENTE', $at['billing_status']);
        $this->assertSame('Cortesia', $at['conta']['status_label']);
        $this->assertSame('cortesia', $at['conta']['modo']);
        $this->assertTrue($at['conta']['paga']);
        $this->assertFalse($at['conta']['pagamento_autenticado']);
        $this->assertSame('Master Cortesia', $at['conta']['pagador']['razao_social']);
        $this->assertTrue($at['conta']['cortesia']['vigente']);
        $this->assertSame('Piloto', $at['conta']['cortesia']['motivo']);
        $this->assertNotNull($at['conta']['dias_ate_proxima']);
    }

    public function test_operador_bonifica_e_revoga_cortesia(): void
    {
        Sanctum::actingAs($this->operador, ['*']);
        $contaId = ContaAtivacao::query()->where('user_id', $this->masterPendente->id)->value('id');

        $this->postJson('/api/v1/plataforma/contas/'.$contaId.'/cortesia', [
            'dias' => 15,
            'motivo' => 'Bonificação teste',
        ])->assertOk()
            ->assertJsonPath('data.saude', 'cortesia')
            ->assertJsonPath('data.cortesia.vigente', true);

        $this->getJson('/api/v1/plataforma/contas?saude=cortesia')
            ->assertOk()
            ->assertJsonPath('data.0.master.codigo', 'USR-PEN1');

        $this->postJson('/api/v1/plataforma/contas/'.$contaId.'/cortesia', [
            'revogar' => true,
        ])->assertOk()
            ->assertJsonPath('data.saude', 'pendente')
            ->assertJsonPath('data.cortesia', null);
    }

    public function test_operador_encerra_cortesia_preserva_historico(): void
    {
        Sanctum::actingAs($this->operador, ['*']);
        $contaId = ContaAtivacao::query()->where('user_id', $this->masterPendente->id)->value('id');

        $this->postJson('/api/v1/plataforma/contas/'.$contaId.'/cortesia', [
            'dias' => 15,
            'motivo' => 'Piloto a encerrar',
        ])->assertOk()->assertJsonPath('data.cortesia.vigente', true);

        $res = $this->postJson('/api/v1/plataforma/contas/'.$contaId.'/cortesia', [
            'encerrar' => true,
        ])->assertOk()
            ->assertJsonPath('data.saude', 'pendente')
            ->assertJsonPath('data.cortesia.vigente', false)
            ->assertJsonPath('data.acesso_liberado', false);

        $this->assertNotEmpty($res->json('data.cortesia.ate'));
    }

    public function test_cortesia_sobrepoe_pagamento_autenticado_na_mensalidade(): void
    {
        Sanctum::actingAs($this->operador, ['*']);
        $contaId = ContaAtivacao::query()->where('user_id', $this->masterPago->id)->value('id');

        $this->postJson('/api/v1/plataforma/contas/'.$contaId.'/cortesia', [
            'dias' => 30,
            'motivo' => 'piloto',
        ])->assertOk()
            ->assertJsonPath('data.saude', 'cortesia')
            ->assertJsonPath('data.cortesia.vigente', true)
            ->assertJsonPath('data.pagamento_autenticado', true);

        $this->getJson('/api/v1/plataforma/contas?saude=cortesia')
            ->assertOk()
            ->assertJsonPath('data.0.master.codigo', 'USR-PAY1');

        $emDia = $this->getJson('/api/v1/plataforma/contas?saude=em_dia')->assertOk()->json('data');
        $this->assertNotContains(
            'USR-PAY1',
            collect($emDia)->pluck('master.codigo')->all(),
        );

        Sanctum::actingAs($this->masterPago, ['*']);
        \App\Models\EmpresaAtivacao::query()->create([
            'empresa_id' => $this->masterPago->empresa_default_id,
            'billing_status' => \App\Models\EmpresaAtivacao::BILLING_ATIVA,
            'billing_provider' => 'mock',
            'billing_metodo_em' => now(),
        ]);
        $at = $this->withHeaders([
            'X-Empresa-Id' => (string) $this->masterPago->empresa_default_id,
        ])->getJson('/api/v1/ativacao')->assertOk()->json('data');

        $this->assertSame('cortesia', $at['conta']['modo']);
        $this->assertSame('Cortesia', $at['conta']['status_label']);
        $this->assertTrue($at['conta']['cortesia']['vigente']);
        $this->assertSame('piloto', $at['conta']['cortesia']['motivo']);
        $this->assertNotNull($at['conta']['dias_ate_proxima']);
        $this->assertGreaterThan(0, $at['conta']['dias_ate_proxima']);
    }

    public function test_admin_nao_provisiona_nem_bonifica(): void
    {
        Sanctum::actingAs($this->adminConta, ['*']);
        $this->postJson('/api/v1/plataforma/contas', [
            'name' => 'X',
            'email' => 'x@y.test',
        ])->assertForbidden();

        $contaId = ContaAtivacao::query()->where('user_id', $this->masterPendente->id)->value('id');
        $this->postJson('/api/v1/plataforma/contas/'.$contaId.'/cortesia', [
            'dias' => 7,
        ])->assertForbidden();
    }
}
