<?php

namespace App\Console\Commands;

use App\Jobs\HidratarTransporteDfeJob;
use Illuminate\Console\Command;

/**
 * Enfileira a leitura de transportador nos XMLs já no cofre.
 * Não consulta o fisco. A lista da caixa não espera este job.
 */
class HidratarTransporteDfeCommand extends Command
{
    protected $signature = 'dfe:hidratar-transporte {--empresa= : ID de uma EMP (opcional)}';

    protected $description = 'Enfileira backfill do transportador na caixa DF-e (XML local, sem SEFAZ)';

    public function handle(): int
    {
        $empresaId = $this->option('empresa') !== null && $this->option('empresa') !== ''
            ? (int) $this->option('empresa')
            : null;

        HidratarTransporteDfeJob::dispatch($empresaId, 1);

        $alvo = $empresaId !== null ? 'EMP #'.$empresaId : 'todas as EMPs com XML pendente';
        $this->info('Backfill de transportador enfileirado ('.$alvo.').');

        return self::SUCCESS;
    }
}
