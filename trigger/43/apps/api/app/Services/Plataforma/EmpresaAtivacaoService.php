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
use App\Services\Banking\Billing\BillingGateway;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use App\Support\FlexorcSuperficie;
use App\Support\ProductBrand;
use Illuminate\Validation\ValidationException;

/**
 * Ativação: mensalidade na conta (USR) + primeiros passos por EMP (ADR_ATIVACAO_EMPRESA).
 * Legado (seed/teste sem linha) opera normalmente — não bloqueia envio.
 */
class EmpresaAtivacaoService
{
    public function __construct(
        private readonly BillingGateway $billing,
        private readonly EmpresaCertificadoA1Service $certificadoA1,
    ) {}

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

        if (! ($row->pagamentoAutenticado() || $this->contaAcessoLiberadoDaEmpresa($empresa))) {
            return false;
        }

        return $this->certificadoA1->aptoParaOperar($empresa);
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

        $contaMaster = $this->contaAtivacaoDaEmpresa($empresa);
        $contaMaster?->loadMissing('user');
        if ($contaMaster !== null) {
            $this->aplicarSuspensaoCicloInterSeVencido($contaMaster);
            $this->sanearResiduoAsaasSeInter($contaMaster);
            $this->expirarPixInterSeNecessario($contaMaster);
            $contaMaster->refresh();
        }
        $pagoAsaas = $row->pagamentoAutenticado() || ($contaMaster?->pagamentoAutenticado() ?? false);
        $contaPaga = $pagoAsaas || $this->contaAcessoLiberadoDaEmpresa($empresa);
        $a1Apto = $this->certificadoA1->aptoParaOperar($empresa);
        $a1Alerta = $this->certificadoA1->alertaOperacao($empresa);
        $passos = $this->passos($empresa, $row, $contaPaga, $a1Apto);
        $pendentesObrigatorios = array_values(array_filter($passos, fn ($p) => ! $p['feito'] && $p['obrigatorio']));
        $pendentes = array_values(array_filter($passos, fn ($p) => ! $p['feito']));
        $provider = $this->billing->providerNome();

        return [
            'origem' => 'self_service',
            'pronta' => $pendentesObrigatorios === [],
            'pagamento_pendente' => ! $contaPaga,
            'certificado_a1_pendente' => ! $a1Apto,
            ...$this->dtoCamposCertificadoA1($a1Alerta),
            'pode_enviar_orcamento' => $contaPaga && $a1Apto,
            'billing_provider' => $this->providerEfetivo($contaMaster?->billing_provider ?? $row->billing_provider),
            'billing_status' => $pagoAsaas
                ? EmpresaAtivacao::BILLING_ATIVA
                : ($contaMaster?->billing_status ?? $row->billing_status),
            'checkout_url' => $this->checkoutUrlEfetivo(
                $contaMaster?->billing_checkout_url ?? $row->billing_checkout_url,
                $contaMaster?->billing_provider ?? $row->billing_provider,
            ),
            'pix_copia_cola' => $provider === 'inter' ? $contaMaster?->billing_pix_copia_cola : null,
            'pix_qr_base64' => $provider === 'inter' ? $contaMaster?->billing_pix_qr_base64 : null,
            'pix_vencimento' => $provider === 'inter'
                ? $contaMaster?->billing_charge_vencimento?->toDateString()
                : null,
            'pix_expira_em' => $provider === 'inter' && $contaMaster !== null
                ? $this->pixExpiraEmDto($contaMaster)
                : null,
            'pix_expirado' => false,
            'pode_gerar_pix' => $provider === 'inter'
                && $contaMaster !== null
                && $this->billing->precisaPagarCiclo($contaMaster),
            'pode_confirmar_demo' => $this->billing->podeConfirmarDemo(),
            'proximo' => $pendentes[0]['id'] ?? null,
            'passos' => $passos,
            'conta' => $this->dtoConta($empresa, $row, $contaPaga, $contaMaster),
            'superficie' => FlexorcSuperficie::dto(),
        ];
    }

    /**
     * Sanitiza conta antes de GET/POST de fatura (expira PIX Inter ocioso, etc.).
     * Roda mesmo quando a EMP do contexto é legado sem empresa_ativacoes.
     */
    public function prepararContaParaLeitura(User $user): void
    {
        $row = ContaAtivacao::query()->where('user_id', $user->id)->first();
        if ($row === null) {
            return;
        }
        $this->aplicarSuspensaoCicloInterSeVencido($row);
        $this->sanearResiduoAsaasSeInter($row);
        $this->reconciliarPixInterSePago($row);
        $this->expirarPixInterSeNecessario($row);
    }

    /**
     * Fatura da conta sem EMP (alta pública e painel vazio).
     *
     * @return array<string, mixed>
     */
    public function dtoDaConta(User $user): array
    {
        $row = $this->provisionarConta($user);
        $this->prepararContaParaLeitura($user);
        $row->refresh();
        $liberado = $row->acessoLiberado();
        $pagoAsaas = $row->pagamentoAutenticado();
        $provider = $this->billing->providerNome();
        $hintPagamento = match (true) {
            $pagoAsaas && $provider === 'inter' => 'Conta paga — PIX Inter confirmado',
            $pagoAsaas => 'Conta paga — a TRIGGER recebeu pelo ASAAS',
            $row->cortesiaVigente() => 'Período cortesia TRIGGER — autentique a mensalidade antecipada antes do fim',
            $row->cortesiaEncerrada() && $provider === 'inter' => 'Cortesia encerrada — pague a mensalidade via PIX para continuar',
            $row->cortesiaEncerrada() => 'Cortesia encerrada — pague a mensalidade antecipada no cartão para continuar',
            $provider === 'inter' => 'Você paga a TRIGGER. PIX na tela (QR + copia-e-cola); o '.ProductBrand::name().' não guarda o comprovante do banco.',
            default => 'Você paga a TRIGGER. Cartão no ASAAS (recorrente); o '.ProductBrand::name().' não vê o cartão.',
        };
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
                'label' => 'Mensalidade '.ProductBrand::name(),
                'hint' => $hintPagamento,
                'feito' => $liberado,
                'obrigatorio' => false,
                'fase' => 'alta',
                'to' => '/conta/mensalidade',
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
            'pagamento_pendente' => ! $liberado,
            'certificado_a1_pendente' => false,
            ...$this->dtoCamposCertificadoA1(null),
            'pode_enviar_orcamento' => $liberado,
            'billing_provider' => $this->providerEfetivo($row->billing_provider ?: $provider),
            'billing_status' => $row->billing_status,
            'checkout_url' => $this->checkoutUrlEfetivo($row->billing_checkout_url, $row->billing_provider),
            'pix_copia_cola' => $provider === 'inter' ? $row->billing_pix_copia_cola : null,
            'pix_qr_base64' => $provider === 'inter' ? $row->billing_pix_qr_base64 : null,
            'pix_vencimento' => $provider === 'inter' ? $row->billing_charge_vencimento?->toDateString() : null,
            'pix_expira_em' => $provider === 'inter' ? $this->pixExpiraEmDto($row) : null,
            'pix_expirado' => false,
            'pode_gerar_pix' => $provider === 'inter' && $this->billing->precisaPagarCiclo($row),
            'pode_confirmar_demo' => $this->billing->podeConfirmarDemo(),
            'proximo' => $pendentes[0]['id'] ?? null,
            'passos' => $passos,
            'conta' => $this->dtoFaturaUsuario($user, $row),
        ];
    }

    /**
     * Aviso de mensalidade/cortesia para login e /auth/me (UX imediata).
     *
     * @return array{
     *   tipo: string,
     *   titulo: string,
     *   mensagem: string,
     *   acao: string,
     *   to: string,
     *   dias_restantes: ?int,
     *   valor_formatado: ?string
     * }|null
     */
    public function avisoBillingConta(User $user): ?array
    {
        $row = ContaAtivacao::query()->where('user_id', $user->id)->first();
        if ($row === null) {
            return null;
        }

        $valor = $this->formatarMoeda(
            $this->billing->valorTabela() > 0
                ? $this->billing->valorTabela()
                : $this->billing->valorCobranca(),
        );
        $to = '/conta/mensalidade';

        if ($row->billing_status === ContaAtivacao::BILLING_SUSPENSA) {
            return [
                'tipo' => 'suspensa',
                'titulo' => 'Mensalidade suspensa',
                'mensagem' => 'Regularize a mensalidade '.ProductBrand::name().' no ASAAS para voltar a enviar propostas.',
                'acao' => 'autenticar',
                'to' => $to,
                'dias_restantes' => null,
                'valor_formatado' => $valor,
            ];
        }

        if ($row->cortesiaVigente() && ! $row->pagamentoAutenticado()) {
            $dias = (int) now()->startOfDay()->diffInDays($row->cortesia_ate->copy()->startOfDay());
            $primeira = $this->billing->primeiraCobrancaEm($row->cortesia_ate)
                ->timezone(config('app.timezone'))
                ->format('d/m/Y');

            return [
                'tipo' => 'cortesia',
                'titulo' => $dias <= $this->billing->alertaCortesiaDias()
                    ? 'Cortesia acabando — autentique a mensalidade'
                    : 'Período cortesia — autentique a mensalidade',
                'mensagem' => $dias === 0
                    ? "A cortesia encerra hoje. 1ª cobrança antecipada em {$primeira} ({$valor})."
                    : ($dias === 1
                        ? "A cortesia encerra amanhã. 1ª cobrança antecipada em {$primeira} ({$valor})."
                        : "Restam {$dias} dias de cortesia. 1ª cobrança antecipada em {$primeira} ({$valor})."),
                'acao' => 'autenticar',
                'to' => $to,
                'dias_restantes' => $dias,
                'valor_formatado' => $valor,
            ];
        }

        if (! $row->acessoLiberado()) {
            if ($row->cortesiaEncerrada()) {
                $ate = $row->cortesia_ate->timezone(config('app.timezone'))->format('d/m/Y');

                return [
                    'tipo' => 'cortesia_encerrada',
                    'titulo' => 'Cortesia encerrada — pague para continuar',
                    'mensagem' => "O período cortesia encerrou em {$ate}. {$valor} no cartão (ASAAS), antecipado, para voltar a enviar propostas.",
                    'acao' => 'autenticar',
                    'to' => $to,
                    'dias_restantes' => 0,
                    'valor_formatado' => $valor,
                ];
            }

            return [
                'tipo' => 'pendente',
                'titulo' => 'Mensalidade '.ProductBrand::name().' em aberto',
                'mensagem' => "{$valor} · Regularize a mensalidade antecipada. Sem isto o envio da proposta fica bloqueado.",
                'acao' => 'autenticar',
                'to' => $to,
                'dias_restantes' => null,
                'valor_formatado' => $valor,
            ];
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    public function iniciarPagamentoConta(User $user): array
    {
        $row = $this->provisionarConta($user);

        if ($this->billing->providerNome() === 'inter') {
            $this->aplicarSuspensaoCicloInterSeVencido($row);
            $row->refresh();
            $this->expirarPixInterSeNecessario($row);
            $row->refresh();
            if (! $this->billing->precisaPagarCiclo($row)) {
                return $this->dtoDaConta($user);
            }
        } elseif ($row->pagamentoAutenticado()) {
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
        if (array_key_exists('checkout_url', $out)) {
            $row->billing_checkout_url = $out['checkout_url'];
        }
        if (array_key_exists('pix_copia_cola', $out)) {
            $row->billing_pix_copia_cola = $out['pix_copia_cola'];
        }
        if (array_key_exists('pix_qr_base64', $out)) {
            $row->billing_pix_qr_base64 = $out['pix_qr_base64'];
        }
        if (array_key_exists('charge_vencimento', $out)) {
            $row->billing_charge_vencimento = $out['charge_vencimento'];
        }
        if (! empty($out['pix_emitido_em'])) {
            try {
                $row->billing_pix_emitido_em = \Carbon\Carbon::parse((string) $out['pix_emitido_em']);
            } catch (\Throwable) {
                $row->billing_pix_emitido_em = now();
            }
        } elseif (($out['provider'] ?? '') === 'inter' && filled($out['pix_copia_cola'] ?? null)) {
            $row->billing_pix_emitido_em = now();
        }
        if (($out['provider'] ?? '') === 'inter') {
            $row->billing_checkout_url = null;
        }
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
        if ($row->pagamentoAutenticado() || $this->contaPagaAsaasDaEmpresa($empresa)) {
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
        if (array_key_exists('checkout_url', $out)) {
            $row->billing_checkout_url = $out['checkout_url'];
        }
        if (($out['provider'] ?? '') === 'inter') {
            $row->billing_checkout_url = null;
        }
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
    public function aplicarWebhookBilling(array $payload, ?string $providerHint = null): array
    {
        $gw = $this->gatewayParaWebhook($providerHint);
        if (! $gw->ehEventoBilling($payload)) {
            return ['handled' => false];
        }

        $userId = $gw->userIdDoPayload($payload);
        if ($userId !== null) {
            $conta = ContaAtivacao::query()->where('user_id', $userId)->first();
            if ($conta === null) {
                return [
                    'handled' => true,
                    'resultado' => 'IGNORADO',
                    'mensagem' => 'Ativação da conta não encontrada.',
                ];
            }
            if ($gw->pagamentoConfirmado($payload)) {
                $paymentId = (string) (data_get($payload, 'payment.id')
                    ?? data_get($payload, 'checkout.id')
                    ?? data_get($payload, 'codigoSolicitacao')
                    ?? '');
                if ($paymentId !== '') {
                    $conta->billing_subscription_ref = $paymentId;
                }
                $provider = $providerHint === 'inter' || $gw->providerNome() === 'inter'
                    ? 'inter'
                    : 'asaas';
                if (($conta->billing_provider === 'inter') || $providerHint === 'inter') {
                    $provider = 'inter';
                }
                $this->marcarPagamentoConta($conta, $provider, $this->dataPagamentoDoPayload($payload));
                $user = User::query()->find($userId);
                if ($user) {
                    $this->propagarPagamentoContaParaEmpresas($user, $conta);
                }

                return [
                    'handled' => true,
                    'resultado' => 'PROCESSADO',
                    'mensagem' => 'Forma de pagamento da conta atualizada.',
                    'user_id' => $userId,
                ];
            }

            if ($gw->pagamentoEmAtrasoOuCancelado($payload) && $conta->pagamentoAutenticado()) {
                $this->suspenderPagamentoConta($conta);
                $user = User::query()->find($userId);
                if ($user) {
                    $this->propagarSuspensaoContaParaEmpresas($user);
                }

                return [
                    'handled' => true,
                    'resultado' => 'PROCESSADO',
                    'mensagem' => 'Mensalidade da conta suspensa por inadimplência ou cancelamento.',
                    'user_id' => $userId,
                ];
            }

            return [
                'handled' => true,
                'resultado' => 'PROCESSADO',
                'mensagem' => 'Evento de billing da conta recebido.',
                'user_id' => $userId,
            ];
        }

        $empresaId = $gw->empresaIdDoPayload($payload);
        if ($empresaId === null) {
            return [
                'handled' => true,
                'resultado' => 'IGNORADO',
                'mensagem' => 'Evento de billing sem referência de conta '.ProductBrand::name().'.',
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

        if ($gw->pagamentoConfirmado($payload)) {
            $paymentId = (string) (data_get($payload, 'payment.id') ?? data_get($payload, 'checkout.id') ?? '');
            if ($paymentId !== '') {
                $row->billing_subscription_ref = $paymentId;
            }
            $this->marcarPagamentoAutenticado($row, 'asaas', $this->dataPagamentoDoPayload($payload));
            $empresa = Empresa::query()->find($empresaId);
            if ($empresa) {
                $this->marcarPagamentoContaVinculada($empresa, 'asaas');
            }

            return [
                'handled' => true,
                'resultado' => 'PROCESSADO',
                'mensagem' => 'Forma de pagamento da conta atualizada.',
                'empresa_id' => $empresaId,
            ];
        }

        if ($gw->pagamentoEmAtrasoOuCancelado($payload) && $row->pagamentoAutenticado()) {
            $this->suspenderPagamentoEmpresa($row);
            $empresa = Empresa::query()->find($empresaId);
            if ($empresa) {
                $this->suspenderPagamentoContaVinculada($empresa);
            }

            return [
                'handled' => true,
                'resultado' => 'PROCESSADO',
                'mensagem' => 'Mensalidade suspensa por inadimplência ou cancelamento.',
                'empresa_id' => $empresaId,
            ];
        }

        return [
            'handled' => true,
            'resultado' => 'PROCESSADO',
            'mensagem' => 'Evento de billing recebido.',
            'empresa_id' => $empresaId,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function ehEventoBilling(array $payload, ?string $providerHint = null): bool
    {
        return $this->gatewayParaWebhook($providerHint)->ehEventoBilling($payload);
    }

    private function gatewayParaWebhook(?string $providerHint): BillingGateway
    {
        return match (strtolower((string) $providerHint)) {
            'inter' => app(\App\Services\Banking\Inter\InterBillingGateway::class),
            'asaas' => app(\App\Services\Banking\Asaas\AsaasBillingGateway::class),
            default => $this->billing,
        };
    }

    public function mensagemBloqueioEnvio(Empresa $empresa): string
    {
        $erros = $this->errosBloqueioEnvio($empresa);
        foreach ($erros as $msgs) {
            if (isset($msgs[0]) && is_string($msgs[0])) {
                return $msgs[0];
            }
        }

        return 'Conclua a mensalidade e o certificado A1 desta empresa para enviar a proposta.';
    }

    /**
     * @return array<string, list<string>>
     */
    public function errosBloqueioEnvio(Empresa $empresa): array
    {
        if ($this->podeEnviarOrcamento($empresa)) {
            return [];
        }

        $row = $empresa->ativacao ?? EmpresaAtivacao::query()->where('empresa_id', $empresa->id)->first();
        if ($row === null) {
            return [];
        }

        $paga = $row->pagamentoAutenticado() || $this->contaAcessoLiberadoDaEmpresa($empresa);
        if (! $paga) {
            $conta = $this->contaAtivacaoDaEmpresa($empresa);
            $suspensa = ($conta?->billing_status ?? $row->billing_status) === ContaAtivacao::BILLING_SUSPENSA;

            return [
                'pagamento' => [
                    $suspensa
                        ? 'Mensalidade '.ProductBrand::name().' suspensa por inadimplência. Regularize no ASAAS (cartão) para voltar a enviar propostas.'
                        : ($conta?->cortesiaEncerrada()
                            ? 'O período cortesia encerrou. Pague a mensalidade antecipada da conta '.ProductBrand::name().' (cartão no ASAAS) para voltar a enviar propostas. Isto não é o sinal do orçamento.'
                            : 'Pague a mensalidade antecipada da conta '.ProductBrand::name().' (cartão no ASAAS) para enviar a proposta. Isto não é o sinal do orçamento — o sinal o seu cliente paga a você.'),
                ],
            ];
        }

        return [
            'certificado_a1' => [$this->certificadoA1->mensagemBloqueioOperacao($empresa)],
        ];
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
    private function passos(Empresa $empresa, EmpresaAtivacao $row, bool $contaPaga, bool $a1Apto): array
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
                'label' => 'Mensalidade '.ProductBrand::name(),
                'hint' => $contaPaga
                    ? 'Conta paga — a TRIGGER recebeu pelo ASAAS'
                    : ($this->contaAtivacaoDaEmpresa($empresa)?->cortesiaEncerrada()
                        ? 'Cortesia encerrada — pague a mensalidade antecipada no cartão para continuar'
                        : 'Você paga a TRIGGER. Cartão no ASAAS (recorrente); o '.ProductBrand::name().' não vê o cartão.'),
                'feito' => $contaPaga,
                'obrigatorio' => false,
                'fase' => 'alta',
                'to' => '/conta/mensalidade',
            ],
            [
                'id' => 'certificado_a1',
                'label' => 'Certificado A1',
                'hint' => $this->certificadoA1->hintCockpit($empresa),
                'feito' => $a1Apto,
                'obrigatorio' => true,
                'fase' => 'operacao',
                'to' => '/empresas?tab=a1',
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
     * Campos de vigência/alerta do A1 no DTO de ativação (detecção automática por valido_ate).
     *
     * @param  array<string, mixed>|null  $alerta
     * @return array<string, mixed>
     */
    private function dtoCamposCertificadoA1(?array $alerta): array
    {
        if ($alerta === null) {
            return [
                'certificado_a1_alerta' => false,
                'certificado_a1_alerta_nivel' => null,
                'certificado_a1_status' => null,
                'certificado_a1_dias_para_vencer' => null,
                'certificado_a1_valido_ate' => null,
                'certificado_a1_mensagem' => null,
            ];
        }

        return [
            'certificado_a1_alerta' => (bool) ($alerta['alerta'] ?? false),
            'certificado_a1_alerta_nivel' => $alerta['alerta_nivel'] ?? null,
            'certificado_a1_status' => $alerta['status'] ?? null,
            'certificado_a1_dias_para_vencer' => $alerta['dias_para_vencer'] ?? null,
            'certificado_a1_valido_ate' => $alerta['valido_ate'] ?? null,
            'certificado_a1_mensagem' => $alerta['mensagem'] ?? null,
        ];
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
            'certificado_a1_pendente' => false,
            ...$this->dtoCamposCertificadoA1(null),
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
     * Fatura da conta (master → TRIGGER). Distinta do sinal do ORC / CNPJ da EMP.
     *
     * @return array<string, mixed>
     */
    private function dtoConta(Empresa $empresa, EmpresaAtivacao $row, bool $liberado, ?ContaAtivacao $contaMaster = null): array
    {
        $pagoAsaas = $row->pagamentoAutenticado() || ($contaMaster?->pagamentoAutenticado() ?? false);
        $status = $pagoAsaas
            ? EmpresaAtivacao::BILLING_ATIVA
            : ($contaMaster?->billing_status ?? $row->billing_status);
        $autenticadoEm = $contaMaster?->billing_metodo_em ?? $row->billing_metodo_em;

        // Pagador = master da conta (mesmo eixo do console /plataforma), não a EMP ativa.
        $master = $contaMaster?->user;
        if ($master !== null) {
            return $this->montarFatura(
                pagadorCodigo: $master->codigo,
                pagadorNome: $master->name,
                pagadorCnpj: '',
                status: $status,
                liberado: $liberado,
                autenticadoEm: $autenticadoEm,
                conta: $contaMaster,
            );
        }

        $cnpj = preg_replace('/\D/', '', (string) $empresa->cnpj) ?: (string) $empresa->cnpj;

        return $this->montarFatura(
            pagadorCodigo: $empresa->codigo,
            pagadorNome: $empresa->razao_social,
            pagadorCnpj: $cnpj,
            status: $status,
            liberado: $liberado,
            autenticadoEm: $autenticadoEm,
            conta: $contaMaster,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function dtoFaturaUsuario(User $user, ContaAtivacao $row): array
    {
        return $this->montarFatura(
            pagadorCodigo: $user->codigo,
            pagadorNome: $user->name,
            pagadorCnpj: '',
            status: $row->billing_status,
            liberado: $row->acessoLiberado(),
            autenticadoEm: $row->billing_metodo_em,
            conta: $row,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function montarFatura(
        string $pagadorCodigo,
        string $pagadorNome,
        string $pagadorCnpj,
        string $status,
        bool $liberado,
        mixed $autenticadoEm,
        ?ContaAtivacao $conta = null,
    ): array {
        $tabela = $this->billing->valorTabela();
        $cobranca = $this->billing->valorCobranca();
        $pagoAsaas = $conta?->pagamentoAutenticado()
            ?? ($liberado && $autenticadoEm instanceof \Carbon\CarbonInterface);
        $cortesiaVigente = $conta?->cortesiaVigente() ?? false;
        $cortesiaEncerrada = $conta?->cortesiaEncerrada() ?? false;
        // Bonificação TRIGGER vigente tem prioridade na UX (setup/console) sobre ASAAS já autenticado.
        $modo = match (true) {
            $status === ContaAtivacao::BILLING_SUSPENSA => 'suspensa',
            $cortesiaVigente => 'cortesia',
            $pagoAsaas => 'pago',
            $cortesiaEncerrada => 'cortesia_encerrada',
            default => 'pendente',
        };

        $primeira = $this->billing->primeiraCobrancaEm(
            $cortesiaVigente && $conta?->cortesia_ate !== null ? $conta->cortesia_ate : null,
        );
        $primeiraFmt = $primeira->timezone(config('app.timezone'))->format('d/m/Y');
        $alertaLimite = $this->billing->alertaCortesiaDias();

        if ($modo === 'cortesia' && $conta?->cortesia_ate !== null) {
            $ate = $conta->cortesia_ate->copy()->startOfDay();
            $hoje = now()->startOfDay();
            $dias = (int) $hoje->diffInDays($ate);
            $formatada = $conta->cortesia_ate->timezone(config('app.timezone'))->format('d/m/Y');
            if ($pagoAsaas) {
                $label = $dias === 0
                    ? 'Meio autenticado · 1ª cobrança antecipada hoje ('.$primeiraFmt.')'
                    : ($dias === 1
                        ? 'Meio autenticado · 1ª cobrança antecipada amanhã ('.$primeiraFmt.')'
                        : 'Meio autenticado · 1ª cobrança antecipada em '.$dias.' dias ('.$primeiraFmt.')');
            } else {
                $label = $dias === 0
                    ? 'Cortesia encerra hoje · autentique a mensalidade antecipada'
                    : ($dias === 1
                        ? 'Cortesia encerra amanhã · 1ª cobrança em '.$primeiraFmt
                        : 'Cortesia por mais '.$dias.' dias · 1ª cobrança antecipada em '.$primeiraFmt);
            }
            $ciclo = [
                'proxima_cobranca_em' => $primeira->toDateString(),
                'proxima_cobranca_formatada' => $primeiraFmt,
                'dias_ate_proxima' => $dias,
                'renovacao_label' => $label,
            ];
        } elseif ($modo === 'cortesia_encerrada' && $conta?->cortesia_ate !== null) {
            $formatada = $conta->cortesia_ate->timezone(config('app.timezone'))->format('d/m/Y');
            $ciclo = [
                'proxima_cobranca_em' => $primeira->toDateString(),
                'proxima_cobranca_formatada' => $primeiraFmt,
                'dias_ate_proxima' => 0,
                'renovacao_label' => 'Cortesia encerrou em '.$formatada.' · 1ª mensalidade antecipada hoje ('.$primeiraFmt.')',
            ];
        } else {
            $ciclo = $this->billing->cicloStatus(
                $autenticadoEm instanceof \Carbon\CarbonInterface ? $autenticadoEm : null,
                $pagoAsaas,
            );
        }

        $statusLabel = match ($modo) {
            'suspensa' => 'Suspensa',
            'pago' => 'Em dia',
            'cortesia' => 'Cortesia',
            'cortesia_encerrada' => 'Cortesia encerrada',
            default => 'Aguardando pagamento',
        };

        $diasRestantes = $modo === 'cortesia' ? $ciclo['dias_ate_proxima'] : null;
        $alertaCortesia = $modo === 'cortesia'
            && ! $pagoAsaas
            && is_int($diasRestantes)
            && $diasRestantes <= $alertaLimite;
        $alertaNivel = match (true) {
            ! $alertaCortesia => null,
            $diasRestantes === 0 => 'urgent',
            $diasRestantes <= 3 => 'warning',
            default => 'info',
        };

        $cortesiaDto = null;
        if ($conta !== null && $conta->cortesia_ate !== null) {
            $cortesiaDto = [
                'vigente' => $cortesiaVigente,
                'ate' => $conta->cortesia_ate->toIso8601String(),
                'ate_formatada' => $conta->cortesia_ate->timezone(config('app.timezone'))->format('d/m/Y'),
                'dias_restantes' => $diasRestantes,
                'motivo' => $conta->cortesia_motivo,
                'alerta' => $alertaCortesia,
                'alerta_nivel' => $alertaNivel,
            ];
        }

        $provider = $this->billing->providerNome();
        $ehInter = $provider === 'inter'
            || ($conta?->billing_provider === 'inter');

        return [
            'produto' => (string) config('erp.brand.licensee_product', 'FLEXOERP'),
            'fornecedor' => 'TRIGGER',
            'pagador' => [
                'codigo' => $pagadorCodigo,
                'razao_social' => $pagadorNome,
                'cnpj' => $pagadorCnpj,
            ],
            'plano' => 'Mensalidade',
            'periodicidade' => $this->billing->ciclo(),
            'periodicidade_label' => $this->billing->cicloLabel(),
            'descricao' => $this->billing->descricao(),
            'valor' => $tabela,
            'valor_cobranca' => $cobranca,
            'valor_formatado' => $this->formatarMoeda($tabela > 0 ? $tabela : $cobranca),
            'meios' => $ehInter ? ['PIX'] : ['Cartão de crédito'],
            'cofre' => $ehInter ? 'Banco Inter' : 'ASAAS',
            'status' => $status,
            'status_label' => $statusLabel,
            'modo' => $modo,
            'paga' => $liberado,
            'pagamento_autenticado' => $pagoAsaas,
            'pago_em' => $autenticadoEm instanceof \Carbon\CarbonInterface
                ? $autenticadoEm->toIso8601String()
                : null,
            'cobranca_antecipada' => (bool) config('erp.billing.cobranca_antecipada', true),
            'primeira_cobranca_em' => $modo === 'cortesia' || ! $pagoAsaas
                ? $primeira->toDateString()
                : $ciclo['proxima_cobranca_em'],
            'primeira_cobranca_formatada' => $modo === 'cortesia' || ! $pagoAsaas
                ? $primeiraFmt
                : $ciclo['proxima_cobranca_formatada'],
            'proxima_cobranca_em' => $ciclo['proxima_cobranca_em'],
            'proxima_cobranca_formatada' => $ciclo['proxima_cobranca_formatada'],
            'dias_ate_proxima' => $ciclo['dias_ate_proxima'],
            'renovacao_label' => $ciclo['renovacao_label'],
            'alerta_cortesia' => $alertaCortesia,
            'alerta_cortesia_nivel' => $alertaNivel,
            'cortesia' => $cortesiaDto,
            'pix_copia_cola' => $conta?->billing_pix_copia_cola,
            'pix_qr_base64' => $conta?->billing_pix_qr_base64,
            'pix_vencimento' => $conta?->billing_charge_vencimento?->toDateString(),
            'pix_expira_em' => $conta !== null ? $this->pixExpiraEmDto($conta) : null,
            'pode_gerar_pix' => $ehInter && $conta !== null && $this->billing->precisaPagarCiclo($conta),
            'camada_esta' => match (true) {
                $modo === 'cortesia' && $ehInter => 'Bonificação TRIGGER: período cortesia na conta '.ProductBrand::name().'. A 1ª mensalidade é cobrada via PIX no fim da cortesia.',
                $modo === 'cortesia' => 'Bonificação TRIGGER: período cortesia na conta '.ProductBrand::name().'. A 1ª mensalidade é cobrada de forma antecipada no fim da cortesia (cartão no ASAAS).',
                $modo === 'cortesia_encerrada' && $ehInter => 'A cortesia TRIGGER encerrou. Pague a mensalidade via PIX para continuar enviando propostas.',
                $modo === 'cortesia_encerrada' => 'A cortesia TRIGGER encerrou. Pague a mensalidade antecipada no cartão (ASAAS) para continuar enviando propostas.',
                $ehInter => 'Você paga a TRIGGER pela conta '.ProductBrand::name().' — mensalidade via PIX (Banco Inter). Até '
                    .ContaAtivacao::maxEmpresasPorConta().' empresas nesta conta.',
                default => 'Você paga a TRIGGER pela conta '.ProductBrand::name().' — mensalidade antecipada no cartão (ASAAS). Até '
                    .ContaAtivacao::maxEmpresasPorConta().' empresas nesta conta.',
            },
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

    private function marcarPagamentoAutenticado(EmpresaAtivacao $row, string $provider, ?\Carbon\CarbonInterface $em = null): void
    {
        $row->billing_status = EmpresaAtivacao::BILLING_ATIVA;
        $row->billing_provider = $provider;
        $row->billing_metodo_em = $em ?? now();
        $row->billing_checkout_url = null;
        $row->save();
    }

    private function marcarPagamentoConta(ContaAtivacao $row, string $provider, ?\Carbon\CarbonInterface $em = null): void
    {
        $row->billing_status = ContaAtivacao::BILLING_ATIVA;
        $row->billing_provider = $provider;
        $row->billing_metodo_em = $em ?? now();
        $row->billing_checkout_url = null;
        $row->billing_pix_copia_cola = null;
        $row->billing_pix_qr_base64 = null;
        $row->billing_charge_vencimento = null;
        $row->billing_pix_emitido_em = null;
        $row->save();
    }

    private function suspenderPagamentoConta(ContaAtivacao $row): void
    {
        $row->billing_status = ContaAtivacao::BILLING_SUSPENSA;
        $row->billing_checkout_url = null;
        $row->billing_pix_copia_cola = null;
        $row->billing_pix_qr_base64 = null;
        $row->billing_charge_vencimento = null;
        $row->billing_pix_emitido_em = null;
        $row->save();
    }

    private function suspenderPagamentoEmpresa(EmpresaAtivacao $row): void
    {
        $row->billing_status = EmpresaAtivacao::BILLING_SUSPENSA;
        $row->billing_checkout_url = null;
        $row->save();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function dataPagamentoDoPayload(array $payload): \Carbon\CarbonInterface
    {
        $raw = data_get($payload, 'payment.clientPaymentDate')
            ?? data_get($payload, 'payment.confirmedDate')
            ?? data_get($payload, 'payment.paymentDate')
            ?? data_get($payload, 'payment.dueDate')
            ?? data_get($payload, 'dataHoraSituacao')
            ?? data_get($payload, 'horaSituacao');

        if (is_string($raw) && $raw !== '') {
            try {
                return \Carbon\Carbon::parse($raw)->timezone(config('app.timezone'));
            } catch (\Throwable) {
                // fallback abaixo
            }
        }

        return now();
    }

    /** Inter: ciclo local vencido → SUSPENSA (não há OVERDUE recorrente no provedor). */
    private function aplicarSuspensaoCicloInterSeVencido(ContaAtivacao $row): void
    {
        if ($this->billing->providerNome() !== 'inter') {
            return;
        }
        if (! $row->pagamentoAutenticado()) {
            return;
        }
        if (! $this->billing->cicloVencidoLocal($row->billing_metodo_em)) {
            return;
        }

        $this->suspenderPagamentoConta($row);
        $user = User::query()->find($row->user_id);
        if ($user) {
            $this->propagarSuspensaoContaParaEmpresas($user);
        }
    }

    /**
     * Gateway ativo da instalação manda na UX (evita misturar ASAAS residual com Inter).
     */
    private function providerEfetivo(?string $gravado): string
    {
        $ativo = $this->billing->providerNome();
        if (in_array($ativo, ['asaas', 'inter'], true)) {
            return $ativo;
        }

        $g = strtolower(trim((string) $gravado));

        return $g !== '' ? $g : 'mock';
    }

    private function checkoutUrlEfetivo(?string $url, ?string $gravadoProvider): ?string
    {
        if ($this->providerEfetivo($gravadoProvider) === 'inter') {
            return null;
        }
        $url = is_string($url) ? trim($url) : '';

        return $url !== '' ? $url : null;
    }

    /** Após trocar BILLING_PROVIDER=inter, remove checkout ASAAS residual da conta. */
    private function sanearResiduoAsaasSeInter(ContaAtivacao $row): void
    {
        if ($this->billing->providerNome() !== 'inter') {
            return;
        }
        if (! filled($row->billing_checkout_url)) {
            return;
        }

        $row->billing_checkout_url = null;
        if ($row->billing_provider !== 'inter') {
            $row->billing_provider = 'inter';
        }
        $row->save();
    }

    private function expirarPixInterSeNecessario(ContaAtivacao $row): void
    {
        if ($this->billing->providerNome() !== 'inter') {
            return;
        }
        if (! $this->billing instanceof \App\Services\Banking\Inter\InterBillingGateway) {
            return;
        }
        $this->billing->expirarPixAberto($row);
    }

    /**
     * Webhook Inter é a via canônica; pull no GET /ativacao cobre lab/túnel/atraso do banco.
     * Não estraga fluxo ASAAS nem contas sem PIX aberto.
     */
    private function reconciliarPixInterSePago(ContaAtivacao $row): void
    {
        if ($row->pagamentoAutenticado()) {
            return;
        }
        if ($this->billing->providerNome() !== 'inter') {
            return;
        }
        if (! $this->billing instanceof \App\Services\Banking\Inter\InterBillingGateway) {
            return;
        }

        try {
            $payload = $this->billing->consultarCobrancaAbertaSePaga($row);
            if ($payload === null) {
                return;
            }
            $this->aplicarWebhookBilling($payload, 'inter');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('ativacao.inter.reconcile.excecao', [
                'conta_id' => $row->id,
                'msg' => $e->getMessage(),
            ]);
        }
    }

    private function pixExpiraEmDto(ContaAtivacao $row): ?string
    {
        if ($this->billing->providerNome() !== 'inter') {
            return null;
        }
        if (! $this->billing instanceof \App\Services\Banking\Inter\InterBillingGateway) {
            return null;
        }
        if (! filled($row->billing_pix_copia_cola)) {
            return null;
        }

        return $this->billing->pixExpiraEm($row)?->toIso8601String();
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

    private function suspenderPagamentoContaVinculada(Empresa $empresa): void
    {
        $userIds = $empresa->users()->pluck('users.id');
        foreach (User::query()->whereIn('id', $userIds)->get() as $user) {
            if (! $user->hasRole('ADMIN') && ! $user->can('empresas.gerir')) {
                continue;
            }
            $conta = ContaAtivacao::query()->where('user_id', $user->id)->first();
            if ($conta !== null && $conta->pagamentoAutenticado()) {
                $this->suspenderPagamentoConta($conta);
            }
        }
    }

    private function propagarPagamentoContaParaEmpresas(User $user, ContaAtivacao $conta): void
    {
        $user->loadMissing('empresas');
        foreach ($user->empresas as $empresa) {
            $this->herdarPagamentoDaConta($user, $empresa);
        }
    }

    private function propagarSuspensaoContaParaEmpresas(User $user): void
    {
        $user->loadMissing('empresas');
        foreach ($user->empresas as $empresa) {
            $row = EmpresaAtivacao::query()->where('empresa_id', $empresa->id)->first();
            if ($row !== null && $row->pagamentoAutenticado()) {
                $this->suspenderPagamentoEmpresa($row);
            }
        }
    }

    private function contaDoUsuario(User $user): ?ContaAtivacao
    {
        return ContaAtivacao::query()->where('user_id', $user->id)->first();
    }

    private function contaAcessoLiberadoDaEmpresa(Empresa $empresa): bool
    {
        $contas = ContaAtivacao::query()
            ->whereIn('user_id', function ($q) use ($empresa) {
                $q->select('user_id')->from('empresa_user')->where('empresa_id', $empresa->id);
            })
            ->get();

        foreach ($contas as $conta) {
            if ($conta->acessoLiberado()) {
                return true;
            }
        }

        return false;
    }

    private function contaPagaAsaasDaEmpresa(Empresa $empresa): bool
    {
        return ContaAtivacao::query()
            ->where('billing_status', ContaAtivacao::BILLING_ATIVA)
            ->whereNotNull('billing_metodo_em')
            ->whereIn('user_id', function ($q) use ($empresa) {
                $q->select('user_id')->from('empresa_user')->where('empresa_id', $empresa->id);
            })
            ->exists();
    }

    private function contaAtivacaoDaEmpresa(Empresa $empresa): ?ContaAtivacao
    {
        $contas = ContaAtivacao::query()
            ->whereIn('user_id', function ($q) use ($empresa) {
                $q->select('user_id')->from('empresa_user')->where('empresa_id', $empresa->id);
            })
            ->orderByDesc('id')
            ->get();

        return $contas->first(fn (ContaAtivacao $c) => $c->acessoLiberado())
            ?? $contas->first();
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
