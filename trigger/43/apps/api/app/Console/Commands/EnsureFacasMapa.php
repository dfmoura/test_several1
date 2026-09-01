<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Comercial\FacasMapaService;
use Illuminate\Console\Command;

/**
 * Idempotente — seed do mapa oficial em deploys existentes.
 * Semeia template (empresa_id nulo) e cada EMP — mesmo padrão de orcamento:ensure-catalogo.
 */
class EnsureFacasMapa extends Command
{
    protected $signature = 'facas:ensure-mapa {--force : Sobrescreve facas já cadastradas com o JSON oficial}';

    protected $description = 'Semeia o mapa oficial de facas (orc_mapa_facas) a partir do JSON — template + EMPs';

    public function handle(FacasMapaService $service): int
    {
        if (! $service->tablesReady()) {
            $this->error('Tabela orc_mapa_facas ausente — rode as migrations primeiro.');

            return self::FAILURE;
        }

        $force = (bool) $this->option('force');
        $criados = 0;
        $existentes = 0;

        $template = $service->seedFromJson(null, $force, null);
        $criados += $template['criados'];
        $existentes += $template['existentes'];
        $this->line(sprintf(
            'Template (empresa_id nulo): criados=%d existentes=%d',
            $template['criados'],
            $template['existentes'],
        ));

        foreach (Empresa::query()->orderBy('id')->pluck('id') as $id) {
            $chunk = $service->seedFromJson(null, $force, (int) $id);
            $criados += $chunk['criados'];
            $existentes += $chunk['existentes'];
            $this->line(sprintf(
                'EMP id=%d: criados=%d existentes=%d',
                $id,
                $chunk['criados'],
                $chunk['existentes'],
            ));
        }

        $this->info(sprintf('Seed mapa de facas: criados=%d existentes=%d', $criados, $existentes));
        $this->info('Resumo: '.json_encode($service->resumo(), JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}
