<?php

namespace App\Console\Commands;

use App\Services\Comercial\FacasMapaService;
use Illuminate\Console\Command;

/**
 * Idempotente — seed do mapa oficial em deploys existentes.
 */
class EnsureFacasMapa extends Command
{
    protected $signature = 'facas:ensure-mapa {--force : Sobrescreve facas já cadastradas com o JSON oficial}';

    protected $description = 'Semeia o mapa oficial de facas (orc_mapa_facas) a partir do JSON';

    public function handle(FacasMapaService $service): int
    {
        if (! $service->tablesReady()) {
            $this->error('Tabela orc_mapa_facas ausente — rode as migrations primeiro.');

            return self::FAILURE;
        }

        $result = $service->seedFromJson(forceOverwrite: (bool) $this->option('force'));
        $this->info('Seed mapa de facas: '.json_encode($result, JSON_UNESCAPED_UNICODE));
        $this->info('Resumo: '.json_encode($service->resumo(), JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}
