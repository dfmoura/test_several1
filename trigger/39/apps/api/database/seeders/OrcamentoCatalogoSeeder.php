<?php

namespace Database\Seeders;

use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use Illuminate\Database\Seeder;

/**
 * Seméia as 4 bases editáveis do catálogo ORC a partir do JSON oficial.
 * Idempotente: não sobrescreve preços já cadastrados.
 */
class OrcamentoCatalogoSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(OrcamentoCatalogoAdminService::class);
        if (! $service->tablesReady()) {
            $this->command?->warn('Tabelas do catálogo ORC ainda não existem — pulando seed.');

            return;
        }

        $result = $service->seedFromJson();
        $this->command?->info(sprintf(
            'Catálogo ORC: papeis +%d, acabamentos +%d, trocas +%d, máquinas +%d, tarifas +%d',
            $result['criados']['papeis'],
            $result['criados']['acabamentos'],
            $result['criados']['tipos_troca'],
            $result['criados']['maquinas'],
            $result['criados']['tarifas'],
        ));
    }
}
