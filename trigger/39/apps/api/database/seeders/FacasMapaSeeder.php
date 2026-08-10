<?php

namespace Database\Seeders;

use App\Services\Comercial\FacasMapaService;
use Illuminate\Database\Seeder;

/**
 * Seméia o mapa oficial de facas a partir do JSON (idempotente).
 */
class FacasMapaSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(FacasMapaService::class);
        if (! $service->tablesReady()) {
            $this->command?->warn('Tabela orc_mapa_facas ainda não existe — pulando seed.');

            return;
        }

        $result = $service->seedFromJson();
        $this->command?->info(sprintf(
            'Mapa de facas: +%d criadas, %d já existiam (%s)',
            $result['criados'],
            $result['existentes'],
            $result['fonte'],
        ));
    }
}
