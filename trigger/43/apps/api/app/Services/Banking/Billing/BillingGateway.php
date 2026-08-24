<?php

namespace App\Services\Banking\Billing;

use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\EmpresaAtivacao;
use App\Models\User;
use Carbon\CarbonInterface;

/**
 * Contrato da mensalidade FLEXORC (conta → TRIGGER).
 * Implementações: Asaas (cartão recorrente) · Inter (PIX por ciclo) · mock.
 */
interface BillingGateway
{
    public function providerNome(): string;

    public function podeConfirmarDemo(): bool;

    /**
     * @return array{
     *   checkout_url: ?string,
     *   customer_ref: ?string,
     *   checkout_ref: ?string,
     *   provider: string,
     *   pix_copia_cola?: ?string,
     *   pix_qr_base64?: ?string,
     *   charge_vencimento?: ?string
     * }
     */
    public function iniciarCheckout(Empresa $empresa, EmpresaAtivacao $ativacao): array;

    /**
     * @return array{
     *   checkout_url: ?string,
     *   customer_ref: ?string,
     *   checkout_ref: ?string,
     *   provider: string,
     *   pix_copia_cola?: ?string,
     *   pix_qr_base64?: ?string,
     *   charge_vencimento?: ?string
     * }
     */
    public function iniciarCheckoutConta(User $user, ContaAtivacao $ativacao): array;

    /** @param  array<string, mixed>  $payload */
    public function ehEventoBilling(array $payload): bool;

    /** @param  array<string, mixed>  $payload */
    public function empresaIdDoPayload(array $payload): ?int;

    /** @param  array<string, mixed>  $payload */
    public function userIdDoPayload(array $payload): ?int;

    /** @param  array<string, mixed>  $payload */
    public function pagamentoConfirmado(array $payload): bool;

    /** @param  array<string, mixed>  $payload */
    public function pagamentoEmAtrasoOuCancelado(array $payload): bool;

    public function primeiraCobrancaEm(?CarbonInterface $cortesiaAte = null, ?CarbonInterface $agora = null): CarbonInterface;

    public function alertaCortesiaDias(): int;

    /**
     * @return array{
     *   proxima_cobranca_em: ?string,
     *   proxima_cobranca_formatada: ?string,
     *   dias_ate_proxima: ?int,
     *   renovacao_label: string
     * }
     */
    public function cicloStatus(?CarbonInterface $autenticadoEm, bool $paga): array;

    public function valorTabela(): float;

    public function valorCobranca(): float;

    public function ciclo(): string;

    public function cicloLabel(): string;

    public function descricao(): string;

    /** Inter: ciclo local vencido (sem renovação). Asaas: sempre false (webhook). */
    public function cicloVencidoLocal(?CarbonInterface $autenticadoEm): bool;

    /** Janela para emitir/mostrar PIX (≤ alerta dias ou vencido). */
    public function precisaPagarCiclo(ContaAtivacao $conta): bool;
}
