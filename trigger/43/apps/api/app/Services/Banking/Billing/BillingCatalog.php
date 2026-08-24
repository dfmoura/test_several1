<?php

namespace App\Services\Banking\Billing;

use App\Models\BillingCatalogoInstalacao;
use App\Models\ContaAtivacao;
use Carbon\CarbonInterface;

/**
 * Valor / ciclo / rótulos da mensalidade FLEXORC — compartilhado entre gateways.
 */
final class BillingCatalog
{
    public function valorTabela(): float
    {
        $raw = $this->valorBruto();
        $n = (float) str_replace(',', '.', $raw);

        return $n < 0 ? 0.0 : round($n, 2);
    }

    public function valorCobranca(): float
    {
        $n = $this->valorTabela();

        return $n > 0 ? $n : 1.00;
    }

    public function ciclo(): string
    {
        $row = BillingCatalogoInstalacao::atual();
        $c = strtoupper(trim((string) ($row?->ciclo ?? config('erp.billing.ciclo', 'MONTHLY'))));

        return $c !== '' ? $c : 'MONTHLY';
    }

    public function cicloLabel(): string
    {
        return match ($this->ciclo()) {
            'WEEKLY' => 'Toda semana',
            'BIWEEKLY' => 'A cada 2 semanas',
            'BIMONTHLY' => 'Bimestral',
            'QUARTERLY' => 'Trimestral',
            'SEMIANNUALLY' => 'Semestral',
            'YEARLY' => 'Anual',
            default => 'Todo mês',
        };
    }

    public function descricao(): string
    {
        $row = BillingCatalogoInstalacao::atual();
        $d = trim((string) ($row?->descricao ?? config('erp.billing.descricao', '')));

        return $d !== '' ? $d : 'Mensalidade da conta '.config('erp.brand.licensee_product', 'FLEXOERP');
    }

    private function valorBruto(): string
    {
        $row = BillingCatalogoInstalacao::atual();
        if ($row !== null) {
            return (string) $row->valor;
        }

        return (string) config('erp.billing.valor', '297.00');
    }

    public function alertaCortesiaDias(): int
    {
        $n = (int) config('erp.billing.alerta_cortesia_dias', 7);

        return $n > 0 ? $n : 7;
    }

    public function primeiraCobrancaEm(?CarbonInterface $cortesiaAte = null, ?CarbonInterface $agora = null): CarbonInterface
    {
        $hoje = ($agora ?? now())->copy()->startOfDay();
        if (! (bool) config('erp.billing.cobranca_antecipada', true)) {
            return $hoje;
        }

        if ($cortesiaAte === null) {
            return $hoje;
        }

        $ate = $cortesiaAte->copy()->startOfDay();

        return $ate->greaterThanOrEqualTo($hoje) ? $ate : $hoje;
    }

    public function avancarCiclo(CarbonInterface $de): CarbonInterface
    {
        return match ($this->ciclo()) {
            'WEEKLY' => $de->copy()->addWeek(),
            'BIWEEKLY' => $de->copy()->addWeeks(2),
            'BIMONTHLY' => $de->copy()->addMonthsNoOverflow(2),
            'QUARTERLY' => $de->copy()->addMonthsNoOverflow(3),
            'SEMIANNUALLY' => $de->copy()->addMonthsNoOverflow(6),
            'YEARLY' => $de->copy()->addYearNoOverflow(),
            default => $de->copy()->addMonthNoOverflow(),
        };
    }

    /**
     * Âncora ASAAS: avança até a próxima data ≥ hoje (assinatura no provedor).
     *
     * @return array{
     *   proxima_cobranca_em: ?string,
     *   proxima_cobranca_formatada: ?string,
     *   dias_ate_proxima: ?int,
     *   renovacao_label: string
     * }
     */
    public function cicloStatusAssinatura(?CarbonInterface $autenticadoEm, bool $paga): array
    {
        if (! $paga || $autenticadoEm === null) {
            return [
                'proxima_cobranca_em' => null,
                'proxima_cobranca_formatada' => null,
                'dias_ate_proxima' => null,
                'renovacao_label' => 'Aguardando a primeira confirmação no ASAAS',
            ];
        }

        $hoje = now()->startOfDay();
        $proxima = $this->avancarCiclo($autenticadoEm->copy()->startOfDay());
        $guard = 0;
        while ($proxima->lt($hoje) && $guard < 240) {
            $proxima = $this->avancarCiclo($proxima);
            $guard++;
        }

        $dias = (int) $hoje->diffInDays($proxima);
        $formatada = $proxima->format('d/m/Y');

        $label = match (true) {
            $dias === 0 => 'Renova hoje ('.$formatada.')',
            $dias === 1 => 'Renova amanhã ('.$formatada.')',
            default => 'Renova em '.$dias.' dias ('.$formatada.')',
        };

        return [
            'proxima_cobranca_em' => $proxima->toDateString(),
            'proxima_cobranca_formatada' => $formatada,
            'dias_ate_proxima' => $dias,
            'renovacao_label' => $label,
        ];
    }

    /**
     * Ciclo Inter: fim do período pago (sem pular vencidos). dias pode ser 0 se vencido.
     *
     * @return array{
     *   proxima_cobranca_em: ?string,
     *   proxima_cobranca_formatada: ?string,
     *   dias_ate_proxima: ?int,
     *   renovacao_label: string
     * }
     */
    public function cicloStatusPixPorCiclo(?CarbonInterface $autenticadoEm, bool $paga): array
    {
        if (! $paga || $autenticadoEm === null) {
            return [
                'proxima_cobranca_em' => null,
                'proxima_cobranca_formatada' => null,
                'dias_ate_proxima' => null,
                'renovacao_label' => 'Aguardando o primeiro PIX confirmado',
            ];
        }

        $hoje = now()->startOfDay();
        $fim = $this->avancarCiclo($autenticadoEm->copy()->startOfDay());
        $formatada = $fim->format('d/m/Y');

        if ($fim->lt($hoje)) {
            return [
                'proxima_cobranca_em' => $fim->toDateString(),
                'proxima_cobranca_formatada' => $formatada,
                'dias_ate_proxima' => 0,
                'renovacao_label' => 'Ciclo vencido em '.$formatada.' · pague o PIX para continuar',
            ];
        }

        $dias = (int) $hoje->diffInDays($fim);
        $label = match (true) {
            $dias === 0 => 'Vence hoje ('.$formatada.') · pague o PIX',
            $dias === 1 => 'Vence amanhã ('.$formatada.')',
            default => 'Vence em '.$dias.' dias ('.$formatada.')',
        };

        return [
            'proxima_cobranca_em' => $fim->toDateString(),
            'proxima_cobranca_formatada' => $formatada,
            'dias_ate_proxima' => $dias,
            'renovacao_label' => $label,
        ];
    }

    public function cicloVencido(?CarbonInterface $autenticadoEm, ?CarbonInterface $agora = null): bool
    {
        if ($autenticadoEm === null) {
            return false;
        }

        $hoje = ($agora ?? now())->copy()->startOfDay();
        $fim = $this->avancarCiclo($autenticadoEm->copy()->startOfDay());

        return $fim->lt($hoje);
    }

    public function precisaPagarCicloPix(ContaAtivacao $conta): bool
    {
        if ($conta->billing_status === ContaAtivacao::BILLING_SUSPENSA) {
            return true;
        }

        if (! $conta->pagamentoAutenticado()) {
            return true;
        }

        if ($this->cicloVencido($conta->billing_metodo_em)) {
            return true;
        }

        $ciclo = $this->cicloStatusPixPorCiclo($conta->billing_metodo_em, true);
        $dias = $ciclo['dias_ate_proxima'];

        return is_int($dias) && $dias <= $this->alertaCortesiaDias();
    }
}
