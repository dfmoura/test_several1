<?php

namespace Database\Seeders;

use App\Models\Empresa;
use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use Illuminate\Database\Seeder;

/**
 * Seméia as bases editáveis do catálogo ORC (+ escalares) a partir do JSON oficial.
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

        $ids = Empresa::query()->pluck('id');
        if ($ids->isEmpty()) {
            $result = $service->seedFromJson();
        } else {
            $result = ['criados' => [
                'papeis' => 0, 'acabamentos' => 0, 'tipos_troca' => 0,
                'maquinas' => 0, 'tarifas' => 0, 'parametros' => 0,
            ]];
            foreach ($ids as $id) {
                $chunk = $service->seedFromJson(null, false, (int) $id);
                foreach ($chunk['criados'] as $k => $n) {
                    $result['criados'][$k] = ($result['criados'][$k] ?? 0) + $n;
                }
            }
        }
        $this->command?->info(sprintf(
            'Catálogo ORC: papeis +%d, acabamentos +%d, trocas +%d, máquinas +%d, tarifas +%d, parâmetros +%d',
            $result['criados']['papeis'],
            $result['criados']['acabamentos'],
            $result['criados']['tipos_troca'],
            $result['criados']['maquinas'],
            $result['criados']['tarifas'],
            $result['criados']['parametros'] ?? 0,
        ));
        $this->command?->info(sprintf(
            'Catálogo ORC frete: faixas +%d (R$ vazio / inativas até o comercial preencher)',
        ));
    }
}
