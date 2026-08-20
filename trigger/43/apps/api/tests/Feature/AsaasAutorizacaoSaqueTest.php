<?php

namespace Tests\Feature;

use App\Models\AsaasAutorizacaoSaque;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AsaasAutorizacaoSaqueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'erp.asaas.webhook_token' => 'tok-eventos',
            'erp.asaas.saque_webhook_token' => 'tok-saque',
        ]);
    }

    public function test_sem_token_nao_autoriza(): void
    {
        $this->postJson('/api/v1/webhooks/bancarios/asaas/autorizar-saque', $this->transferencia())
            ->assertUnauthorized()
            ->assertJsonPath('status', 'REFUSED');
    }

    public function test_token_errado_nao_autoriza(): void
    {
        $this->withHeader('asaas-access-token', 'outro')
            ->postJson('/api/v1/webhooks/bancarios/asaas/autorizar-saque', $this->transferencia())
            ->assertUnauthorized()
            ->assertJsonPath('status', 'REFUSED');
    }

    public function test_token_de_eventos_nao_substitui_token_de_saque(): void
    {
        $this->withHeader('asaas-access-token', 'tok-eventos')
            ->postJson('/api/v1/webhooks/bancarios/asaas/autorizar-saque', $this->transferencia())
            ->assertUnauthorized();
    }

    public function test_transferencia_desconhecida_e_recusada_e_auditada(): void
    {
        $this->withHeader('asaas-access-token', 'tok-saque')
            ->postJson('/api/v1/webhooks/bancarios/asaas/autorizar-saque', $this->transferencia())
            ->assertOk()
            ->assertJsonPath('status', 'REFUSED')
            ->assertJsonPath('refuseReason', 'Operação de saída não originada por esta instalação.')
            ->assertJsonMissingPath('data');

        $this->assertDatabaseHas('asaas_autorizacao_saques', [
            'tipo' => 'TRANSFER',
            'provedor_ref' => '0bed986c-737d-49bf-a1cc-beca916797c4',
            'decisao' => 'REFUSED',
        ]);
        $this->assertSame(1, AsaasAutorizacaoSaque::query()->count());
    }

    public function test_estorno_pix_e_recarga_sao_recusados(): void
    {
        $this->withHeader('asaas-access-token', 'tok-saque')
            ->postJson('/api/v1/webhooks/bancarios/asaas/autorizar-saque', [
                'type' => 'PIX_REFUND',
                'pixRefund' => ['id' => 'ref-1', 'value' => 200],
            ])
            ->assertOk()
            ->assertJsonPath('status', 'REFUSED');

        $this->withHeader('asaas-access-token', 'tok-saque')
            ->postJson('/api/v1/webhooks/bancarios/asaas/autorizar-saque', [
                'type' => 'MOBILE_PHONE_RECHARGE',
                'mobilePhoneRecharge' => ['id' => 'rec-1', 'value' => 20],
            ])
            ->assertOk()
            ->assertJsonPath('status', 'REFUSED');
    }

    public function test_sem_token_configurado_recusa_sem_processar(): void
    {
        config(['erp.asaas.saque_webhook_token' => '', 'erp.asaas.webhook_token' => '']);

        $this->withHeader('asaas-access-token', 'qualquer')
            ->postJson('/api/v1/webhooks/bancarios/asaas/autorizar-saque', $this->transferencia())
            ->assertOk()
            ->assertJsonPath('status', 'REFUSED')
            ->assertJsonPath('refuseReason', 'Token de autorização de saque não configurado.');

        $this->assertSame(0, AsaasAutorizacaoSaque::query()->count());
    }

    public function test_webhook_de_eventos_nao_usa_esta_rota(): void
    {
        $this->withHeader('asaas-access-token', 'tok-eventos')
            ->postJson('/api/v1/webhooks/bancarios/asaas', [
                'event' => 'PAYMENT_RECEIVED',
                'payment' => ['id' => 'pay_x', 'status' => 'RECEIVED'],
            ])
            ->assertStatus(422)
            ->assertJsonPath('data.resultado', 'ERRO')
            ->assertJsonMissingPath('status');
    }

    public function test_webhook_de_eventos_exige_token_quando_configurado(): void
    {
        $this->postJson('/api/v1/webhooks/bancarios/asaas', [
            'event' => 'PAYMENT_RECEIVED',
            'payment' => ['id' => 'pay_x', 'status' => 'RECEIVED'],
        ])->assertUnauthorized();

        $this->withHeader('asaas-access-token', 'tok-eventos')
            ->postJson('/api/v1/webhooks/bancarios/asaas', [
                'event' => 'PAYMENT_RECEIVED',
                'payment' => ['id' => 'pay_x', 'status' => 'RECEIVED'],
            ])
            ->assertStatus(422)
            ->assertJsonPath('data.resultado', 'ERRO');
    }

    /** @return array<string, mixed> */
    private function transferencia(): array
    {
        return [
            'type' => 'TRANSFER',
            'transfer' => [
                'object' => 'transfer',
                'id' => '0bed986c-737d-49bf-a1cc-beca916797c4',
                'status' => 'PENDING',
                'value' => 22,
                'netValue' => 22,
                'type' => 'BANK_ACCOUNT',
                'operationType' => 'PIX',
            ],
        ];
    }
}
