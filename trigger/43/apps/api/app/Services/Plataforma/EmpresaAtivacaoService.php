<?php

namespace App\Services\Plataforma;

use App\Models\BemPatrimonial;
use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\EmpresaAtivacao;
use App\Models\EmpresaContaFinanceira;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\User;
use App\Services\Banking\Asaas\AsaasBillingGateway;
use App\Support\FlexorcSuperficie;
use Illuminate\Validation\ValidationException;

/**
 * Ativação: mensalidade na conta (USR) + primeiros passos por EMP (ADR_ATIVACAO_EMPRESA).
 * Legado (seed/teste sem linha) opera normalmente — não bloqueia envio.
 */
class EmpresaAtivacaoService
{
    public function __construct(private readonly AsaasBillingGateway $billing) {}

    public function provisionar(Empresa $empresa): EmpresaAtivacao
    {
        return EmpresaAtivacao::query()->firstOrCreate(
            ['empresa_id' => $empresa->id],
            [
                'billing_status' => EmpresaAtivacao::BILLING_PENDENTE,
                'billing_provider' => $this->billing->providerNome(),
            ],
        );
    }

    public function provisionarConta(User $user): ContaAtivacao
    {
        return ContaAtivacao::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'billing_status' => ContaAtivacao::BILLING_PENDENTE,
                'billing_provider' => $this->billing->providerNome(),
            ],
        );
    }

    public function herdarPagamentoDaConta(User $user, Empresa $empresa): void
    {
        $conta = $this->contaDoUsuario($user);
        if ($conta === null || ! $conta->pagamentoAutenticado()) {
            return;
        }

        $row = $this->provisionar($empresa);
        if ($row->pagamentoAutenticado()) {
            return;
        }

        $row->billing_status = $conta->billing_status;
        $row->billing_provider = $conta->billing_provider;
        $row->billing_customer_ref = $conta->billing_customer_ref;
        $row->billing_subscription_ref = $conta->billing_subscription_ref;
        $row->billing_metodo_em = $conta->billing_metodo_em;
        $row->billing_checkout_url = null;
        $row->save();
    }

    public function podeEnviarOrcamento(Empresa $empresa): bool
    {
        $row = $empresa->ativacao ?? EmpresaAtivacao::query()->where('empresa_id', $empresa->id)->first();
        if ($row === null) {
            return true;
        }

        return $row->pagamentoAutenticado() || $this->contaPagaDaEmpresa($empresa);
    }

    /**
     * @return array<string, mixed>
     */
    public function dto(Empresa $empresa): array
    {
        $empresa->loadMissing(['ativacao', 'contasFinanceiras']);
        $row = $empresa->ativacao;
        if ($row === null) {
            return $this->dtoLegado($empresa);
        }

        $contaPaga = $row->pagamentoAutenticado() || $this->contaPagaDaEmpresa($empresa);
        $passos = $this->passos($empresa, $row, $contaPaga);
        $pendentesObrigatorios = array_values(array_filter($passos, fn ($p) => ! $p['feito'] && $p['obrigatorio']));
        $pendentes = array_values(array_filter($passos, fn ($p) => ! $p['feito']));

        return [
            'origem' => 'self_service',
            'pronta' => $pendentesObrigatorios === [],
            'pagamento_pendente' => ! $contaPaga,
            'pode_enviar_orcamento' => $contaPaga,
            'billing_provider' => $row->billing_provider,
            'billing_status' => $contaPaga ? EmpresaAtivacao::BILLING_ATIVA : $row->billing_status,
            'checkout_url' => $row->billing_checkout_url,
            'pode_confirmar_demo' => $this->billing->podeConfirmarDemo(),
            'proximo' => $pendentes[0]['id'] ?? null,
            'passos' => $passos,
            'conta' => $this->dtoConta($empresa, $row, $contaPaga),
            'superficie' => FlexorcSuperficie::dto(),
        ];
    }

    /**
     * Fatura da conta sem EMP (alta pública e painel vazio).
     *
     * @return array<string, mixed>
     */
    public function dtoDaConta(User $user): array
    {
        $row = $this->provisionarConta($user);
        $paga = $row->pagamentoAutenticado();
        $passos = [
            [
                'id' => 'conta',
                'label' => 'Sua conta',
                'hint' => $user->codigo,
                'feito' => true,
                'obrigatorio' => true,
                'fase' => 'alta',
                'to' => null,
            ],
            [
                'id' => 'pagamento',
                'label' => 'Mensalidade FLEXORC',
                'hint' => $paga
                    ? 'Conta paga — a TRIGGER recebeu pelo ASAAS'
                    : 'Você paga a TRIGGER. Cartão ou PIX no ASAAS; o FLEXORC não vê o cartão.',
                'feito' => $paga,
                'obrigatorio' => false,
                'fase' => 'alta',
                'to' => '/cadastro/pagamento',
            ],
            [
                'id' => 'empresa',
                'label' => 'Empresa',
                'hint' => 'Até '.ContaAtivacao::maxEmpresasPorConta().' nesta conta, depois de entrar',
                'feito' => $user->empresas()->exists(),
                'obrigatorio' => false,
                'fase' => 'operacao',
                'to' => '/empresas/nova',
            ],
        ];
        $pendentes = array_values(array_filter($passos, fn ($p) => ! $p['feito']));

        return [
            'origem' => 'self_service',
            'pronta' => true,
            'pagamento_pendente' => ! $paga,
            'pode_enviar_orcamento' => $paga,
            'billing_provider' => $row->billing_provider,
            'billing_status' => $row->billing_status,
            'checkout_url' => $row->billing_checkout_url,
            'pode_confirmar_demo' => $this->billing->podeConfirmarDemo(),
            'proximo' => $pendentes[0]['id'] ?? null,
            'passos' => $passos,
            'conta' => $this->dtoFaturaUsuario($user, $row),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function iniciarPagamentoConta(User $user): array
    {
        $row = $this->provisionarConta($user);
        if ($row->pagamentoAutenticado()) {
            return $this->dtoDaConta($user);
        }

        try {
            $out = $this->billing->iniciarCheckoutConta($user, $row);
        } catch (\RuntimeException $e) {
            throw ValidationException::withMessages([
                'pagamento' => $e->getMessage(),
            ]);
        }

        $row->billing_provider = $out['provider'];
        $row->billing_customer_ref = $out['customer_ref'] ?? $row->billing_customer_ref;
        $row->billing_checkout_ref = $out['checkout_ref'] ?? $row->billing_checkout_ref;
        $row->billing_checkout_url = $out['checkout_url'] ?? $row->billing_checkout_url;
        $row->save();

        return $this->dtoDaConta($user->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function confirmarPagamentoDemoConta(User $user): array
    {
        if (! $this->billing->podeConfirmarDemo()) {
            throw ValidationException::withMessages([
                'pagamento' => 'Neste ambiente a forma de pagamento é autenticada pelo ASAAS.',
            ]);
        }

        $row = $this->provisionarConta($user);
        $this->marcarPagamentoConta($row, $this->billing->providerNome());
        $this->propagarPagamentoContaParaEmpresas($user, $row);

        return $this->dtoDaConta($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function iniciarPagamento(Empresa $empresa): array
    {
        $row = $this->exigirSelfService($empresa);
        if ($row->pagamentoAutenticado() || $this->contaPagaDaEmpresa($empresa)) {
            return $this->dto($empresa);
        }

        try {
            $out = $this->billing->iniciarCheckout($empresa, $row);
        } catch (\RuntimeException $e) {
            throw ValidationException::withMessages([
                'pagamento' => $e->getMessage(),
            ]);
        }

        $row->billing_provider = $out['provider'];
        $row->billing_customer_ref = $out['customer_ref'] ?? $row->billing_customer_ref;
        $row->billing_checkout_ref = $out['checkout_ref'] ?? $row->billing_checkout_ref;
        $row->billing_checkout_url = $out['checkout_url'] ?? $row->billing_checkout_url;
        $row->save();

        return $this->dto($empresa->fresh(['ativacao', 'contasFinanceiras']));
    }

    /**
     * @return array<string, mixed>
     */
    public function confirmarPagamentoDemo(Empresa $empresa): array
    {
        if (! $this->billing->podeConfirmarDemo()) {
            throw ValidationException::withMessages([
                'pagamento' => 'Neste ambiente a forma de pagamento é autenticada pelo ASAAS.',
            ]);
        }

        $row = $this->exigirSelfService($empresa);
        $this->marcarPagamentoAutenticado($row, $this->billing->providerNome());
        $this->marcarPagamentoContaVinculada($empresa, $this->billing->providerNome());

        return $this->dto($empresa->fresh(['ativacao', 'contasFinanceiras']));
    }

    /**
     * @return array<string, mixed>
     */
    public function registrarRecebimento(Empresa $empresa, string $pixChave): array
    {
        $chave = trim($pixChave);
        if ($chave === '') {
            throw ValidationException::withMessages([
                'pix_chave' => 'Informe a chave PIX da empresa para receber o sinal.',
            ]);
        }
        if (mb_strlen($chave) > 255) {
            throw ValidationException::withMessages([
                'pix_chave' => 'Chave PIX muito longa.',
            ]);
        }

        $this->exigirSelfService($empresa);
        $conta = $this->contaPrincipal($empresa);
        if ($conta === null) {
            throw ValidationException::withMessages([
                'pix_chave' => 'Conta financeira da empresa não encontrada.',
            ]);
        }

        $conta->pix_chave = $chave;
        if (! $conta->descricao) {
            $conta->descricao = 'Conta principal (PIX / sinal)';
        }
        $conta->observacao = 'Chave PIX para o sinal dos orçamentos.';
        $conta->save();

        return $this->dto($empresa->fresh(['ativacao', 'contasFinanceiras']));
    }

    /**
     * @return array<string, mixed>
     */
    public function conferirCatalogo(Empresa $empresa): array
    {
        $row = $this->exigirSelfService($empresa);
        $row->catalogo_conferido_em = now();
        $row->save();

        return $this->dto($empresa->fresh(['ativacao', 'contasFinanceiras']));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function aplicarWebhookBilling(array $payload): array
    {
        if (! $this->billing->ehEventoBilling($payload)) {
            return ['handled' => false];
        }

        $userId = $this->billing->userIdDoPayload($payload);
        if ($userId !== null) {
            $conta = ContaAtivacao::query()->where('user_id', $userId)->first();
            if ($conta === null) {
                return [
                    'handled' => true,
                    'resultado' => 'IGNORADO',
                    'mensagem' => 'Ativação da conta não encontrada.',
                ];
            }
            if ($this->billing->pagamentoConfirmado($payload)) {
                $paymentId = (string) (data_get($payload, 'payment.id') ?? data_get($payload, 'checkout.id') ?? '');
                if ($paymentId !== '') {
                    $conta->billing_subscription_ref = $paymentId;
                }
                $this->marcarPagamentoConta($conta, 'asaas');
                $user = User::query()->find($userId);
                if ($user) {
                    $this->propagarPagamentoContaParaEmpresas($user, $conta);
                }
            }

            return [
                'handled' => true,
                'resultado' => 'PROCESSADO',
                'mensagem' => 'Forma de pagamento da conta atualizada.',
                'user_id' => $userId,
            ];
        }

        $empresaId = $this->billing->empresaIdDoPayload($payload);
        if ($empresaId === null) {
            return [
                'handled' => true,
                'resultado' => 'IGNORADO',
                'mensagem' => 'Evento ASAAS sem referência de conta FLEXORC.',
            ];
        }

        $row = EmpresaAtivacao::query()->where('empresa_id', $empresaId)->first();
        if ($row === null) {
            return [
                'handled' => true,
                'resultado' => 'IGNORADO',
                'mensagem' => 'Ativação não encontrada.',
            ];
        }

        if ($this->billing->pagamentoConfirmado($payload)) {
            $paymentId = (string) (data_get($payload, 'payment.id') ?? data_get($payload, 'checkout.id') ?? '');
            if ($paymentId !== '') {
                $row->billing_subscription_ref = $paymentId;
            }
            $this->marcarPagamentoAutenticado($row, 'asaas');
            $empresa = Empresa::query()->find($empresaId);
            if ($empresa) {
                $this->marcarPagamentoContaVinculada($empresa, 'asaas');
            }
        }

        return [
            'handled' => true,
            'resultado' => 'PROCESSADO',
            'mensagem' => 'Forma de pagamento da conta atualizada.',
            'empresa_id' => $empresaId,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function ehEventoBilling(array $payload): bool
    {
        return $this->billing->ehEventoBilling($payload);
    }

    public function mensagemBloqueioEnvio(): string
    {
        return 'Pague a mensalidade da conta FLEXORC (cartão ou PIX no ASAAS) para enviar a proposta. Isto não é o sinal do orçamento — o sinal o seu cliente paga a você.';
    }

    /**
     * @return list<array{
     *   id: string,
     *   label: string,
     *   hint: string,
     *   feito: bool,
     *   obrigatorio: bool,
     *   fase: 'alta'|'operacao',
     *   to: string|null
     * }>
     */
    private function passos(Empresa $empresa, EmpresaAtivacao $row, bool $contaPaga): array
    {
        $clientes = $this->contarClientes($empresa);
        $orcs = Orcamento::query()->where('empresa_id', $empresa->id)->count();
        $pix = $this->pixPrincipal($empresa);
        $bens = BemPatrimonial::query()->where('empresa_id', $empresa->id)->count();

        $passos = [
            [
                'id' => 'conta',
                'label' => 'Sua conta',
                'hint' => 'Acesso criado',
                'feito' => true,
                'obrigatorio' => true,
                'fase' => 'alta',
                'to' => null,
            ],
            [
                'id' => 'empresa',
                'label' => 'Empresa',
                'hint' => $empresa->razao_social,
                'feito' => true,
                'obrigatorio' => true,
                'fase' => 'alta',
                'to' => '/empresas',
            ],
            [
                'id' => 'pagamento',
                'label' => 'Mensalidade FLEXORC',
                'hint' => $contaPaga
                    ? 'Conta paga — a TRIGGER recebeu pelo ASAAS'
                    : 'Você paga a TRIGGER. Cartão ou PIX no ASAAS; o FLEXORC não vê o cartão.',
                'feito' => $contaPaga,
                'obrigatorio' => false,
                'fase' => 'alta',
                'to' => '/cadastro/pagamento',
            ],
        ];

        if (FlexorcSuperficie::emiteSinalNoAceite()) {
            $passos[] = [
                'id' => 'recebimento',
                'label' => 'PIX para o sinal',
                'hint' => $pix
                    ? 'Chave pronta para receber o adiantamento'
                    : 'Chave PIX da empresa (conta financeira)',
                'feito' => $pix !== null,
                'obrigatorio' => false,
                'fase' => 'operacao',
                'to' => '/empresas',
            ];
        }

        $passos = array_merge($passos, [
            [
                'id' => 'catalogo',
                'label' => 'Catálogo de preços',
                'hint' => $row->catalogo_conferido_em
                    ? 'Conferido — valem os preços desta empresa'
                    : 'Modelo inicial: confira papel, hora-máquina e facas',
                'feito' => $row->catalogo_conferido_em !== null,
                'obrigatorio' => false,
                'fase' => 'operacao',
                'to' => '/orcamento-catalogo',
            ],
            [
                'id' => 'parceiro',
                'label' => 'Primeiro parceiro',
                'hint' => $clientes > 0
                    ? $clientes.' no cadastro'
                    : 'Prospect mínimo: nome, contato e cidade',
                'feito' => $clientes > 0,
                'obrigatorio' => false,
                'fase' => 'operacao',
                'to' => '/parceiros/novo',
            ],
            [
                'id' => 'patrimonio',
                'label' => 'Patrimônio',
                'hint' => $bens > 0
                    ? $bens.' bens — ajuste marca, série e valores à operação'
                    : 'Modelo inicial das máquinas do catálogo ORC',
                'feito' => $bens > 0,
                'obrigatorio' => false,
                'fase' => 'operacao',
                'to' => '/patrimonio',
            ],
            [
                'id' => 'orcamento',
                'label' => 'Primeiro orçamento',
                'hint' => $orcs > 0 ? $orcs.' nesta empresa' : 'Calcular, gravar e enviar o link',
                'feito' => $orcs > 0,
                'obrigatorio' => false,
                'fase' => 'operacao',
                'to' => '/orcamentos/novo',
            ],
        ]);

        return $passos;
    }

    /**
     * @return array<string, mixed>
     */
    private function dtoLegado(Empresa $empresa): array
    {
        return [
            'origem' => 'legado',
            'pronta' => true,
            'pagamento_pendente' => false,
            'pode_enviar_orcamento' => true,
            'billing_provider' => 'legado',
            'billing_status' => EmpresaAtivacao::BILLING_ATIVA,
            'checkout_url' => null,
            'pode_confirmar_demo' => false,
            'proximo' => null,
            'passos' => [],
            'conta' => null,
        ];
    }

    /**
     * Fatura da conta FLEXORC (EMP → TRIGGER). Distinta do sinal do ORC.
     *
     * @return array<string, mixed>
     */
    private function dtoConta(Empresa $empresa, EmpresaAtivacao $row, bool $paga): array
    {
        $tabela = $this->billing->valorTabela();
        $cobranca = $this->billing->valorCobranca();
        $cnpj = preg_replace('/\D/', '', (string) $empresa->cnpj) ?: (string) $empresa->cnpj;

        return [
            'produto' => 'FLEXORC',
            'fornecedor' => 'TRIGGER',
            'pagador' => [
                'codigo' => $empresa->codigo,
                'razao_social' => $empresa->razao_social,
                'cnpj' => $cnpj,
            ],
            'plano' => 'Mensalidade',
            'periodicidade' => $this->billing->ciclo(),
            'periodicidade_label' => $this->billing->cicloLabel(),
            'descricao' => $this->billing->descricao(),
            'valor' => $tabela,
            'valor_cobranca' => $cobranca,
            'valor_formatado' => $this->formatarMoeda($tabela > 0 ? $tabela : $cobranca),
            'meios' => ['Cartão de crédito', 'PIX'],
            'cofre' => 'ASAAS',
            'status' => $paga ? EmpresaAtivacao::BILLING_ATIVA : $row->billing_status,
            'status_label' => $paga ? 'Paga' : 'Aguardando pagamento',
            'paga' => $paga,
            'pago_em' => $row->billing_metodo_em?->toIso8601String(),
            'camada_esta' => 'Você paga a TRIGGER pela conta FLEXORC — mensalidade, no ASAAS. Até '
                .ContaAtivacao::maxEmpresasPorConta().' empresas nesta conta.',
            'camada_nao_e' => 'Não é o sinal do orçamento. O sinal o cliente da gráfica paga a você (PIX da empresa).',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function dtoFaturaUsuario(User $user, ContaAtivacao $row): array
    {
        $tabela = $this->billing->valorTabela();
        $cobranca = $this->billing->valorCobranca();
        $paga = $row->pagamentoAutenticado();

        return [
            'produto' => 'FLEXORC',
            'fornecedor' => 'TRIGGER',
            'pagador' => [
                'codigo' => $user->codigo,
                'razao_social' => $user->name,
                'cnpj' => '',
            ],
            'plano' => 'Mensalidade',
            'periodicidade' => $this->billing->ciclo(),
            'periodicidade_label' => $this->billing->cicloLabel(),
            'descricao' => $this->billing->descricao(),
            'valor' => $tabela,
            'valor_cobranca' => $cobranca,
            'valor_formatado' => $this->formatarMoeda($tabela > 0 ? $tabela : $cobranca),
            'meios' => ['Cartão de crédito', 'PIX'],
            'cofre' => 'ASAAS',
            'status' => $row->billing_status,
            'status_label' => $paga ? 'Paga' : 'Aguardando pagamento',
            'paga' => $paga,
            'pago_em' => $row->billing_metodo_em?->toIso8601String(),
            'camada_esta' => 'Você paga a TRIGGER pela conta FLEXORC — mensalidade, no ASAAS. Até '
                .ContaAtivacao::maxEmpresasPorConta().' empresas nesta conta.',
            'camada_nao_e' => 'Não é o sinal do orçamento. O sinal o cliente da gráfica paga a você (PIX da empresa).',
        ];
    }

    private function formatarMoeda(float $valor): string
    {
        return 'R$ '.number_format($valor, 2, ',', '.');
    }

    private function exigirSelfService(Empresa $empresa): EmpresaAtivacao
    {
        $row = $empresa->ativacao ?? EmpresaAtivacao::query()->where('empresa_id', $empresa->id)->first();
        if ($row === null) {
            throw ValidationException::withMessages([
                'ativacao' => 'Esta empresa não usa o fluxo de auto-cadastro.',
            ]);
        }

        return $row;
    }

    private function marcarPagamentoAutenticado(EmpresaAtivacao $row, string $provider): void
    {
        $row->billing_status = EmpresaAtivacao::BILLING_ATIVA;
        $row->billing_provider = $provider;
        $row->billing_metodo_em = $row->billing_metodo_em ?? now();
        $row->billing_checkout_url = null;
        $row->save();
    }

    private function marcarPagamentoConta(ContaAtivacao $row, string $provider): void
    {
        $row->billing_status = ContaAtivacao::BILLING_ATIVA;
        $row->billing_provider = $provider;
        $row->billing_metodo_em = $row->billing_metodo_em ?? now();
        $row->billing_checkout_url = null;
        $row->save();
    }

    private function marcarPagamentoContaVinculada(Empresa $empresa, string $provider): void
    {
        $userIds = $empresa->users()->pluck('users.id');
        foreach (User::query()->whereIn('id', $userIds)->get() as $user) {
            if (! $user->hasRole('ADMIN') && ! $user->can('empresas.gerir')) {
                continue;
            }
            $conta = $this->provisionarConta($user);
            $this->marcarPagamentoConta($conta, $provider);
        }
    }

    private function propagarPagamentoContaParaEmpresas(User $user, ContaAtivacao $conta): void
    {
        $user->loadMissing('empresas');
        foreach ($user->empresas as $empresa) {
            $this->herdarPagamentoDaConta($user, $empresa);
        }
    }

    private function contaDoUsuario(User $user): ?ContaAtivacao
    {
        return ContaAtivacao::query()->where('user_id', $user->id)->first();
    }

    private function contaPagaDaEmpresa(Empresa $empresa): bool
    {
        return ContaAtivacao::query()
            ->where('billing_status', ContaAtivacao::BILLING_ATIVA)
            ->whereNotNull('billing_metodo_em')
            ->whereIn('user_id', function ($q) use ($empresa) {
                $q->select('user_id')->from('empresa_user')->where('empresa_id', $empresa->id);
            })
            ->exists();
    }

    private function contaPrincipal(Empresa $empresa): ?EmpresaContaFinanceira
    {
        return EmpresaContaFinanceira::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativa', true)
            ->orderByDesc('principal')
            ->orderBy('ordem')
            ->first();
    }

    private function pixPrincipal(Empresa $empresa): ?string
    {
        $chave = $this->contaPrincipal($empresa)?->pix_chave;
        $chave = is_string($chave) ? trim($chave) : '';

        return $chave !== '' ? $chave : null;
    }

    private function contarClientes(Empresa $empresa): int
    {
        return Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where(function ($q) {
                $q->where('papel_cliente', true)->orWhere('is_prospect', true);
            })
            ->count();
    }
}
