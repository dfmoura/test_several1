<?php

namespace Tests\Feature;

use App\Models\BillingCatalogoInstalacao;
use App\Models\ContaAtivacao;
use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class BillingCatalogoInstalacaoTest extends TestCase
{
    use RefreshDatabase;

    private User $operador;

    private User $master;

    protected function setUp(): void
    {
        parent::setUp();

        PlatformRbac::ensure();
        Permission::findOrCreate('usuarios.gerir', 'web');
        Role::findOrCreate('ADMIN', 'web');

        config([
            'erp.billing.valor' => '297.00',
            'erp.billing.ciclo' => 'MONTHLY',
            'erp.billing.descricao' => 'Mensalidade da conta FLEXOERP',
            'erp.billing.provider' => 'mock',
        ]);

        $this->operador = User::query()->create([
            'codigo' => 'USR-BCAT1',
            'name' => 'Ops Billing',
            'email' => 'billing@triggerti.com',
            'password' => bcrypt('Ops@12345'),
            'ativo' => true,
        ]);
        $this->operador->assignRole(PlatformRbac::ROLE);

        $this->master = User::query()->create([
            'codigo' => 'USR-BCAT2',
            'name' => 'Master Cliente',
            'email' => 'master@billing.test',
            'password' => bcrypt('Admin@123'),
            'ativo' => true,
        ]);
        $this->master->assignRole('ADMIN');

        ContaAtivacao::query()->create([
            'user_id' => $this->master->id,
            'billing_status' => ContaAtivacao::BILLING_PENDENTE,
            'billing_provider' => 'mock',
        ]);
    }

    public function test_admin_da_conta_nao_edita_catalogo(): void
    {
        Sanctum::actingAs($this->master, ['*']);

        $this->getJson('/api/v1/plataforma/billing/catalogo')->assertForbidden();
        $this->putJson('/api/v1/plataforma/billing/catalogo', ['valor' => 350])->assertForbidden();
    }

    public function test_operador_le_e_salva_catalogo_reflete_no_cliente(): void
    {
        Sanctum::actingAs($this->operador, ['*']);

        $this->getJson('/api/v1/plataforma/billing/catalogo')
            ->assertOk()
            ->assertJsonPath('data.fonte', 'env')
            ->assertJsonPath('data.valor', 297);

        $this->putJson('/api/v1/plataforma/billing/catalogo', [
            'valor' => 349.9,
            'ciclo' => 'MONTHLY',
            'descricao' => 'Mensalidade FLEXORC Pro',
        ])
            ->assertOk()
            ->assertJsonPath('data.fonte', 'banco')
            ->assertJsonPath('data.valor', 349.9)
            ->assertJsonPath('data.descricao', 'Mensalidade FLEXORC Pro')
            ->assertJsonPath('data.alterado', true);

        $this->assertDatabaseHas('billing_catalogo_instalacao', [
            'valor' => '349.90',
            'descricao' => 'Mensalidade FLEXORC Pro',
        ]);

        Sanctum::actingAs($this->master, ['*']);

        $this->getJson('/api/v1/ativacao')
            ->assertOk()
            ->assertJsonPath('data.conta.valor', 349.9);
    }

    public function test_mudanca_de_preco_invalida_pix_inter_aberto(): void
    {
        $conta = ContaAtivacao::query()->where('user_id', $this->master->id)->firstOrFail();
        $conta->billing_provider = 'inter';
        $conta->billing_pix_copia_cola = '000201PIXVELHO';
        $conta->billing_checkout_ref = 'cod-inter-1';
        $conta->billing_charge_vencimento = now()->addDays(3);
        $conta->billing_pix_emitido_em = now();
        $conta->save();

        Sanctum::actingAs($this->operador, ['*']);

        $this->putJson('/api/v1/plataforma/billing/catalogo', ['valor' => 310])
            ->assertOk()
            ->assertJsonPath('data.sync.pix_invalidados', 1);

        $conta->refresh();
        $this->assertNull($conta->billing_pix_copia_cola);
        $this->assertNull($conta->billing_checkout_ref);
    }

    public function test_sync_asaas_atualiza_assinatura_no_proximo_ciclo(): void
    {
        config([
            'erp.billing.provider' => 'asaas',
            'erp.asaas.api_key' => 'test_asaas_key',
            'erp.asaas.env' => 'sandbox',
        ]);

        $conta = ContaAtivacao::query()->where('user_id', $this->master->id)->firstOrFail();
        $conta->billing_provider = 'asaas';
        $conta->billing_status = ContaAtivacao::BILLING_ATIVA;
        $conta->billing_metodo_em = now()->subMonth();
        $conta->billing_customer_ref = 'cus_test_1';
        $conta->save();

        Http::fake([
            '*/subscriptions?*' => Http::response([
                'data' => [[
                    'id' => 'sub_test_1',
                    'externalReference' => 'FLEXORC-CONTA-'.$this->master->id,
                    'status' => 'ACTIVE',
                ]],
            ], 200),
            '*/subscriptions/sub_test_1' => Http::response(['id' => 'sub_test_1'], 200),
        ]);

        Sanctum::actingAs($this->operador, ['*']);

        $this->putJson('/api/v1/plataforma/billing/catalogo', ['valor' => 399])
            ->assertOk()
            ->assertJsonPath('data.sync.asaas_atualizadas', 1);

        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), '/subscriptions/sub_test_1')) {
                return true;
            }
            $body = $request->data();

            return ($body['value'] ?? null) === 399.0
                && ($body['updatePendingPayments'] ?? null) === false;
        });
    }
}
