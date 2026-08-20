<?php

namespace App\Services\Banking\Asaas;

use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\EmpresaAtivacao;
use App\Models\User;
use RuntimeException;

/**
 * Conta FLEXORC: customer + checkout no ASAAS (PCI no provedor).
 * Sem chave: o ERP só marca o meio como autenticado no ambiente de demo.
 */
final class AsaasBillingGateway
{
    public const EXTERNAL_PREFIX = 'FLEXORC-BILLING-';

    public const CONTA_PREFIX = 'FLEXORC-CONTA-';

    public function __construct(private readonly AsaasClient $client) {}

    public function providerNome(): string
    {
        $configured = strtolower(trim((string) config('erp.billing.provider', 'mock')));
        if ($configured === 'asaas' && $this->client->habilitado()) {
            return 'asaas';
        }

        return 'mock';
    }

    public function podeConfirmarDemo(): bool
    {
        if ($this->providerNome() === 'mock') {
            return true;
        }

        $stage = strtolower((string) config('erp.stage', 'local'));

        return in_array($stage, ['local', 'testing'], true);
    }

    /**
     * @return array{checkout_url: ?string, customer_ref: ?string, checkout_ref: ?string, provider: string}
     */
    public function iniciarCheckout(Empresa $empresa, EmpresaAtivacao $ativacao): array
    {
        $provider = $this->providerNome();
        if ($provider === 'mock' || ! $this->client->habilitado()) {
            return [
                'checkout_url' => null,
                'customer_ref' => $ativacao->billing_customer_ref,
                'checkout_ref' => $ativacao->billing_checkout_ref,
                'provider' => 'mock',
            ];
        }

        $customerId = $this->garantirCustomer($empresa, $ativacao);
        $valor = $this->valorCobranca();
        $front = $this->frontBase();
        $due = now()->toDateString();

        $body = [
            'billingTypes' => ['CREDIT_CARD', 'PIX'],
            'chargeTypes' => ['RECURRENT'],
            'minutesToExpire' => 120,
            'externalReference' => self::EXTERNAL_PREFIX.$empresa->id,
            'callback' => [
                'successUrl' => $front.'/cadastro/pagamento?retorno=asaas',
                'cancelUrl' => $front.'/cadastro/pagamento?retorno=cancelado',
                'expiredUrl' => $front.'/cadastro/pagamento?retorno=expirado',
                'autoRedirect' => true,
            ],
            'items' => [[
                'name' => 'FLEXORC — mensalidade',
                'description' => $this->descricao(),
                'quantity' => 1,
                'value' => $valor,
            ]],
            'customer' => $customerId,
            'customerData' => array_filter([
                'name' => $empresa->razao_social,
                'cpfCnpj' => preg_replace('/\D/', '', (string) $empresa->cnpj) ?: null,
                'email' => $empresa->email,
            ]),
            'subscription' => [
                'cycle' => $this->ciclo(),
                'nextDueDate' => $due,
            ],
        ];

        $res = $this->client->post('checkouts', $body, 'billing-'.$empresa->id.'-'.($ativacao->updated_at?->timestamp ?? time()));

        $url = isset($res['url']) ? (string) $res['url'] : (isset($res['link']) ? (string) $res['link'] : null);
        $ref = isset($res['id']) ? (string) $res['id'] : null;

        return [
            'checkout_url' => $url,
            'customer_ref' => $customerId,
            'checkout_ref' => $ref,
            'provider' => 'asaas',
        ];
    }

    /**
     * @return array{checkout_url: ?string, customer_ref: ?string, checkout_ref: ?string, provider: string}
     */
    public function iniciarCheckoutConta(User $user, ContaAtivacao $ativacao): array
    {
        $provider = $this->providerNome();
        if ($provider === 'mock' || ! $this->client->habilitado()) {
            return [
                'checkout_url' => null,
                'customer_ref' => $ativacao->billing_customer_ref,
                'checkout_ref' => $ativacao->billing_checkout_ref,
                'provider' => 'mock',
            ];
        }

        $customerId = $this->garantirCustomerConta($user, $ativacao);
        $valor = $this->valorCobranca();
        $front = $this->frontBase();
        $due = now()->toDateString();

        $body = [
            'billingTypes' => ['CREDIT_CARD', 'PIX'],
            'chargeTypes' => ['RECURRENT'],
            'minutesToExpire' => 120,
            'externalReference' => self::CONTA_PREFIX.$user->id,
            'callback' => [
                'successUrl' => $front.'/cadastro/pagamento?retorno=asaas',
                'cancelUrl' => $front.'/cadastro/pagamento?retorno=cancelado',
                'expiredUrl' => $front.'/cadastro/pagamento?retorno=expirado',
                'autoRedirect' => true,
            ],
            'items' => [[
                'name' => 'FLEXORC — mensalidade',
                'description' => $this->descricao(),
                'quantity' => 1,
                'value' => $valor,
            ]],
            'customer' => $customerId,
            'customerData' => array_filter([
                'name' => $user->name,
                'email' => $user->email,
            ]),
            'subscription' => [
                'cycle' => $this->ciclo(),
                'nextDueDate' => $due,
            ],
        ];

        $res = $this->client->post('checkouts', $body, 'billing-conta-'.$user->id.'-'.($ativacao->updated_at?->timestamp ?? time()));

        $url = isset($res['url']) ? (string) $res['url'] : (isset($res['link']) ? (string) $res['link'] : null);
        $ref = isset($res['id']) ? (string) $res['id'] : null;

        return [
            'checkout_url' => $url,
            'customer_ref' => $customerId,
            'checkout_ref' => $ref,
            'provider' => 'asaas',
        ];
    }

    public function externalReference(Empresa $empresa): string
    {
        return self::EXTERNAL_PREFIX.$empresa->id;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function ehEventoBilling(array $payload): bool
    {
        $ref = $this->externalRefFromPayload($payload);

        return $ref !== null && (str_starts_with($ref, self::EXTERNAL_PREFIX) || str_starts_with($ref, self::CONTA_PREFIX));
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function empresaIdDoPayload(array $payload): ?int
    {
        $ref = $this->externalRefFromPayload($payload);
        if ($ref === null || ! str_starts_with($ref, self::EXTERNAL_PREFIX)) {
            return null;
        }

        $id = (int) substr($ref, strlen(self::EXTERNAL_PREFIX));

        return $id > 0 ? $id : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function userIdDoPayload(array $payload): ?int
    {
        $ref = $this->externalRefFromPayload($payload);
        if ($ref === null || ! str_starts_with($ref, self::CONTA_PREFIX)) {
            return null;
        }

        $id = (int) substr($ref, strlen(self::CONTA_PREFIX));

        return $id > 0 ? $id : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function pagamentoConfirmado(array $payload): bool
    {
        $event = strtoupper((string) ($payload['event'] ?? ''));
        if (in_array($event, ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'CHECKOUT_PAID', 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'], true)) {
            return true;
        }

        $status = strtoupper((string) data_get($payload, 'payment.status', data_get($payload, 'checkout.status', '')));

        return in_array($status, ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'PAID', 'APPROVED'], true);
    }

    private function garantirCustomer(Empresa $empresa, EmpresaAtivacao $ativacao): string
    {
        if (is_string($ativacao->billing_customer_ref) && $ativacao->billing_customer_ref !== '') {
            return $ativacao->billing_customer_ref;
        }

        $cnpj = preg_replace('/\D/', '', (string) $empresa->cnpj) ?: '';
        $body = [
            'name' => $empresa->razao_social,
            'cpfCnpj' => $cnpj,
            'email' => $empresa->email,
            'externalReference' => $this->externalReference($empresa),
            'notificationDisabled' => true,
        ];

        $res = $this->client->post('customers', array_filter($body, fn ($v) => $v !== null && $v !== ''), 'cust-'.$empresa->id);
        $id = (string) ($res['id'] ?? '');
        if ($id === '') {
            throw new RuntimeException('ASAAS não devolveu o cliente da conta.');
        }

        return $id;
    }

    private function garantirCustomerConta(User $user, ContaAtivacao $ativacao): string
    {
        if (is_string($ativacao->billing_customer_ref) && $ativacao->billing_customer_ref !== '') {
            return $ativacao->billing_customer_ref;
        }

        $body = [
            'name' => $user->name,
            'email' => $user->email,
            'externalReference' => self::CONTA_PREFIX.$user->id,
            'notificationDisabled' => true,
        ];

        $res = $this->client->post('customers', array_filter($body, fn ($v) => $v !== null && $v !== ''), 'cust-conta-'.$user->id);
        $id = (string) ($res['id'] ?? '');
        if ($id === '') {
            throw new RuntimeException('ASAAS não devolveu o cliente da conta.');
        }

        return $id;
    }

    public function descricao(): string
    {
        $d = trim((string) config('erp.billing.descricao', ''));

        return $d !== '' ? $d : 'Mensalidade da conta FLEXORC';
    }

    public function ciclo(): string
    {
        $ciclo = strtoupper(trim((string) config('erp.billing.ciclo', 'MONTHLY')));

        return in_array($ciclo, ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'], true)
            ? $ciclo
            : 'MONTHLY';
    }

    public function cicloLabel(): string
    {
        return match ($this->ciclo()) {
            'WEEKLY' => 'Toda semana',
            'BIWEEKLY' => 'A cada 15 dias',
            'BIMONTHLY' => 'A cada dois meses',
            'QUARTERLY' => 'Trimestral',
            'SEMIANNUALLY' => 'Semestral',
            'YEARLY' => 'Anual',
            default => 'Todo mês',
        };
    }

    public function valorTabela(): float
    {
        $raw = (string) config('erp.billing.valor', '297.00');
        $n = (float) str_replace(',', '.', $raw);

        return $n < 0 ? 0.0 : round($n, 2);
    }

    public function valorCobranca(): float
    {
        $n = $this->valorTabela();

        // Checkout ASAAS rejeita R$ 0 em alguns ambientes — autenticação mínima.
        return $n > 0 ? $n : 1.00;
    }

    public function frontBase(): string
    {
        return rtrim((string) config('erp.orcamento_public_base_url', config('app.url')), '/');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function externalRefFromPayload(array $payload): ?string
    {
        $candidates = [
            data_get($payload, 'payment.externalReference'),
            data_get($payload, 'checkout.externalReference'),
            data_get($payload, 'subscription.externalReference'),
            data_get($payload, 'payment.subscription.externalReference'),
            data_get($payload, 'externalReference'),
        ];
        foreach ($candidates as $c) {
            if (is_string($c) && $c !== '') {
                return $c;
            }
        }

        return null;
    }
}
