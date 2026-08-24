<?php

namespace Tests\Feature;

use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AsaasCheckoutBillingTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    private ContaAtivacao $conta;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('empresas.gerir', 'web');
        Role::findOrCreate('ADMIN', 'web')->givePermissionTo('empresas.gerir');

        config([
            'erp.billing.provider' => 'asaas',
            'erp.asaas.api_key' => 'test_asaas_key',
            'erp.asaas.env' => 'sandbox',
            'erp.stage' => 'local',
            'erp.orcamento_public_base_url' => 'http://localhost:8043',
        ]);

        $this->master = User::query()->create([
            'codigo' => 'USR-CHK1',
            'name' => 'Master Checkout',
            'email' => 'checkout@cliente.test',
            'password' => bcrypt('Admin@123'),
            'ativo' => true,
        ]);
        $this->master->assignRole('ADMIN');

        $emp = Empresa::query()->create([
            'codigo' => 'EMP-CHK1',
            'cnpj' => '34661762000150',
            'razao_social' => 'Grafica Checkout',
            'email' => 'fiscal@grafica.test',
            'telefone' => '3432383955',
            'logradouro' => 'Rua das Acacias',
            'numero' => '100',
            'bairro' => 'Centro',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400000',
            'ibge' => '3170206',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $this->master->empresas()->attach([$emp->id => ['padrao' => true]]);

        $this->conta = ContaAtivacao::query()->create([
            'user_id' => $this->master->id,
            'billing_status' => ContaAtivacao::BILLING_PENDENTE,
            'billing_provider' => 'asaas',
            'cortesia_ate' => now()->addDays(5)->endOfDay(),
            'cortesia_concedida_em' => now(),
            'cortesia_motivo' => 'Teste checkout',
        ]);
    }

    public function test_checkout_conta_envia_so_customer_sem_customer_data(): void
    {
        Http::fake([
            '*/cities*' => Http::response([
                'data' => [[
                    'id' => 12565,
                    'name' => 'Uberlandia',
                    'state' => 'MG',
                    'ibgeCode' => '3170206',
                ]],
            ], 200),
            '*/customers/*' => Http::response(['id' => 'cus_test_1'], 200),
            '*/customers' => Http::response(['id' => 'cus_test_1'], 200),
            '*/checkouts' => Http::response([
                'id' => 'chk_test_1',
                'url' => 'https://asaas.test/checkout/chk_test_1',
            ], 200),
        ]);

        Sanctum::actingAs($this->master, ['*']);

        $res = $this->postJson('/api/v1/ativacao/pagamento')->assertOk();

        $checkoutUrl = $res->json('data.checkout_url');
        $this->assertNotEmpty($checkoutUrl, 'checkout_url deve voltar para a UI redirecionar ao ASAAS');
        $this->assertSame('https://asaas.test/checkout/chk_test_1', $checkoutUrl);

        $checkoutBodies = [];
        Http::assertSent(function ($request) use (&$checkoutBodies) {
            if (! str_contains($request->url(), '/checkouts')) {
                return true;
            }
            $checkoutBodies[] = $request->data();

            return true;
        });

        $this->assertNotEmpty($checkoutBodies, 'POST /checkouts deve ter sido chamado');
        $body = $checkoutBodies[0];
        $this->assertSame('cus_test_1', $body['customer'] ?? null);
        $this->assertArrayNotHasKey('customerData', $body);
        $this->assertSame(['CREDIT_CARD'], $body['billingTypes'] ?? null);
        $this->assertSame(['RECURRENT'], $body['chargeTypes'] ?? null);
        $this->assertArrayHasKey('nextDueDate', $body['subscription'] ?? []);

        $customerBodies = [];
        Http::assertSent(function ($request) use (&$customerBodies) {
            $url = $request->url();
            if (! str_contains($url, '/customers') || str_contains($url, '/checkouts') || str_contains($url, '/cities')) {
                return true;
            }
            $customerBodies[] = $request->data();

            return true;
        });
        $this->assertNotEmpty($customerBodies);
        $cust = $customerBodies[0];
        $this->assertSame('3432383955', $cust['phone'] ?? null);
        $this->assertSame('Rua das Acacias', $cust['address'] ?? null);
        $this->assertSame('100', $cust['addressNumber'] ?? null);
        $this->assertSame('38400000', $cust['postalCode'] ?? null);
        $this->assertSame('Centro', $cust['province'] ?? null);
        $this->assertSame(12565, $cust['city'] ?? null);

        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), '/checkouts')) {
                return true;
            }
            $key = (string) $request->header('Idempotency-Key')[0];

            return strlen($key) > 0 && strlen($key) <= 48;
        });

        $this->assertDatabaseHas('conta_ativacoes', [
            'user_id' => $this->master->id,
            'billing_customer_ref' => 'cus_test_1',
            'billing_checkout_ref' => 'chk_test_1',
        ]);
    }

    public function test_me_e_login_trazem_aviso_de_cortesia(): void
    {
        Sanctum::actingAs($this->master, ['*']);

        $me = $this->getJson('/api/v1/auth/me')->assertOk();
        $this->assertSame('cortesia', $me->json('billing_aviso.tipo'));
        $this->assertSame('autenticar', $me->json('billing_aviso.acao'));
        $this->assertSame('/conta/mensalidade', $me->json('billing_aviso.to'));
    }

    public function test_checkout_atualiza_customer_incompleto_antes_de_abrir(): void
    {
        $this->conta->billing_customer_ref = 'cus_legado_incompleto';
        $this->conta->save();

        Http::fake([
            '*/cities*' => Http::response([
                'data' => [[
                    'id' => 12565,
                    'name' => 'Uberlandia',
                    'state' => 'MG',
                    'ibgeCode' => '3170206',
                ]],
            ], 200),
            '*/customers/*' => Http::response(['id' => 'cus_legado_incompleto'], 200),
            '*/checkouts' => Http::response([
                'id' => 'chk_test_2',
                'url' => 'https://asaas.test/checkout/chk_test_2',
            ], 200),
        ]);

        Sanctum::actingAs($this->master, ['*']);
        $this->postJson('/api/v1/ativacao/pagamento')->assertOk()
            ->assertJsonPath('data.checkout_url', 'https://asaas.test/checkout/chk_test_2');

        Http::assertSent(function ($request) {
            return $request->method() === 'PUT'
                && str_contains($request->url(), '/customers/cus_legado_incompleto')
                && ($request->data()['phone'] ?? null) === '3432383955'
                && ($request->data()['postalCode'] ?? null) === '38400000'
                && $request->header('Idempotency-Key') === [];
        });
        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/checkouts')
                && ($request->data()['customer'] ?? null) === 'cus_legado_incompleto'
                && ! array_key_exists('customerData', $request->data());
        });
    }

    public function test_checkout_segue_quando_put_customer_retorna_409(): void
    {
        $this->conta->billing_customer_ref = 'cus_legado_incompleto';
        $this->conta->save();

        $gets = 0;
        Http::fake(function ($request) use (&$gets) {
            $url = $request->url();
            if (str_contains($url, '/cities')) {
                return Http::response([
                    'data' => [[
                        'id' => 12565,
                        'name' => 'Uberlandia',
                        'state' => 'MG',
                        'ibgeCode' => '3170206',
                    ]],
                ], 200);
            }
            if (str_contains($url, '/checkouts')) {
                return Http::response([
                    'id' => 'chk_test_3',
                    'url' => 'https://asaas.test/checkout/chk_test_3',
                ], 200);
            }
            if ($request->method() === 'PUT' && str_contains($url, '/customers/')) {
                return Http::response('', 409);
            }
            if ($request->method() === 'GET' && str_contains($url, '/customers/')) {
                $gets++;
                if ($gets === 1) {
                    return Http::response(['id' => 'cus_legado_incompleto'], 200);
                }

                return Http::response([
                    'id' => 'cus_legado_incompleto',
                    'phone' => '3432383955',
                    'address' => 'Rua das Acacias',
                    'addressNumber' => '100',
                    'postalCode' => '38400000',
                    'province' => 'Centro',
                    'city' => 12565,
                ], 200);
            }

            return Http::response(['id' => 'cus_legado_incompleto'], 200);
        });

        Sanctum::actingAs($this->master, ['*']);
        $this->postJson('/api/v1/ativacao/pagamento')->assertOk()
            ->assertJsonPath('data.checkout_url', 'https://asaas.test/checkout/chk_test_3');
    }
}
