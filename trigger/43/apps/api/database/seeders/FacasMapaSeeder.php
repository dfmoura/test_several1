<?php

namespace Database\Seeders;

use App\Models\Empresa;
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

        $ids = Empresa::query()->pluck('id');
        $criados = 0;
        $existentes = 0;
        $fonte = 'MAPA DE FACAS';
        if ($ids->isEmpty()) {
            $result = $service->seedFromJson();
            $criados = $result['criados'];
            $existentes = $result['existentes'];
            $fonte = $result['fonte'];
        } else {
            foreach ($ids as $id) {
                $result = $service->seedFromJson(null, false, (int) $id);
                $criados += $result['criados'];
                $existentes += $result['existentes'];
                $fonte = $result['fonte'];
            }
        }
        $this->command?->info(sprintf(
            'Mapa de facas: +%d criadas, %d já existiam (%s)',
            $criados,
            $existentes,
            $fonte,
        ));
    }
}
