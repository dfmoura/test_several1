<?php

namespace Tests\Feature;

use App\Models\BillingIntegracaoInter;
use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\User;
use App\Services\Banking\BankCrypto;
use App\Support\PlatformRbac;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InterBillingMensalidadeTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    private ContaAtivacao $conta;

    private User $operador;

    protected function setUp(): void
    {
        parent::setUp();

        PlatformRbac::ensure();
        Permission::findOrCreate('empresas.gerir', 'web');
        Role::findOrCreate('ADMIN', 'web')->givePermissionTo('empresas.gerir');

        config([
            'erp.billing.provider' => 'inter',
            'erp.stage' => 'local',
            'erp.orcamento_public_base_url' => 'https://flexorc.triggerti.com',
            'app.url' => 'http://localhost:8080',
        ]);

        $this->master = User::query()->create([
            'codigo' => 'USR-INT1',
            'name' => 'Master Inter',
            'email' => 'inter-master@cliente.test',
            'password' => bcrypt('Admin@123'),
            'ativo' => true,
        ]);
        $this->master->assignRole('ADMIN');

        $emp = Empresa::query()->create([
            'codigo' => 'EMP-INT1',
            'cnpj' => '34661762000150',
            'razao_social' => 'Grafica Inter Teste',
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
            'billing_provider' => 'inter',
        ]);

        $this->operador = User::query()->create([
            'codigo' => 'USR-OPS1',
            'name' => 'Ops Inter',
            'email' => 'ops-inter@trigger.test',
            'password' => bcrypt('Admin@123'),
            'ativo' => true,
        ]);
        $this->operador->assignRole(PlatformRbac::ROLE);

        $this->seedCredenciaisInter();
    }

    public function test_cliente_admin_nao_acessa_setup_inter(): void
    {
        Sanctum::actingAs($this->master, ['*']);

        $this->getJson('/api/v1/plataforma/integracoes/inter')->assertForbidden();
    }

    public function test_operador_salva_e_le_setup_sem_expor_segredos(): void
    {
        Sanctum::actingAs($this->operador, ['*']);

        $res = $this->getJson('/api/v1/plataforma/integracoes/inter')->assertOk();
        $this->assertTrue($res->json('data.configurado'));
        $this->assertTrue($res->json('data.tem_client_id'));
        $this->assertArrayNotHasKey('client_secret', $res->json('data'));
        $this->assertStringContainsString(
            'https://flexorc.triggerti.com/api/v1/webhooks/bancarios/inter',
            (string) $res->json('data.webhook_url'),
        );
    }

    public function test_emitir_pix_mensalidade_e_confirmar_webhook(): void
    {
        Http::fake([
            '*/oauth/v2/token' => Http::response(['access_token' => 'tok_test', 'expires_in' => 3600], 200),
            '*/cobranca/v3/cobrancas' => Http::response(['codigoSolicitacao' => 'sol_abc'], 200),
            '*/cobranca/v3/cobrancas/sol_abc' => Http::response([
                'pix' => [
                    'pixCopiaECola' => '00020126580014br.gov.bcb.pix0136teste',
                    'qrCode' => base64_encode('qr'),
                ],
            ], 200),
        ]);

        Sanctum::actingAs($this->master, ['*']);

        $res = $this->postJson('/api/v1/ativacao/pagamento')->assertOk();
        $this->assertSame('inter', $res->json('data.billing_provider'));
        $this->assertNotEmpty($res->json('data.pix_copia_cola'));
        $this->assertNull($res->json('data.checkout_url'));

        $this->conta->refresh();
        $this->assertSame('sol_abc', $this->conta->billing_checkout_ref);
        $this->assertNotEmpty($this->conta->billing_pix_copia_cola);

        $this->postJson('/api/v1/webhooks/bancarios/inter', [
            'codigoSolicitacao' => 'sol_abc',
            'seuNumero' => 'FLEXORC-CONTA-'.$this->master->id,
            'situacao' => 'RECEBIDO',
            'dataHoraSituacao' => now()->toIso8601String(),
            'valorTotalRecebido' => '297.00',
        ])->assertOk();

        $this->conta->refresh();
        $this->assertSame(ContaAtivacao::BILLING_ATIVA, $this->conta->billing_status);
        $this->assertNotNull($this->conta->billing_metodo_em);
        $this->assertNull($this->conta->billing_pix_copia_cola);
    }

    public function test_renovacao_proxima_do_vencimento_permite_novo_pix(): void
    {
        Http::fake([
            '*/oauth/v2/token' => Http::response(['access_token' => 'tok_test', 'expires_in' => 3600], 200),
            '*/cobranca/v3/cobrancas' => Http::response(['codigoSolicitacao' => 'sol_renova'], 200),
            '*/cobranca/v3/cobrancas/sol_renova' => Http::response([
                'pix' => [
                    'pixCopiaECola' => '00020126580014br.gov.bcb.pix0136renova',
                    'qrCode' => base64_encode('qr2'),
                ],
            ], 200),
        ]);

        $this->conta->billing_status = ContaAtivacao::BILLING_ATIVA;
        $this->conta->billing_metodo_em = now()->subDays(25);
        $this->conta->billing_provider = 'inter';
        $this->conta->save();

        Sanctum::actingAs($this->master, ['*']);

        $res = $this->postJson('/api/v1/ativacao/pagamento')->assertOk();
        $this->assertNotEmpty($res->json('data.pix_copia_cola'));
        $this->assertTrue((bool) $res->json('data.pode_gerar_pix') || filled($res->json('data.pix_copia_cola')));
    }

    public function test_pix_expirado_por_ttl_cancela_e_permite_novo(): void
    {
        Http::fake([
            '*/oauth/v2/token' => Http::response(['access_token' => 'tok_test', 'expires_in' => 3600], 200),
            '*/cobranca/v3/cobrancas/sol_velho/cancelar' => Http::response([], 200),
            '*/cobranca/v3/cobrancas' => Http::response(['codigoSolicitacao' => 'sol_novo'], 200),
            '*/cobranca/v3/cobrancas/sol_novo' => Http::response([
                'pix' => [
                    'pixCopiaECola' => '00020126580014br.gov.bcb.pix0136novo',
                    'qrCode' => base64_encode('qr3'),
                ],
            ], 200),
        ]);

        config(['erp.billing.inter_pix_ttl_horas' => 3]);

        $this->conta->billing_provider = 'inter';
        $this->conta->billing_checkout_ref = 'sol_velho';
        $this->conta->billing_pix_copia_cola = '000201PIXVELHO';
        $this->conta->billing_pix_qr_base64 = base64_encode('old');
        $this->conta->billing_charge_vencimento = now()->toDateString();
        $this->conta->billing_pix_emitido_em = now()->subHours(4);
        $this->conta->save();

        Sanctum::actingAs($this->master, ['*']);

        // GET limpa PIX expirado.
        $get = $this->getJson('/api/v1/ativacao')->assertOk();
        $this->assertEmpty($get->json('data.pix_copia_cola'));
        $this->conta->refresh();
        $this->assertNull($this->conta->billing_pix_copia_cola);

        $res = $this->postJson('/api/v1/ativacao/pagamento')->assertOk();
        $this->assertSame('sol_novo', $res->json('data.pix_copia_cola') ? $this->conta->fresh()->billing_checkout_ref : null);
        $this->assertNotEmpty($res->json('data.pix_copia_cola'));
        $this->assertNotNull($res->json('data.pix_expira_em'));
    }

    public function test_get_ativacao_reconcilia_pix_pago_sem_webhook(): void
    {
        Http::fake([
            '*/oauth/v2/token' => Http::response(['access_token' => 'tok_test', 'expires_in' => 3600], 200),
            '*/cobranca/v3/cobrancas/sol_pago' => Http::response([
                'situacao' => 'RECEBIDO',
                'valorTotalRecebido' => '3.00',
                'codigoSolicitacao' => 'sol_pago',
            ], 200),
        ]);

        $this->conta->billing_provider = 'inter';
        $this->conta->billing_status = ContaAtivacao::BILLING_PENDENTE;
        $this->conta->billing_checkout_ref = 'sol_pago';
        $this->conta->billing_pix_copia_cola = '000201PIXPAGO';
        $this->conta->billing_pix_qr_base64 = base64_encode('qr');
        $this->conta->billing_charge_vencimento = now()->toDateString();
        $this->conta->billing_pix_emitido_em = now();
        $this->conta->save();

        Sanctum::actingAs($this->master, ['*']);

        $this->getJson('/api/v1/ativacao')->assertOk()
            ->assertJsonPath('data.conta.paga', true);

        $this->conta->refresh();
        $this->assertSame(ContaAtivacao::BILLING_ATIVA, $this->conta->billing_status);
        $this->assertNotNull($this->conta->billing_metodo_em);
        $this->assertNull($this->conta->billing_pix_copia_cola);
    }

    private function seedCredenciaisInter(): void
    {
        $crypto = app(BankCrypto::class);
        $cert = "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----";
        $key = "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----";

        BillingIntegracaoInter::query()->create([
            'operador' => '12345678',
            'client_id_cipher' => $crypto->criptografar('client-id-test'),
            'client_secret_cipher' => $crypto->criptografar('client-secret-test'),
            'cert_pem_cipher' => $crypto->criptografar($cert),
            'key_pem_cipher' => $crypto->criptografar($key),
            'ambiente' => 'SANDBOX',
            'ativo' => true,
        ]);
    }
}
