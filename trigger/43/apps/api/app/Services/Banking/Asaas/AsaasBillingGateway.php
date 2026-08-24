<?php

namespace App\Services\Banking\Asaas;

use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\EmpresaAtivacao;
use App\Models\User;
use App\Services\Banking\Billing\BillingCatalog;
use App\Services\Banking\Billing\BillingGateway;
use App\Support\BillingReference;
use Carbon\CarbonInterface;
use RuntimeException;

/**
 * Conta FLEXORC: customer + checkout no ASAAS (PCI no provedor).
 * Sem chave: o ERP só marca o meio como autenticado no ambiente de demo.
 */
final class AsaasBillingGateway implements BillingGateway
{
    public function __construct(
        private readonly AsaasClient $client,
        private readonly BillingCatalog $catalog,
    ) {}

    /** @deprecated Legado — webhooks antigos; novos usam {@see BillingReference::BILLING_LEGACY} */
    public const EXTERNAL_PREFIX = BillingReference::BILLING_LEGACY;

    /** @deprecated Legado — webhooks antigos; novos usam {@see BillingReference::CONTA_LEGACY} */
    public const CONTA_PREFIX = BillingReference::CONTA_LEGACY;

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
        $due = $this->primeiraCobrancaEm($this->cortesiaAteDaEmpresa($empresa))->toDateString();

        // ASAAS: informar só `customer` OU `customerData` — nunca os dois.
        $body = [
            'billingTypes' => ['CREDIT_CARD'],
            'chargeTypes' => ['RECURRENT'],
            'minutesToExpire' => 120,
            'externalReference' => BillingReference::billingRef($empresa->id),
            'callback' => [
                'successUrl' => $front.'/conta/mensalidade?retorno=asaas',
                'cancelUrl' => $front.'/conta/mensalidade?retorno=cancelado',
                'expiredUrl' => $front.'/conta/mensalidade?retorno=expirado',
                'autoRedirect' => true,
            ],
            'items' => [[
                'name' => 'FLEXORC — mensalidade',
                'description' => $this->descricao(),
                'quantity' => 1,
                'value' => $valor,
            ]],
            'customer' => $customerId,
            'subscription' => [
                'cycle' => $this->ciclo(),
                'nextDueDate' => $due,
            ],
        ];

        $res = $this->client->post(
            'checkouts',
            $body,
            $this->idempotencyKey('fe', $empresa->id),
        );

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
        $due = $this->primeiraCobrancaEm(
            $ativacao->cortesiaVigente() ? $ativacao->cortesia_ate : null,
        )->toDateString();

        // ASAAS: informar só `customer` OU `customerData` — nunca os dois.
        $body = [
            'billingTypes' => ['CREDIT_CARD'],
            'chargeTypes' => ['RECURRENT'],
            'minutesToExpire' => 120,
            'externalReference' => BillingReference::contaRef($user->id),
            'callback' => [
                'successUrl' => $front.'/conta/mensalidade?retorno=asaas',
                'cancelUrl' => $front.'/conta/mensalidade?retorno=cancelado',
                'expiredUrl' => $front.'/conta/mensalidade?retorno=expirado',
                'autoRedirect' => true,
            ],
            'items' => [[
                'name' => 'FLEXORC — mensalidade',
                'description' => $this->descricao(),
                'quantity' => 1,
                'value' => $valor,
            ]],
            'customer' => $customerId,
            'subscription' => [
                'cycle' => $this->ciclo(),
                'nextDueDate' => $due,
            ],
        ];

        $res = $this->client->post(
            'checkouts',
            $body,
            $this->idempotencyKey('fc', $user->id),
        );

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
        return BillingReference::billingRef($empresa->id);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function ehEventoBilling(array $payload): bool
    {
        return BillingReference::isAnyRef($this->externalRefFromPayload($payload));
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function empresaIdDoPayload(array $payload): ?int
    {
        return BillingReference::empresaIdFromBillingRef($this->externalRefFromPayload($payload));
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function userIdDoPayload(array $payload): ?int
    {
        return BillingReference::userIdFromContaRef($this->externalRefFromPayload($payload));
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

    /**
     * Inadimplência / cancelamento da recorrência — suspende a conta FLEXORC.
     *
     * @param  array<string, mixed>  $payload
     */
    public function pagamentoEmAtrasoOuCancelado(array $payload): bool
    {
        $event = strtoupper((string) ($payload['event'] ?? ''));
        if (in_array($event, [
            'PAYMENT_OVERDUE',
            'PAYMENT_DELETED',
            'PAYMENT_REFUNDED',
            'PAYMENT_PARTIALLY_REFUNDED',
            'SUBSCRIPTION_DELETED',
            'SUBSCRIPTION_INACTIVATED',
        ], true)) {
            return true;
        }

        $status = strtoupper((string) data_get($payload, 'payment.status', data_get($payload, 'subscription.status', '')));

        return in_array($status, ['OVERDUE', 'DELETED', 'REFUNDED', 'INACTIVE'], true);
    }

    /**
     * Data da 1ª cobrança antecipada: fim da cortesia vigente, senão hoje.
     * ASAAS gera as renovações seguintes no ciclo configurado.
     */
    public function primeiraCobrancaEm(?CarbonInterface $cortesiaAte = null, ?CarbonInterface $agora = null): CarbonInterface
    {
        return $this->catalog->primeiraCobrancaEm($cortesiaAte, $agora);
    }

    public function alertaCortesiaDias(): int
    {
        return $this->catalog->alertaCortesiaDias();
    }

    /**
     * ASAAS exige Idempotency-Key com no máximo 48 caracteres.
     */
    public function idempotencyKey(string $prefix, int|string $id): string
    {
        $key = sprintf('%s%s-%s', $prefix, $id, bin2hex(random_bytes(8)));

        return strlen($key) <= 48 ? $key : substr(hash('sha256', $key), 0, 48);
    }

    private function cortesiaAteDaEmpresa(Empresa $empresa): ?CarbonInterface
    {
        $userIds = $empresa->users()->pluck('users.id');
        if ($userIds->isEmpty()) {
            return null;
        }

        $conta = ContaAtivacao::query()
            ->whereIn('user_id', $userIds)
            ->whereNotNull('cortesia_ate')
            ->orderByDesc('cortesia_ate')
            ->first();

        if ($conta === null || ! $conta->cortesiaVigente()) {
            return null;
        }

        return $conta->cortesia_ate;
    }

    private function garantirCustomer(Empresa $empresa, EmpresaAtivacao $ativacao): string
    {
        $payload = $this->payloadCustomerEmpresa($empresa);
        $id = is_string($ativacao->billing_customer_ref) && $ativacao->billing_customer_ref !== ''
            ? $ativacao->billing_customer_ref
            : '';

        if ($id === '') {
            $id = $this->criarCustomer($payload, $this->externalReference($empresa), 'cust-'.$empresa->id);
            $ativacao->billing_customer_ref = $id;
            $ativacao->save();
        }

        $this->completarCustomerParaCheckout($id, $payload);

        return $id;
    }

    private function garantirCustomerConta(User $user, ContaAtivacao $ativacao): string
    {
        $user->loadMissing('empresas');
        $emp = $user->empresas->first(fn ($e) => (bool) ($e->pivot->padrao ?? false))
            ?? $user->empresas->first();
        if ($emp === null) {
            throw new RuntimeException(
                'Cadastre a empresa (endereço e telefone) para autenticar a mensalidade no ASAAS. Menu Empresas.',
            );
        }

        $payload = $this->payloadCustomerEmpresa($emp, $user);
        $id = is_string($ativacao->billing_customer_ref) && $ativacao->billing_customer_ref !== ''
            ? $ativacao->billing_customer_ref
            : '';
        $external = BillingReference::contaRef($user->id);

        if ($id === '') {
            $id = $this->criarCustomer($payload, $external, 'cust-conta-'.$user->id);
            $ativacao->billing_customer_ref = $id;
            $ativacao->save();
        }

        $this->completarCustomerParaCheckout($id, $payload);

        return $id;
    }

    /**
     * Checkout recorrente exige telefone + endereço no customer ASAAS.
     *
     * @return array<string, mixed>
     */
    private function payloadCustomerEmpresa(Empresa $empresa, ?User $user = null): array
    {
        $cnpj = preg_replace('/\D/', '', (string) $empresa->cnpj) ?: '';
        $phone = preg_replace('/\D/', '', (string) $empresa->telefone) ?: '';
        $cep = preg_replace('/\D/', '', (string) $empresa->cep) ?: '';
        $numero = trim((string) $empresa->numero);
        $address = trim((string) $empresa->logradouro);
        $bairro = trim((string) $empresa->bairro);
        $municipio = trim((string) $empresa->municipio);

        $faltando = [];
        if ($phone === '' || strlen($phone) < 10) {
            $faltando[] = 'telefone';
        }
        if ($address === '') {
            $faltando[] = 'logradouro';
        }
        if ($numero === '') {
            $faltando[] = 'número';
        }
        if (strlen($cep) !== 8) {
            $faltando[] = 'CEP';
        }
        if ($bairro === '') {
            $faltando[] = 'bairro';
        }
        if ($municipio === '') {
            $faltando[] = 'município';
        }
        if ($faltando !== []) {
            throw new RuntimeException(
                'Complete o cadastro da empresa ('.implode(', ', $faltando).') para autenticar a mensalidade no ASAAS. Menu Empresas.',
            );
        }

        $cityId = $this->resolverCidadeAsaas($municipio, (string) $empresa->uf, (string) $empresa->ibge);
        $external = $user !== null ? BillingReference::contaRef($user->id) : $this->externalReference($empresa);

        return array_filter([
            'name' => $empresa->razao_social ?: ($user?->name ?? 'Conta FLEXORC'),
            'email' => $empresa->email ?: ($user?->email ?? null),
            'cpfCnpj' => $cnpj !== '' ? $cnpj : null,
            'phone' => $phone,
            'mobilePhone' => strlen($phone) >= 11 ? $phone : null,
            'address' => $address,
            'addressNumber' => $numero,
            'complement' => trim((string) $empresa->complemento) ?: null,
            'province' => $bairro,
            'postalCode' => $cep,
            'city' => $cityId,
            'externalReference' => $external,
            'notificationDisabled' => true,
        ], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function criarCustomer(array $payload, string $external, string $idempotency): string
    {
        try {
            $res = $this->client->post('customers', $payload, $idempotency);
            $id = (string) ($res['id'] ?? '');
        } catch (RuntimeException $e) {
            $id = $this->buscarCustomerPorExternalRef($external) ?? '';
            if ($id === '') {
                throw $e;
            }
        }

        if ($id === '') {
            throw new RuntimeException('ASAAS não devolveu o cliente da conta.');
        }

        return $id;
    }

    /**
     * Checkout recorrente exige telefone + endereço no customer. PUT sem Idempotency-Key:
     * a chave fixa gerava HTTP 409 no segundo clique. 409 = conflito; se o cadastro já
     * estiver completo, segue para o checkout.
     *
     * @param  array<string, mixed>  $payload
     */
    private function completarCustomerParaCheckout(string $id, array $payload): void
    {
        $atual = $this->obterCustomer($id);
        if ($this->customerProntoParaCheckout($atual)) {
            return;
        }

        $endereco = array_filter([
            'phone' => $payload['phone'] ?? null,
            'address' => $payload['address'] ?? null,
            'addressNumber' => $payload['addressNumber'] ?? null,
            'province' => $payload['province'] ?? null,
            'postalCode' => $payload['postalCode'] ?? null,
            'complement' => $payload['complement'] ?? null,
        ], fn ($v) => $v !== null && $v !== '');

        try {
            $this->client->put('customers/'.$id, $endereco);
        } catch (RuntimeException $e) {
            if (! str_contains($e->getMessage(), '(HTTP 409)')) {
                throw $e;
            }
            $depois = $this->obterCustomer($id);
            if (! $this->customerProntoParaCheckout($depois)) {
                throw $e;
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function obterCustomer(string $id): array
    {
        try {
            $res = $this->client->get('customers/'.$id);
        } catch (RuntimeException) {
            return [];
        }

        return $res;
    }

    /**
     * @param  array<string, mixed>  $cus
     */
    private function customerProntoParaCheckout(array $cus): bool
    {
        $phone = preg_replace('/\D/', '', (string) ($cus['phone'] ?? $cus['mobilePhone'] ?? '')) ?: '';
        $address = trim((string) ($cus['address'] ?? ''));
        $numero = trim((string) ($cus['addressNumber'] ?? ''));
        $cep = preg_replace('/\D/', '', (string) ($cus['postalCode'] ?? '')) ?: '';
        $bairro = trim((string) ($cus['province'] ?? ''));
        $cidade = $cus['city'] ?? $cus['cityName'] ?? null;

        return strlen($phone) >= 10
            && $address !== ''
            && $numero !== ''
            && strlen($cep) === 8
            && $bairro !== ''
            && $cidade !== null
            && $cidade !== '';
    }

    private function resolverCidadeAsaas(string $municipio, string $uf, string $ibge): ?int
    {
        $nome = trim($municipio);
        if ($nome === '') {
            return null;
        }

        try {
            $res = $this->client->get('cities?name='.rawurlencode($nome));
        } catch (RuntimeException) {
            return null;
        }

        $data = $res['data'] ?? null;
        if (! is_array($data) || $data === []) {
            return null;
        }

        $ufNorm = strtoupper(trim($uf));
        $ibgeNorm = preg_replace('/\D/', '', $ibge) ?: '';
        foreach ($data as $row) {
            if (! is_array($row)) {
                continue;
            }
            $rowIbge = preg_replace('/\D/', '', (string) ($row['ibgeCode'] ?? $row['ibge'] ?? '')) ?: '';
            if ($ibgeNorm !== '' && $rowIbge === $ibgeNorm) {
                $id = (int) ($row['id'] ?? 0);

                return $id > 0 ? $id : null;
            }
        }
        foreach ($data as $row) {
            if (! is_array($row)) {
                continue;
            }
            $rowUf = strtoupper((string) ($row['state'] ?? $row['uf'] ?? ''));
            if ($ufNorm !== '' && $rowUf === $ufNorm) {
                $id = (int) ($row['id'] ?? 0);

                return $id > 0 ? $id : null;
            }
        }

        $id = (int) ($data[0]['id'] ?? 0);

        return $id > 0 ? $id : null;
    }

    private function buscarCustomerPorExternalRef(string $externalReference): ?string
    {
        try {
            $res = $this->client->get('customers?externalReference='.rawurlencode($externalReference).'&limit=1');
        } catch (RuntimeException) {
            return null;
        }

        $data = $res['data'] ?? null;
        if (! is_array($data) || $data === []) {
            return null;
        }

        $id = (string) ($data[0]['id'] ?? '');

        return $id !== '' ? $id : null;
    }

    public function descricao(): string
    {
        return $this->catalog->descricao();
    }

    public function ciclo(): string
    {
        return $this->catalog->ciclo();
    }

    public function cicloLabel(): string
    {
        return $this->catalog->cicloLabel();
    }

    /**
     * Próxima mensalidade a partir da autenticação do meio (âncora local).
     * Não consulta o ASAAS a cada GET — espinha determinística alinhada ao ciclo config.
     *
     * @return array{
     *   proxima_cobranca_em: ?string,
     *   proxima_cobranca_formatada: ?string,
     *   dias_ate_proxima: ?int,
     *   renovacao_label: string
     * }
     */
    public function cicloStatus(?CarbonInterface $autenticadoEm, bool $paga): array
    {
        return $this->catalog->cicloStatusAssinatura($autenticadoEm, $paga);
    }

    public function valorTabela(): float
    {
        return $this->catalog->valorTabela();
    }

    public function valorCobranca(): float
    {
        return $this->catalog->valorCobranca();
    }

    public function cicloVencidoLocal(?CarbonInterface $autenticadoEm): bool
    {
        return false;
    }

    public function precisaPagarCiclo(ContaAtivacao $conta): bool
    {
        // ASAAS: checkout só na primeira autenticação; renovações no provedor.
        return ! $conta->pagamentoAutenticado();
    }

    /**
     * Propaga novo valor de tabela às assinaturas ASAAS ativas (próximo ciclo).
     *
     * @return array{atualizadas: int, ignoradas: int, erros: list<string>}
     */
    public function sincronizarValorAssinaturas(float $novoValor): array
    {
        $out = ['atualizadas' => 0, 'ignoradas' => 0, 'erros' => []];
        if ($this->providerNome() !== 'asaas' || ! $this->client->habilitado()) {
            return $out;
        }

        $valor = round($novoValor, 2);
        if ($valor <= 0) {
            return $out;
        }

        ContaAtivacao::query()
            ->where('billing_provider', 'asaas')
            ->whereNotNull('billing_metodo_em')
            ->where('billing_status', ContaAtivacao::BILLING_ATIVA)
            ->whereNotNull('billing_customer_ref')
            ->orderBy('id')
            ->each(function (ContaAtivacao $conta) use ($valor, &$out) {
                $customerId = (string) $conta->billing_customer_ref;
                if ($customerId === '') {
                    $out['ignoradas']++;

                    return;
                }

                $externalRef = BillingReference::contaRef($conta->user_id);
                $subscriptionId = $this->resolverAssinaturaId($customerId, $externalRef);
                if ($subscriptionId === null) {
                    $out['ignoradas']++;

                    return;
                }

                try {
                    $this->client->put('subscriptions/'.$subscriptionId, [
                        'value' => $valor,
                        'updatePendingPayments' => false,
                        'description' => $this->descricao(),
                    ]);
                    $out['atualizadas']++;
                } catch (\Throwable $e) {
                    $out['erros'][] = 'conta '.$conta->user_id.': '.$e->getMessage();
                }
            });

        return $out;
    }

    private function resolverAssinaturaId(string $customerId, string $externalRef): ?string
    {
        try {
            $res = $this->client->get('subscriptions?customer='.$customerId.'&status=ACTIVE&limit=20');
        } catch (\Throwable) {
            return null;
        }

        $items = is_array($res['data'] ?? null) ? $res['data'] : [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $ref = (string) ($item['externalReference'] ?? '');
            if ($ref === $externalRef && filled($item['id'] ?? null)) {
                return (string) $item['id'];
            }
        }

        if (count($items) === 1 && filled($items[0]['id'] ?? null)) {
            return (string) $items[0]['id'];
        }

        return null;
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
