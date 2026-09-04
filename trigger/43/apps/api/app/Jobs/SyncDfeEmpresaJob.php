<?php

namespace App\Jobs;

use App\Services\Compras\DfeSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Lote DF-e por EMP — fora do request HTTP (BL-091).
 */
class SyncDfeEmpresaJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 120;

    public function __construct(
        public readonly int $empresaId,
        public readonly int $rodada = 1,
    ) {}

    public function handle(DfeSyncService $sync): void
    {
        $sync->executarLote($this->empresaId, max(1, $this->rodada));
    }
}
