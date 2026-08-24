<?php

namespace App\Console\Commands;

use App\Models\ContaAtivacao;
use App\Services\Banking\Billing\BillingGateway;
use Illuminate\Console\Command;

/**
 * Ops: contas com cortesia acabando sem meio autenticado (cobrança antecipada).
 * Agendado diariamente — não envia e-mail; lista para o console / logs.
 */
class AvisarCortesiaBilling extends Command
{
    protected $signature = 'plataforma:avisar-cortesia-billing
                            {--dias= : Limite de dias restantes (default: config erp.billing.alerta_cortesia_dias)}';

    protected $description = 'Lista contas com cortesia no fim sem mensalidade autenticada (antecipada)';

    public function handle(BillingGateway $billing): int
    {
        $limite = $this->option('dias') !== null
            ? max(0, (int) $this->option('dias'))
            : $billing->alertaCortesiaDias();

        $hoje = now()->startOfDay();
        $ate = $hoje->copy()->addDays($limite)->endOfDay();

        $rows = ContaAtivacao::query()
            ->with('user:id,codigo,name,email')
            ->whereNotNull('cortesia_ate')
            ->whereBetween('cortesia_ate', [$hoje, $ate])
            ->orderBy('cortesia_ate')
            ->get()
            ->filter(fn (ContaAtivacao $c) => $c->cortesiaVigente($hoje) && ! $c->pagamentoAutenticado());

        if ($rows->isEmpty()) {
            $this->info("Nenhuma conta com cortesia acabando em até {$limite} dia(s) sem meio autenticado.");

            return self::SUCCESS;
        }

        $this->warn($rows->count().' conta(s) precisam autenticar a mensalidade antecipada:');
        $this->table(
            ['Código', 'E-mail', 'Cortesia até', 'Dias', '1ª cobrança'],
            $rows->map(function (ContaAtivacao $c) use ($billing, $hoje) {
                $dias = (int) $hoje->diffInDays($c->cortesia_ate->copy()->startOfDay());
                $primeira = $billing->primeiraCobrancaEm($c->cortesia_ate);

                return [
                    $c->user?->codigo ?? '—',
                    $c->user?->email ?? '—',
                    $c->cortesia_ate->timezone(config('app.timezone'))->format('d/m/Y'),
                    $dias,
                    $primeira->format('d/m/Y'),
                ];
            })->all(),
        );

        return self::SUCCESS;
    }
}
