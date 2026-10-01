<?php

namespace App\Jobs;

use App\Services\Compras\NfseCaixaService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Lote ADN de NFS-e por empresa — fora da espera da tela.
 */
class SyncNfseEmpresaJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 120;

    public function __construct(public readonly int $empresaId) {}

    public function handle(NfseCaixaService $caixa): void
    {
        $caixa->executar($this->empresaId);
    }
}
