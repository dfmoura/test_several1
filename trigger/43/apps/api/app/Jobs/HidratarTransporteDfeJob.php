<?php

namespace App\Jobs;

use App\Services\Compras\DfeTransporteMetaService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Backfill de transportador na caixa DF-e — fora do GET da lista.
 * Nota nova já grava transp no sync e na busca de XML.
 */
class HidratarTransporteDfeJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 120;

    public function __construct(
        public readonly ?int $empresaId = null,
        public readonly int $rodada = 1,
    ) {}

    public function handle(DfeTransporteMetaService $meta): void
    {
        $limite = max(1, (int) config('erp.dfe.transporte_lote', 40));
        $maxRodadas = max(1, (int) config('erp.dfe.transporte_max_rodadas', 50));
        $lidos = $meta->hidratarPendentes($this->empresaId, $limite);

        if ($lidos >= $limite && $this->rodada < $maxRodadas) {
            self::dispatch($this->empresaId, $this->rodada + 1)
                ->delay(now()->addSeconds(2));
        }
    }
}
