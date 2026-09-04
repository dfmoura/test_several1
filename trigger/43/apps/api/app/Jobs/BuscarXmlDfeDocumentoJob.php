<?php

namespace App\Jobs;

use App\Services\Compras\DfeXmlCompletoService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class BuscarXmlDfeDocumentoJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 120;

    public function __construct(
        public readonly int $empresaId,
        public readonly int $documentoId,
    ) {}

    public function handle(DfeXmlCompletoService $service): void
    {
        $service->executarBusca($this->empresaId, $this->documentoId);
    }
}
